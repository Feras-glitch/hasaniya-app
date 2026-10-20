/* تحدّي الأسبوع للأسرة: خمسة أبيات يختارها الإصدار لكل أسبوع، ولوحة لكل الأطفال */
function weekKey(d) {
  d = d || new Date();
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((t - y0) / 86400000 + 1) / 7);
  return t.getUTCFullYear() + "-W" + String(wk).padStart(2, "0");
}
function weeklyVerseIds(key) {
  const all = []; content.journeyData.forEach(st => st.verses.forEach(v => all.push(v.id)));
  let h = 0; for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const picks = [];
  while (picks.length < Math.min(5, all.length)) {
    h = (h * 1103515245 + 12345) >>> 0;
    const id = all[h % all.length];
    if (!picks.includes(id)) picks.push(id);
  }
  return picks;
}
function ensureWeekly(s) {
  const k = weekKey();
  if (!s.weekly || s.weekly.week !== k) s.weekly = {week: k, done: {}};
  return s.weekly;
}
function markWeekly(vid) {
  if (!state) return;
  const w = ensureWeekly(state);
  if (!weeklyVerseIds(w.week).includes(vid) || w.done[vid]) return;
  w.done[vid] = true; saveState();
  if (weeklyVerseIds(w.week).every(id => w.done[id])) {
    kidToast(kidLine("weeklyDone"), "success");
    awardBadge("weekly");
  }
}
function findVerse(id) {
  for (let si = 0; si < content.journeyData.length; si++) {
    const vi = content.journeyData[si].verses.findIndex(v => v.id === id);
    if (vi !== -1) return {si, vi, v: content.journeyData[si].verses[vi], st: content.journeyData[si]};
  }
  return null;
}
function showWeekly() {
  const key = weekKey();
  const ids = weeklyVerseIds(key);
  const w = ensureWeekly(state);
  const rows = ids.map(id => {
    const f = findVerse(id); if (!f) return "";
    const done = !!w.done[id];
    return `<button class="hub-row ${done ? "done" : ""}" onclick="startFocusFromWeekly(${f.si},${f.vi})">
      <span>${done ? "✅" : "⬜"}</span>
      <span style="flex:1;text-align:right">${escapeHtml(f.v.fullVerse)}</span></button>`;
  }).join("");
  openHub("🏅 تحدّي الأسبوع", `
    <p style="color:#666;font-size:.9rem">أتقِن هذه الأبيات الخمسة هذا الأسبوع. اضغط البيت للتدرّب عليه.</p>
    <div style="font-weight:bold;margin-bottom:8px">التقدّم: ${Object.keys(w.done).filter(k => ids.includes(k)).length} / ${ids.length}</div>
    ${rows}
    <div class="board-title">لوحة الأسرة</div>
    <div id="weeklyBoard">${familyRows(key)}</div>`);
}
function startFocusFromWeekly(si, vi) { closePopup("hubPopup"); startFocus(si, vi); }
function familyRows(key) {
  const rows = users.map(u => {
    const w = u.state && u.state.weekly;
    const n = w && w.week === key ? Object.keys(w.done).length : 0;
    return {name: avatarHTML(u, "board-photo") + " " + escapeHtml(u.name), n};
  }).sort((a, b) => b.n - a.n);
  if (!rows.length) return `<p class="empty-state">لا يوجد أطفال بعد.</p>`;
  return rows.map(r => `<div class="board-row"><span>${r.name}</span><strong>${r.n} / 5</strong></div>`).join("");
}
function renderFamilyBoard() {
  const el = document.getElementById("familyBoard");
  if (el) el.innerHTML = familyRows(weekKey());
}
