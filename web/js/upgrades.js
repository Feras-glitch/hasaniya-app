/* v62: التوثيق المرئي، القرآن، الغريب، الإخفاء التدريجي، ترتيب المحطات، سؤال التأمل، تقرير الأسبوع */

/* ---------- 1. درجة التوثيق والقرآن تحت القصة ---------- */
function docGradeHtml(v) {
  if (!v.story) return "";
  if (v.storyStatus === "ok") return `<div class="grade-line grade-ok">✅ موثّق: ظهر نص الشاهد في المصدر</div>`;
  return `<div class="grade-line grade-book">⚠️ من هامش الكتاب، ولم يُتحقق منه مستقلاً</div>`;
}
/* فائدة علمية للوالد: ملاحظة محررة تحت المصادر (حقل note في stories.js) */
function noteHtml(v) {
  if (!v || !v.story || !v.note) return "";
  const parts = String(v.note).split(/\s*\|\s*/).map(x => x.trim()).filter(Boolean);
  if (!parts.length) return "";
  return `<div class="parent-note"><div class="parent-note-title">💡 فائدة علمية للوالد</div>${parts.map(x => `<p>${escapeHtml(x)}</p>`).join("")}</div>`;
}
function quranHtml(v) {
  const L = (typeof QURAN_LINKS !== "undefined") ? QURAN_LINKS[v.id] : null;
  if (!L || !L.length) return "";
  return `<div class="quran-box"><div class="quran-title">📖 من القرآن الكريم</div>${L.map(q => `
    <div class="quran-ayah">${escapeHtml(q.text)}<div class="quran-ref">﴿ ${escapeHtml(q.ref)} ﴾</div>${q.note ? `<div class="quran-note">${escapeHtml(q.note)}</div>` : ""}</div>`).join("")}<div class="quran-src">${escapeHtml(QURAN_SOURCE)}</div></div>`;
}
function docCoverage() {
  const c = { ok: 0, book: 0, review: 0, none: 0 }, missing = [];
  content.journeyData.forEach(st => st.verses.forEach(v => {
    if (v.story) c[v.storyStatus === "ok" ? "ok" : "book"]++;
    else if (v.storyStatus === "review") c.review++;
    else { c.none++; missing.push(v); }
  }));
  return { c, missing };
}
function showDocCoverage() {
  const { c, missing } = docCoverage();
  const total = c.ok + c.book + c.review + c.none;
  const list = missing.map(v => `<div class="hub-row"><span style="flex:1;text-align:right">${escapeHtml(v.fullVerse)}</span></div>`).join("");
  openHub("📋 حالة التوثيق", `
    <p>من أصل ${total} بيتاً:</p>
    <div>✅ موثّق بنص الشاهد: <strong>${c.ok}</strong></div>
    <div>⚠️ من هامش الكتاب فقط: <strong>${c.book}</strong></div>
    <div>🔎 قيد المراجعة (لا تُعرض للطفل): <strong>${c.review}</strong></div>
    <div>⬜ بلا قصة مكتوبة بعد: <strong>${c.none}</strong></div>
    <div class="board-title">الأبيات بلا قصة</div>${list || '<p class="empty-state">لا توجد.</p>'}`);
}

/* ---------- 2. الغريب ---------- */
function showGlossary() {
  const rows = (typeof GLOSSARY !== "undefined" ? GLOSSARY : []).map(g => `
    <div class="gloss-row"><strong>${escapeHtml(g.term)}</strong>: ${escapeHtml(g.meaning)}</div>`).join("");
  openHub("📜 الغريب", `<p style="color:#666;font-size:.9rem">كلمات تحتاج شرحاً، ومعناها مأخوذ من نص القصة نفسها.</p>${rows}`);
}

