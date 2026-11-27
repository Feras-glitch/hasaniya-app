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
/* بطاقة في منطقة الوالدين: خطة اليوم وزر التسميع.
   v114: خطة اليوم من todayPlan() نفسها التي في رئيسة الطفل (كانت تقول «درس جديد» والطفل أنهى درسه)،
   وتسجيلات الطفل التي تنتظر حكمك */
function renderParentCheckCard() {
  const box = document.getElementById("parentCheckCard"); if (!box) return;
  const started = Object.keys(state.seenVerses || {}).length > 0;
  const tp = typeof todayPlan === "function" ? todayPlan() : { parts: [] };
  const name = escapeHtml(getUserName());
  const todayLine = !started ? "لم يبدأ بعد"
    : tp.parts.length ? gForm("بقي له: ", "بقي لها: ") + escapeHtml(tp.parts.join("، ثم "))
    : tp.block === "waitJudge" ? gForm("ينتظر أن تسمع تسجيلاته (أدناه) قبل الجديد", "تنتظر أن تسمع تسجيلاتها (أدناه) قبل الجديد")
    : `${name} ${gForm("أنهى", "أنهت")} درس اليوم`;
  const pend = (state.tasmeePending || []);
  const label = { wird: "📿 وِرد", sabq: "🎙️ تسميع الدرس", segment: "🏁 تسميع المحطة" };
  box.innerHTML = `<div class="pc-card">
    <div><strong>📅 اليوم:</strong> ${todayLine}</div>
    <div class="rec-count">${escapeHtml(pcTomorrowText())}</div>
    ${pcReadyList().length ? `<div class="rec-count">🌟 ${arCount(pcReadyList().length, "بيت واحد جاهز", "بيتان جاهزان", "أبيات جاهزة", "بيتاً جاهزاً")} لتسميعك: «بلا فتح» ينقله إلى المراجعة البعيدة.</div>` : ""}
    <div class="rec-count">${escapeHtml(pcLastText())}. التسميع منك هو الدليل الأصدق على الحفظ.</div>
    ${pend.map(p => `<button class="action-btn btn-warn" style="width:100%;margin-top:6px" onclick="tsPendingJudge('${escapeForAttr(p.id)}')">🎧 ${label[p.kind] || "تسميع"} «${escapeHtml(p.title)}» المسجّل ينتظر حكمك</button>`).join("")}
    ${segmentPendingList().map(x => `<button class="action-btn btn-warn" style="width:100%;margin-top:6px" onclick="segmentListenThenJudge(${x.si})">🎧 تسميع «${escapeHtml(x.st.title)}» المسجّل ينتظر حكمك</button>`).join("")}
    ${segmentBlocking() >= 0 ? `<button class="action-btn btn-info" style="width:100%;margin-top:6px" onclick="pcStartSegment(${segmentBlocking()})">🏁 سمّع له «${escapeHtml(content.journeyData[segmentBlocking()].title)}» كاملة (تُفتح بعدها المحطة التالية)</button>` : ""}
    <button class="action-btn btn-success" style="width:100%;margin-top:6px" onclick="pcStart()" ${started ? "" : "disabled"}>🎙️ سمّعه الآن (خمسة أبيات)</button>
  </div>`;
}
function pcStart() {
  const list = pcCandidates();
  if (!list.length) { showToast("لم يبدأ الطفل الحفظ بعد", "error"); return; }
  pcStartList(list, { kind: "free" });
}
/* v114: جلسة سماع عامة: حرة (سمّعه الآن)، أو محطة (segment)، أو وِرد، أو سبق، أو تسجيل ينتظر الحكم.
   opts: { kind, title, segment, opened, onDone(res) } */
