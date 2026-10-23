/* v101: الصوت الموحّد — كل نص يسمعه الطفل يمرّ من هنا.
   الأولوية: تسجيل الوالد أو المعلم لهذا النص بعينه، ثم القارئ الآلي احتياطاً.
   - الأبيات والقصص: بمعرّف البيت مع بصمة النص (authorRecFor).
   - كل نص آخر (رسائل ناجي، التعليمات، أسئلة الاختبار وخياراتها، الشرح، الألغاز، الأحداث، النقاش):
     بمفتاح مشتق من النص نفسه (lineKey)، فالخيار «بدر» يُسجَّل مرة ويُسمع في كل سؤال يرد فيه.
   - النداء «يا فلان» لا يدخل في التسجيل: يُقرأ وحده ثم تُسمع بقية الجملة المسجّلة.
   - لا صوت فوق التسجيل، وصوت واحد في كل لحظة (حَكَم الصوت في audio.js). */

/* ---------- رسائل الطفل الثابتة: [صيغة الولد، صيغة البنت] ----------
   كل رسالة هنا تظهر في «استوديو التسجيل» بصيغتيها. {N} موضع النداء باسم الطفل. */
const KID_LINES = {
  // تنبيهات
  stopRecFirst: ["أوقف التسجيل أولاً ثم استمع", "أوقفي التسجيل أولاً ثم استمعي"],
  allowMic: ["اسمح للتطبيق باستخدام الميكروفون", "اسمحي للتطبيق باستخدام الميكروفون"],
  finishPrev: ["🔒 أكمل المحطة السابقة أولاً", "🔒 أكملي المحطة السابقة أولاً"],
  needOneVerse: ["أكمل بيتاً واحداً على الأقل", "أكملي بيتاً واحداً على الأقل"],
  needOneFirst: ["أكمل بيتاً واحداً أولاً", "أكملي بيتاً واحداً أولاً"],
  needTwoStations: ["أكمل محطتين على الأقل لتلعب ترتيب المحطات", "أكملي محطتين على الأقل لتلعبي ترتيب المحطات"],
  startFirst: ["ابدأ الرحلة أولاً، ثم تدرّب هنا على ما حفظت", "ابدئي الرحلة أولاً، ثم تدرّبي هنا على ما حفظتِ"],
  notEnoughQs: ["لا توجد أسئلة كافية الآن، أكمل قصصاً أكثر", "لا توجد أسئلة كافية الآن، أكملي قصصاً أكثر"],
  noStories: ["لا توجد قصص في هذه المحطة"],
  noDoneStation: ["لا توجد محطة مكتملة الآن"],
  noOpenStation: ["لا توجد محطة مفتوحة الآن"],
  noLearned: ["لم تُحفظ أبيات بعد"],
  noSaved: ["لا توجد أبيات محفوظة بعد"],
  noRecs: ["لا توجد تسجيلات بعد"],
  nothingDue: ["لا شيء مستحق اليوم 🎉"],
  resetDone: ["تمّت إعادة التصفير"],
  // تشجيع ونتائج
  wellDone: ["أحسنتَ!", "أحسنتِ!"],
  tryAgain: ["حاول مرة أخرى", "حاولي مرة أخرى"],
  correctIs: ["💡 الصحيح هو:"],
  answerIs: ["الجواب:"],
  allDone: ["🎉 أكملتَ كل المحطات", "🎉 أكملتِ كل المحطات"],
  lessonDone: ["أحسنتَ! انتهى درس اليوم، ويبقى الباقي للغد 🐪", "أحسنتِ! انتهى درس اليوم، ويبقى الباقي للغد 🐪"],
  noMistakes: ["لا توجد أخطاء، أحسنتَ!", "لا توجد أخطاء، أحسنتِ!"],
  weeklyDone: ["🏅 أتممتَ تحدّي الأسبوع!", "🏅 أتممتِ تحدّي الأسبوع!"],
  reflectionSaved: ["حفظتَ تأمّلَكَ، شكراً لَكَ ✨", "حفظتِ تأمّلَكِ، شكراً لَكِ ✨"],
  recallGreat: ["ممتاز! ذاكرتُكَ قوية.", "ممتاز! ذاكرتُكِ قوية."],
  recallKeep: ["كل مرة تُعيد فيها البيت تقوى ذاكرتُكَ.", "كل مرة تُعيدين فيها البيت تقوى ذاكرتُكِ."],
  exGreat: ["ممتاز!"],
  exKeep: ["كل تمرين يقوّي ما حفظته.", "كل تمرين يقوّي ما حفظتِه."],
  // تعليمات
  introListen: ["بيت جديد: استمع إليه واقرأه", "بيت جديد: استمعي إليه واقرئيه"],
  orderFromMemory: ["رتّب كلمات البيت من ذاكرتك", "رتّبي كلمات البيت من ذاكرتك"],
  recallSay: ["قل البيت بصوت عالٍ أولاً، ثم أظهره.", "قولي البيت بصوت عالٍ أولاً، ثم أظهريه."],
  eventQ: ["قبل القصة: ما الحدث الذي يصفه هذا البيت؟"],
  // ناجي
  askEvent: ["{N}، ماذا حدث هنا؟ اختر الإجابة الصحيحة 🐪", "{N}، ماذا حدث هنا؟ اختاري الإجابة الصحيحة 🐪"],
  hardVerse: ["{N}، هذا البيت يحتاج إلى تمهّل. ماذا نفعل معاً؟"],
  newVerseMeaning: ["{N}، بيت جديد! هل تريد معرفة معناه قبل أن نقرأه؟", "{N}، بيت جديد! هل تريدين معرفة معناه قبل أن نقرأه؟"],
  helperForgot: ["{N}، نسيتُ أول كلمة في هذا البيت! هل تساعدني؟", "{N}، نسيتُ أول كلمة في هذا البيت! هل تساعدينني؟"],
  helperNotThis: ["{N}، ليس هذا، جرّب مرة أخرى 🌿", "{N}، ليس هذا، جرّبي مرة أخرى 🌿"],
  helperThanks: ["شكراً! ساعدتَني فتذكّرتُ الآن 🐪", "شكراً! ساعدتِني فتذكّرتُ الآن 🐪"],
  foundMe: ["وجدتَني {N}! 🎉 أضفتُ ختماً خاصاً إلى دفترك", "وجدتِني {N}! 🎉 أضفتُ ختماً خاصاً إلى دفترك"],
  vacation: ["ناجي في إجازة 🏖️ يعود حين تُفعّله من الإعدادات."],
  needHelp: ["{N}، تحتاج مساعدة؟ استمع للبيت أولاً، ثم رتّب كلماته.", "{N}، تحتاجين مساعدة؟ استمعي للبيت أولاً، ثم رتّبي كلماته."],
  firstRec: ["{N}، أول بيت سجّلتَه بصوتك! 🎙️ هكذا يصير الحفظ لك 🐪", "{N}، أول بيت سجّلتِه بصوتك! 🎙️ هكذا يصير الحفظ لك 🐪"],
  // v102: ما يُسمع بدل الرسائل التي فيها أرقام (الرقم يبقى مكتوباً على الشاشة)
  quizAll: ["أجبتَ عن كل الأسئلة، أحسنتَ!", "أجبتِ عن كل الأسئلة، أحسنتِ!"],
  quizSome: ["أجبتَ عن بعض الأسئلة، وسنراجع الباقي معاً", "أجبتِ عن بعض الأسئلة، وسنراجع الباقي معاً"],
  quizNone: ["لا بأس، سنراجع هذه الأسئلة معاً"],
  challengeDone: ["انتهى التحدي {N}! أحسنتَ العمل في خمس دقائق 🎉", "انتهى التحدي {N}! أحسنتِ العمل في خمس دقائق 🎉"],
  recMore: ["{N}، سجّلتَ أبياتاً جديدة بصوتِكَ! 🌟", "{N}، سجّلتِ أبياتاً جديدة بصوتِكِ! 🌟"],
  newBadge: ["وسام جديد:"],
  greetMorning: ["صباح الخير!"],
  greetEvening: ["مساء الخير!"],
  greetNight: ["مساءٌ سعيد!"],
  greetFriday: ["جمعة مباركة!"],
  helloN: ["أهلاً {N}!"],
  missedYou: ["اشتقتُ لصوتِكَ!", "اشتقتُ لصوتِكِ!"],
  currentStation: ["المحطة الحالية:"],
  resumeHere: ["توقّفنا في وسط هذه المحطة."],
  letsContinue: ["هيا نكمل الرحلة 🐪"],
  cardsWaiting: ["عندي بطاقات تنتظر مراجعتَكَ.", "عندي بطاقات تنتظر مراجعتَكِ."],
  streakBadge: ["🏅 وسام جديد: ثلاثة أيام متتالية!"],
  allStationsGuide: ["{N}، أتممتَ كل المحطات! 🏆", "{N}، أتممتِ كل المحطات! 🏆"],
  riddlePick: ["اختر الجواب الصحيح", "اختاري الجواب الصحيح"]
};
function kidLine(k) {
  const L = KID_LINES[k];
  return L ? gForm(L[0], L[1] || L[0]) : "";
}

