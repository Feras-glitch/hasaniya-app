/* قائمة الأدوات + سؤال الحدث قبل القصة + الاستماع للقصة */
const TOOLS = [
  {icon: "📜", name: "الغريب", fn: "showGlossary"},
  {icon: "🔀", name: "رتّب المحطات", fn: "startStationOrder"},
  {icon: "💭", name: "سؤال التأمل", fn: "showReflection"},
  {icon: "🧩", name: "تدريب", fn: "showTrainHub"},
  {icon: "🌍", name: "أماكن القصص", fn: "showPlacesMap"},
  {icon: "🗺️", name: "خريطة الرحلة", fn: "showJourneyMap"},
  {icon: "🧭", name: "رحلة المحطات", fn: "toggleStationList"},
  {icon: "🏆", name: "إنجازاتي", fn: "showAchievementsHub"},
  {icon: "⚡", name: "التحديات", fn: "showChallengesHub"},
  {icon: "💬", name: "اسأل المنظومة", fn: "showAsk"},
  {icon: "🖨️", name: "بطاقات للطباعة", fn: "printAllCards"},
  {icon: "🕰️", name: "ترتيب الأحداث", fn: "showTimeline"},
  {icon: "📜", name: "الأبيات", fn: "showPoem"},
  {icon: "🎤", name: "تسجيلاتي", fn: "openRecPopup"}
];
/* v105: «🎮 العب» في شاشة الطفل: أنشطة يختارها الوالد لكل طفل (الافتراضي ثلاثة، واثنان للصغير).
   و«المراجعة» و«الأدوات» كاملتين في «المزيد» لا تظهران إلا إذا سمح بهما الوالد */