/* ---------- 3. الإخفاء التدريجي (تسميع من الذاكرة) ---------- */
let hideState = null;
function startHideLevels() {
  const pool = [];
  content.journeyData.forEach(st => st.verses.forEach(v => { if (state.seenVerses[v.id]) pool.push(v); }));
  if (!pool.length) { kidToast(kidLine("needOneFirst"), "error"); return; }
  renderHideLevel(pool[Math.floor(Math.random() * pool.length)], 1);
}
/* المستوى 1: نخفي كل ثالث كلمة. 2: نخفي الكل ونعطي أول حرف. 3: نخفي الكل بلا تلميح */
/* الصعوبة تتكيّف: إن تعثّر الطفل في البيت (ثلاث أخطاء وأكثر، وأكثر من الصحيح) تقلّ الكلمات المخفاة في المستوى الأول */
function hideMask(v, level) {
  if (level !== 1) return v.words.map(() => true);
  const vs = (state.verseStats || {})[v.id] || { correct: 0, wrong: 0 };
  const struggling = vs.wrong >= 3 && vs.wrong > vs.correct;
  const step = struggling ? 4 : 3;
  const mask = v.words.map((w, i) => i % step === 1);
  if (!mask.some(Boolean)) mask[mask.length - 1] = true;
  return mask;
}
/* عدد الأبيات المتقنة في المحطة (إجابتان صحيحتان متتاليتان على الأقل) */
function stationMastery(st) {
  const vs = state.verseStats || {};
  const done = st.verses.filter(v => { const s = vs[v.id]; return s && s.correct >= 2 && s.lastCorrect >= (s.lastWrong || 0); }).length;
  return { done, total: st.verses.length };
}
function renderHideLevel(v, level) {
  const mask = hideMask(v, level);
  const parts = v.words.map((w, i) => {
    if (!mask[i]) return `<span class="hide-shown">${escapeHtml(w)}</span>`;
    const hint = level === 2 ? normalizeArabic(w).charAt(0) : "";
    return `<input class="hide-in" data-i="${i}" placeholder="${escapeForAttr(hint || "…")}" autocomplete="off">`;
  }).join(" ");
  hideState = { v, level };
  openHub(`🧩 إخفاء تدريجي — المستوى ${level} من 3`, `
    <div class="hide-verse">${parts}</div>
    <div id="hideMsg" style="min-height:26px;font-weight:bold;margin:8px 0"></div>
    <div class="hub-actions"><button class="action-btn btn-success" onclick="checkHideLevel()">تحقّق ✔️</button></div>`);
  setTimeout(() => { const f = document.querySelector(".hide-in"); if (f) f.focus(); }, 100);
}
function checkHideLevel() {
  const { v, level } = hideState;
  let wrong = 0;
  document.querySelectorAll(".hide-in").forEach(inp => {
    const ok = normalizeArabic(inp.value) === normalizeArabic(v.words[+inp.dataset.i]) && inp.value.trim() !== "";
    inp.classList.toggle("hide-ok", ok); inp.classList.toggle("hide-bad", !ok);
    if (!ok) wrong++;
  });
  const msg = document.getElementById("hideMsg");
  const body = document.getElementById("hubBody");
  body.querySelectorAll(".hide-next").forEach(b => b.remove());
  if (wrong === 0) {
    if (firstCreditToday("hide|" + level + "|" + v.id)) addPoints(level * 2);
    leitnerRecord(v.id, true); saveState(); playSuccess();
    msg.innerHTML = `<span style="color:var(--success)">✅ ${escapeHtml(guideVocative())}، ${gForm("أحسنتَ", "أحسنتِ")}!</span>`;
    const label = level < 3 ? "المستوى التالي ⬅️" : "بيت جديد 🎲";
    body.insertAdjacentHTML("beforeend", `<button class="action-btn btn-success hide-next" style="width:100%" onclick="${level < 3 ? `renderHideLevel(hideState.v, ${level + 1})` : "startHideLevels()"}">${label}</button>`);
  } else {
    leitnerRecord(v.id, false); saveState(); playFail();
    msg.innerHTML = `<span style="color:var(--danger)">حاول مرة أخرى، الكلمات المعلّمة بالأحمر</span>`;
  }
}

