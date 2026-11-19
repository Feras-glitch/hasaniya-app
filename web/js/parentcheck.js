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
    ${segmentPendingList().map(x => `<button class="action-btn btn-warn" style="width:100%;margin-top:6px" onclick="segmentListenThenJudge(${x.si})">🎧 تسميع «${escapeHtml(x.st.title)}» المسجّل ينتظر حكمك</button>`).join("")}
    ${segmentBlocking() >= 0 ? `<button class="action-btn btn-info" style="width:100%;margin-top:6px" onclick="pcStartSegment(${segmentBlocking()})">🏁 سمّع له «${escapeHtml(content.journeyData[segmentBlocking()].title)}» كاملة (تُفتح بعدها المحطة التالية)</button>` : ""}
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
    ${pcState.segment ? `<p class="rec-count">🏁 تسميع «${escapeHtml(pcState.title)}» متصلاً: البيت ${i + 1} من ${list.length}. ${gForm("يقرأ الأبيات واحداً بعد واحد دون أن ينظر", "تقرأ الأبيات واحداً بعد واحد دون أن تنظر")}، واحكم على كل بيت.</p>`
      : `<p class="rec-count">البيت ${i + 1} من ${list.length}. اطلب من ${escapeHtml(getUserName())} أن ${gForm("يقول البيت من حفظه دون أن ينظر", "تقول البيت من حفظها دون أن تنظر")} إلى الشاشة.</p>`}
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
  if (pcState.segment) {
    state.segmentChecks = state.segmentChecks || {};
    state.segmentChecks[pcState.segment] = { r: fail ? "fail" : fath ? "fath" : "ok", at: Date.now() };
    saveState();
  }
  openHub("🎙️ انتهى التسميع", `
    <div class="pc-sum">✅ ${ok} · ⚠️ ${fath} · ❌ ${fail}</div>
    <p class="rec-count">${fail ? "ما احتاج فتحين فأكثر عاد إلى المراجعة اليومية؛ راجِعاه معاً غداً." : fath ? "ما احتاج فتحاً واحداً يبقى على موعده؛ كرّراه معاً مرة اليوم." : "ممتاز، ما سمّعه ثابت."}</p>
    ${pcState.segment ? `<p class="rec-count">${fail ? "🏁 المحطة تحتاج تسميعاً آخر قبل المحطة التالية." : "🏁 سُمّعت المحطة كاملة؛ تُفتح المحطة التالية."}</p>` : ""}
    <button class="action-btn btn-success" style="width:100%" onclick="closePopup('hubPopup')">تم</button>`);
  pcState = null;
  renderParentCheckCard();
}

/* ============================================================
   v111: تسميع المقطع — المقطع هو المحطة كاملة (مسجّلة متصلة في «المحطات متصلة»)
   - لا تبدأ المحطة التالية حتى تُسمَّع التي قبلها كاملة غيباً:
     يسمعها الوالد ويحكم بيتاً بيتاً بطريقة الفتح، أو يسجّل الطفل تسميعه فيُفتح ما بعدها حتى يحكم الوالد.
   - النتيجة في state.segmentChecks[المحطة] = { r: ok | fath | fail | pending, at }
   ============================================================ */
function segmentPassed(stId) {
  const c = (state.segmentChecks || {})[stId];
  return !!c && (c.r === "ok" || c.r === "fath" || c.r === "pending");
}
/* رقم المحطة المكتملة التي تمنع الجديد حتى تُسمَّع، أو ‎-1 */
function segmentBlocking() {
  const J = content.journeyData;
  const idx = J.findIndex(s => getStationStatus(s) !== "completed");
  const prev = idx > 0 ? idx - 1 : -1;
  if (prev < 0) return -1;
  // يُطلب للمحطة التي أتمّها الطفل في دروسه (segmentDue)، لا لما فُتح من نسخة احتياطية أو بوضع التصفح
  if (!(state.segmentDue || {})[J[prev].id]) return -1;
  return segmentPassed(J[prev].id) ? -1 : prev;
}
function showSegmentMilestone(si) {
  const st = content.journeyData[si]; if (!st) return;
  const c = (state.segmentChecks || {})[st.id];
  openHub("🏁 تسميع المحطة كاملة", `
    <p style="font-size:1.1rem;line-height:1.9"><strong>«${escapeHtml(st.title)}»</strong>: ${st.verses.length} ${st.verses.length > 10 ? "بيتاً" : "أبيات"}.</p>
    <p style="line-height:1.9">${escapeHtml(kidLine("segmentFirst"))}<br>${escapeHtml(kidLine("segmentHow"))}</p>
    ${c && c.r === "fail" ? `<p class="rec-count">آخر تسميع احتاج مراجعة؛ راجِعها ثم سمّعها مرة أخرى.</p>` : ""}
    <div class="hub-actions" style="flex-direction:column">
      <button class="action-btn btn-info" onclick="playStationListen(${si})">🎧 اسمعها كاملة</button>
      <button class="action-btn btn-success" onclick="requirePin(() => pcStartSegment(${si}), 'تسميع المحطة على الوالد')">👨‍👩‍👧 ${gForm("يسمعني والدي الآن", "يسمعني والدي الآن")}</button>
      <button class="action-btn btn-warn" onclick="closePopup('hubPopup'); segmentRecord(${si})">🎤 ${gForm("سجّل تسميعك", "سجّلي تسميعك")}</button>
    </div>`);
  if (typeof autoSayNow === "function") autoSayNow([kidLine("segmentFirst"), kidLine("segmentHow")]);
}
function segmentRecord(si) {
  if (typeof openRecPopup !== "function") return;
  openRecPopup({ mode: "child", range: "station-" + si });
}
/* بعد أن يحفظ الطفل تسميع المحطة كاملة: يُفتح ما بعدها، ويبقى «ينتظر حكم الوالد» */
function segmentRecorded(si) {
  const st = content.journeyData[si]; if (!st) return;
  if (!st.verses.every(v => state.seenVerses && state.seenVerses[v.id])) return;
  state.segmentChecks = state.segmentChecks || {};
  const c = state.segmentChecks[st.id];
  if (c && (c.r === "ok" || c.r === "fath")) return;
  state.segmentChecks[st.id] = { r: "pending", at: Date.now() };
  saveState();
  kidToast(kidLine("segmentSaved"), "success");
}
/* الوالد يسمع المحطة متصلة ويحكم على كل بيت (يُحدّث صندوقه أيضاً كـ«سمّعه الآن») */
function pcStartSegment(si) {
  const st = content.journeyData[si]; if (!st) return;
  const list = st.verses.map((v, vi) => ({ si, vi, v }));
  pcState = { list, i: 0, res: { ok: 0, fath: 0, fail: 0 }, segment: st.id, title: st.title };
  pcRender();
}
function segmentPendingList() {
  return content.journeyData.map((st, si) => ({ st, si, c: (state.segmentChecks || {})[st.id] })).filter(x => x.c && x.c.r === "pending");
}
async function segmentListenThenJudge(si) {
  try {
    const rec = await recGet(sectionKey("station-" + si));
    if (rec && rec.blob && typeof audioBegin === "function" && audioBegin()) {
      const token = seqToken;
      showToast("🎧 يُشغَّل تسميع الطفل… احكم بعده", "success");
      await playPart(token, rec, "");
    }
  } catch (e) {}
  pcStartSegment(si);
}

