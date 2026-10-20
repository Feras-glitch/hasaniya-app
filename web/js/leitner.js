/* صناديق لايتنر: كل بيت في صندوق من 1 إلى 5؛ الصحيح يصعد والخطأ يعود للصندوق الأول */
const LEITNER_DAYS = [0, 1, 2, 4, 8, 16];
const LEITNER_NAMES = ["", "كل يوم", "كل يومين", "كل 4 أيام", "كل 8 أيام", "كل 16 يوماً"];

/* v94: لا يدخل الصناديق إلا بيت رآه الطفل في درسه، ولا يصعد البيت صندوقاً إلا مرة في اليوم
   (التكرار السريع في الجلسة نفسها لا يعني الحفظ، ويُفسد التباعد). النزول عند الخطأ يبقى فورياً. */
function leitnerRecord(vid, ok) {
  if (!state) return;
  if (!state.seenVerses || !state.seenVerses[vid]) return;
  if (typeof noCredit === "function" && noCredit()) return;
  state.leitner = state.leitner || {};
  const cur = state.leitner[vid] || {box: 1, due: 0};
  if (ok) {
    if (typeof firstCreditToday === "function" && !firstCreditToday("box|" + vid)) { state.leitner[vid] = cur; return; }
    cur.box = Math.min(5, cur.box + 1);
  } else cur.box = 1;
  cur.due = Date.now() + LEITNER_DAYS[cur.box] * 86400000;
  state.leitner[vid] = cur;
}
function leitnerCounts() {
  const c = [0, 0, 0, 0, 0, 0];
  Object.values(state.leitner || {}).forEach(e => { if (e.box >= 1 && e.box <= 5) c[e.box]++; });
  return c;
}
function leitnerDueVerses() {
  const now = Date.now(), out = [];
  content.journeyData.forEach((st, si) => st.verses.forEach((v, vi) => {
    const e = (state.leitner || {})[v.id];
    if (e && e.due <= now) out.push({stationIndex: si, verseIndex: vi, due: e.due});
  }));
  return out.sort((a, b) => a.due - b.due);
}
function showLeitnerBoxes() {
  const c = leitnerCounts(), due = leitnerDueVerses().length;
  const rows = [1, 2, 3, 4, 5].map(b => `
    <div class="leitner-box">
      <div class="lb-num">${b}</div>
      <div class="lb-info"><strong>${c[b]} بيت</strong><small>${LEITNER_NAMES[b]}</small></div>
    </div>`).join("");
  openHub("🗃️ صناديق الحفظ", `
    <p style="color:#666;font-size:.9rem">الصحيح يصعد للصندوق الأعلى، والخطأ يعود للأول.</p>
    ${rows}
    <button class="action-btn btn-success" style="width:100%;margin-top:12px" onclick="startLeitnerReview()" ${due ? "" : "disabled"}>
      🎯 راجع المستحق الآن (${due})</button>`);
}
function startLeitnerReview() {
  const due = leitnerDueVerses().slice(0, 8);
  if (!due.length) { kidToast(kidLine("nothingDue"), "success"); return; }
  closePopup("hubPopup");
  playQueue = due.map(d => ({stationIndex: d.stationIndex, verseIndex: d.verseIndex}));
  playMode = MODE_REVIEW; playIndex = 0;
  sessionStats = {correct: 0, wrong: 0, total: playQueue.length};
  enterPlayScreen("🗃️ صناديق الحفظ");
}