const PLAY_ACTIVITIES = {
  riddles: { icon: "🧩", name: "الألغاز", fn: "startRiddles" },
  mistakes: { icon: "🎯", name: "مراجعة الأخطاء", fn: "startReview" },
  timeline: { icon: "🕰️", name: "ترتيب الأحداث", fn: "showTimeline" },
  boxes: { icon: "🗃️", name: "صناديق الحفظ", fn: "showLeitnerBoxes" },
  stationOrder: { icon: "🔀", name: "رتّب المحطات", fn: "startStationOrder" },
  places: { icon: "🌍", name: "أماكن القصص", fn: "showPlacesMap" },
  hide: { icon: "🙈", name: "إخفاء تدريجي", fn: "startHideLevels" },
  recall: { icon: "🔑", name: "تذكّر", fn: "showRecallMenu" },
  glossary: { icon: "📜", name: "الغريب", fn: "showGlossary" },
  poem: { icon: "📖", name: "الأبيات", fn: "showPoem" },
  recordings: { icon: "🎤", name: "تسجيلاتي", fn: "openRecPopup" },
  achievements: { icon: "🏆", name: "إنجازاتي", fn: "showAchievementsHub" }
};
function playSetOf(s) {
  s = s || state;
  const list = Array.isArray(s && s.playSet) ? s.playSet.filter(k => PLAY_ACTIVITIES[k]) : null;
  if (list && list.length) return list;
  return typeof isSmallKid === "function" && isSmallKid() ? ["riddles", "mistakes"] : ["riddles", "mistakes", "timeline"];
}
function openPlayHub() {
  const tiles = playSetOf().map(k => { const a = PLAY_ACTIVITIES[k];
    return `<button class="hub-tile" onclick="openTool('${a.fn}')"><span>${a.icon}</span>${escapeHtml(a.name)}</button>`; }).join("");
  openHub("🎮 العب", `<div class="hub-grid">${tiles}</div>`);
}
function applyHomeMode() { document.body.classList.toggle("simple-home", !(state && state.allActivities)); }
function showTools() {
  openHub("🧰 أدوات", `<div class="hub-grid">${TOOLS.map(t =>
    `<button class="hub-tile" onclick="openTool('${t.fn}')"><span>${t.icon}</span>${escapeHtml(t.name)}</button>`).join("")}</div>`);
}
function openTool(fn) {
  closePopup("hubPopup");
  setTimeout(() => window[fn](), 0);
}
function openHub(title, html) {
  if (typeof placeHubDone !== "undefined") placeHubDone = null;
  document.getElementById("hubTitle").textContent = title;
  document.getElementById("hubBody").innerHTML = html;
  document.getElementById("hubPopup").classList.add("active");
}
function speakStory() {
  const cur = getCurrentVerse(); if (!cur || !cur.verse.story) return;
  playStoryAudio(cur.verse);
}
function renderScene(v) {
  const img = document.getElementById("storyImg");
  if (!img) return;
  const src = (typeof SCENES !== "undefined") ? SCENES[v.id] : null;
  // v105: الصورة نفسها ظاهرة أعلى الدرس، فلا تتكرر داخل بطاقة القصة
  const shown = !!document.querySelector("#gameArea .scene-img") && document.getElementById("gameScreen").style.display !== "none";
  if (src && !shown) { img.src = src; img.style.display = "block"; } else { img.removeAttribute("src"); img.style.display = "none"; }
}
/* القصة الطويلة تُعرض أولاً حتى نهاية جملة قريبة، ثم «أكمل القصة» لمن أراد. الاستماع يقرأ القصة كاملة */
const STORY_FOLD = 230;
function setStoryText(el, story) {
  el.textContent = "";
  if (story.length <= STORY_FOLD + 80) { el.textContent = story; return; }
  let cut = story.lastIndexOf(".", STORY_FOLD);
  if (cut < 90) cut = story.indexOf(".", STORY_FOLD);
  if (cut < 0 || cut > story.length - 60) { el.textContent = story; return; }
  el.appendChild(document.createTextNode(story.slice(0, cut + 1)));
  const more = document.createElement("button");
  more.className = "tool-btn story-more"; more.type = "button"; more.textContent = "📖 أكمل القصة";
  more.onclick = () => { el.textContent = story; };
  el.appendChild(document.createElement("br"));
  el.appendChild(more);
}
/* v105: 24 قصة تتكرر على 67 بيتاً (قصة بحيرى بعد سبعة أبيات متتالية)؛ فإن كانت قصة البيت هي قصة البيت قبله
   في المحطة نفسها لا تُعاد قراءتها، وتظهر مطويّة، ويكفي شرح البيت لبيان ما أضافه */
