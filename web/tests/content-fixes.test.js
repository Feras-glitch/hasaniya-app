/* v93 — حارس تصحيحات المراجعة العلمية (الدفعة أ): يمنع رجوع أخطاء صُحّحت */
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const ctx = { console }; vm.createContext(ctx);
["js/config.js", "js/data/manzumah.js", "js/data/stories.js", "js/data/explanations.js", "js/parser.js",
 "js/data/quizzes.js", "js/data/riddles.js", "js/data/khilaf.js", "js/data/places.js", "js/data/discussion.js", "js/journey.js"]
  .forEach(f => { try { vm.runInContext(fs.readFileSync(path.join(root, f), "utf8").replace(/\bconst\b|\blet\b/g, "var"), ctx, { filename: f }); } catch (e) { if (f !== "js/journey.js") throw e; } });
let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log("❌ " + msg); } };
const Q = ctx.QUIZZES, S = ctx.STORIES, E = ctx.EXPLANATIONS;
const allQ = Object.values(Q).flat();

// أسئلة: لا يُجعل القول المشهور خياراً خاطئاً
const q10 = allQ.find(q => q.ref === "s10v8");
check(q10 && !q10.wrong.includes("ذو الحجة") && /الناظم/.test(q10.q), "سؤال شهر البيعة يجب أن يُنسب للناظم ولا يجعل ذا الحجة خطأً");
const q137 = allQ.find(q => q.ref === "s13v7");
check(q137 && !q137.wrong.includes("بئر معونة") && !/القرّاء|القراء/.test(q137.q), "سؤال الرجيع لا يذكر القرّاء ولا يجعل بئر معونة خطأً");
const q11 = allQ.find(q => q.ref === "s11av1");
check(q11 && /عمر/.test(q11.q), "سؤال العشرين يخص من هاجروا مع عمر");
const q12c = allQ.find(q => q.ref === "s12cv2");
check(q12c && /أول/.test(q12c.q), "سؤال قينقاع: أول من نقض العهد");
check(!allQ.some(q => /على المسلمين/.test(q.q) && q.ref.startsWith("s8")), "الحصار كان على بني هاشم لا على المسلمين");
check(!allQ.some(q => q.wrong.some(w => /زوّجوه/.test(w))), "لا خيارات هزلية مثل «زوّجوه»");

// لغز المحطة 3
const r3 = ctx.RIDDLES.find(r => r.station === "s3");
check(r3 && !/من هو العم/.test(r3.riddle), "لغز المحطة 3 لا يسأل عن العم ثم يجيب «عمه»");

// شروح
check(!/الطائف/.test(E.s5v10), "شرح إسلام الجن لا يربطه برحلة الطائف");
check(!/المسلمين/.test(E.s8v2) && /هاشم/.test(E.s8v2), "شرح الحصار: بنو هاشم وبنو المطلب");
check(/بدر الأولى/.test(E.s12av11) && /الناظم/.test(E.s12av11), "بدر الأولى: تُنسب تسمية «الصغرى» إلى الناظم");
// كل بيت قصته قيد المراجعة يُنسب شرحه إلى الناظم إن ذكر تاريخاً أو عدداً
for (const id of Object.keys(S)) if (S[id].status === "review" && E[id] && /السنة|سنة|أول|عيد/.test(E[id]))
  check(/كما يذكر الناظم/.test(E[id]), "شرح " + id + " يجزم بقول قصته قيد المراجعة");

// قصص
check(!/الهيسر/.test(JSON.stringify(S)), "تصحيف أبي الحيسر");
check(/همدان/.test(S.s10v3.story), "قصة s10v3 عن الرجل الهمداني كما في البيت");
check(/سعد/.test(S.s12av7.story), "قصة أول سهم تذكر سعداً");
check(!/زوجتيه/.test(S.s11bv7.story), "قصة المؤاخاة للطفل بلا عرض الزوجة");
check(!/أتحب أن أقتله/.test(S.s12cv5.story), "حوار كعب في حاشية الوالد لا في قصة الطفل");
check(!/المحرم/.test(S.s12cv1.story), "غزوة بني سليم لا تُجعل في المحرم بخلاف ترتيب الأبيات");
check(!JSON.stringify(S.s8v7.sources).includes("islamonline"), "لا مقالات صحفية مصدراً");

// خلاف وهمي ومكان
check(!ctx.KHILAF.s13v7, "لا صندوق خلاف لعدد أهل الرجيع (المجموع عشرة)");

const src = fs.readFileSync(path.join(root, "js/data/places.js"), "utf8");
check(/"الأبواء": \{ lon: 39\.19, lat: 23\.18/.test(src), "إحداثيات الأبواء موحّدة مع خريطة المحطات");

if (fail) { console.log("❌ " + fail + " من تصحيحات المراجعة العلمية رجع"); process.exit(1); }
console.log("✅ تصحيحات المراجعة العلمية سليمة");
