/* المرشد «ناجي» 🐪: يتحرك ويتكلم ويشجّع الطفل في المواقف المختلفة */

const GUIDE_NAME = "ناجي";
/* {N} تُستبدل باسم الطفل مع «يا» (انظر guideFill). الأفعال تتبع جنس الطفل */
const GUIDE_LINES = {
  welcome: () => [
    "أهلاً بك في رحلة السيرة {N}! هيا نبدأ 🌙",
    gForm("أهلاً {N}! سنسافر معاً عبر السيرة 🐪", "أهلاً {N}! سنسافر معاً عبر السيرة 🐪")
  ],
  mastery: () => [
    gForm("ممتاز {N}! أتقنتَ البيت 🌟", "ممتاز {N}! أتقنتِ البيت 🌟"),
    "هكذا تُحفظ القصيدة بيتاً بيتاً، ثم نُسمّعها كلها معاً 🔁"
  ],
  station: () => [
    gForm("أحسنتَ {N}! فُتحت محطة جديدة 🎉", "أحسنتِ {N}! فُتحت محطة جديدة 🎉"),
    "الرحلة تزداد جمالاً، هيا نكمل 🐪"
  ],
  wrong: () => [
    gForm("لا بأس {N}، الخطأ جزء من التعلم. حاول مرة أخرى 💛", "لا بأس {N}، الخطأ جزء من التعلم. حاولي مرة أخرى 💛"),
    gForm("{N}، أنت قادر، فكّر قليلاً ثم جرّب 🌿", "{N}، أنتِ قادرة، فكّري قليلاً ثم جرّبي 🌿")
  ],
  review: () => [
    gForm("{N}، سمّع القصيدة كلها مرة واحدة، فالتكرار يثبّت الحفظ 🔁", "{N}، سمّعي القصيدة كلها مرة واحدة، فالتكرار يثبّت الحفظ 🔁"),
    "التسميع المتصل يربط الأبيات ببعضها 📜"
  ],
  ask: () => [gForm("{N}، ماذا حدث هنا؟ اختر الإجابة الصحيحة 🐪", "{N}، ماذا حدث هنا؟ اختاري الإجابة الصحيحة 🐪")],
  finale: () => [
    gForm("أتممتَ الرحلة كاملة {N}! 🏆", "أتممتِ الرحلة كاملة {N}! 🏆"),
    gForm("لقد حفظتَ القصيدة وعرفتَ السيرة، أنا فخور بك 🐪", "لقد حفظتِ القصيدة وعرفتِ السيرة، أنا فخورة بك 🐪")
  ],
  back: () => [
    "اشتقتُ إليك {N}! هيا نُكمل الرحلة معاً 💛",
    "نمتُ قليلاً وانتظرتك، هيا نُكمل 🐪"
  ]
};
const GUIDE_ANIM = { mastery: "jump", station: "spin", wrong: "shake", review: "bob", welcome: "bob", back: "jump", ask: "bob", finale: "spin" };

/* لباس ناجي يتغيّر مع تقدم الرحلة */
const GUIDE_OUTFITS = [
  { at: 1, icon: "🧣", name: "وشاح الصحراء" },
  { at: 3, icon: "🎒", name: "حقيبة السفر" },
  { at: 5, icon: "🧭", name: "البوصلة" },
  { at: 7, icon: "🏮", name: "الفانوس" },
  { at: 9, icon: "👑", name: "تاج الإتقان" }
];
function renderGuideOutfit() {
  const el = document.getElementById("guideOutfit");
  if (!el) return;
  const done = content.journeyData.filter(s => getStationStatus(s) === "completed").length;
  const cur = [...GUIDE_OUTFITS].reverse().find(o => done >= o.at);
  el.textContent = cur ? cur.icon : "";
  el.title = cur ? cur.name : "";
}
function showFinale() {
  const pop = document.getElementById("finalePopup");
  if (!pop) return;
  document.getElementById("finaleTitle").textContent = "🏆 " + guideVocative() + "، " + gForm("أتممتَ", "أتممتِ") + " الرحلة كاملة!";
  document.getElementById("finaleText").textContent = gForm("حفظتَ القصيدة وعرفتَ السيرة من أولها إلى آخرها.", "حفظتِ القصيدة وعرفتِ السيرة من أولها إلى آخرها.");
  guideDance(true);
  guideSay("finale");
  pop.classList.add("active");
  launchConfetti();
  setTimeout(() => guideDance(false), 4000);
}