function storySameAsPrev(v) {
  if (!v || !v.story) return false;
  for (const st of content.journeyData) {
    const i = st.verses.findIndex(x => x.id === v.id);
    if (i >= 0) return i > 0 && st.verses[i - 1].story === v.story;
  }
  return false;
}
/* v105: القصة القصيرة للصغير: أول جملتين، والباقي بزر */
function storyShortPart(story) {
  const parts = String(story || "").match(/[^.!؟]+[.!؟]*/g) || [];
  return parts.length > 2 ? parts.slice(0, 2).join("").trim() : "";
}
function renderStoryContent(v) {
  if (typeof markStoryRead === "function") markStoryRead(v.id);
  renderScene(v);
  renderKhilaf(v);
  if (typeof guideCampfire === "function") guideCampfire();
  const el = document.getElementById("storyText");
  const short = typeof isSmallKid === "function" && isSmallKid() ? storyShortPart(v.story) : "";
  if (storySameAsPrev(v)) {
    el.innerHTML = `<div class="story-same">📖 ${escapeHtml(kidLine("storySame"))}</div>`;
    const more = document.createElement("button");
    more.className = "tool-btn story-more"; more.type = "button"; more.textContent = "📖 القصة كاملة";
    more.onclick = () => { setStoryText(el, v.story || ""); if (typeof playStoryAudio === "function") playStoryAudio(v, { force: true }); };
    el.appendChild(more);
  } else if (short) {
    el.textContent = short;
    const more = document.createElement("button");
    more.className = "tool-btn story-more"; more.type = "button"; more.textContent = "📖 أكمل القصة";
    more.onclick = () => { el.textContent = v.story; };
    el.appendChild(document.createElement("br")); el.appendChild(more);
  } else setStoryText(el, v.story || "");
  const srcs = (v.sources && v.sources.length) ? v.sources : (v.source ? [v.source] : []);
  document.getElementById("storySource").innerHTML =
    (srcs.length ? srcs.map(escapeHtml).join("<br>• ") : "غير موثق") + docGradeHtml(v) + noteHtml(v) + quranHtml(v);
}
function renderKhilaf(v) {
  const box = document.getElementById("khilafBox");
  if (!box) return;
  const k = (typeof KHILAF !== "undefined") ? KHILAF[v.id] : null;
  const wrap = document.getElementById("khilafWrap");
  if (!k) { if (wrap) wrap.style.display = "none"; box.innerHTML = ""; return; }
  box.innerHTML = `
    <div class="khilaf-title">🤔 ${escapeHtml(k.title)}</div>
    <div class="khilaf-agreed"><strong>ما اتفقوا عليه:</strong> ${escapeHtml(k.agreed)}</div>
    <div class="khilaf-sides">${k.sides.map(s => `<div class="khilaf-side"><strong>${escapeHtml(s.who)}:</strong> ${escapeHtml(s.text)}<div class="khilaf-src">📚 ${escapeHtml(s.source)}</div></div>`).join("")}</div>
    <div class="khilaf-q">❓ ${escapeHtml(k.question)}</div>
    <ul class="khilaf-think">${k.think.map(t => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
    <div class="khilaf-pick"><div>🔍 أيُّ القولين أقرب إلى فهمك؟ (لا توجد إجابة خاطئة)</div>
      <div class="word-bank">${k.sides.map((s, i) => `<button class="word-btn" onclick="khilafPick('${v.id}', ${i}, this)">${escapeHtml(s.who)}</button>`).join("")}</div>
      <div class="khilaf-reply" id="khilafReply"></div>
    </div>`;
  if (wrap) wrap.style.display = "block";
}
function khilafPick(id, i, btn) {
  const k = KHILAF[id]; if (!k) return;
  btn.parentElement.querySelectorAll(".word-btn").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  document.getElementById("khilafReply").innerHTML =
    `${gForm("اخترتَ", "اخترتِ")} «${escapeHtml(k.sides[i].who)}». ${gForm("أحسنتَ", "أحسنتِ")} التفكير! اسأل نفسك: ما الدليل الذي يقوي هذا القول؟ وهل نعرف رأي الآخر؟ وإن لم تجد الجواب الحاسم، فقل: «لا أعرف بعد»، وهذه من الأمانة في العلم.`;
}
/* المشتّتات من محطات أخرى، ولا تشترك مع الجواب في كلمة مهمة، حتى لا يكون المشتّت صحيحاً أيضاً */
const EVENT_STOP = new Set(["نبي", "رسول", "الله", "صلي", "عليه", "سلم", "اول", "بعد", "قبل", "مع", "الي", "في", "من", "عن", "علي", "ثم"]);
function eventWords(e) {
  return new Set(normalizeArabic(e).split(" ").map(t => t.replace(/^(و|ف|ب|ل)?ال/, "")).filter(t => t.length >= 3 && !EVENT_STOP.has(t)));
}
/* v105: كان الجواب الصحيح يشارك البيتَ لفظاً في 43% من الأبيات («ففرّ» ← «فرار الصحابة») والمشتّتات من محطات بعيدة،
   فيُحلّ السؤال بمطابقة الكلمة. الآن يُقدَّم من المشتّتات ما يشارك البيت لفظاً أيضاً، ومن المحطة نفسها أو المجاورة،
   ولا يُختار حدث بيتٍ قصتُه قصةُ هذا البيت، ولا حدثٌ يشارك الجوابَ لفظاً (فلا يكون للسؤال جوابان). */
