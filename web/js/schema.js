/* ============================================================
   v114: جدول واحد لحقول حالة الطفل (من توصيات مراجعة المطوّر في v113).
   كانت إضافة حقل تتطلب تعديل أربعة مواضع يدوياً (createNewUser وnormalizeUserState وcleanupOrphanedState
   وsanitizeImportedState)، وكان الاستيراد لا يفحص نوع 12 حقلاً، فملف تالف يعطّل شاشة الشهادات.
   الآن: كل حقل هنا بنوعه، ومفاتيحه إن كان قاموساً (بيت أو محطة)، وقيمته الافتراضية؛
   ومنه تُشتق: تصحيح الأنواع عند كل تحميل، وحذف ما يشير إلى بيت أو محطة لم تعد موجودة، وتنقية الاستيراد.
   عند إضافة حقل لحالة الطفل يُضاف هنا فقط (واختبار tests/unit/state-schema.test.js يذكّرك).
   الأنواع: map (قاموس)، arr (مصفوفة)، num، str، bool، obj (كائن أو null)
   keys: verse | station | any — ما تشير إليه مفاتيح القاموس
   ============================================================ */
const STATE_SCHEMA = {
  version: { t: "num", d: 13 },
  // تقدّم المحطات
  stationStatus: { t: "map", keys: "station" }, rewardUnlocked: { t: "map", keys: "station" }, versePositions: { t: "map", keys: "station" },
  stampDates: { t: "map", keys: "station" }, charms: { t: "map", keys: "station" }, quizResults: { t: "map", keys: "station" },
  reflections: { t: "map", keys: "station" }, segmentChecks: { t: "map", keys: "station" }, segmentDue: { t: "map", keys: "station" },
  wirdLog: { t: "map", keys: "station" }, khatma: { t: "map", keys: "station" },
  // تقدّم الأبيات
  seenVerses: { t: "map", keys: "verse" }, seenAt: { t: "map", keys: "verse" }, verseStats: { t: "map", keys: "verse" }, leitner: { t: "map", keys: "verse" },
  storyUnlocked: { t: "map", keys: "verse" }, meaningSeen: { t: "map", keys: "verse" }, masteredNotified: { t: "map", keys: "verse" },
  follow: { t: "map", keys: "verse" }, eventMisses: { t: "map", keys: "verse" }, recEval: { t: "map", keys: "verse", sec: true },
  parentChecks: { t: "map", keys: "verse" }, linked: { t: "map", keys: "verse" }, sayRevealed: { t: "map", keys: "verse" },
  storiesRead: { t: "map", keys: "verse" },
  // قواميس أخرى
  mistakes: { t: "map", keys: "any" }, riddlesSolved: { t: "map", keys: "any" }, achievements: { t: "map", keys: "any" },
  guideBadges: { t: "map", keys: "any" }, customBadges: { t: "map", keys: "any" }, dailyCredits: { t: "map", keys: "any" },
  warmups: { t: "map", keys: "any" }, docChecks: { t: "map", keys: "any" },
  stats: { t: "obj", d: () => ({ perfectSessions: 0, reviewSessions: 0, shared: 0, challengeSessions: 0 }) },
  weekly: { t: "obj", d: null }, dayPlan: { t: "obj", d: null }, dayTime: { t: "obj", d: null },
  // مصفوفات
  certs: { t: "arr" }, activeDays: { t: "arr" }, docSample: { t: "arr" }, tasmeePending: { t: "arr" }, dailyIds: { t: "arr" },
  playSet: { t: "arr", d: null },
  // أرقام
  points: { t: "num", d: 0 }, streak: { t: "num", d: 0 }, totalTimeSeconds: { t: "num", d: 0 }, guideHue: { t: "num", d: 0 },
  najiCount: { t: "num", d: 0 }, lessonDays: { t: "num", d: 0 }, dailyLimitMin: { t: "num", d: 0 },
  selectedStation: { t: "num", d: 0 }, selectedVerse: { t: "num", d: 0 },
  newPerDay: { t: "num", d: null }, dailyLeft: { t: "num", d: null }, khatmaDoneAt: { t: "num", d: null },
  // نصوص (أيام ومعرّفات)
  lastPracticeDate: { t: "str", d: null }, recentDone: { t: "str", d: null }, najiFound: { t: "str", d: null },
  dailyReviewDay: { t: "str", d: null }, wirdDay: { t: "str", d: null }, sabqDay: { t: "str", d: null },
  allActivities: { t: "bool", d: false }
};
function schemaDefault(f) {
  const d = f.d;
  if (typeof d === "function") return d();
  if (d !== undefined) return d;
  return f.t === "map" ? {} : f.t === "arr" ? [] : null;
}
function schemaTypeOk(v, f) {
  if (v === null) return f.d === null || f.t === "obj";
  switch (f.t) {
    case "map": case "obj": return !!v && typeof v === "object" && !Array.isArray(v);
    case "arr": return Array.isArray(v);
    case "num": return typeof v === "number" && isFinite(v);
    case "str": return typeof v === "string";
    case "bool": return typeof v === "boolean";
  }
  return true;
}
/* يصحّح نوع كل حقل معروف (الغائب أو المخالف يأخذ قيمته الافتراضية). لا يحذف الحقول المجهولة */
function schemaNormalize(s) {
  if (!s || typeof s !== "object") return s;
  for (const [k, f] of Object.entries(STATE_SCHEMA)) {
    if (!(k in s) || s[k] === undefined) { if (f.t === "map" || f.t === "arr" || f.t === "obj" || f.d !== undefined) s[k] = schemaDefault(f); continue; }
    if (!schemaTypeOk(s[k], f)) s[k] = schemaDefault(f);
  }
  if (s.stats) s.stats = Object.assign(schemaDefault(STATE_SCHEMA.stats), s.stats);
  return s;
}
/* يحذف من القواميس ما يشير إلى بيت أو محطة لم تعد في المحتوى */
const SEC_KEY_RE = /^sec:(all|station-\d{1,2})$/;
function schemaCleanup(s, verseIds, stationIds) {
  for (const [k, f] of Object.entries(STATE_SCHEMA)) {
    if (f.t !== "map" || f.keys === "any" || !s[k] || typeof s[k] !== "object") continue;
    const ok = f.keys === "verse" ? verseIds : stationIds;
    for (const id of Object.keys(s[k])) if (!ok.has(id) && !(f.sec && SEC_KEY_RE.test(id))) delete s[k][id];
  }
  return s;
}
/* للاستيراد: يُسقط الحقول المجهولة (كان ملف معدَّل باليد يضيف ما يشاء) */
function schemaDropUnknown(s) {
  for (const k of Object.keys(s)) if (!STATE_SCHEMA[k]) delete s[k];
  return s;
}