/* ---------- تحويل النص المعروض إلى ما يُسجَّل ---------- */
const VOICE_VOC = "يا ٭";   // موضع النداء في سجل الأصوات
function voicePretty(s) {
  return String(s || "")
    .replace(/\s+([،,.!؟?:؛])/g, "$1")
    .replace(/[،,:؛]+(?=[!.؟?])/g, "")
    .replace(/^[\s،,.!؟?:؛]+/, "")
    .replace(/\s+/g, " ").trim();
}
/* النص بعد حذف النداء منه: «ممتاز يا عمر! أتقنتَ البيت» ← «ممتاز! أتقنتَ البيت» */
function voiceBody(text, voc) {
  let s = cleanSpeech(text);
  if (voc && s.includes(voc)) s = s.split(voc).join(" ");
  return voicePretty(s);
}

/* ---------- سجل الأصوات: كل نص قابل للتسجيل، مقسّماً أقساماً بترتيب الأولوية ---------- */
const VOICE_SECTIONS = [
  { id: "names", title: "👧 أسماء الأطفال" },
  { id: "verse", title: "📖 الأبيات" },
  { id: "guide", title: "🐪 التعليمات ورسائل ناجي" },
  { id: "titles", title: "🏷️ أسماء المحطات والأوسمة" },
  { id: "quiz", title: "❓ أسئلة الاختبار" },
  { id: "opt", title: "🔘 خيارات الأسئلة" },
  { id: "quizex", title: "💡 تعقيب الأسئلة" },
  { id: "expl", title: "📘 الشرح" },
  { id: "story", title: "📜 القصص" },
  { id: "riddle", title: "🧩 الألغاز وأجوبتها" },
  { id: "event", title: "🗓️ أحداث الأبيات" },
  { id: "disc", title: "💬 أسئلة النقاش" }
];
/* صيغتا الولد والبنت لكل رسالة ثابتة (ناجي والتنبيهات والتعليمات) */
function voiceFixedLines() {
  const out = [];
  const prev = gForm.force;
  try {
    for (const g of ["boy", "girl"]) {
      gForm.force = g;
      if (typeof GUIDE_LINES !== "undefined") Object.keys(GUIDE_LINES).forEach(m => GUIDE_LINES[m]().forEach(t => out.push(t)));
      Object.keys(KID_LINES).forEach(k => out.push(kidLine(k)));
    }
  } finally { gForm.force = prev; }
  return out.map(t => voiceBody(String(t).replace(/\{N\}/g, VOICE_VOC), VOICE_VOC)).filter(Boolean);
}
let voiceRegCache = null, voiceMatchCache = null;
function voiceCacheReset() { voiceRegCache = null; voiceMatchCache = null; }
/* النداء باسم كل طفل على الجهاز، و«يا صديقي/يا صديقتي» لمن لم يُكتب اسمه */
function voiceNameLines() {
  const names = (typeof users !== "undefined" && Array.isArray(users) ? users : [])
    .map(u => u && String(u.name || "").trim()).filter(n => n && n !== "طفلي").map(n => "يا " + n);
  return [...new Set(names), "يا صديقي", "يا صديقتي"];
}
function voiceRegistry() {
  const J = (content && content.journeyData) || [];
  const nk = voiceNameLines().join("|");
  if (voiceRegCache && voiceRegCache.src === J && voiceRegCache.nk === nk) return voiceRegCache;
  const items = [], seen = new Set();
  const add = it => { const k = it.section + "|" + it.key; if (seen.has(k)) return; seen.add(k); items.push(it); };
  const line = (section, text, station) => {
    const t = voicePretty(cleanSpeech(text));
    if (t) add({ section, kind: "line", id: lineId(t), key: lineKey(t), text: t, station });
  };
  const sIndex = id => J.findIndex(s => s.id === id);
  voiceNameLines().forEach(t => line("names", t, -1));
  J.forEach((st, si) => st.verses.forEach((v, vi) =>
    add({ section: "verse", kind: "verse", id: v.id, key: authorKey("verse", v.id), text: v.fullVerse, station: si, n: vi + 1 })));
  voiceFixedLines().forEach(t => line("guide", t, -1));
  J.forEach((st, si) => line("titles", st.title, si));
  [typeof CUSTOM_BADGES !== "undefined" ? Object.values(CUSTOM_BADGES) : [], typeof GUIDE_BADGES !== "undefined" ? Object.values(GUIDE_BADGES) : []]
    .forEach(list => list.forEach(b => { if (b && b.name) line("titles", b.name, -1); }));
  /* الإنجازات تظهر في نافذة تُقرأ: الاسم والوصف */
  (typeof ACHIEVEMENTS !== "undefined" ? ACHIEVEMENTS : []).forEach(a => { if (a.name) line("titles", a.name, -1); if (a.desc) line("titles", a.desc, -1); });
  J.forEach((st, si) => {
    const qs = (typeof QUIZZES !== "undefined" && QUIZZES[st.id]) || [];
    qs.forEach(q => line("quiz", q.q, si));
    qs.forEach(q => [q.correct, ...(q.wrong || [])].forEach(o => line("opt", o, si)));
    qs.forEach(q => { if (q.explain) line("quizex", q.explain, si); });
  });
  J.forEach((st, si) => st.verses.forEach(v => { if (v.meaning) line("expl", v.meaning, si); }));
  J.forEach((st, si) => st.verses.forEach((v, vi) => {
    if (v.story) add({ section: "story", kind: "story", id: v.id, key: authorKey("story", v.id), text: v.story, station: si, n: vi + 1 });
  }));
  if (typeof RIDDLES !== "undefined") RIDDLES.forEach(r => { const si = sIndex(r.station); line("riddle", r.riddle, si); line("riddle", r.answer, si); });
  J.forEach((st, si) => st.verses.forEach(v => { if (v.event) line("event", v.event, si); }));
  J.forEach((st, si) => ((typeof DISCUSSION !== "undefined" && DISCUSSION[st.id]) || []).forEach(q => line("disc", q, si)));
  const byKey = new Map();
  items.forEach(it => { if (!byKey.has(it.key)) byKey.set(it.key, it); });
  voiceRegCache = { src: J, nk, items, byKey };
  return voiceRegCache;
}
/* التسجيل صالح للعرض: موجود، وبصمته تطابق النص الحالي */
function voiceRecValid(item, rec) {
  if (!rec || !rec.blob) return false;
  if (item.kind === "line") return true;
  const v = vpFindVerse(item.id);
  return !!v && !vpIsStale(rec, item.kind, v);
}
/* تقدّم كل قسم: كم نصاً سُجّل من مجموعه (تستعمله نافذة التصدير والاستوديو) */
function voiceProgress(recs) {
  const have = new Map((recs || []).map(r => [r.key, r]));
  const reg = voiceRegistry();
  return VOICE_SECTIONS.map(s => {
    const list = reg.items.filter(it => it.section === s.id);
    const done = list.filter(it => voiceRecValid(it, have.get(it.key))).length;
    return { id: s.id, title: s.title, done, total: list.length,
      leftSec: list.filter(it => !voiceRecValid(it, have.get(it.key))).reduce((a, it) => a + voiceEstSec(it.text), 0) };
  });
}
/* مدة تقريبية لقراءة النص بصوت هادئ */
function voiceEstSec(text) { return 1.5 + String(text || "").split(/\s+/).filter(Boolean).length / 2; }