function eventLexShare(a, b) {
  return [...a].some(x => [...b].some(y => x.length >= 3 && y.length >= 3 && (x === y || x.includes(y) || y.includes(x))));
}
function eventChoicesFor(v) {
  const mine = eventWords(v.event), verseW = eventWords(v.fullVerse || "");
  const homeSi = content.journeyData.findIndex(st => st.verses.some(x => x.id === v.id));
  const seen = new Set([normalizeArabic(v.event)]), cand = [];
  content.journeyData.forEach((st, si) => st.verses.forEach(x => {
    if (x.id === v.id || !x.event) return;
    const key = normalizeArabic(x.event); if (seen.has(key)) return; seen.add(key);
    if (v.story && x.story === v.story) return;
    const ew = eventWords(x.event);
    if (eventLexShare(ew, mine)) return;
    const score = (eventLexShare(ew, verseW) ? 2 : 0) + (si === homeSi ? 1 : Math.abs(si - homeSi) === 1 ? 0.5 : 0) + Math.random() * 0.6;
    cand.push({ e: x.event, score });
  }));
  cand.sort((a, b) => b.score - a.score);
  return [v.event, ...cand.slice(0, 2).map(c => c.e)].sort(() => Math.random() - .5);
}
/* قبل القصة: سؤال واحد عن حدث البيت، ثم تظهر القصة مباشرة */
function askEventBeforeStory(v) {
  const opts = eventChoicesFor(v);
  guideSay("ask", kidLine("askEvent"), opts);
  document.getElementById("storyText").innerHTML = `
    <div style="font-weight:bold;margin-bottom:8px">${sayBtnHTML([kidLine("eventQ"), ...opts], "استمع للسؤال")} 🧩 ${escapeHtml(kidLine("eventQ"))}</div>
    <div class="word-bank">${optionsHTML(opts, o => `answerEventQ(this,'${escapeForAttr(o)}','${v.id}')`)}</div>`;
  document.getElementById("sourcesWrap").style.display = "none";
  document.getElementById("khilafWrap").style.display = "none";
  document.getElementById("storyImg").style.display = "none";
  document.getElementById("storyBox").style.display = "block";
}
function answerEventQ(btn, chosen, vid) {
  const v = content.journeyData.flatMap(st => st.verses).find(x => x.id === vid);
  if (!v) return;
  document.querySelectorAll("#storyText .word-btn").forEach(b => b.disabled = true);
  // v105: فقاعة «ماذا حدث هنا؟» تُغلق بعد الإجابة، وكانت تبقى فوق سطر من القصة
  if (typeof guideHidePanel === "function") guideHidePanel();
  const good = chosen === v.event;
  btn.classList.add(good ? "success" : "fail");
  // v104: الخطأ يعلّم: يُضاء الجواب الصحيح، ويظهر الشرح بعد الإجابة لا قبلها
  if (!good) [...document.querySelectorAll("#storyText .word-btn")].filter(b => b.textContent === v.event).forEach(b => b.classList.add("success"));
  if (typeof showMeaningAfterEvent === "function") showMeaningAfterEvent(v);
  if (good) { playSuccess(); if (firstCreditToday("event|" + v.id)) addPoints(2); } else playFail();
  if (!good) {
    state.eventMisses = state.eventMisses || {};
    state.eventMisses[v.id] = (state.eventMisses[v.id] || 0) + 1;
  }
  state.storyUnlocked = state.storyUnlocked || {};
  state.storyUnlocked[v.id] = true; saveState();
  setTimeout(() => {
    document.getElementById("sourcesWrap").style.display = "block";
    renderStoryContent(v);
    playStoryAudio(v);
  }, good ? 500 : 1200);
}

