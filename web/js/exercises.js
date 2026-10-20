/* v64: تمارين مولّدة من نصوص القصص الموثقة وترتيب الأبيات — بلا أي معلومة من خارج المشروع */
const EX_PLACES = ["مكة", "المدينة", "الطائف", "الحبشة", "الشام", "الأبواء", "قباء", "غار ثور", "بدر", "أحد"];
const EX_FIGURES = ["أبو طالب", "عبد المطلب", "خديجة", "بحيرى", "ورقة بن نوفل", "أبو بكر", "سراقة", "أم أيمن", "حليمة", "حمزة", "عائشة"];

function exNorm(s) { return normalizeArabic(s); }
function exShuffle(a) { return [...a].sort(() => Math.random() - .5); }
function exEscRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
/* يخفي الاسم في النص مع التشكيل المحتمل بين الحروف، ثم يتحقق أنه لم يبقَ أثر له */
function exMask(text, term) {
  const re = new RegExp(term.split("").map(c => c === " " ? "\\s+" : exEscRe(c) + "[ً-ٰٟ]*").join(""), "g");
  return text.replace(re, "_____");
}
function exShownVerses(journey) {
  const out = [];
  (journey || content.journeyData).forEach(st => st.verses.forEach(v => { if (v.story) out.push(v); }));
  return out;
}
function exBuild(journey, list, n, promptFn) {
  const qs = [];
  for (const v of exShuffle(exShownVerses(journey))) {
    const t = exNorm(v.story);
    const found = list.filter(term => t.includes(exNorm(term)));
    if (!found.length) continue;
    const correct = found[Math.floor(Math.random() * found.length)];
    const masked = exMask(v.story, correct);
    if (exNorm(masked).includes(exNorm(correct))) continue;
    const wrong = exShuffle(list.filter(term => !t.includes(exNorm(term)))).slice(0, 2);
    if (wrong.length < 2) continue;
    qs.push({ prompt: promptFn(masked), options: exShuffle([correct, ...wrong]), correct, verseId: v.id });
    if (qs.length >= n) break;
  }
  return qs;
}
function buildPlaceQs(n = 5, journey) {
  return exBuild(journey, EX_PLACES, n, m => "في أي مكان حدث هذا؟\n«" + m + "»");
}
function buildFigureQs(n = 5, journey) {
  return exBuild(journey, EX_FIGURES, n, m => "أيُّ هذه الأسماء حُذف من القصة؟\n«" + m + "»");
}
/* سؤال ترتيب: بيتان من المنظومة، أيهما يأتي أولاً فيها؟ */
function buildOrderQs(n = 5, journey) {
  const all = [];
  (journey || content.journeyData).forEach(st => st.verses.forEach(v => all.push(v)));
  const qs = [];
  for (let k = 0; k < n && all.length > 1; k++) {
    let i = Math.floor(Math.random() * all.length), j = Math.floor(Math.random() * all.length);
    if (i === j) continue;
    if (i > j) [i, j] = [j, i];
    const a = all[i].fullVerse, b = all[j].fullVerse;
    if (a === b) continue;
    qs.push({ prompt: "أيُّ البيتين يأتي أولاً في المنظومة؟", options: exShuffle([a, b]), correct: a, verseId: all[i].id });
  }
  return qs;
}

/* ربط الأبيات: يُعرض بيت، فيختار الطفل البيت الذي يليه في المنظومة. هذا هو «السرد» الذي يحتاجه الحافظ.
   journey يحدد الأبيات المسموح بها (المرئية)، والترتيب من المنظومة كاملة */
function buildNextQs(n = 5, journey) {
  const allowed = new Set((journey || content.journeyData).flatMap(st => st.verses.map(v => v.id)));
  const all = content.journeyData.flatMap(st => st.verses);
  const pairs = [];
  for (let i = 0; i + 1 < all.length; i++) if (allowed.has(all[i].id) && allowed.has(all[i + 1].id)) pairs.push(i);
  const pool = all.filter(v => allowed.has(v.id));
  if (pool.length < 4) return [];
  const qs = [];
  for (const i of exShuffle(pairs).slice(0, n)) {
    const a = all[i], b = all[i + 1];
    const wrong = exShuffle(pool.filter(v => v.id !== a.id && v.id !== b.id && v.fullVerse !== b.fullVerse)).slice(0, 2).map(v => v.fullVerse);
    if (wrong.length < 2) continue;
    qs.push({ prompt: "ما البيت الذي يأتي بعد هذا البيت؟\n«" + a.fullVerse + "»", options: exShuffle([b.fullVerse, ...wrong]), correct: b.fullVerse, verseId: b.id });
  }
  return qs;
}