/* ---------- 4. ترتيب المحطات ---------- */
let orderState = null;
function startStationOrder() {
  /* من المحطات التي وصلها الطفل فقط: لا يُسأل عن ترتيب ما لم يتعلّمه بعد */
  const pool = content.journeyData.map((s, i) => i).filter(i => getStationStatus(content.journeyData[i]) !== "locked");
  if (pool.length < 3) { kidToast(kidLine("needTwoStations"), "error"); return; }
  const picks = [];
  while (picks.length < Math.min(4, pool.length)) { const i = pool[Math.floor(Math.random() * pool.length)]; if (!picks.includes(i)) picks.push(i); }
  orderState = { sorted: [...picks].sort((a, b) => a - b), taken: [] };
  const btns = [...picks].sort(() => Math.random() - .5).map(i => {
    const st = content.journeyData[i];
    return `<button class="word-btn order-btn" data-si="${i}" onclick="pickOrder(this)">${escapeHtml(st.icon)} ${escapeHtml(st.title)}</button>`;
  }).join("");
  openHub("🔀 رتّب المحطات", `
    <p style="color:#666;font-size:.9rem">اضغط المحطات بالترتيب الذي تأتي به في المنظومة، من الأول إلى الأخير.</p>
    <div id="orderTaken" style="min-height:30px;margin-bottom:8px;font-weight:bold"></div>
    <div class="word-bank">${btns}</div>
    <div id="orderMsg" style="min-height:26px;font-weight:bold;margin-top:8px"></div>`);
}
function pickOrder(btn) {
  const o = orderState; if (!o) return;
  const si = +btn.dataset.si;
  const msg = document.getElementById("orderMsg");
  if (si !== o.sorted[o.taken.length]) {
    playFail();
    msg.innerHTML = `<span style="color:var(--danger)">جرّب مرة أخرى، ابدأ بالمحطة التي تأتي أولاً في المنظومة</span>`;
    o.taken = []; document.getElementById("orderTaken").innerHTML = "";
    document.querySelectorAll(".order-btn").forEach(b => { b.disabled = false; b.classList.remove("success"); });
    return;
  }
  o.taken.push(si); btn.disabled = true; btn.classList.add("success"); playClick();
  document.getElementById("orderTaken").textContent = o.taken.map(i => content.journeyData[i].title).join(" ← ");
  if (o.taken.length === o.sorted.length) {
    if (firstCreditToday("order|" + o.sorted.join(","))) addPoints(5);
    saveState(); playSuccess();
    msg.innerHTML = `<span style="color:var(--success)">✅ ${escapeHtml(guideVocative())}، ${gForm("أحسنتَ", "أحسنتِ")}! هذا هو الترتيب الصحيح</span>`;
    document.getElementById("hubBody").insertAdjacentHTML("beforeend", `<button class="action-btn btn-success" style="width:100%;margin-top:10px" onclick="startStationOrder()">ترتيب جديد 🔀</button>`);
  }
}

/* ---------- 5. سؤال التأمل (يكتبه الطفل بكلماته) ---------- */
const REFLECT_PROMPTS = [
  ["ماذا تعلّمتَ من هذه المحطة؟", "ماذا تعلّمتِ من هذه المحطة؟"],
  ["لو كنتَ مكان أحد أهل هذه القصة، ماذا كنتَ ستفعل؟", "لو كنتِ مكان أحد أهل هذه القصة، ماذا كنتِ ستفعلين؟"],
  ["أيّ موقف في هذه المحطة أعجبك أكثر، ولماذا؟", "أيّ موقف في هذه المحطة أعجبكِ أكثر، ولماذا؟"]
];
function reflectionPrompt(si) {
  const p = REFLECT_PROMPTS[si % REFLECT_PROMPTS.length];
  return gForm(p[0], p[1]);
}
function showReflection() {
  const opts = content.journeyData.map((s, i) => `<option value="${i}">${escapeHtml(s.icon)} ${escapeHtml(s.title)}</option>`).join("");
  openHub("💭 سؤال التأمل", `
    <select id="reflSt" class="ask-input" onchange="loadReflection()">${opts}</select>
    <p id="reflQ" style="font-weight:bold;line-height:1.8"></p>
    <textarea id="reflTxt" class="ask-input" rows="3" placeholder="اكتب بكلماتك"></textarea>
    <div class="hub-actions"><button class="action-btn btn-success" onclick="saveReflection()">حفظ ✔️</button></div>`);
  loadReflection();
}
function loadReflection() {
  const si = +document.getElementById("reflSt").value;
  document.getElementById("reflQ").textContent = reflectionPrompt(si);
  document.getElementById("reflTxt").value = (state.reflections || {})[content.journeyData[si].id] || "";
}
function saveReflection() {
  const si = +document.getElementById("reflSt").value;
  const txt = document.getElementById("reflTxt").value.trim().slice(0, 400);
  state.reflections = state.reflections || {};
  state.reflections[content.journeyData[si].id] = txt;
  saveState();
  if (Object.values(state.reflections).filter(Boolean).length >= 3) awardBadge("reflect3");
  kidToast(kidLine("reflectionSaved"));
}

