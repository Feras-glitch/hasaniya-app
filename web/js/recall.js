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
    if (!pool.length) { kidToast("أكمل بيتاً واحداً أولاً", "error"); return; }
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
    <p style="color:#666;font-size:.85rem">قل البيت بصوت عالٍ أولاً، ثم أظهره.</p>
    <div id="recallAns" style="display:none;margin:12px 0;font-size:1.15rem;line-height:1.9;color:var(--primary)">${escapeHtml(it.v.fullVerse)}</div>
    <div id="recallBtns" class="hub-actions">
      <button class="action-btn btn-info" onclick="revealRecall()">أظهر البيت</button>
    </div>`);
}
function revealRecall() {
  document.getElementById("recallAns").style.display = "block";
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
function renderRiddle() {
  const q = recallQ, r = q.items[q.i];
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
    document.getElementById("riddleMsg").innerHTML = `<span style="color:var(--success)">✅ ${escapeHtml(guideVocative())}، ${gForm("أحسنتَ", "أحسنتِ")}! الجواب: ${escapeHtml(r.answer)}</span>`;
    document.getElementById("riddleBtns").innerHTML = `<button class="action-btn btn-success" onclick="nextRiddle()">التالي ⬅️</button>`;
    playSuccess();
  } else {
    document.getElementById("riddleMsg").innerHTML = `<span style="color:var(--danger)">حاول مرة أخرى</span>`;
    playFail();
  }
}
function revealRiddle() {
  const r = recallQ.items[recallQ.i];
  const v = content.journeyData.flatMap(s => s.verses).find(x => x.id === r.ref);
  document.getElementById("riddleMsg").innerHTML = `الجواب: <strong>${escapeHtml(r.answer)}</strong>
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
    <p style="color:#666">${q.score === q.items.length ? "ممتاز! ذاكرتك قوية." : "كل مرة تُعيد فيها البيت تقوى ذاكرتك."}</p>
    <button class="action-btn btn-info" style="width:100%" onclick="showRecallMenu()">تذكّر مرة أخرى</button>`);
}