/* ---------- البحث عن التسجيل المناسب لنص ---------- */
function voiceContentMatch(text) {
  const J = (content && content.journeyData) || [];
  if (!voiceMatchCache || voiceMatchCache.src !== J) {
    const m = new Map();
    J.forEach(st => st.verses.forEach(v => {
      m.set(voiceNorm(v.fullVerse), { kind: "verse", v });
      if (v.story) m.set(voiceNorm(v.story), { kind: "story", v });
    }));
    voiceMatchCache = { src: J, m };
  }
  return voiceMatchCache.m.get(voiceNorm(text)) || null;
}
async function voiceLineRec(text) {
  try { const r = await recGet(lineKey(text)); return r && r.blob ? r : null; } catch (e) { return null; }
}
/* نص واحد ← أجزاء تُشغَّل: [{rec, text}]. rec فارغ يعني القراءة الآلية */
async function voiceResolve(text) {
  const clean = cleanSpeech(text);
  if (!clean) return [];
  const m = voiceContentMatch(clean);
  if (m) return [{ rec: await authorRecFor(m.kind, m.v), text: clean }];
  const voc = typeof guideVocative === "function" ? guideVocative() : "";
  const hasVoc = !!voc && clean.includes(voc);
  const body = hasVoc ? voiceBody(clean, voc) : clean;
  /* v102: اسم الطفل يسجّله الوالد مرة واحدة («يا عمر») في الاستوديو */
  const vrec = hasVoc ? await voiceLineRec(voc) : null;
  const rec = body ? await voiceLineRec(body) : null;
  if (!rec && !vrec) return [{ rec: null, text: clean }];   // بلا تسجيل: الجملة كاملة بالقارئ الآلي، أطبع نطقاً
  if (!hasVoc) return [{ rec, text: body }];
  if (!body) return [{ rec: vrec, text: voc }];
  return [{ rec: vrec, text: voc }, { rec, text: body }];
}

