/* اختبار فهم قصير بعد كل محطة + التوقيت الزمني + المراجعة اليومية */
let quizState = null;

/* v111: أسئلة أصعب للكبير، تُولَّد من نص المنظومة نفسه فلا تحتاج مراجعة علمية جديدة:
   1) «ما البيت الذي يأتي بعد…؟»: الجواب صدر البيت التالي، والمشتّتات صدور أبيات من المحطة نفسها (قريبة جداً، فتختبر الحفظ والربط)
   2) «أيّ هذه الأحداث ذكره الناظم أولاً؟»: ثلاثة أحداث من المحطة، والجواب أسبقها في ترتيب الناظم */
function hardQuizItems(station) {
  const vs = station.verses || [];
  if (vs.length < 4) return [];
  const out = [];
  const head = v => { const w = v.words || []; const h = v.half > 0 && v.half < w.length ? v.half : Math.ceil(w.length / 2); return w.slice(0, h).join(" "); };
  const k = Math.floor(Math.random() * (vs.length - 1));
  const correct = head(vs[k + 1]);
  const pool = [...new Set(vs.filter((v, j) => j !== k + 1 && j !== k).map(head))].filter(x => x !== correct);
  if (pool.length >= 2) out.push({
    q: `ما الذي يأتي بعد: «${vs[k].fullVerse}»؟`, correct, wrong: pool.sort(() => Math.random() - .5).slice(0, 2),
    explain: `البيت التالي: ${vs[k + 1].fullVerse}`, hard: true });
  const seen = new Set(), evs = [];
  vs.forEach(v => { if (v.event && !seen.has(v.event)) { seen.add(v.event); evs.push(v.event); } });
  if (evs.length >= 3) {
    const pick = evs.map((e, i) => [e, i]).sort(() => Math.random() - .5).slice(0, 3).sort((a, b) => a[1] - b[1]);
    out.push({ q: "أيّ هذه الأحداث ذكره الناظم أولاً في هذه المحطة؟", correct: pick[0][0], wrong: [pick[1][0], pick[2][0]],
      explain: `الترتيب في المنظومة: ${pick.map(x => x[0]).join(" ← ")}`, hard: true });
  }
  return out;
}
function startStationQuiz(station, onDone) {
  let items = (typeof QUIZZES !== "undefined" && QUIZZES[station.id]) || [];
  if (!items.length) { onDone(); return; }
  if (!(typeof isSmallKid === "function" && isSmallKid())) items = items.concat(hardQuizItems(station));
  quizState = {station, items, i: 0, score: 0, answered: 0, onDone};
  const sk = document.getElementById("quizSkipBtn"); if (sk) sk.style.display = "none";
  renderQuizQuestion();
  document.getElementById("quizPopup").classList.add("active");
}
function renderQuizQuestion() {
  const {items, i} = quizState, it = items[i];
  const order = [it.correct, ...it.wrong].sort(() => Math.random() - .5);
  document.getElementById("quizBody").innerHTML = `
    <div style="color:#666;font-size:.85rem">سؤال ${i + 1} من ${items.length}</div>
    <h3 style="margin:10px 0">${sayBtnHTML([it.q, ...order], "استمع للسؤال")} ${escapeHtml(it.q)}</h3>
    ${it.hard ? `<div class="rec-count">⭐ سؤال للحفظ والترتيب</div>` : (typeof reviewInlineBtn === "function" ? reviewInlineBtn(`q:${quizState.station.id}:${i}`) : "")}
    <div class="word-bank">${optionsHTML(order, o => `answerQuiz(this,'${escapeForAttr(o)}')`)}</div>
    <p id="quizFeedback" style="min-height:24px;font-weight:bold"></p>`;
  /* v101: السؤال ثم كل خيار بتسجيله الخاص، بترتيب ظهوره على الشاشة */
  autoSayNow([it.q, ...order]);
}
function answerQuiz(btn, chosen) {
  const qs = quizState; if (!qs) return;
  const it = qs.items[qs.i];
  document.querySelectorAll("#quizBody .word-btn").forEach(b => b.disabled = true);
  qs.answered = (qs.answered || 0) + 1;
  if (qs.answered >= 2) { const sk = document.getElementById("quizSkipBtn"); if (sk) sk.style.display = ""; }
  const good = chosen === it.correct;
  btn.classList.add(good ? "success" : "fail");
  if (good) { quizState.score++; playSuccess(); } else playFail();
  // v104: الخطأ يعلّم: يُضاء الجواب الصحيح ويُقال قبل التعقيب
  if (!good) document.querySelectorAll("#quizBody .word-btn").forEach(b => { if (b.textContent === it.correct) b.classList.add("success"); });
  document.getElementById("quizFeedback").textContent = (good ? "✅ " + guideVocative() + "، " + kidLine("wellDone") + " " : "❌ " + kidLine("answerIs") + " " + it.correct + ". ") + it.explain;
  /* التعقيب يُقرأ كاملاً قبل السؤال التالي، حتى لا يقطعه؛ وزر «التالي» لمن أنهى القراءة */
  let goNext;
  const pressed = new Promise(res => { goNext = res; });
  const nb = document.createElement("button");
  nb.className = "action-btn btn-info quiz-next"; nb.textContent = "التالي ⬅";
  nb.onclick = () => { nb.disabled = true; if (typeof audioStopAll === "function") audioStopAll(); goNext(); };
  document.getElementById("quizFeedback").after(nb);
  Promise.race([voiceFeedback(good ? [guideVocative(), kidLine("wellDone"), it.explain] : [kidLine("answerIs"), it.correct, it.explain], 1800), pressed]).then(() => {
    if (quizState !== qs || qs.i !== qs.items.indexOf(it)) return; // تُخطّي الاختبار أو انتهى قبل المؤقّت
    quizState.i++;
    if (quizState.i < quizState.items.length) renderQuizQuestion();
    else finishQuiz();
  });
}
/* تخطّي الاختبار: يكمل المحطة دون نقاط، حتى لا يتعطّل الطفل */
function skipQuiz() {
  if (!quizState) { document.getElementById("quizPopup").classList.remove("active"); return; }
  const {onDone} = quizState;
  quizState = null;
  document.getElementById("quizPopup").classList.remove("active");
  onDone();
}
function finishQuiz() {
  const {score, items, onDone, station} = quizState;
  // إعادة اختبار المحطة نفسها في اليوم نفسه لا تمنح نقاطاً جديدة
  if (score > 0 && firstCreditToday("quiz|" + (station && station.id))) addPoints(score * 5);
  // v104: نتيجة اختبار الفهم تُحفظ (آخر محاولة) وتظهر في تقرير المعلم
  if (station && station.id && !noCredit()) {
    state.quizResults = state.quizResults || {};
    state.quizResults[station.id] = { score, total: items.length, at: Date.now() };
    saveState();
  }
  document.getElementById("quizPopup").classList.remove("active");
  quizState = null;
  kidAnnounce(`اختبار الفهم: ${score} / ${items.length}`, score === items.length ? "success" : "",
    [kidLine(score === items.length ? "quizAll" : score ? "quizSome" : "quizNone")]);
  onDone();
}

