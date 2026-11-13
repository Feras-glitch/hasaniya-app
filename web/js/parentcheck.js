/* ============================================================
   v104: «سمّعه الآن» — تسميع الوالد (من توصيات فحص v102 المعتمدة)
   الطفل يقول البيت من حفظه دون أن يرى الشاشة، والوالد يحكم بطريقة «الفتح» في الكتاتيب:
   ✅ بلا فتح ← دليل حفظ حقيقي: يُحسب صحيحاً ويرفع صندوق البيت ولو لم يحن موعده.
   ⚠️ فتح واحد ← لا يرفع ولا يُنزل؛ يبقى في موعده.
   ❌ فتحان فأكثر ← يُحسب خطأً ويعود البيت إلى الصندوق الأول.
   ============================================================ */
let pcState = null;

/* الأبيات المقترحة: ما حان موعده أولاً، ثم آخر ما تعلّمه الطفل (حتى خمسة) */
function pcCandidates() {
  const out = [], seen = new Set();
  const add = (si, vi) => {
    const v = content.journeyData[si] && content.journeyData[si].verses[vi];
    if (v && !seen.has(v.id) && state.seenVerses && state.seenVerses[v.id]) { seen.add(v.id); out.push({ si, vi, v }); }
  };
  (typeof leitnerDueVerses === "function" ? leitnerDueVerses() : []).forEach(d => add(d.stationIndex, d.verseIndex));
  // v105: ما بلغ الصندوق الخامس جاهز لتسميعك: «بلا فتح» ينقله إلى المراجعة البعيدة (كل 32 ثم 64 يوماً)
  pcReadyList().forEach(([si, vi]) => add(si, vi));
  const learned = [];
  content.journeyData.forEach((st, si) => st.verses.forEach((v, vi) => { if (state.seenVerses && state.seenVerses[v.id]) learned.push([si, vi]); }));
  learned.slice(-5).reverse().forEach(([si, vi]) => add(si, vi));
  return out.slice(0, 5);
}
function pcLastText() {
  const all = Object.values(state.parentChecks || {}).map(x => +x.at || 0);
  if (!all.length) return gForm("لم تسمّع له بعد", "لم تسمّع لها بعد");
  const days = Math.floor((Date.now() - Math.max(...all)) / 86400000);
  return days <= 0 ? "آخر تسميع منك: اليوم" : days === 1 ? "آخر تسميع منك: أمس" : `آخر تسميع منك: قبل ${arCount(days, "يوم", "يومين", "أيام", "يوماً")}`;
}
function pcReadyList() {
  const out = [];
  content.journeyData.forEach((st, si) => st.verses.forEach((v, vi) => {
    const e = (state.leitner || {})[v.id];
    if (e && e.box === LEITNER_SOLO_MAX) out.push([si, vi]);
  }));
  return out;
}
/* v106 (من الدفعة «و» المعتمدة): سطر «غداً» للوالد: كم بيتاً يُراجَع، وهل يأتي جديد */
function pcTomorrowText() {
  if (typeof leitnerDayStart !== "function") return "";
  const end = leitnerDayStart() + 2 * 86400000;   // نهاية الغد
  const due = Object.keys(state.leitner || {}).filter(id => (state.leitner[id].due || 0) < end && (state.seenVerses || {})[id]).length;
  const cap = typeof newPerDayOf === "function" ? newPerDayOf() : 3;
  const allDone = content.journeyData.every(s => getStationStatus(s) === "completed");
  const fresh = allDone ? "" : due > (typeof OVERDUE_NO_NEW !== "undefined" ? OVERDUE_NO_NEW : 15) ? " — مراجعة فقط، بلا جديد" : ` — ثم ${arCount(cap, "بيت جديد", "بيتان جديدان", "أبيات جديدة", "بيتاً جديداً")}`;
  return due ? `🗓️ غداً: مراجعة ${arCount(due, "بيت واحد", "بيتين", "أبيات", "بيتاً")}${fresh}` : `🗓️ غداً: لا مراجعة مستحقة${fresh}`;
}
/* بطاقة في منطقة الوالدين: خطة اليوم وزر التسميع */
function renderParentCheckCard() {
  const box = document.getElementById("parentCheckCard"); if (!box) return;
  const due = typeof leitnerDueVerses === "function" ? leitnerDueVerses().length : 0;
  const started = Object.keys(state.seenVerses || {}).length > 0;
  box.innerHTML = `<div class="pc-card">
    <div><strong>📅 اليوم:</strong> ${due ? `${arCount(due, "بيت واحد حان موعد مراجعته", "بيتان حان موعد مراجعتهما", "أبيات حان موعد مراجعتها", "بيتاً حان موعد مراجعتها")}، ثم درس جديد` : (started ? "لا مراجعة مستحقة؛ درس جديد" : "لم يبدأ الحفظ بعد")}</div>
    <div class="rec-count">${escapeHtml(pcTomorrowText())}</div>
    ${pcReadyList().length ? `<div class="rec-count">🌟 ${arCount(pcReadyList().length, "بيت واحد جاهز", "بيتان جاهزان", "أبيات جاهزة", "بيتاً جاهزاً")} لتسميعك: «بلا فتح» ينقله إلى المراجعة البعيدة.</div>` : ""}
    <div class="rec-count">${escapeHtml(pcLastText())}. التسميع منك هو الدليل الأصدق على الحفظ.</div>
    <button class="action-btn btn-success" style="width:100%;margin-top:6px" onclick="pcStart()" ${started ? "" : "disabled"}>🎙️ سمّعه الآن</button>
  </div>`;
}
function pcStart() {
  const list = pcCandidates();
  if (!list.length) { showToast("لم يبدأ الطفل الحفظ بعد", "error"); return; }
  pcState = { list, i: 0, res: { ok: 0, fath: 0, fail: 0 } };
  pcRender();
}
function pcRender() {
  const { list, i } = pcState;
  if (i >= list.length) return pcDone();
  const { v } = list[i];
  const first = (v.words && v.words[0]) || "";
  openHub("🎙️ سمّعه الآن", `
    <p class="rec-count">البيت ${i + 1} من ${list.length}. اطلب من ${escapeHtml(getUserName())} أن ${gForm("يقول البيت من حفظه دون أن ينظر", "تقول البيت من حفظها دون أن تنظر")} إلى الشاشة.</p>
    <div class="pc-cue">للتذكير إن احتجت: الحدث «${escapeHtml(v.event || "")}»، وأوله «${escapeHtml(first)}»</div>
    <div class="pc-verse" id="pcVerse" hidden>${escapeHtml(v.fullVerse)}${v.n ? ` <small style="color:#888">(البيت ${v.n} في الكتاب)</small>` : ""}</div>
    <button class="tool-btn" style="width:100%;margin:6px 0" onclick="document.getElementById('pcVerse').hidden=false;this.remove()">👁️ أظهر البيت لي</button>
    <div class="pc-btns">
      <button class="action-btn btn-success" onclick="pcRate('ok')">✅ بلا فتح</button>
      <button class="action-btn btn-warn" onclick="pcRate('fath')">⚠️ فتح واحد</button>
      <button class="action-btn btn-danger" onclick="pcRate('fail')">❌ فتحان فأكثر</button>
    </div>
    <p class="rec-count">الفتح: أن ${gForm("تذكّره بكلمة نسيها", "تذكّرها بكلمة نسيتها")}.</p>`);
  // ضغطتان سريعتان لا تحكمان على البيت التالي قبل أن يُسمع: الأزرار تُفعَّل بعد لحظة
  const bs = [...document.querySelectorAll(".pc-btns button")];
  bs.forEach(b => { b.disabled = true; });
  setTimeout(() => bs.forEach(b => { b.disabled = false; }), 450);
}
function pcRate(r) {
  if (!pcState || !pcState.list[pcState.i]) return;
  const { v } = pcState.list[pcState.i];
  const vid = v.id, now = Date.now();
  state.verseStats = state.verseStats || {};
  const s = state.verseStats[vid] || (state.verseStats[vid] = { correct: 0, wrong: 0, lastCorrect: 0, lastWrong: 0 });
  if (r === "ok") {
    if (typeof leitnerRecord === "function") leitnerRecord(vid, true, { parent: true });
    if (firstCreditToday("mastery|" + vid)) { s.correct++; s.lastCorrect = now; }
  } else if (r === "fail") {
    if (typeof leitnerRecord === "function") leitnerRecord(vid, false);
    s.wrong++; s.lastWrong = now;
  }
  state.parentChecks = state.parentChecks || {};
  state.parentChecks[vid] = { at: now, r };
  pcState.res[r]++;
  pcState.i++;
  saveState();
  pcRender();
}
function pcDone() {
  const { ok, fath, fail } = pcState.res;
  openHub("🎙️ انتهى التسميع", `
    <div class="pc-sum">✅ ${ok} · ⚠️ ${fath} · ❌ ${fail}</div>
    <p class="rec-count">${fail ? "ما احتاج فتحين فأكثر عاد إلى المراجعة اليومية؛ راجِعاه معاً غداً." : fath ? "ما احتاج فتحاً واحداً يبقى على موعده؛ كرّراه معاً مرة اليوم." : "ممتاز، ما سمّعه ثابت."}</p>
    <button class="action-btn btn-success" style="width:100%" onclick="closePopup('hubPopup')">تم</button>`);
  pcState = null;
  renderParentCheckCard();
}