/* ---------- التشغيل ---------- */
/* ---------- هل على الجهاز صوت عربي؟ ----------
   على لينكس لا أصوات أصلاً، وعلى ويندوز قد لا يوجد صوت عربي فيُقرأ النص بصوت إنجليزي مشوّه.
   حينها لا نقرأ آلياً، ويُنبَّه الوالد (شاشة الأسرة والاستوديو) إلى حزمة الصوت أو تثبيت صوت عربي. */
let voiceSynthFailed = false;
const voiceBootAt = Date.now();
function voiceEngineState() {
  if (!("speechSynthesis" in window)) return "none";
  if (voiceSynthFailed) return "failed";
  let v = [];
  try { v = window.speechSynthesis.getVoices() || []; } catch (e) {}
  // قائمة الأصوات تصل بعد لحظة في بعض المتصفحات؛ فإن بقيت فارغة بعد ثوانٍ فلا صوت على الجهاز (لينكس مثلاً)
  if (!v.length) return Date.now() - voiceBootAt > 3000 ? "none" : "loading";
  return v.some(x => x.lang && x.lang.toLowerCase().startsWith("ar")) ? "ok" : "noarabic";
}
/* القراءة الآلية تُسكت فقط حين نعرف يقيناً أن الصوت العربي غير موجود */
function voiceEngineMuted() { const s = voiceEngineState(); return s === "none" || s === "noarabic" || s === "failed"; }
let voiceSynthFails = 0;
function voiceNoteError(e) {
  const err = e && e.error;
  // «لا لغة» قاطع؛ أما فشل النطق فقد يكون عارضاً (صوت على الإنترنت مثلاً) فيُشترط تكراره
  if (err === "language-unavailable") voiceSynthFailed = true;
  else if (err === "synthesis-failed" || err === "synthesis-unavailable" || err === "voice-unavailable") { if (++voiceSynthFails >= 2) voiceSynthFailed = true; }
}
/* الصوت العربي المحلي أولاً (أصوات الإنترنت لا تعمل والتطبيق بلا اتصال) */
function voiceArabic() {
  let v = [];
  try { v = window.speechSynthesis.getVoices() || []; } catch (e) {}
  const ar = v.filter(x => x.lang && x.lang.toLowerCase().startsWith("ar"));
  return ar.find(x => x.localService) || ar[0] || null;
}
/* سطر تنبيه للوالد إن كان الجهاز بلا صوت عربي (فارغ إن كان كل شيء سليماً) */
function voiceMissingNotice() {
  const s = voiceEngineState();
  if (s === "ok" || s === "loading") return "";
  return "⚠ لا يوجد على هذا الجهاز صوت عربي للقراءة الآلية، فكل ما لم يُسجَّل في «استوديو التسجيل» لن يُسمع. الحل: استورد حزمة صوت المعلم، أو سجّل بصوتك، أو ثبّت صوتاً عربياً من إعدادات الجهاز (تحويل النص إلى كلام).";
}