/* عرض أبيات المنظومة كاملة، مرتبة بالمحطات، بالنص الكامل لكل بيت */
function showPoem() {
  document.getElementById("poemBody").innerHTML = content.journeyData.map(st => `
    <div style="margin-bottom:10px">
      <div style="font-weight:bold;color:var(--primary);border-bottom:1px solid #ddd;margin:8px 0">${escapeHtml(st.icon)} ${escapeHtml(st.title)}</div>
      ${st.verses.map((v, i) => `<div style="font-size:1.05rem">${escapeHtml(v.fullVerse)} <span style="color:#999;font-size:.8rem">(${v.n || i + 1})</span></div>`).join("")}
    </div>`).join("");
  document.getElementById("poemPopup").classList.add("active");
}

/* الخط الزمني: ترتيب المحطات والأحداث بلا تواريخ خلافية */
function showTimeline() {
  document.getElementById("timelineList").innerHTML = content.journeyData.map(st => {
    const status = getStationStatus(st);
    const events = [...new Set(st.verses.map(v => v.event))].slice(0, 6);
    return `<div class="inv-item ${status === 'locked' ? 'locked' : ''}" style="text-align:right;margin-bottom:8px">
      <strong>${escapeHtml(st.icon)} ${escapeHtml(st.title)}</strong>
      <div style="font-size:.8rem;color:#666;margin-top:4px">${status === 'locked' ? '🔒' : events.map(escapeHtml).join(" ← ")}</div></div>`;
  }).join("");
  document.getElementById("timelinePopup").classList.add("active");
}