function pcStartList(list, opts) {
  opts = opts || {};
  if (!list || !list.length) return;
  pcState = { list, i: 0, res: { ok: 0, fath: 0, fail: 0 }, kind: opts.kind || "free", segment: opts.segment || null,
    title: opts.title || "", opened: opts.opened || 0, onDone: opts.onDone || null, recKey: opts.recKey || null };
  pcRender();
}
function pcRender() {
  const { list, i } = pcState;
  if (i >= list.length) return pcDone();
  const { v } = list[i];
  const first = (v.words && v.words[0]) || "";
  openHub("🎙️ سمّعه الآن", `
    ${pcState.kind !== "free" ? `<p class="rec-count">${pcState.kind === "segment" ? "🏁" : pcState.kind === "wird" ? "📿" : "🎙️"} تسميع «${escapeHtml(pcState.title)}» متصلاً: البيت ${i + 1} من ${list.length}. ${gForm("يقرأ الأبيات واحداً بعد واحد دون أن ينظر", "تقرأ الأبيات واحداً بعد واحد دون أن تنظر")}، واحكم على كل بيت.${pcState.opened ? ` (كشف في تسجيله ${pcState.opened} من الأشطر)` : ""}</p>`
      : `<p class="rec-count">البيت ${i + 1} من ${list.length}. اطلب من ${escapeHtml(getUserName())} أن ${gForm("يقول البيت من حفظه دون أن ينظر", "تقول البيت من حفظها دون أن تنظر")} إلى الشاشة.</p>`}
    <div class="pc-cue">للتذكير إن احتجت: الحدث «${escapeHtml(v.event || "")}»، وأوله «${escapeHtml(first)}»</div>
    <div class="pc-verse" id="pcVerse" hidden>${escapeHtml(v.fullVerse)}${v.n ? ` <small style="color:#888">(البيت ${v.n} في الكتاب)</small>` : ""}</div>
    <button class="tool-btn" style="width:100%;margin:6px 0" onclick="document.getElementById('pcVerse').hidden=false;this.remove()">👁️ أظهر البيت لي</button>
    ${pcState.recKey ? `<button class="tool-btn" style="width:100%;margin:0 0 6px" onclick="pcReplay()">🔁 أعد سماع التسجيل</button>` : ""}
    <div class="pc-btns">
      <button class="action-btn btn-success" onclick="pcRate('ok')">✅ بلا فتح</button>
      <button class="action-btn btn-warn" onclick="pcRate('fath')">⚠️ فتح واحد</button>
      <button class="action-btn btn-danger" onclick="pcRate('fail')">❌ فتحان فأكثر</button>
    </div>
    ${list.length - i > 1 ? `<button class="tool-btn" style="width:100%;margin-top:6px" onclick="pcRateRest()">✅ الباقي كلّه بلا فتح (${list.length - i})</button>` : ""}
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
  pcApply(vid, r, now);
  // v114: النقاط على التسميع الحقيقي، لا على الضغط
  if (r !== "fail" && firstCreditToday("heard|" + vid)) addPoints(r === "ok" ? 5 : 2);
  pcState.res[r]++;
  pcState.i++;
  saveState();
  pcRender();
}
/* حكم السامع على بيت: صندوقه، وإحصاؤه، وسجلّ تسميعاته بلا فتح (لـ«يحفظه غيباً») */
function pcApply(vid, r, now) {
  now = now || Date.now();
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
  const prev = state.parentChecks[vid];
  let oks = typeof pcOksOf === "function" ? pcOksOf(state, vid) : [];
  if (r === "ok") oks = oks.concat([now]).slice(-6);
  if (r === "fail") oks = [];
  state.parentChecks[vid] = { at: now, r, oks };
  if (prev && prev.r === r && prev.at === now) return;
}
/* v114: الحكم على تسجيل متصل: يُعاد سماعه متى شاء الوالد (كان يُسمع مرة واحدة ثم يُسأل عن سبعة أبيات) */
async function pcReplay() {
  if (!pcState || !pcState.recKey) return;
  try { const rec = await recGet(pcState.recKey); if (rec && rec.blob && audioBegin()) await playPart(seqToken, rec, ""); } catch (e) {}
}
function pcRateRest() {
  if (!pcState) return;
  if (!confirm(`كل الأبيات الباقية (${pcState.list.length - pcState.i}) قالها بلا فتح؟`)) return;
  while (pcState && pcState.i < pcState.list.length) {
    const { v } = pcState.list[pcState.i];
    pcApply(v.id, "ok");
    if (firstCreditToday("heard|" + v.id)) addPoints(5);
    pcState.res.ok++; pcState.i++;
  }
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
    <button class="action-btn btn-success" style="width:100%" onclick="pcFinish()">تم</button>`);
  pcFinishCb = pcState.onDone ? (() => { const cb = pcState && pcState.onDone; return res => cb && cb(res); })() : null;
  pcFinishRes = Object.assign({}, pcState.res);
  pcState = null;
  if (typeof refreshScreens === "function") refreshScreens();
}
let pcFinishCb = null, pcFinishRes = null;
function pcFinish() {
  closePopup("hubPopup");
  const cb = pcFinishCb, res = pcFinishRes; pcFinishCb = null; pcFinishRes = null;
  if (cb) cb(res);
  if (typeof refreshScreens === "function") refreshScreens();
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
  if (!segmentPassed(J[prev].id)) return prev;
  return -1;
}
/* v114: تسجيلان لمحطتين ينتظران حكم السامع: لا جديد حتى يسمع أقدمهما */
function segmentWaitingJudge() {
  const p = segmentPendingList();
  return p.length > 1 ? p[0].si : -1;
}
function showSegmentMilestone(si) {
  const st = content.journeyData[si]; if (!st) return;
  const c = (state.segmentChecks || {})[st.id];
  openHub("🏁 تسميع المحطة كاملة", `
    <p style="font-size:1.1rem;line-height:1.9"><strong>«${escapeHtml(st.title)}»</strong>: ${st.verses.length} ${st.verses.length > 10 ? "بيتاً" : "أبيات"}.</p>
    <p style="line-height:1.9">${escapeHtml(kidLine("segmentFirst"))}<br>${escapeHtml(kidLine("segmentHow"))}</p>
    ${c && c.r === "fail" ? `<p class="rec-count">آخر تسميع احتاج مراجعة؛ راجِعها ثم سمّعها مرة أخرى.</p>` : ""}
    <div class="hub-actions" style="flex-direction:column">
      <button class="action-btn btn-success big-choice" onclick="requirePin(() => pcStartSegment(${si}), 'تسميع المحطة على الوالد')"><span class="bc-ico">👨‍👩‍👧</span> ${escapeHtml(kidLine("listenerNow"))}</button>
      <button class="action-btn btn-info big-choice" onclick="closePopup('hubPopup'); segmentRecord(${si})"><span class="bc-ico">🎤</span> ${gForm("أسجّل تسميعي", "أسجّل تسميعي")}</button>
      <button class="tool-btn" onclick="playStationListen(${si})">🎧 ${gForm("اسمعها كاملة أولاً", "اسمعيها كاملة أولاً")}</button>
    </div>`);
  if (typeof autoSayNow === "function") autoSayNow([kidLine("segmentFirst"), kidLine("segmentHow")]);
}
/* v114: شاشة تسجيل بسيطة (زر كبير وعدّاد وقت) بدل «تسجيلاتي»، وأقل مدة ثلاث ثوانٍ لكل بيت */
function segmentRecord(si) {
  const st = content.journeyData[si]; if (!st || typeof tsRecordOpen !== "function") return;
  tsRecordOpen({ kind: "segment", ids: st.verses.map(v => v.id), title: st.title, storeKey: sectionKey("station-" + si),
    onSaved: info => segmentRecorded(si, info) });
}
/* بعد أن يحفظ الطفل تسميع المحطة كاملة: يُفتح ما بعدها، ويبقى «ينتظر حكم الوالد» */
function segmentRecorded(si, info) {
  const st = content.journeyData[si]; if (!st) return;
  if (!st.verses.every(v => state.seenVerses && state.seenVerses[v.id])) return;
  state.segmentChecks = state.segmentChecks || {};
  const c = state.segmentChecks[st.id];
  if (c && (c.r === "ok" || c.r === "fath")) return;
  // v114: كشف أكثر من نصف الأشطر في التسجيل لا يفتح المحطة التالية (حُفظ ليسمعه الوالد)
  const halves = st.verses.length * 2;
  if (info && info.opened > halves / 2) { kidToast(kidLine("segmentTooOpen"), "error"); return; }
  state.segmentChecks[st.id] = { r: "pending", at: Date.now(), opened: (info && info.opened) || 0 };
  saveState();
  // لا تُفتح محطة ثانية وفي الانتظار محطة لم يحكم عليها السامع
  kidToast(kidLine(segmentPendingList().length > 1 ? "segmentWaitJudge" : "segmentSaved"), "success");
  if (typeof refreshScreens === "function") refreshScreens();
}
/* الوالد يسمع المحطة متصلة ويحكم على كل بيت (يُحدّث صندوقه أيضاً كـ«سمّعه الآن») */
function pcStartSegment(si) {
  const st = content.journeyData[si]; if (!st) return;
  const list = st.verses.map((v, vi) => ({ si, vi, v }));
  pcStartList(list, { kind: "segment", segment: st.id, title: st.title });
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
  pcStartList(content.journeyData[si].verses.map((v, vi) => ({ si, vi, v })), { kind: "segment", segment: content.journeyData[si].id, title: content.journeyData[si].title, recKey: sectionKey("station-" + si) });
}