/* القراءة التلقائية (v100): يضبطها الوالد من شاشة الأسرة، ومفعّلة افتراضياً لمن لا يقرأ.
   تشمل فقاعات ناجي ورسائل الطفل والتعليمات والأسئلة. لا تتكلم فوق التسجيل ولا فوق صوت آخر */
function autoReadOn() { const p = getPrefs(); return p.autoRead !== false && p.guideVoice !== false; }
function guideVoiceOn() { return autoReadOn(); }
function cleanSpeech(t) { return String(t || "").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "").replace(/\s+/g, " ").trim(); }
/* v101: كل القراءة تمرّ من voicePlay (voice.js): تسجيل الوالد أو المعلم أولاً، ثم القارئ الآلي */
function autoSay(text) {
  if (!autoReadOn() || (typeof recIsActive === "function" && recIsActive())) return;
  voicePlay(text, { polite: true, silent: true });
}
/* زر 🔊 بجانب أي نص: يقرؤه عند الضغط (لا أثناء التسجيل). القائمة تُمرَّر نصوصاً مفصولة بـ␞ */
const SAY_SEP = "\u241E";
function sayText(t) { if (typeof recIsActive === "function" && recIsActive()) return; voicePlay(String(t).split(SAY_SEP)); }
function sayBtnHTML(t, label) { const v = Array.isArray(t) ? t.join(SAY_SEP) : String(t); return `<button class="say-btn" type="button" aria-label="${escapeHtml(label || "استمع")}" onclick="sayText('${escapeForAttr(v)}')">🔊</button>`; }
/* قراءة تلقائية لسؤال جديد: تقطع ما قبلها، لأن السؤال الجديد أهم من بقية الرسالة السابقة */
function autoSayNow(text) { if (!autoReadOn() || (typeof recIsActive === "function" && recIsActive())) return; return voicePlay(text, { silent: true }); }
/* فقاعة ظهرت أثناء التسجيل تُحجز ولا تُعرض، ثم تظهر بعد انتهائه إن لم يمضِ عليها وقت طويل */
let heldVoice = null;
function flushHeldVoice() {
  const h = heldVoice; heldVoice = null;
  if (h && Date.now() - h.at < 20000) setTimeout(() => h.run(), 400);
}

/* الاسم في النداء: «يا اسم الطفل»، أو «يا صديقي» إن لم يكن الاسم مُدخلاً */
function guideVocative() {
  const u = getCurrentUser();
  // الاسم الافتراضي «طفلي» قبل أن يكتب الوالد اسم الطفل لا يُنادى به
  return "يا " + (u && u.name && u.name !== "طفلي" ? u.name : gForm("صديقي", "صديقتي"));
}
function guideFill(t) { return String(t).replace(/\{N\}/g, guideVocative()); }
/* رسالة للطفل تبدأ باسمه: تنبيه أو تشجيع */
/* parts: ما يُقرأ إن اختلف عن النص (رسالة فيها كلمة متغيّرة: «الصحيح هو:» ثم الكلمة) */
function kidToast(msg, t, parts) { const m = guideVocative() + "، " + msg; showToast(m, t || ""); autoSay(parts ? [guideVocative(), ...parts] : m); }