/* المراجعة اليومية: أقدم الأبيات التي أُتقنت (أو لم تُراجع) من المشاهدة */
function startDaily() {
  if (leitnerDueVerses().length) { startLeitnerReview(); return; }
  const pool = [];
  content.journeyData.forEach((st, si) => st.verses.forEach((v, vi) => {
    if (state.seenVerses[v.id]) {
      const s = state.verseStats[v.id] || {};
      pool.push({stationIndex: si, verseIndex: vi, last: s.lastCorrect || 0});
    }
  }));
  if (!pool.length) { kidToast(kidLine("needOneVerse"), "error"); return; }
  pool.sort((a, b) => a.last - b.last);
  playQueue = pool.slice(0, 5);
  // v104: مراجعة إضافية لا تحدّي: نقاط المراجعة، ولا وقت ولا أسئلة إضافية
  playMode = MODE_REVIEW; playIndex = 0;
  sessionStats = {correct: 0, wrong: 0, total: playQueue.length};
  enterPlayScreen("📅 مراجعة اليوم");
}

/* تكرار جماعي كل خمسة أبيات قبل المتابعة */
function showRepeatBatch(station, from, to, onContinue) {
  const verses = station.verses.slice(from, to + 1);
  const all = verses.map(v => v.fullVerse);
  // v111: كانت النافذة تُسمِع الأبيات فقط؛ الآن يسمعها الطفل متصلة ثم يُخفيها ويسمّعها من حفظه
  const body = document.getElementById("repeatBody");
  body.classList.remove("rb-hidden");
  body.innerHTML = verses.map(v => `<div style="font-size:1.1rem;font-weight:bold">${escapeHtml(v.fullVerse)}</div>`).join("");
  const hint = document.getElementById("repeatHint"); if (hint) hint.textContent = kidLine("batchRecite");
  const playModel = async () => {
    if (typeof stationModelParts !== "function" || typeof audioBegin !== "function") { speakQueue(all); return; }
    if (!audioBegin()) return;
    const token = seqToken;
    for (const p of await stationModelParts(station, verses)) { if (token !== seqToken) return; await playPart(token, p.rec, p.text); }
  };
  document.getElementById("repeatSpeakBtn").onclick = playModel;
  const hb = document.getElementById("repeatHideBtn");
  if (hb) { hb.textContent = "🙈 أخفِها وسمّع"; hb.onclick = () => { const hid = body.classList.toggle("rb-hidden"); hb.textContent = hid ? "👁️ أظهرها" : "🙈 أخفِها وسمّع"; if (hid && typeof stopSpeech === "function") stopSpeech(); }; }
  document.getElementById("repeatNextBtn").onclick = () => {
    stopSpeech();
    document.getElementById("repeatPopup").classList.remove("active");
    onContinue();
  };
  document.getElementById("repeatPopup").classList.add("active");
  playModel();
}