let exState = null;
function showExercises() {
  openHub("🧭 تمارين", `
    <p style="color:#666;font-size:.9rem">أسئلة قصيرة من القصص والأبيات التي حفظتها.</p>
    <div class="hub-grid">
      <button class="hub-tile" onclick="startExercise('places')"><span>📍</span>الأماكن</button>
      <button class="hub-tile" onclick="startExercise('figures')"><span>👤</span>الأسماء</button>
      <button class="hub-tile" onclick="startExercise('order')"><span>🔢</span>ترتيب الأبيات</button>
      <button class="hub-tile" onclick="startExercise('next')"><span>🔗</span>البيت التالي</button>
    </div>`);
}
/* الأسئلة من الأبيات التي رآها الطفل فقط، لا من محطات لم يصلها */
function seenJourney() {
  const seen = (state && state.seenVerses) || {};
  return content.journeyData.map(st => Object.assign({}, st, { verses: st.verses.filter(v => seen[v.id]) }));
}
function startExercise(kind) {
  const j = seenJourney();
  const qs = kind === "places" ? buildPlaceQs(5, j) : kind === "figures" ? buildFigureQs(5, j) : kind === "next" ? buildNextQs(5, j) : buildOrderQs(5, j);
  if (!qs.length) { kidToast(kidLine("notEnoughQs"), "error"); return; }
  exState = { kind, qs, i: 0, score: 0, answered: false };
  renderExercise();
}
function renderExercise() {
  const q = exState.qs[exState.i];
  exState.answered = false;
  openHub(`🧭 سؤال ${exState.i + 1} من ${exState.qs.length}`, `
    <p style="white-space:pre-line;line-height:1.9;font-weight:bold">${sayBtnHTML([q.prompt.replace("_____", "فراغ"), ...q.options], "استمع للسؤال")} ${escapeHtml(q.prompt)}</p>
    <div class="word-bank">${optionsHTML(q.options, (o, i) => `answerExercise(${i}, this)`)}</div>
    <div id="exMsg" style="min-height:26px;font-weight:bold;margin-top:10px"></div>`);
  autoSayNow([q.prompt.replace("_____", "فراغ"), ...q.options]);
}
function answerExercise(i, btn) {
  if (!exState || exState.answered) return;
  exState.answered = true;
  const q = exState.qs[exState.i];
  const ok = q.options[i] === q.correct;
  document.querySelectorAll("#hubBody .word-btn").forEach(b => b.disabled = true);
  btn.classList.add(ok ? "success" : "fail");
  const msg = document.getElementById("exMsg");
  if (ok) { exState.score++; if (firstCreditToday("ex|" + exState.kind + "|" + q.verseId + "|" + q.correct)) addPoints(2); playSuccess(); msg.innerHTML = `<span style="color:var(--success)">✅ ${escapeHtml(guideVocative())}، ${escapeHtml(kidLine("wellDone"))}</span>`; autoSayNow([guideVocative(), kidLine("wellDone")]); }
  else {
    playFail();
    msg.innerHTML = `<span style="color:var(--danger)">${escapeHtml(kidLine("answerIs"))} ${escapeHtml(q.correct)}</span>`;
    autoSayNow([kidLine("answerIs"), q.correct]);
    try { leitnerRecord(q.verseId, false); saveState(); } catch(e) {}
  }
  const last = exState.i + 1 >= exState.qs.length;
  document.getElementById("hubBody").insertAdjacentHTML("beforeend",
    `<button class="action-btn btn-success" style="width:100%;margin-top:10px" onclick="${last ? "finishExercise()" : "nextExercise()"}">${last ? "انتهى التمرين 🎉" : "التالي ⬅️"}</button>`);
}
function nextExercise() { exState.i++; renderExercise(); }
function finishExercise() {
  const total = exState.qs.length, score = exState.score;
  if (exState.kind === "places" && score === total && typeof awardBadge === "function") awardBadge("places5");
  openHub("🎉 انتهى التمرين", `
    <div style="font-size:3rem">🧭</div>
    <p style="font-size:1.2rem"><strong>${score} / ${total}</strong></p>
    <p style="color:#666">${escapeHtml(kidLine(score === total ? "exGreat" : "exKeep"))}</p>
    <button class="action-btn btn-info" style="width:100%" onclick="showExercises()">تمرين آخر</button>`);
  autoSay(kidLine(score === total ? "exGreat" : "exKeep"));
  exState = null;
}