function voiceTTS(token, text, wait) {
  return new Promise(resolve => {
    if (token !== seqToken || !("speechSynthesis" in window) || voiceEngineMuted()) return resolve();
    let u, guard = null, finished = false;
    const done = () => { if (finished) return; finished = true; clearTimeout(guard); seqWaiters.delete(done); resolve(); };
    try {
      u = new SpeechSynthesisUtterance(ttsText(text));
      u.lang = "ar-SA"; u.rate = speechRate();
      const ar = voiceArabic();
      if (ar) try { u.voice = ar; } catch (e) {}
      /* انتهى النطق: لم يعد الصوت الأساسي «منتظراً»، فرسالة ناجي التالية تُسمع */
      u.onerror = e => { voiceNoteError(e); audioMainClear(token); done(); };
      u.onend = () => { audioMainClear(token); done(); };
      /* لا يُنتظر نهاية النطق إن لم تكن على الجهاز أصوات: بعض المتصفحات لا تُعلن النهاية حينها */
      const canWait = wait && window.speechSynthesis.getVoices().length > 0;
      if (canWait) {
        seqWaiters.add(done);
        guard = setTimeout(done, 4000 + String(text || "").length * 150);   // مهلة قصوى إن لم تُعلن النهاية
      }
      window.speechSynthesis.speak(u);
      if (!canWait) { finished = true; resolve(); }
    } catch (e) { resolve(); }
  });
}
/* v103: الأجزاء الآلية المتتالية تُقرأ نطقاً واحداً. على أندرويد كل نطق جديد يقطع الذي قبله،
   فكان السؤال وخياراته تُقطع ولا يُسمع إلا الخيار الأخير؛ والنطق الواحد أيضاً أطبع */