/* وضع التصفّح للوالد: زر «التالي» يتجاوز الحلّ، ويُفتح بالرقم السري للوالدين من أيقونة 🔐.
   للعرض فقط: لا نقاط ولا إتقان ولا إتمام محطات، ولا يغيّر موضع الطفل في درسه (انظر noCredit) */
function isBrowse() {
  try { return sessionStorage.getItem("browseOn") === "1"; } catch(e) { return false; }
}
function refreshBrowseUI() {
  updateBrowsePanel();
  const b = document.getElementById("browseNextBtn");
  if (b) b.style.display = isBrowse() ? "inline-block" : "none";
  const e = document.getElementById("browseEntryBtn");
  if (e) e.style.opacity = isBrowse() ? "1" : ".6";
}
function openBrowseCode() {
  if (isBrowse()) {
    try { sessionStorage.removeItem("browseOn"); } catch(e) {}
    refreshBrowseUI();
    showToast("أُغلق وضع التصفح", "success");
    return;
  }
  requirePin(() => {
    try { sessionStorage.setItem("browseOn", "1"); } catch(e) {}
    refreshBrowseUI();
    showToast("وضع التصفح مفعّل (للعرض فقط، لا يُحتسب تقدّم)", "success");
  }, "وضع التصفّح للوالدين، أدخل الرقم السري");
}
function browseNext() {
  if (!isBrowse()) return;
  const si = state.selectedStation;
  const st = content.journeyData[si];
  if (!st) { showMap(); return; }
  if (state.selectedVerse < st.verses.length - 1) {
    state.selectedVerse++;
  } else if (si < content.journeyData.length - 1) {
    state.selectedStation = si + 1;
    state.selectedVerse = 0;
  } else {
    showMap(); return;
  }
  saveState(); loadVerse();
}