function guideSay(mood, customText, extraVoice) {
  const bubble = guideBubbleEl();
  const body = document.getElementById("guideBody");
  const wrap = document.getElementById("guide");
  if (!bubble || !body || !wrap) return;
  if (typeof recIsActive === "function" && recIsActive()) { heldVoice = { at: Date.now(), run: () => guideSay(mood, customText, extraVoice) }; return; }
  const lines = customText ? [customText] : (GUIDE_LINES[mood] ? GUIDE_LINES[mood]() : ["🐪"]);
  const text = guideFill(lines[Math.floor(Math.random() * lines.length)]);
  bubble.textContent = text;
  bubble.classList.add("show");
  wrap.classList.remove("jump", "shake", "spin", "bob");
  void body.offsetWidth; // لإعادة تشغيل الحركة
  wrap.classList.add(GUIDE_ANIM[mood] || "bob");
  clearTimeout(guideSay.hideTimer);
  guideSay.hideTimer = setTimeout(() => guideHidePanel(), 6000);
  if (guideVoiceOn()) speakPlainArabic(extraVoice && extraVoice.say ? extraVoice.say : [text, ...(extraVoice || [])]);
}
/* صوت ناجي: لا يتكلم فوق تسجيل أو صوت آخر */
function speakPlainArabic(text) { return voicePlay(text, { polite: true, silent: true }); }

/* النقر على ناجي يعطي تشجيعاً عشوائياً */
function guideTap() {
  lastActivity = Date.now();
  if (document.getElementById("guide").classList.contains("sleep")) {
    guideSleep(false);
    guideSay("back");
    return;
  }
  guideShowActions();
}