/* ---------- 6. تقرير الأسبوع للوالدين (يُكتب على الجهاز ولا يُرسل إلا بضغط الوالد) ---------- */
function buildWeeklyText() {
  const w = ensureWeekly(state);
  const ids = weeklyVerseIds(w.week);
  const completed = content.journeyData.filter(s => getStationStatus(s) === "completed").length;
  const mastered = Object.values(state.verseStats || {}).filter(s => s.correct >= 2 && s.lastCorrect >= (s.lastWrong || 0)).length;
  const weak = getMistakesSorted().slice(0, 5).map(m => m.word);
  const reflections = Object.values(state.reflections || {}).filter(Boolean).length;
  return [
    `تقرير المتابعة الأسبوعي: ${getUserName()}`,
    `التاريخ: ${new Date().toLocaleDateString("ar-EG")}`,
    `المحطات المكتملة: ${completed} من ${content.journeyData.length}`,
    `أبيات أُتقنت (إجابتان صحيحتان متتاليتان): ${mastered}`,
    `تحدّي الأسبوع: ${Object.keys(w.done).filter(k => ids.includes(k)).length} من ${ids.length}`,
    `أبيات مستحقة للمراجعة الآن: ${leitnerDueVerses().length}`,
    `تأمّلات مكتوبة: ${reflections}`,
    `أكثر الكلمات تعثّراً: ${weak.length ? weak.join("، ") : "لا يوجد"}`,
    "",
    "هذا التقرير يبقى على الجهاز، ولا يُرسل إلا إذا أرسلتَه أنت بنفسك."
  ].join("\n");
}
function showWeeklyReport() {
  openHub("📝 تقرير الأسبوع", `
    <pre class="report-pre">${escapeHtml(buildWeeklyText())}</pre>
    <div class="hub-actions"><button class="action-btn btn-info" onclick="shareWeeklyText()">📤 مشاركة / حفظ</button></div>`);
}
function shareWeeklyText() {
  const text = buildWeeklyText();
  if (navigator.share) {
    navigator.share({ text, title: "تقرير المنظومة الحسنية" }).catch(e => {
      // إلغاء المستخدم ليس خطأً؛ غير ذلك نحفظ ملفاً نصياً بدل الصمت
      if (e && e.name === "AbortError") return;
      saveWeeklyTextFile(text);
    });
    return;
  }
  saveWeeklyTextFile(text);
}
function saveWeeklyTextFile(text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = "hasaniya_week_" + Date.now() + ".txt"; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- 9. عينة للمراجعة: يتحقق الوالد من مصادر 10 قصص عشوائياً ---------- */
const REVIEW_SAMPLE_SIZE = 10;
function reviewCandidates() {
  const out = [];
  content.journeyData.forEach(st => st.verses.forEach(v => {
    if (v.story && v.storyStatus === "ok" && v.sources && v.sources.length) out.push(v);
  }));
  return out;
}
function shuffleCopy(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function reviewSampleIds(regen) {
  const cands = reviewCandidates();
  const valid = new Set(cands.map(v => v.id));
  let ids = (state.docSample || []).filter(id => valid.has(id));
  if (regen || ids.length < Math.min(REVIEW_SAMPLE_SIZE, cands.length)) {
    ids = shuffleCopy(cands.map(v => v.id)).slice(0, REVIEW_SAMPLE_SIZE);
    state.docSample = ids;
    saveState();
  }
  return ids;
}
function showReviewSample(regen) {
  state.docChecks = state.docChecks || {};
  const ids = reviewSampleIds(!!regen);
  const byId = new Map();
  content.journeyData.forEach(st => st.verses.forEach(v => byId.set(v.id, v)));
  const rows = ids.map(id => {
    const v = byId.get(id);
    const checked = state.docChecks[id] ? "checked" : "";
    return `<div class="review-item">
      <label><input type="checkbox" data-vid="${escapeHtml(id)}" ${checked}>
        <strong>${escapeHtml(v.fullVerse)}</strong></label>
      <p class="review-story">${escapeHtml(v.story)}</p>
      <small>المصادر: ${escapeHtml(v.sources.join(" ؛ "))}</small>
    </div>`;
  }).join("");
  openHub("🔍 عينة للمراجعة", `
    <p style="color:#666;font-size:.9rem">تحقّق من أن كل قصة مطابقة لمصدرها المذكور، ثم ضع علامة. العينة تُختار عشوائياً وتُحفظ على هذا الجهاز.</p>
    <div id="reviewCount" class="rec-count"></div>
    ${rows || '<p class="empty-state">لا توجد قصص موثّقة لعرضها.</p>'}
    <div class="controls"><button class="tool-btn" onclick="showReviewSample(true)">🔄 عينة جديدة</button></div>`);
  const update = () => {
    const done = ids.filter(id => state.docChecks[id]).length;
    const el = document.getElementById("reviewCount");
    if (el) el.textContent = `تم التحقق من ${done} من ${ids.length} قصص · إجمالي المتحقَّق منها: ${Object.keys(state.docChecks).length}`;
  };
  document.querySelectorAll("#hubBody input[data-vid]").forEach(cb => {
    cb.onchange = () => {
      const id = cb.dataset.vid;
      if (cb.checked) state.docChecks[id] = new Date().toISOString().slice(0, 10);
      else delete state.docChecks[id];
      saveState(); update();
    };
  });
  update();
}