function voiceMergeSegs(segs) {
  const out = [];
  for (const s of segs) {
    const last = out[out.length - 1];
    if (!s.rec && last && !last.rec) last.text = /[.،؛:؟!?]\s*$/.test(last.text) ? last.text + " " + s.text : last.text + "، " + s.text;
    else out.push({ rec: s.rec, text: s.text });
  }
  return out;
}
/* يشغّل نصاً أو قائمة نصوص بالترتيب، ويُحلّ عند انتهائها أو إيقافها.
   opts.polite: لا يقطع صوتاً جارياً (فقاعات ناجي والرسائل)
   opts.silent: إن كان التسجيل جارياً يسكت دون تنبيه (القراءة التلقائية)
   opts.wait: يُحلّ بعد نهاية النطق الآلي الأخير أيضاً (تعقيب الأسئلة قبل الانتقال) */
/* voicePoliteTok: رسالة لطيفة (ناجي أو تنبيه) تُسمع الآن؛ الرسالة الأحدث تحل محلها،
   أما البيت والقصة وما يضغطه الطفل فلا تقطعها رسالة */
let voicePoliteTok = -1;
async function voicePlay(texts, opts = {}) {
  const list = (Array.isArray(texts) ? texts : [texts]).map(t => String(t == null ? "" : t)).filter(t => cleanSpeech(t));
  if (!list.length) return;
  if (recIsActive()) { if (!opts.silent) kidToast(kidLine("stopRecFirst"), "error"); return; }
  if (opts.polite) {
    if (audioMainPending()) return;          // بيت أو قصة بدأ ولم يُسمع بعد: لا تتراكب الرسالة معه
    if (voicePoliteTok === seqToken) audioStopAll();
    else if (audioBusy()) return;
  } else { audioStopAll(); audioMainMark(); }
  const token = seqToken;
  if (opts.polite) voicePoliteTok = token;
  let segs = [];
  for (const t of list) segs = segs.concat(await voiceResolve(t));
  if (token !== seqToken || recIsActive()) return;
  if (opts.polite && (voicePoliteTok !== token || audioMainPending())) return;
  segs = voiceMergeSegs(segs);
  for (let i = 0; i < segs.length; i++) {
    if (token !== seqToken) break;
    const s = segs[i];
    if (s.rec) await playPart(token, s.rec, s.text, !!opts.polite);
    else await voiceTTS(token, s.text, !!opts.wait || segs.slice(i + 1).some(x => x.rec));
  }
  if (voicePoliteTok === token) voicePoliteTok = -1;
  if (!opts.polite && token === seqToken && !audioBusy()) audioMainClear(token);
}