/* ---------- لوحة ناجي: نص واحد وأزرار تفعل شيئاً فعلاً ---------- */
/* فقاعة ناجي: في الخريطة تحت ناجي، وأثناء اللعب فقاعة عائمة أسفل الشاشة */
function guideBubbleEl() {
  const mapOn = document.getElementById("mapScreen") && getComputedStyle(document.getElementById("mapScreen")).display !== "none";
  const modalOn = !!document.querySelector(".modal-overlay.active");
  if (mapOn && !modalOn) return document.getElementById("guideBubble");
  let f = document.getElementById("guideFloat");
  if (!f) {
    f = document.createElement("div");
    f.id = "guideFloat"; f.className = "guide-bubble guide-float";
    document.body.appendChild(f);
  }
  return f;
}
function guidePanel(text, actions, targetEl, extraVoice) {
  const bubble = guideBubbleEl();
  if (!bubble) return;
  // لا تغطّي الفقاعة نموذج إنشاء الطفل أو الرقم السري
  if (document.querySelector("#userEditorPopup.active, #pinPopup.active")) return;
  // ولا تظهر أثناء تسجيل الطفل: تُحجز حتى ينتهي
  if (typeof recIsActive === "function" && recIsActive()) { heldVoice = { at: Date.now(), run: () => guidePanel(text, actions, targetEl, extraVoice) }; return; }
  text = guideFill(text);
  document.querySelectorAll(".guide-target").forEach(el => el.classList.remove("guide-target"));
  if (targetEl) targetEl.classList.add("guide-target");
  bubble.innerHTML = "";
  const close = document.createElement("button");
  close.className = "guide-x"; close.textContent = "✕"; close.setAttribute("aria-label", "إغلاق");
  close.onclick = ev => { ev.stopPropagation(); guideHidePanel(); };
  const p = document.createElement("div"); p.className = "guide-text"; p.textContent = text;
  bubble.appendChild(close); bubble.appendChild(p);
  if (actions && actions.length) {
    const row = document.createElement("div"); row.className = "guide-actions";
    actions.forEach(a => {
      const b = document.createElement("button");
      b.className = "tool-btn guide-act"; b.textContent = a.label;
      b.onclick = ev => { ev.stopPropagation(); guideHidePanel(); a.run(); };
      row.appendChild(b);
    });
    bubble.appendChild(row);
  }
  clearTimeout(guideSay.hideTimer);
  bubble.classList.add("show");
  /* الفقاعة العائمة تحجز مساحة أسفل الصفحة، وتختفي وحدها بعد 25 ثانية إن لم يلمسها الطفل */
  if (bubble.id === "guideFloat") {
    document.body.classList.add("guide-open");
    guideSay.hideTimer = setTimeout(() => guideHidePanel(), 25000);
  }
  if (guideVoiceOn()) speakPlainArabic(extraVoice && extraVoice.say ? extraVoice.say : [text, ...(extraVoice || [])]);
}
/* عروض ناجي ذات الأزرار (المعنى، ساعدني) تُخفى عند الإجابة أو الانتقال، فلا تحجب زر «التالي» */
function guideHideOffers() {
  const f = document.getElementById("guideFloat");
  if (f && f.classList.contains("show") && f.querySelector(".guide-actions")) guideHidePanel();
}
function guideHidePanel() {
  document.body.classList.remove("guide-open");
  document.querySelectorAll(".guide-target").forEach(el => el.classList.remove("guide-target"));
  ["guideBubble", "guideFloat"].forEach(id => {
    const bubble = document.getElementById(id);
    if (!bubble) return;
    bubble.classList.remove("show");
    bubble.innerHTML = "";
  });
}
/* المحطة المفتوحة الآن (ليست مكتملة ولا مقفلة) */
function guideOpenStation() {
  return content.journeyData.find(s => { const st = getStationStatus(s); return st !== "completed" && st !== "locked"; }) || null;
}
/* ماذا يفعل الطفل الآن؟ يُبنى من حالة الرحلة الفعلية */
function guideShowActions(greet) {
  if (!content.journeyData || !content.journeyData.length) return;
  guideHidePanel();
  if (getPrefs().vacation) {
    guidePanel(kidLine("vacation"), []);
    return;
  }
  guideTouchToday();
  applyGuideHue();
  const name = getUserName();
  const acts = [];
  let text, target = null;
  /* say: ما يُسمع بدل النص (الأرقام تبقى مكتوبة، والمسموع جمل ثابتة قابلة للتسجيل) */
  let say = [];
  const open = guideOpenStation();
  if (open) {
    const idx = content.journeyData.indexOf(open);
    target = document.querySelectorAll(".station")[idx] || null;
    const pos = state.versePositions[open.id] || 0;
    const left = open.verses.length - pos;
    text = `المحطة الحالية: ${open.title}. ` + (pos > 0 ? `توقّفنا عند البيت ${pos + 1}، ` : "") +
      `وبقي ${left} ${left === 1 ? "بيت" : "أبيات"}.`;
    say = [kidLine("currentStation"), open.title, ...(pos > 0 ? [kidLine("resumeHere")] : []), kidLine("letsContinue")];
    acts.push({ label: "▶ تابع الرحلة", run: () => resumeJourney() });
    if (!guideChallenge) acts.push({ label: "⏱ تحدي 5 دقائق", run: () => guideStartChallenge() });
  } else {
    text = kidLine("allStationsGuide");
    say = [guideFill(text)];
    acts.push({ label: "🏆 شهادة الرحلة", run: () => certSave(JOURNEY_CERT) });
  }
  if (state.recentDone) {
    const si = content.journeyData.findIndex(s => s.id === state.recentDone);
    if (si >= 0) acts.push({ label: "🎧 استمع للقصص", run: () => guidePlayStationStories(si) });
    state.recentDone = null; saveState();
  }
  guideWalkerPlace(target);
  guidePlaceHidden();
  const due = leitnerDueVerses().length;
  if (due) {
    text += ` عندي ${due} ${due === 1 ? "بطاقة تنتظر" : "بطاقات تنتظر"} مراجعتك.`;
    say.push(kidLine("cardsWaiting"));
    acts.push({ label: "🗃️ راجع البطاقات", run: () => startLeitnerReview() });
  }
  if (learnedVerses("all").length >= 2) acts.push({ label: "🔁 سمّع ما حفظت", run: () => openRecPopup({ mode: "child", range: "all" }) });
  acts.push({ label: "📖 دفتر الرحلة", run: () => openGuideJournal() });
  if (guideNudgeDue()) { text = kidLine("missedYou") + " " + text; say.unshift(kidLine("missedYou")); }
  if (guideCheckStreak()) { text += " " + kidLine("streakBadge"); say.push(kidLine("streakBadge")); }
  if (greet) say.unshift(guideGreeting().trim(), guideFill(kidLine("helloN")));
  guidePanel((greet ? `${guideGreeting()}${kidLine("helloN")} ` : "") + text, acts.slice(0, 5), target, { say });
}
/* مساعدة محددة لبيت يتعثر فيه الطفل */
let guideHintKey = null;
function guideCheckStuck() {
  const gs = document.getElementById("gameScreen");
  if (!gs || getComputedStyle(gs).display === "none") return;
  if (Date.now() - lastActivity < 45000 || audioBusy()) return;
  const cur = getCurrentVerse(); if (!cur) return;
  if (guideHintKey === cur.verse.id) return;
  guideHintKey = cur.verse.id;
  lastActivity = Date.now();
  guidePanel(kidLine("needHelp"),
    [{ label: "🔊 استمع للبيت", run: () => playVerseAndStory(cur.verse, false) }],
    document.getElementById("speakFullBtn"));
}

