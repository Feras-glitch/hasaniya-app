/* صناديق لايتنر: كل بيت في صندوق من 1 إلى 7؛ الصحيح يصعد والخطأ يعود للصندوق الأول.
   v105: الصندوقان 6 و7 (كل 32 و64 يوماً) لا يدخلهما البيت إلا بتسميع الوالد غيباً («سمّعه الآن» بلا فتح)،
   فتقلّ مراجعة الصيانة من نحو 10 يومياً إلى نحو 3، ويبقى ما في الصندوق 5 يُراجَع كل 16 يوماً حتى يسمّعه الوالد. */
const LEITNER_DAYS = [0, 1, 2, 4, 8, 16, 32, 64];
const LEITNER_NAMES = ["", "كل يوم", "كل يومين", "كل 4 أيام", "كل 8 أيام", "كل 16 يوماً", "كل 32 يوماً", "كل 64 يوماً"];
const LEITNER_SOLO_MAX = 5, LEITNER_MAX = 7;

/* v94: لا يدخل الصناديق إلا بيت رآه الطفل في درسه، ولا يصعد البيت صندوقاً إلا مرة في اليوم.
   v104 (من توصيات فحص v102 المعتمدة):
   - البيت الجديد يبدأ في الصندوق الأول، ومراجعته غداً (أهم مراجعة)، لا بعد يومين.
   - لا يصعد البيت إلا إذا حان موعد مراجعته: المراجعة المبكرة لا تعني أنه ثبت.
   - الصحيح بعد خطأ في اليوم نفسه لا يرفعه.
   - تسميع الوالد (سمّعه الآن) دليل قوي: يرفعه ولو لم يحن موعده.
   - المواعيد من أول اليوم، فلا يفوت البيت لأن الطفل تعلّمه مساءً وراجعه عصراً. */
function leitnerDayStart(t) { const d = new Date(t || Date.now()); d.setHours(0, 0, 0, 0); return d.getTime(); }
function leitnerDueAfter(days) { return leitnerDayStart() + days * 86400000; }
function leitnerRecord(vid, ok, opts) {
  opts = opts || {};
  if (!state) return;
  if (!state.seenVerses || !state.seenVerses[vid]) return;
  // تسميع الوالد دليل حقيقي فيُحسب ولو كان وضع التصفّح مفعّلاً
  if (!opts.parent && typeof noCredit === "function" && noCredit()) return;
  state.leitner = state.leitner || {};
  const now = Date.now();
  const cur = state.leitner[vid];
  if (!cur) { state.leitner[vid] = { box: 1, due: leitnerDueAfter(1), lastWrong: ok ? 0 : now }; return; }
  if (!ok) { cur.box = 1; cur.due = leitnerDueAfter(1); cur.lastWrong = now; return; }
  if ((cur.lastWrong || 0) >= leitnerDayStart()) return;           // أخطأ فيه اليوم
  if (!opts.parent && (cur.due || 0) > now) return;                // لم يحن موعده
  const b = Math.min(LEITNER_MAX, Math.max(1, cur.box || 1));
  // ما بعد الصندوق 5 لا يصعده إلا تسميع الوالد؛ والمراجعة الصحيحة دونه تُبقيه في موعده المعتاد.
  // (قبل حساب «مرة في اليوم»: مراجعة الطفل الصباحية لا تستهلك فرصة تسميع الوالد مساءً)
  if (b >= LEITNER_SOLO_MAX && !opts.parent) { cur.box = b; cur.due = leitnerDueAfter(LEITNER_DAYS[b]); return; }
  if (typeof firstCreditToday === "function" && !firstCreditToday("box|" + vid)) return;
  cur.box = Math.min(LEITNER_MAX, b + 1);
  cur.due = leitnerDueAfter(LEITNER_DAYS[cur.box]);
}
/* بيت أُكمل بتلميح أو بعد خطأ يدخل الصندوق الأول إن لم يكن فيه، فلا يفوته جدول المراجعة */
function leitnerEnsure(vid) {
  if (!state || !state.seenVerses || !state.seenVerses[vid]) return;
  if (typeof noCredit === "function" && noCredit()) return;
  state.leitner = state.leitner || {};
  if (!state.leitner[vid]) state.leitner[vid] = { box: 1, due: leitnerDueAfter(1), lastWrong: 0 };
}
function leitnerCounts() {
  const c = [0, 0, 0, 0, 0, 0, 0, 0];
  Object.values(state.leitner || {}).forEach(e => { if (e.box >= 1 && e.box <= LEITNER_MAX) c[e.box]++; });
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
  const rows = [1, 2, 3, 4, 5, 6, 7].map(b => `
    <div class="leitner-box">
      <div class="lb-num">${b}</div>
      <div class="lb-info"><strong>${c[b]} بيت</strong><small>${LEITNER_NAMES[b]}</small></div>
    </div>`).join("");
  openHub("🗃️ صناديق الحفظ", `
    <p style="color:#666;font-size:.9rem">البيت يصعد صندوقاً إذا راجعته صحيحاً في موعده، والخطأ يعيده إلى الأول. وكلما صعد قلّ العون: في الصندوق 3 تُكمل كلمتين ناقصتين، ومن الرابع تُرتّب الكلمات من أول حروفها. والصندوقان 6 و7 لا يدخلهما البيت إلا إذا سمّعه الوالد غيباً.</p>
    ${rows}
    <button class="action-btn btn-success" style="width:100%;margin-top:12px" onclick="startLeitnerReview()" ${due ? "" : "disabled"}>
      🎯 راجع المستحق الآن (${due})</button>`);
}
function startLeitnerReview() {
  const due = leitnerDueVerses().slice(0, 10);
  if (!due.length) { kidToast(kidLine("nothingDue"), "success"); return; }
  closePopup("hubPopup");
  playQueue = due.map(d => ({stationIndex: d.stationIndex, verseIndex: d.verseIndex}));
  playMode = MODE_REVIEW; playIndex = 0;
  sessionStats = {correct: 0, wrong: 0, total: playQueue.length};
  enterPlayScreen("🗃️ صناديق الحفظ");
}