/* ---------- الإعدادات: سرعة القراءة، حجم الخط، الوضع الليلي ---------- */
const PREFS_KEY = "hasaniya_prefs";
/* night و reduceMotion: null = حسب إعداد الجهاز، true/false = اختيار الطفل أو الوالد */
function getPrefs() {
  const d = { rate: "normal", big: false, night: null, reduceMotion: null, systemFont: false };
  try { return Object.assign(d, JSON.parse(localStorage.getItem(PREFS_KEY) || "{}")); }
  catch(e) { return d; }
}
function setPref(k, v) {
  const p = getPrefs(); p[k] = v;
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch(e) {}
  applyPrefs(); renderSettings();
  if (k === "vacation" && typeof guideSleep === "function") {
    guideSleep(!!v);
    if (document.getElementById("mapScreen").style.display !== "none") guideShowActions();
  }
}
function applyPrefs() {
  const p = getPrefs();
  const mq = q => !!(window.matchMedia && matchMedia(q).matches);
  const dark = (p.night === null || p.night === undefined) ? mq("(prefers-color-scheme: dark)") : !!p.night;
  const still = (p.reduceMotion === null || p.reduceMotion === undefined) ? mq("(prefers-reduced-motion: reduce)") : !!p.reduceMotion;
  document.body.classList.toggle("text-big", !!p.big);
  document.body.classList.toggle("night", dark);
  document.body.classList.toggle("reduce-motion", still);
  document.body.classList.toggle("system-font", !!p.systemFont);
}
/* يتابع تغيّر إعداد الجهاز ما دام الطفل لم يختر بنفسه */
if (window.matchMedia) {
  ["(prefers-color-scheme: dark)", "(prefers-reduced-motion: reduce)"].forEach(q => {
    const m = matchMedia(q);
    if (m.addEventListener) m.addEventListener("change", () => applyPrefs());
  });
}
function speechRate() { return getPrefs().rate === "slow" ? 0.6 : 0.85; }
function openSettings() {
  renderSettings();
  document.getElementById("settingsPopup").classList.add("active");
}
function renderSettings() {
  const p = getPrefs();
  const btn = (label, on, js) => `<button class="word-btn ${on ? "selected" : ""}" onclick="${js}">${label}</button>`;
  document.getElementById("settingsBody").innerHTML = `
    <div class="set-row"><div class="set-label">🐢 سرعة القراءة بالصوت</div><div class="word-bank">
      ${btn("عادي", p.rate !== "slow", "setPref('rate','normal')")}${btn("بطيء", p.rate === "slow", "setPref('rate','slow')")}</div></div>
    <div class="set-row"><div class="set-label">🔤 حجم الخط</div><div class="word-bank">
      ${btn("عادي", !p.big, "setPref('big',false)")}${btn("كبير", !!p.big, "setPref('big',true)")}</div></div>
    <div class="set-row"><div class="set-label">🌙 الوضع الليلي</div><div class="word-bank">
      ${btn("حسب الجهاز", p.night === null || p.night === undefined, "setPref('night',null)")}${btn("إيقاف", p.night === false, "setPref('night',false)")}${btn("تشغيل", p.night === true, "setPref('night',true)")}</div></div>
    <div class="set-row"><div class="set-label">🎞️ تقليل الحركة</div><div class="word-bank">
      ${btn("حسب الجهاز", p.reduceMotion === null || p.reduceMotion === undefined, "setPref('reduceMotion',null)")}${btn("إيقاف", p.reduceMotion === false, "setPref('reduceMotion',false)")}${btn("تشغيل", p.reduceMotion === true, "setPref('reduceMotion',true)")}</div></div>
    <div class="set-row"><div class="set-label">🔤 خط الأبيات</div><div class="word-bank">
      ${btn("خط النسخ المضمّن", !p.systemFont, "setPref('systemFont',false)")}${btn("خط الجهاز", !!p.systemFont, "setPref('systemFont',true)")}</div></div>
    <div class="set-row"><div class="set-label">🏖️ وضع الإجازة لناجي</div><div class="word-bank">
      ${btn("إيقاف", !p.vacation, "setPref('vacation',false)")}${btn("تشغيل", !!p.vacation, "setPref('vacation',true)")}</div></div>
    <div class="set-row"><div class="set-label">🔔 تذكير لطيف بعد الغياب</div><div class="word-bank">
      ${btn("تشغيل", p.absenceNudge !== false, "setPref('absenceNudge',true)")}${btn("إيقاف", p.absenceNudge === false, "setPref('absenceNudge',false)")}</div></div>
    <div class="set-row"><div class="set-label">💾 حفظ التقدم في ملف</div>
      <button class="action-btn btn-info" onclick="exportProgress()">تصدير التقدم</button></div>
    <div class="set-row"><div class="set-label">📂 فتح ملف (تقدّم، أو تسجيلات للتقييم، أو تقييم)</div>
      <input type="file" accept="application/json" onchange="openSharedFile(this.files[0])"></div>`;
}