/* ---------- خيارات الأسئلة: كل خيار بزر 🔊 خاص به بجانبه ---------- */
function optionsHTML(opts, onclickFor) {
  return opts.map((o, i) => `<span class="opt-wrap">${sayBtnHTML(o, "استمع للخيار")}<button class="word-btn" onclick="${onclickFor(o, i)}">${escapeHtml(o)}</button></span>`).join("");
}
function sleepMs(ms) { return new Promise(r => setTimeout(r, ms)); }
/* تعقيب بعد الإجابة: يُقرأ ثم يُنتقل، دون أن يقطعه السؤال التالي (بحد أقصى) */
function voiceFeedback(parts, minMs) {
  const spoken = autoReadOn() ? voicePlay(parts, { silent: true, wait: true }) : null;
  const chars = parts.join(" ").length;
  const cap = 2500 + chars * 110;
  // بلا قراءة صوتية: وقت يكفي طفلاً ليقرأ التعقيب بنفسه (ويستطيع أن يضغط «التالي» قبله)
  const readMs = Math.min(15000, 2000 + chars * 80);
  return Promise.all([sleepMs(Math.max(minMs || 0, readMs)), spoken ? Promise.race([spoken, sleepMs(Math.min(25000, cap))]) : null]);
}

/* ---------- v103: نقل تسجيلات الرسائل التي تغيّر نصها ----------
   التسجيل مربوط بنص الرسالة حرفاً حرفاً؛ فلما صُحّحت بعض الرسائل (للغد، يحتاج إلى، وحركات المخاطَب)
   صار تسجيلها القديم بلا نص، ويصمت على جهاز بلا صوت عربي. يُنسخ مرة واحدة إلى النص الجديد (والقديم يبقى). */
/* نص الرسالة في v102 لكل صيغة (ولد، بنت)، وتُنقل كل صيغة إلى نظيرتها في KID_LINES */
const VOICE_LINES_OLD_102 = {
  lessonDone: ["أحسنتَ! انتهى درس اليوم، ويبقى الباقي لغداً 🐪", "أحسنتِ! انتهى درس اليوم، ويبقى الباقي لغداً 🐪"],
  reflectionSaved: ["حفظتَ تأمّلك، شكراً لك ✨", "حفظتِ تأمّلكِ، شكراً لكِ ✨"],
  recallGreat: ["ممتاز! ذاكرتك قوية.", "ممتاز! ذاكرتك قوية."],
  recallKeep: ["كل مرة تُعيد فيها البيت تقوى ذاكرتك.", "كل مرة تُعيدين فيها البيت تقوى ذاكرتك."],
  hardVerse: ["{N}، هذا البيت يحتاج تمهّل. ماذا نفعل معاً؟", "{N}، هذا البيت يحتاج تمهّل. ماذا نفعل معاً؟"],
  helperThanks: ["شكراً! ساعدتني فتذكّرتُ الآن 🐪", "شكراً! ساعدتني فتذكّرتُ الآن 🐪"],
  missedYou: ["اشتقتُ لصوتك!", "اشتقتُ لصوتك!"],
  cardsWaiting: ["عندي بطاقات تنتظر مراجعتك.", "عندي بطاقات تنتظر مراجعتك."],
  recMore: ["{N}، سجّلتَ أبياتاً جديدة بصوتك! 🌟", "{N}، سجّلتِ أبياتاً جديدة بصوتك! 🌟"]
};
async function voiceMigrateLines103() {
  if (typeof vpPref !== "function" || vpPref("lineMoves103")) return 0;
  const body = t => voiceBody(String(t).replace(/\{N\}/g, VOICE_VOC), VOICE_VOC);
  let moved = 0;
  try {
    for (const k of Object.keys(VOICE_LINES_OLD_102)) {
      const arr = KID_LINES[k]; if (!arr) continue;
      for (let g = 0; g < 2; g++) {
        const src = await recGet(lineKey(body(VOICE_LINES_OLD_102[k][g])));
        if (!src) continue;
        const nb = body(arr[g] !== undefined ? arr[g] : arr[0]);
        const key = lineKey(nb);
        if (key === src.key || await recGet(key)) continue;
        await recPut(Object.assign({}, src, { key, verseId: lineId(nb), fp: lineId(nb), text: nb }));
        moved++;
      }
    }
    vpPref("lineMoves103", true);
  } catch (e) { return moved; }
  if (moved) voiceCacheReset();
  return moved;
}
if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", () => setTimeout(() => { voiceMigrateLines103(); }, 1500));
