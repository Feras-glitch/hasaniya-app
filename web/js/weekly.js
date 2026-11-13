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
/* أبيات الأسبوع لكل طفل من محطاته المفتوحة فقط: ما رآه أولاً، ثم أبيات محطته الحالية بالترتيب.
   تُثبَّت أول الأسبوع فلا تتغير إذا فُتحت محطة جديدة في منتصفه. الإخوة في المرحلة نفسها يأخذون الأبيات نفسها. */
function weeklyPool(s) {
  const seen = [], rest = [];
  content.journeyData.forEach((st, i) => {
    const status = ((s && s.stationStatus) || {})[st.id] || (i === 0 ? "current" : "locked");
    if (status === "locked") return;
    st.verses.forEach(v => ((s && s.seenVerses && s.seenVerses[v.id]) ? seen : rest).push(v.id));
  });
  return { seen, rest };
}
function weeklyPick(key, list, n) {
  let h = 0; for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const pool = list.slice(), picks = [];
  while (picks.length < n && pool.length) {
    h = (h * 1103515245 + 12345) >>> 0;
    picks.push(pool.splice(h % pool.length, 1)[0]);
  }
  return picks;
}
/* v105: التحدّي مراجعة لما حُفظ قبل الأسبوع، فلا يبدأ حتى يكون الطفل قد رأى خمسة أبيات.
   (كان في أول أسبوع للطفل يُثبَّت على بيت واحد، فيُمنح وسام «بطل الأسبوع» بعد أول بيت) */
const WEEKLY_MIN_SEEN = 5;
function weeklyFix(key, s) {
  const { seen } = weeklyPool(s);
  if (seen.length < WEEKLY_MIN_SEEN) return { ids: [], off: true };
  return { ids: weeklyPick(key, seen, WEEKLY_MIN_SEEN), off: false };
}
function weeklyVerseIds(key, s) {
  s = s || state;
  const w = s && s.weekly;
  if (w && w.week === key && Array.isArray(w.ids) && (w.off || w.ids.length >= WEEKLY_MIN_SEEN)) return w.ids;
  return weeklyFix(key, s).ids;
}
function ensureWeekly(s) {
  const k = weekKey();
  if (!s.weekly || s.weekly.week !== k) s.weekly = {week: k, done: {}};
  const w = s.weekly;
  if (!Array.isArray(w.ids) || (!w.off && w.ids.length < WEEKLY_MIN_SEEN)) {
    const f = weeklyFix(k, Object.assign({}, s, { weekly: null }));
    w.ids = f.ids; w.off = f.off;
  }
  return w;
}
function markWeekly(vid) {
  if (!state) return;
  const w = ensureWeekly(state);
  const ids = weeklyVerseIds(w.week);
  if (!ids.length || !ids.includes(vid) || w.done[vid]) return;
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
    <p style="color:#666;font-size:.9rem">${ids.length
      ? gForm("راجِع هذه الأبيات هذا الأسبوع حتى تُرتّبها بلا خطأ ولا تلميح. اضغط البيت للتدرّب عليه.", "راجِعي هذه الأبيات هذا الأسبوع حتى تُرتّبيها بلا خطأ ولا تلميح. اضغطي البيت للتدرّب عليه.")
      : gForm("يبدأ تحدّيك الأسبوع القادم، بعد أن تحفظ خمسة أبيات على الأقل.", "يبدأ تحدّيكِ الأسبوع القادم، بعد أن تحفظي خمسة أبيات على الأقل.")}</p>
    <div style="font-weight:bold;margin-bottom:8px">التقدّم: ${Object.keys(w.done).filter(k => ids.includes(k)).length} / ${ids.length}</div>
    ${rows}
    <div id="weeklyBoard">${familyRows(key)}</div>`);
}
function startFocusFromWeekly(si, vi) { closePopup("hubPopup"); startFocus(si, vi); }
/* هدف الأسرة المشترك: مجموع ما أنجزه الأطفال معاً، بلا ترتيب ولا مقارنة بين الإخوة */
function familyRows(key) {
  if (!users.length) return `<p class="empty-state">لا يوجد أطفال بعد.</p>`;
  let done = 0, target = 0;
  const chips = users.map(u => {
    const s = u.state || {};
    const w = s.weekly && s.weekly.week === key ? s.weekly : null;
    const ids = weeklyVerseIds(key, s);
    const n = w ? ids.filter(id => w.done && w.done[id]).length : 0;
    done += n; target += ids.length;
    return `<span class="family-chip">${avatarHTML(u, "board-photo")}${escapeHtml(u.name)}${n ? " " + "⭐".repeat(n) : ""}</span>`;
  });
  const pct = target ? Math.round(done / target * 100) : 0;
  return `<div class="family-goal">
    <div class="family-goal-head">🤝 هدف الأسرة معاً: <strong>${done} / ${target}</strong></div>
    <div class="family-goal-bar"><div style="width:${pct}%"></div></div>
    ${target && done >= target ? `<div class="family-goal-done">🎉 أنجزت الأسرة هدف هذا الأسبوع!</div>` : ""}
    <div class="family-chips">${chips.join("")}</div>
  </div>`;
}
function renderFamilyBoard() {
  const el = document.getElementById("familyBoard");
  if (el) el.innerHTML = familyRows(weekKey());
}
