/* اختبار فهم قصير بعد كل محطة + التوقيت الزمني + المراجعة اليومية */
let quizState = null;

function startStationQuiz(station, onDone) {
  const items = (typeof QUIZZES !== "undefined" && QUIZZES[station.id]) || [];
  if (!items.length) { onDone(); return; }
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
  document.getElementById("quizFeedback").textContent = (good ? "✅ " + guideVocative() + "، " + kidLine("wellDone") + " " : "❌ ") + it.explain;
  /* التعقيب يُقرأ كاملاً قبل السؤال التالي، حتى لا يقطعه */
  voiceFeedback(good ? [guideVocative(), kidLine("wellDone"), it.explain] : [it.explain], 1800).then(() => {
    if (quizState !== qs) return; // تُخطّي الاختبار أو انتهى قبل المؤقّت
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
  document.getElementById("quizPopup").classList.remove("active");
  quizState = null;
  kidToast(`اختبار الفهم: ${score} / ${items.length}`, score === items.length ? "success" : "",
    [kidLine(score === items.length ? "quizAll" : score ? "quizSome" : "quizNone")]);
  onDone();
}

/* عرض أبيات المنظومة كاملة، مرتبة بالمحطات، بالنص الكامل لكل بيت */
function showPoem() {
  document.getElementById("poemBody").innerHTML = content.journeyData.map(st => `
    <div style="margin-bottom:10px">
      <div style="font-weight:bold;color:var(--primary);border-bottom:1px solid #ddd;margin:8px 0">${escapeHtml(st.icon)} ${escapeHtml(st.title)}</div>
      ${st.verses.map((v, i) => `<div style="font-size:1.05rem">${escapeHtml(v.fullVerse)} <span style="color:#999;font-size:.8rem">(${i + 1})</span></div>`).join("")}
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
  playMode = MODE_CHALLENGE; playIndex = 0;
  sessionStats = {correct: 0, wrong: 0, total: playQueue.length};
  enterPlayScreen("📅 مراجعة اليوم");
}

/* تكرار جماعي كل خمسة أبيات قبل المتابعة */
function showRepeatBatch(station, from, to, onContinue) {
  const verses = station.verses.slice(from, to + 1);
  const all = verses.map(v => v.fullVerse);
  document.getElementById("repeatBody").innerHTML = verses.map(v =>
    `<div style="font-size:1.1rem;font-weight:bold">${escapeHtml(v.fullVerse)}</div>`).join("");
  document.getElementById("repeatSpeakBtn").onclick = () => speakQueue(all);
  document.getElementById("repeatNextBtn").onclick = () => {
    stopSpeech();
    document.getElementById("repeatPopup").classList.remove("active");
    onContinue();
  };
  document.getElementById("repeatPopup").classList.add("active");
  speakQueue(all);
}