/* احتفال حقيقي عند تسجيل الطفل: أول بيت، ثم كل خمسة أبيات */
async function guideOnRecorded(kind) {
  if (kind !== "verse" || typeof recAllForUser !== "function") return;
  const n = (await recAllForUser(activeUserId)).length;
  if (n === 1) guideAwardBadge("firstRec");
  if (n === 1) guideSay("mastery", kidLine("firstRec"));
  else if (n % 5 === 0) guideSay("mastery", gForm(`{N}، سجّلتَ ${n} أبيات بصوتك! 🌟`, `{N}، سجّلتِ ${n} أبيات بصوتك! 🌟`), { say: [guideFill(kidLine("recMore"))] });
}

let lastActivity = Date.now();
function setupGuide() {
  document.addEventListener("pointerdown", () => { lastActivity = Date.now(); });
  // كلمة الترحيب مرة واحدة في كل جلسة، أو الاستيقاظ بعد الغياب
  const away = guideCheckAbsence();
  if (away) {
    guideSleep(true);
  } else {
    try {
      if (!sessionStorage.getItem("guideWelcomed")) {
        sessionStorage.setItem("guideWelcomed", "1");
        setTimeout(() => { if (document.getElementById("mapScreen").style.display !== "none") guideShowActions(true); }, 900);
      }
    } catch(e) {}
  }
  // إذا تعثّر الطفل في بيت (دون ضغط لفترة) يعرض ناجي مساعدة محددة لهذا البيت
  setInterval(guideCheckStuck, 5000);
  // ردّ فعل على كل إجابة خاطئة
  if (typeof playFail === "function" && !playFail.guided) {
    const original = playFail;
    playFail = function () { original(); guideOnWrong(); };
    playFail.guided = true;
  }
}
document.addEventListener("DOMContentLoaded", setupGuide);

/* ---------- الدفعة الأولى: الرقص، والنوم بعد الغياب، والحقيبة، وسؤال ما قبل المحطة ---------- */

/* يرقص ناجي أثناء التسميع */
function guideDance(on) {
  const g = document.getElementById("guide");
  if (g) g.classList.toggle("dance", !!on);
}

/* النوم بعد الغياب: إن لم يفتح الطفل التطبيق منذ يومين */
const GUIDE_SEEN_KEY = "hasaniya_guide_seen";
const GUIDE_AWAY_MS = 2 * 24 * 60 * 60 * 1000;
function guideCheckAbsence() {
  let last = 0;
  try { last = +localStorage.getItem(GUIDE_SEEN_KEY) || 0; } catch(e) {}
  try { localStorage.setItem(GUIDE_SEEN_KEY, String(Date.now())); } catch(e) {}
  return last && (Date.now() - last > GUIDE_AWAY_MS);
}
function guideSleep(on) {
  const g = document.getElementById("guide");
  if (g) g.classList.toggle("sleep", !!on);
}

/* حقيبة ناجي: تُملأ برموز المحطات المكتملة */
function renderGuideCharms() {
  const el = document.getElementById("guideCharms");
  if (!el) return;
  const got = content.journeyData.filter(s => state.charms && state.charms[s.id]);
  renderGuideOutfit();
  el.innerHTML = got.length
    ? `🎒 ${got.map(s => `<span class="charm" title="${escapeForAttr(s.title)}">${escapeHtml(s.icon)}</span>`).join("")}`
    : `🎒 حقيبة ناجي فارغة، أكمل محطة لتملأها`;
}

/* أُلغي سؤال «أول كلمة» قبل المحطة: الطفل يرى البيت أولاً ثم يُسأل عنه داخل الدرس */
function maybeWarmup(station, onDone) { onDone(); }
