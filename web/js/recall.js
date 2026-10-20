/* تذكّر: ثلاث طرق — الكلمة المفتاح، الحروف الأولى، والألغاز */
let recallQ = null;

function openHubBody(title, html) { openHub(title, html); }

function showRecallMenu() {
  openHub("🔑 تذكّر", `
    <p style="color:#666;font-size:.9rem">اختر طريقة التذكّر:</p>
    <div class="hub-grid">
      <button class="hub-tile" onclick="startRecall('keyword')"><span>🔑</span>الكلمة المفتاح</button>
      <button class="hub-tile" onclick="startRecall('initials')"><span>🔤</span>الحروف الأولى</button>
      <button class="hub-tile" onclick="startRecall('riddle')"><span>🧩</span>الألغاز</button>
    </div>`);
}
function keywordOf(v) {
  let best = v.words[0];
  v.words.forEach(w => { if (normalizeArabic(w).length > normalizeArabic(best).length) best = w; });
  return best;
}
function stripAl(s) { return normalizeArabic(s).replace(/^ال/, ""); }

function startRecall(mode) {
  recallQ = {mode, i: 0, score: 0, items: []};
  if (mode === "riddle") {
    recallQ.items = [...RIDDLES].sort(() => Math.random() - .5);
  } else {
    const pool = [];
    content.journeyData.forEach((st, si) => st.verses.forEach((v, vi) => {
      if (state.seenVerses[v.id]) pool.push({st, v, si, vi});
    }));
    if (!pool.length) { kidToast(kidLine("needOneFirst"), "error"); return; }
    recallQ.items = pool.sort(() => Math.random() - .5).slice(0, 8);
  }
  renderRecall();
}
function renderRecall() {
  const q = recallQ;
  if (!q) return;
  if (q.i >= q.items.length) return finishRecall();
  if (q.mode === "riddle") return renderRiddle();
  const it = q.items[q.i];
  const prompt = q.mode === "keyword"
    ? `الكلمة المفتاح: <strong style="font-size:1.5rem;color:var(--primary)">${escapeHtml(keywordOf(it.v))}</strong>`
    : `الحروف الأولى: <strong style="font-size:1.3rem;letter-spacing:4px;color:var(--primary)">${it.v.words.map(w => escapeHtml(normalizeArabic(w).charAt(0))).join(" ")}</strong>`;
  openHub(`🔑 ${q.i + 1} من ${q.items.length}`, `
    <p>${prompt}</p>
    <p style="color:#666;font-size:.85rem">${sayBtnHTML(kidLine("recallSay"))} ${escapeHtml(kidLine("recallSay"))}</p>
    <div id="recallAns" style="display:none;margin:12px 0;font-size:1.15rem;line-height:1.9;color:var(--primary)">${escapeHtml(it.v.fullVerse)}</div>
    <div id="recallBtns" class="hub-actions">
      <button class="action-btn btn-info" onclick="revealRecall()">أظهر البيت</button>
    </div>`);
  autoSayNow(kidLine("recallSay"));
}
function revealRecall() {
  document.getElementById("recallAns").style.display = "block";
  const it = recallQ && recallQ.items[recallQ.i];
  if (it) autoSayNow(it.v.fullVerse);
  document.getElementById("recallBtns").innerHTML = `
    <button class="action-btn btn-success" onclick="rateRecall(true)">✅ تذكّرتُه</button>
    <button class="action-btn btn-danger" onclick="rateRecall(false)">❌ نسيته</button>`;
}
function rateRecall(ok) {
  const it = recallQ.items[recallQ.i];
  leitnerRecord(it.v.id, ok);
  if (ok) { recallQ.score++; if (firstCreditToday("recall|" + it.v.id)) addPoints(3); }
  saveState();
  recallQ.i++;
  renderRecall();
}
/* v102: في وضع الطفل الصغير يُختار الجواب من ثلاثة تُسمع، بدل الكتابة */
function riddleChoices(r) {
  const others = [...new Set(RIDDLES.map(x => x.answer).filter(a => stripAl(a) !== stripAl(r.answer)))].sort(() => Math.random() - .5).slice(0, 2);
  return [r.answer, ...others].sort(() => Math.random() - .5);
}
function pickRiddle(btn, chosen) {
  const r = recallQ.items[recallQ.i];
  if (stripAl(chosen) === stripAl(r.answer)) {
    document.querySelectorAll("#hubBody .word-btn").forEach(b => b.disabled = true);
    btn.classList.add("success");
    document.getElementById("riddleIn").value = chosen;
    checkRiddle();
  } else {
    btn.classList.add("fail"); btn.disabled = true;
    document.getElementById("riddleMsg").innerHTML = `<span style="color:var(--danger)">${escapeHtml(kidLine("tryAgain"))}</span>`;
    playFail(); autoSayNow(kidLine("tryAgain"));
  }
}
function renderRiddle() {
  const q = recallQ, r = q.items[q.i];
  if (isSmallKid()) {
    const opts = riddleChoices(r);
    openHub(`🧩 لغز ${q.i + 1} من ${q.items.length}`, `
      <p style="font-size:1.1rem;line-height:1.9">${sayBtnHTML([r.riddle, kidLine("riddlePick"), ...opts], "استمع للغز")} ${escapeHtml(r.riddle)}</p>
      <input id="riddleIn" type="hidden">
      <div class="word-bank">${optionsHTML(opts, o => `pickRiddle(this,'${escapeForAttr(o)}')`)}</div>
      <div id="riddleMsg" style="min-height:26px;font-weight:bold;margin:8px 0"></div>
      <div id="riddleBtns" class="hub-actions"></div>`);
    autoSayNow([r.riddle, kidLine("riddlePick"), ...opts]);
    return;
  }
  openHub(`🧩 لغز ${q.i + 1} من ${q.items.length}`, `
    <p style="font-size:1.1rem;line-height:1.9">${sayBtnHTML(r.riddle, "استمع للغز")} ${escapeHtml(r.riddle)}</p>
    <input id="riddleIn" class="ask-input" placeholder="اكتب جوابك">
    <div id="riddleMsg" style="min-height:26px;font-weight:bold;margin:8px 0"></div>
    <div id="riddleBtns" class="hub-actions">
      <button class="action-btn btn-success" onclick="checkRiddle()">تحقّق ✔️</button>
      <button class="action-btn btn-gray" onclick="revealRiddle()">أظهر الجواب</button>
    </div>`);
  setTimeout(() => { const i = document.getElementById("riddleIn"); if (i) i.focus(); }, 100);
  autoSayNow(r.riddle);
}
function checkRiddle() {
  const r = recallQ.items[recallQ.i];
  const got = stripAl(document.getElementById("riddleIn").value);
  if (got && got === stripAl(r.answer)) {
    recallQ.score++;
    if (!state.riddlesSolved) state.riddlesSolved = {};
    if (!state.riddlesSolved[r.station]) { state.riddlesSolved[r.station] = true; addPoints(5); }
    saveState();
    document.getElementById("riddleMsg").innerHTML = `<span style="color:var(--success)">✅ ${escapeHtml(guideVocative())}، ${escapeHtml(kidLine("wellDone"))} ${escapeHtml(kidLine("answerIs"))} ${escapeHtml(r.answer)}</span>`;
    autoSayNow([guideVocative(), kidLine("wellDone"), kidLine("answerIs"), r.answer]);
    document.getElementById("riddleBtns").innerHTML = `<button class="action-btn btn-success" onclick="nextRiddle()">التالي ⬅️</button>`;
    playSuccess();
  } else {
    document.getElementById("riddleMsg").innerHTML = `<span style="color:var(--danger)">${escapeHtml(kidLine("tryAgain"))}</span>`;
    autoSayNow(kidLine("tryAgain"));
    playFail();
  }
}
function revealRiddle() {
  const r = recallQ.items[recallQ.i];
  const v = content.journeyData.flatMap(s => s.verses).find(x => x.id === r.ref);
  autoSayNow([kidLine("answerIs"), r.answer]);
  document.getElementById("riddleMsg").innerHTML = `${escapeHtml(kidLine("answerIs"))} <strong>${escapeHtml(r.answer)}</strong>
    <div style="color:var(--primary);font-weight:normal;margin-top:8px;line-height:1.8">${escapeHtml(v ? v.fullVerse : "")}</div>`;
  document.getElementById("riddleBtns").innerHTML = `<button class="action-btn btn-success" onclick="nextRiddle()">التالي ⬅️</button>`;
}
function nextRiddle() { recallQ.i++; renderRecall(); }
function finishRecall() {
  const q = recallQ;
  recallQ = null;
  openHub("🎉 انتهى التذكّر", `
    <div style="font-size:3rem">🔑</div>
    <p style="font-size:1.2rem"><strong>${q.score} / ${q.items.length}</strong></p>
    <p style="color:#666">${escapeHtml(kidLine(q.score === q.items.length ? "recallGreat" : "recallKeep"))}</p>
    <button class="action-btn btn-info" style="width:100%" onclick="showRecallMenu()">تذكّر مرة أخرى</button>`);
  autoSay(kidLine(q.score === q.items.length ? "recallGreat" : "recallKeep"));
}