/* ---------- حفظ التقدم واستعادته ---------- */
function exportProgress() {
  try {
    const blob = new Blob([JSON.stringify({ app: "hasaniya", exportedAt: new Date().toISOString(), state }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "hasaniya-progress.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showToast("تم تصدير التقدم", "success");
  } catch(e) { showToast("تعذّر التصدير", "error"); }
}
function importProgress(file) { openSharedFile(file); }

/* ---------- رحلة المحطات: قائمة المحطات كاملة، تُفتح من الأدوات لا من الشاشة الرئيسية ---------- */
let showStationList = false;
function toggleStationList() {
  showStationList = !showStationList;
  if (typeof showMap === "function") showMap();
}

/* ---------- أكمل من حيث توقفت ---------- */
/* v105: «تابع الرحلة» يمر بالخطة اليومية نفسها: المراجعة أولاً ثم الجديد في حدّه */
function resumeJourney() { startDailyLesson(); }

/* ---------- قفزة إلى بيت في وضع التصفّح ---------- */
function updateBrowsePanel() {
  const panel = document.getElementById("browsePanel");
  if (!panel) return;
  if (!isBrowse()) { panel.style.display = "none"; return; }
  panel.style.display = "block";
  const sel = document.getElementById("jumpStation");
  if (!sel.options.length) {
    sel.innerHTML = content.journeyData.map((st, i) => `<option value="${i}">${escapeHtml(st.title)}</option>`).join("");
    sel.value = String(state.selectedStation || 0);
    fillJumpVerses(state.selectedVerse || 0);
  }
}
function fillJumpVerses(keep) {
  const si = +document.getElementById("jumpStation").value;
  const st = content.journeyData[si];
  if (!st) return;
  document.getElementById("jumpVerse").innerHTML = st.verses.map((v, j) =>
    `<option value="${j}">${j + 1}: ${escapeHtml(v.words.slice(0, 2).join(" "))}</option>`).join("");
  if (typeof keep === "number") document.getElementById("jumpVerse").value = String(keep);
}
function goBrowseJump() {
  if (!isBrowse()) return;
  const si = +document.getElementById("jumpStation").value;
  const j = +document.getElementById("jumpVerse").value || 0;
  const st = content.journeyData[si];
  if (!st) return;
  state.selectedStation = si; state.selectedVerse = j;
  saveState();
  playMode = MODE_NORMAL;
  state.dailyLeft = null; state.dailyIds = [];
  enterPlayScreen(st.title);
}

applyPrefs();

/* مراكز مجمّعة: كل واحد يجمع أدوات متقاربة، ويُغلق الصندوق قبل فتح الأداة (openTool) */
function openReviewHub() {
  const mistakes = Object.keys(state.mistakes || {}).length;
  const tile = (fn, icon, name, n) => `<button class="hub-tile" onclick="openTool('${fn}')"><span>${icon}</span>${escapeHtml(name)}${n ? ` (${n})` : ""}</button>`;
  openHub("🔁 مراجعة", `<div class="hub-grid">
    ${tile("startDaily", "📅", "مراجعة اليوم", dailyReviewCount())}
    ${tile("startReview", "🎯", "مراجعة الأخطاء", mistakes)}
    ${typeof isSmallKid === "function" && isSmallKid() ? "" : tile("showMistakesReview", "🧠", "عرض الأخطاء", mistakes)}
    ${tile("showLeitnerBoxes", "🗃️", "صناديق الحفظ", 0)}
    ${typeof isSmallKid === "function" && isSmallKid() ? tile("startRiddles", "🧩", "الألغاز", 0) : ""}
  </div>`);
}
function showTrainHub() {
  const tile = (fn, icon, name) => `<button class="hub-tile" onclick="openTool('${fn}')"><span>${icon}</span>${escapeHtml(name)}</button>`;
  openHub("🧩 تدريب", `<div class="hub-grid">
    ${tile("showExercises", "🧭", "تمارين")}
    ${tile("startHideLevels", "🧩", "إخفاء تدريجي")}
    ${tile("showRecallMenu", "🔑", "تذكّر")}
    ${tile("startTapOrderHub", "👆", "رتّب بالنقر")}
  </div>`);
}
function showAchievementsHub() {
  const tile = (fn, icon, name) => `<button class="hub-tile" onclick="openTool('${fn}')"><span>${icon}</span>${escapeHtml(name)}</button>`;
  openHub("🏆 إنجازاتي", `<div class="hub-grid">
    ${tile("showMyBadges", "🏅", "أوسمتي الجديدة")}
    ${tile("showAchievements", "🏆", "الإنجازات")}
  </div>`);
}
function showChallengesHub() {
  const tile = (fn, icon, name) => `<button class="hub-tile" onclick="openTool('${fn}')"><span>${icon}</span>${escapeHtml(name)}</button>`;
  openHub("⚡ التحديات", `<div class="hub-grid">
    ${tile("startChallenge", "⚡", "تحدٍّ")}
    ${tile("showWeekly", "🏅", "تحدّي الأسبوع")}
  </div>`);
}
