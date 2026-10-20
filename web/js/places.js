/* v65: خريطة أماكن القصص: تظهر المواضع بعد فتح محطاتها، ويمكن تحريك الرحلة على الخريطة */
let geoAnim = false;

function placeVisitOpen(v) {
  const sid = v.ref.split("v")[0];
  const st = content.journeyData.find(s => s.id === sid);
  return !!st && getStationStatus(st) !== "locked";
}
function showPlacesMap() {
  const W = 340, H = 400;
  const px = lon => 24 + (lon - 36) / 7 * (W - 48);
  const py = lat => 24 + (34 - lat) / 21 * (H - 48);
  const visits = PLACE_VISITS.map((v, i) => ({ ...v, i, geo: GEO_PLACES[v.place], open: placeVisitOpen(v) }));
  const open = visits.filter(v => v.open);
  const pts = open.map(v => px(v.geo.lon) + "," + py(v.geo.lat));
  const line = pts.length > 1 ? `<polyline points="${pts.join(" ")}" fill="none" stroke="#d81b60" stroke-width="3" stroke-dasharray="6 4"/>` : "";
  const dots = visits.map(v => {
    const x = px(v.geo.lon), y = py(v.geo.lat);
    const fill = v.open ? "#4caf50" : "#ddd";
    return `<g onclick="placeInfo('${escapeForAttr(v.place)}')" style="cursor:pointer">
      <circle cx="${x}" cy="${y}" r="13" fill="${fill}" stroke="#fff" stroke-width="2"/>
      <text x="${x}" y="${y + 4}" text-anchor="middle" font-size="12">${v.open ? "📍" : "🔒"}</text>
      <text x="${x}" y="${y + 26}" text-anchor="middle" font-size="10" fill="#444">${escapeHtml(v.place)}</text>
    </g>`;
  }).join("");
  const mover = geoAnim && pts.length > 1
    ? `<circle r="6" fill="#ffb300" stroke="#333" stroke-width="1"><animateMotion dur="${Math.max(6, pts.length * 2)}s" repeatCount="indefinite" path="M${pts.join(" L")}"/></circle>` : "";
  const svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:340px;background:#eef6f0;border-radius:16px;border:2px solid #b7d7bd" role="img" aria-label="خريطة تخطيطية لأماكن القصص">${line}${dots}${mover}</svg>`;
  const legend = visits.map((v, i) => `<div class="board-row"><span>${i + 1}. ${escapeHtml(v.place)}</span><strong>${v.open ? "✅" : "🔒"}</strong></div>`).join("");
  openHub("🌍 أماكن القصص", `
    <p style="color:#666;font-size:.88rem">تظهر كل نقطة عند فتح القصة التي تذكرها. اضغط النقطة لترى قصتها.</p>
    <div style="display:flex;justify-content:center">${svg}</div>
    <div class="hub-actions" style="margin-top:8px"><button class="action-btn btn-info" onclick="toggleGeoAnim()">${geoAnim ? "⏹ إيقاف الحركة" : "▶ حرّك الرحلة"}</button></div>
    <div id="placeInfo" style="margin-top:10px;line-height:1.8"></div>
    <div style="margin-top:10px">${legend}</div>
    <p style="color:#888;font-size:.78rem">الخريطة تخطيطية، والمواضع تقريبية، والترتيب هو ترتيب ظهور الأماكن في المنظومة، وليس مساراً فعلياً للسفر.</p>`);
}
function toggleGeoAnim() { geoAnim = !geoAnim; showPlacesMap(); }
function placeInfo(place) {
  const v = PLACE_VISITS.filter(x => x.place === place);
  const geo = GEO_PLACES[place] || {};
  const rows = v.map(x => {
    const f = findVerse(x.ref);
    const open = placeVisitOpen(x);
    return `<div>${open && f ? `📖 ${escapeHtml(f.st.title)}: «${escapeHtml(f.v.fullVerse)}»` : "🔒 تُفتح عند الوصول إلى محطتها"}</div>`;
  }).join("");
  document.getElementById("placeInfo").innerHTML = `<strong>${escapeHtml(place)}</strong>${geo.note ? `<div style="color:#888;font-size:.8rem">${escapeHtml(geo.note)}</div>` : ""}${rows}`;
}
