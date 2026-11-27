/* v65: خريطة أماكن القصص: تظهر المواضع بعد فتح محطاتها، ويمكن تحريك الرحلة على الخريطة */
let geoAnim = false;

function placeVisitOpen(v) {
  // v106: المحطة من مكان البيت فعلاً، لا من شكل معرّفه (المعرّف ثابت ولو نُقل البيت)
  const st = content.journeyData.find(s => s.verses.some(x => x.id === v.ref));
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
  // v114: كل مكان مرة واحدة (كانت المواضع المكررة تُرسم فوق بعضها)، والمتقارب يُباعَد
  const uniq = [];
  visits.forEach(v => { const u = uniq.find(x => x.place === v.place); if (u) u.open = u.open || v.open; else uniq.push({ place: v.place, geo: v.geo, open: v.open, x: px(v.geo.lon), y: py(v.geo.lat) }); });
  // v114: مكة وما حولها، والمدينة وما حولها، في إطارين مكبَّرين، فلا تتراكم نقاطهما
  const INSETS = [
    { name: "مكة وما حولها", lon: 39.83, lat: 21.42, r: 0.45, k: 150, box: { x: W - 162, y: H - 128, w: 150, h: 116 } },
    { name: "المدينة وما حولها", lon: 39.55, lat: 24.4, r: 0.5, k: 110, box: { x: W - 162, y: 14, w: 150, h: 116 } }
  ];
  uniq.forEach(v => { const ins = INSETS.find(I => Math.hypot(v.geo.lon - I.lon, v.geo.lat - I.lat) < I.r); if (!ins) return;
    const B = ins.box; v.inset = ins;
    v.x = Math.max(B.x + 12, Math.min(B.x + B.w - 12, B.x + B.w / 2 + (v.geo.lon - ins.lon) * ins.k));
    v.y = Math.max(B.y + 12, Math.min(B.y + B.h - 26, B.y + B.h / 2 + (ins.lat - v.geo.lat) * ins.k)); });
  mapSpread(uniq.filter(v => !v.inset), 26, W, H);
  INSETS.forEach(I => mapSpread(uniq.filter(v => v.inset === I), 24, W, H));
  const inset = INSETS.filter(I => uniq.some(v => v.inset === I)).map(I => { const B = I.box, mx = px(I.lon), my = py(I.lat);
    return `<rect x="${mx - 9}" y="${my - 9}" width="18" height="18" fill="none" stroke="#888" stroke-dasharray="3 2"/>
    <line x1="${mx}" y1="${my}" x2="${B.x + B.w / 2}" y2="${B.y > my ? B.y : B.y + B.h}" stroke="#bbb" stroke-dasharray="3 2"/>
    <rect x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}" rx="10" fill="#fff" stroke="#b7d7bd" stroke-width="2"/>
    <text x="${B.x + B.w / 2}" y="${B.y > my ? B.y - 4 : B.y + B.h + 12}" text-anchor="middle" font-size="10" fill="#555">${escapeHtml(I.name)} (مكبَّرة)</text>`; }).join("");
  const dots = uniq.map((v, n) => {
    const fill = v.open ? "#4caf50" : "#ddd";
    return `<g onclick="placeInfo('${escapeForAttr(v.place)}')" style="cursor:pointer">
      ${v.moved ? `<line x1="${v.x}" y1="${v.y}" x2="${v.ax}" y2="${v.ay}" stroke="#999" stroke-width="1"/><circle cx="${v.x}" cy="${v.y}" r="2.5" fill="#666"/>` : ""}
      <circle cx="${v.ax}" cy="${v.ay}" r="11" fill="${fill}" stroke="#fff" stroke-width="2"/>
      <text x="${v.ax}" y="${v.ay + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="${v.open ? "#fff" : "#777"}">${n + 1}</text>
      ${v.showLabel ? `<text x="${v.ax}" y="${v.ay + 24}" text-anchor="middle" font-size="10" fill="#444">${escapeHtml(v.place)}</text>` : ""}
    </g>`;
  }).join("");
  const mover = geoAnim && pts.length > 1
    ? `<circle r="6" fill="#ffb300" stroke="#333" stroke-width="1"><animateMotion dur="${Math.max(6, pts.length * 2)}s" repeatCount="indefinite" path="M${pts.join(" L")}"/></circle>` : "";
  const svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:340px;background:#eef6f0;border-radius:16px;border:2px solid #b7d7bd" role="img" aria-label="خريطة تخطيطية لأماكن القصص">${line}${inset}${dots}${mover}</svg>`;
  const legend = uniq.map((v, i) => `<div class="board-row" onclick="placeInfo('${escapeForAttr(v.place)}')" style="cursor:pointer"><span>${i + 1}. ${escapeHtml(v.place)}</span><strong>${v.open ? "✅" : "🔒"}</strong></div>`).join("");
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
