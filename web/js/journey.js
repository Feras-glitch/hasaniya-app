/* خريطة الرحلة: تُضيء المحطات المفتوحة على خريطة مبسّطة للحجاز والشام والحبشة.
   المحطات التي في موضع واحد تُجمع في علامة واحدة مع قائمة بأرقامها أسفل الخريطة. */
const PLACES = {
  s1: {n: "مكة", g: "مكة", lon: 39.83, lat: 21.42},
  s2: {n: "مكة", g: "مكة", lon: 39.83, lat: 21.42},
  s3: {n: "بُصرى", g: "بُصرى", lon: 36.48, lat: 32.52},
  s4: {n: "مكة", g: "مكة", lon: 39.83, lat: 21.42},
  s5: {n: "حراء", g: "مكة", lon: 39.86, lat: 21.5},
  s6: {n: "مكة", g: "مكة", lon: 39.83, lat: 21.42},
  s7: {n: "الحبشة", g: "الحبشة", lon: 38.73, lat: 14.13},
  s8: {n: "مكة", g: "مكة", lon: 39.83, lat: 21.42},
  s9: {n: "الطائف", g: "الطائف", lon: 40.42, lat: 21.27},
  s10: {n: "العقبة", g: "مكة", lon: 39.9, lat: 21.41},
  s11a: {n: "غار ثور", g: "غار ثور", lon: 39.86, lat: 21.38},
  s11b: {n: "قباء", g: "قباء", lon: 39.62, lat: 24.44},
  s12a: {n: "الأبواء", g: "الأبواء", lon: 39.19, lat: 23.18},
  s12b: {n: "بدر", g: "بدر", lon: 38.79, lat: 23.78},
  s12c: {n: "المدينة", g: "قباء", lon: 39.62, lat: 24.44},
  s13: {n: "أحد", g: "أحد", lon: 39.61, lat: 24.5}
};
function showJourneyMap() {
  const W = 340, H = 400;
  // نطاق مقرّب: الحبشة في الجنوب الغربي، بُصرى في الشمال
  const px = lon => 24 + (lon - 36) / 7 * (W - 48);
  const py = lat => 24 + (34 - lat) / 21 * (H - 48);
  // تجميع المحطات حسب الموضع
  const groups = {};
  content.journeyData.forEach((st, i) => {
    const p = PLACES[st.id]; if (!p) return;
    const g = groups[p.g] || (groups[p.g] = {name: p.g, lon: p.lon, lat: p.lat, stations: []});
    g.stations.push({st, i, status: getStationStatus(st), num: i + 1});
  });
  const rank = {completed: 3, current: 2, locked: 0};
  const groupList = Object.values(groups);
  groupList.forEach(g => {
    g.status = g.stations.reduce((best, s) => (rank[s.status] || 0) > (rank[best] || 0) ? s.status : best, "locked");
    g.x = px(g.lon); g.y = py(g.lat);
  });
  const open = groupList.filter(g => g.status !== "locked");
  const line = open.length > 1 ? `<polyline points="${open.map(g => g.x + "," + g.y).join(" ")}" fill="none" stroke="#d81b60" stroke-width="3" stroke-dasharray="6 4"/>` : "";
  const dots = groupList.map(g => {
    const fill = g.status === "completed" ? "#4caf50" : g.status === "current" ? "#d81b60" : "#ddd";
    const icon = g.status === "locked" ? "🔒" : g.stations[0].st.icon;
    const badge = g.stations.length > 1 ? `<text x="${g.x + 12}" y="${g.y - 10}" font-size="10" font-weight="700" fill="#333">×${g.stations.length}</text>` : "";
    const left = g.x < 90;
    return `<g>
      <circle cx="${g.x}" cy="${g.y}" r="14" fill="${fill}" stroke="#fff" stroke-width="2"/>
      <text x="${g.x}" y="${g.y + 5}" text-anchor="middle" font-size="13">${icon}</text>
      ${badge}
      <text x="${g.x}" y="${g.y + 28}" text-anchor="${left ? "start" : "middle"}" font-size="11" fill="#444">${escapeHtml(g.name)}</text>
    </g>`;
  }).join("");
  const svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:340px;background:#fdf6ec;border-radius:16px;border:2px solid #f0d9b5" role="img" aria-label="خريطة الرحلة">
    ${line}${dots}</svg>`;
  const legend = groupList.map(g => {
    const nums = g.stations.map(s => s.status === "locked" ? `${s.num} 🔒` : `${s.num} ${s.st.icon}`).join("، ");
    return `<div class="board-row"><span>${escapeHtml(g.name)}</span><strong>${nums}</strong></div>`;
  }).join("");
  openHub("🗺️ خريطة الرحلة", `
    <p style="color:#666;font-size:.88rem">كل موضع يُضيء عند فتح محطاته. الخط يتبع مسار الرحلة.</p>
    <div style="display:flex;justify-content:center">${svg}</div>
    <div style="margin-top:10px">${legend}</div>
    <p style="color:#888;font-size:.8rem">المواقع تقريبية للتوضيح، وليست خرائط دقيقة.</p>`);
}
