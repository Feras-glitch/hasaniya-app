/* v93 — حارس تصحيحات المراجعة العلمية (الدفعة أ): يمنع رجوع أخطاء صُحّحت */
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const ctx = { console }; vm.createContext(ctx);
["js/config.js", "js/data/manzumah.js", "js/data/stories.js", "js/data/explanations.js", "js/parser.js",
 "js/data/quizzes.js", "js/data/riddles.js", "js/data/khilaf.js", "js/data/places.js", "js/data/discussion.js", "js/data/links.js", "js/journey.js"]
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
check(!/الطائف/.test(E.s5v10) || /ذكر ابن إسحاق/.test(E.s5v10), "شرح إسلام الجن لا يجزم بربطه برحلة الطائف (إن ذُكرت فمنسوبة إلى ابن إسحاق)");
check(!/المسلمين/.test(E.s8v2) && /هاشم/.test(E.s8v2), "شرح الحصار: بنو هاشم وبنو المطلب");
check(/بدر الأولى/.test(E.s12av11) && /الناظم/.test(E.s12av11), "بدر الأولى: تُنسب تسمية «الصغرى» إلى الناظم");
// كل بيت قصته قيد المراجعة يُنسب شرحه إلى الناظم إن ذكر تاريخاً أو عدداً
// (s12cv4 مستثنى منذ v103: شرحه لم يعد يقول «أول عيد»، وصلاة عيد الأضحى والتضحية فيه لا خلاف فيهما)
for (const id of Object.keys(S)) if (id !== "s12cv4" && S[id].status === "review" && E[id] && /السنة|سنة|أول|عيد/.test(E[id]))
  check(/كما يذكر الناظم/.test(E[id]), "شرح " + id + " يجزم بقول قصته قيد المراجعة");
check(!/أول/.test(E.s12cv4) && !/الناظم/.test(E.s12cv4), "شرح الأضحية لا يجعلها «أول عيد» ولا ينسب ذلك للناظم");

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

/* ---------- v103: الدفعة ب من المراجعة العلمية ---------- */
const N = ctx.normalizeArabic;
// شروح
check(!/أمور أخرى/.test(E.s12cv6) && /غطفان/.test(E.s12cv6), "شرح s12cv6 يسمّي غزوة ذي أمر بدل «أمور أخرى»");
check(!/أحاط/.test(E.s12av8), "شرح بواط: لم يحط بقافلة، بل خرج يطلبها ولم يلق قتالاً");
check(/الناظم/.test(E.s10v8) && /ذي الحجة/.test(E.s10v8), "شرح s10v8: رجب منسوب للناظم مع التنبيه على المشهور");
check(q10 && /ذي الحجة/.test(q10.explain || ""), "تعقيب سؤال شهر البيعة ينبّه على ذي الحجة");
check(/أخويه/.test(E.s12bv6) && /عمّ النبي ﷺ/.test(E.s12bv6), "شرح فداء العباس: ابنا أخويه");
check(/تظلّل النبي ﷺ/.test(E.s3v7), "شرح السحابة: تظلّل النبي ﷺ لا القافلة كلها");
check(!/نحو ثمانين/.test(E.s7v14) && /ابن إسحاق/.test(E.s7v14), "شرح عدد مهاجري الحبشة: ثلاثة وثمانون عند ابن إسحاق");
check(/الثانية عشرة/.test(E.s10v9), "شرح s10v9 ينبّه على المشهور (السنة الثانية عشرة)");
check(!/صحّت/.test(E.s1v6) && !/تزوج من|تزوّج من/.test(E.s4v4), "صياغة s1v6 وs4v4");
check(!/تزوّج/.test(E.s12av2), "شرح s12av2: انتقال عائشة إلى بيت النبي ﷺ لا ابتداء الزواج");
// أحداث الأبيات: كل حدث مميّز (تُستعمل في سؤال «ما الحدث؟» وفي الخط الزمني)
const evs = ctx.DEFAULT_JOURNEY.flatMap(s => s.verses.map(v => [v.id, v.event]));
const seenEv = {};
evs.forEach(([id, e]) => { if (seenEv[e]) check(false, "حدث مكرر «" + e + "» في " + seenEv[e] + " و" + id); else seenEv[e] = id; });
const evOf = Object.fromEntries(evs);
check(/همدان/.test(evOf.s10v3) && /همدان/.test(evOf.s10v4), "حدث s10v3 وs10v4 عن الرجل الهمداني");
// أسئلة
const q8 = allQ.find(q => q.ref === "s8v1");
check(q8 && !q8.wrong.includes("حمزة") && /الناظم/.test(q8.q), "سؤال إسلام عمر: حمزة ليس مشتّتاً (أسلم جهراً أيضاً)");
check(!allQ.some(q => q.ref === "s12bv3" && q.wrong.includes("الزكاة")), "سؤال الصيام: الزكاة ليست مشتّتاً (زكاة الفطر فُرضت في السنة الثانية)");
const q73 = allQ.find(q => q.ref === "s7v3");
check(q73 && /احد عشر/.test(N(q73.explain)), "تعقيب «إحدى عشر» ينبّه على الصواب في النثر");
check(q12c && /ابن هشام/.test(q12c.explain || ""), "تعقيب قينقاع منسوب لسيرة ابن هشام");
const q27 = allQ.find(q => q.ref === "s2v7");
check(q27 && /الناظم/.test(q27.q), "سؤال سن شق الصدر منسوب للناظم");
// ألغاز: أجوبة مقبولة ومشتّتات ممنوعة
ctx.RIDDLES.forEach(r => {
  check(Array.isArray(r.accept) && r.accept.length && r.accept.some(a => N(a) === N(r.answer)), "لغز " + r.station + ": accept مصفوفة تتضمن الجواب");
  if (r.avoid) check(Array.isArray(r.avoid) && !r.avoid.some(a => N(a) === N(r.answer)), "لغز " + r.station + ": avoid لا يتضمن الجواب");
});
const rid = st => ctx.RIDDLES.find(r => r.station === st) || {};
check((rid("s8").avoid || []).includes("حمزة") && (rid("s12a").avoid || []).includes("حمزة"), "لغزا عمر وأول راية: حمزة ليس مشتّتاً");
check(/الناظم/.test(rid("s12a").riddle || "") && /ليال/.test(rid("s11a").riddle || ""), "صياغة لغزي أول راية والغار");
// نقاش
check(!/الفداء/.test(ctx.DISCUSSION.s12b.join(" ")) && /ورقة/.test(ctx.DISCUSSION.s5.join(" ")), "أسئلة نقاش s12b وs5");
// قصص ومصادر
const srcOf = id => (S[id].sources || []).join(" ؛ ");
check(!/نزع/.test(S.s12cv8.story) && /الفُرُع/.test(S.s12cv8.story), "بحران في ناحية الفُرُع");
check(!/قومُ النبي/.test(S.s5v7.story), "قصة ورقة: «حين يخرجه قومه»");
check(/ستره/.test(S.s4v11.story), "قصة الإزار تذكر حفظ الله لنبيه وستره");
check(/بني سليم/.test(S.s12cv7.story) && /المغازي/.test(S.s12cv7.story), "قصة قرقرة: هي غزوة بني سليم عند أكثر أهل المغازي");
check(/1398/.test(S.s11bv3.note), "حاشية مسجد قباء تذكر حديث مسلم (1398)");
check(/\(24\)/.test(srcOf("s8v4")) && /المسيّب/.test(srcOf("s8v4")) && !/\(25\)/.test(srcOf("s8v4")), "مصدر وفاة أبي طالب: مسلم (24) من حديث المسيّب");
check(!/1437/.test(srcOf("s11bv7")) && /2049/.test(srcOf("s11bv7")), "مصدر المؤاخاة: لا مسلم (1437)");
check(/3615/.test(srcOf("s11av12")) && /2009/.test(srcOf("s11av12")), "مصدر وعد سراقة: البخاري (3615) ومسلم (2009)");
check(/حليمة/.test(srcOf("s2v5")), "مصدر الرضاعة: خبر حليمة عند ابن هشام");
check(!/الدرر/.test(srcOf("s8v1")) && /3684، 3863/.test(srcOf("s8v1")), "مصدر إسلام عمر: البخاري (3684، 3863)");
[["s2v4", "أم أيمن رضي الله عنها"], ["s6v4", "سمية أم عمار رضي الله عنها"], ["s13v5", "عبد الأسد رضي الله عنه"],
 ["s13v6", "أنيس رضي الله عنه"], ["s13v7", "عاصم بن ثابت رضي الله عنه"], ["s13v7", "الدثنة رضي الله عنهما"]]
  .forEach(([id, t]) => check(S[id].story.includes(t), "الترضّي في قصة " + id + ": " + t));
[["s5v4", "الكَلّ ("], ["s5v4", "نوائب الحق ("], ["s5v5", "الناموس ("], ["s9v1", "الأخشبين ("], ["s9v3", "الفطرة ("], ["s11av9", "أسودة ("],
 ["s11av12", "أديم ("], ["s12bv7", "الجزور ("], ["s12cv3", "الإذخر ("], ["s12cv1", "نعماً ("], ["s13v5", "سرحهم ("], ["s13v9", "ﷺ (أي دعا في صلاته)"]]
  .forEach(([id, t]) => check(S[id].story.includes(t), "شرح الكلمة الصعبة في قصة " + id + ": " + t));
// خلاف
const K = ctx.KHILAF;
check(!K.s8v3.sides.some(s => s.who === "المنظومة") && K.s8v3.sides.some(s => /ابن إسحاق/.test(s.who)), "خلاف الحصار: قول السنتين منسوب لابن إسحاق");
check(K.s12av5 && K.s12av5.sides.some(s => /عبيدة/.test(s.text)) && K.s12av5.sides.some(s => /حمزة/.test(s.text)), "خلاف أول راية: عبيدة وحمزة");
// خريطة
const visit = p => ctx.PLACE_VISITS.filter(v => v.place === p).map(v => v.ref);
check(ctx.GEO_PLACES["مكة"] && visit("مكة").length >= 1, "مكة على الخريطة ولها زيارة");
check(visit("العقبة").includes("s10v14") && visit("بدر").includes("s12bv5"), "زيارتا العقبة وبدر على البيت الذي يذكرهما");
check(ctx.GEO_PLACES["حراء"].lat === 21.457 && ctx.GEO_PLACES["العقبة"].lat === 21.421, "إحداثيات حراء والعقبة");
// غريب
check(ctx.GLOSSARY.length >= 30 && ["الفذ", "خريت", "ساخ", "يجلي"].every(t => ctx.GLOSSARY.some(g => N(g.term) === t)), "الغريب يشمل كلمات الأبيات الجديدة");

/* ---------- v104: الدفعة ج من المراجعة العلمية (تقرير فحص v103، القسم 2.4 و3) ---------- */
const has = (s, t) => N(s || "").includes(N(t));
// حدث وأسئلة وألغاز
check(evOf.s13v6 === "سرية عبد الله بن أُنيس", "حدث s13v6: «سرية عبد الله بن أُنيس»");
const q11b3 = allQ.find(q => q.ref === "s11bv9");
check(q11b3 && q11b3.q === "ماذا شُرع بالرؤيا الصادقة؟" && !/المدينة/.test(q11b3.q), "سؤال الأذان: «ماذا شُرع بالرؤيا الصادقة؟» (الصيام شُرع في المدينة أيضاً)");
check(q11 && /الركب الذي هاجر فيه عمر/.test(q11.q) && /واحد من العشرين/.test(q11.explain || ""), "سؤال العشرين: عمر واحد من الركب لا خارجه");
const q5 = allQ.find(q => q.ref === "s5v2");
check(q5 && /^أوائل/.test(q5.q), "سؤال أول ما نزل: «أوائل» كما في البيت");
check(/أوائل/.test(rid("s5").riddle || "") && (rid("s5").accept || []).some(a => N(a) === "العلق"), "لغز المحطة 5: «أوائل» ويقبل «العلق»");
// قصص وشروح
check(!/وهو مسجد قباء/.test(S.s11bv3.story) && /أول مسجد/.test(S.s11bv3.story), "قصة s11bv3 لا تجزم بأن المؤسس على التقوى مسجد قباء");
const ql = (ctx.QURAN_LINKS.s11bv3 || [])[0] || {};
check(!/أكثر المفسرين/.test(ql.note || "") && /1398/.test(ql.note || "") && /منافاة/.test(ql.note || ""), "رابط التوبة 108: يذكر القولين");
check(!/للاستطلاع|سبعة|أميرهم|بنو لحيان/.test(S.s13v7.story) && /عاصم بن ثابت/.test(S.s13v7.story), "قصة s13v7 على المتفق عليه (الخلاف في khilaf)");
check(!/يعلمهم الدين|نفراً من أصحابه/.test(S.s13v8.story) && /الناظم/.test(S.s13v8.story), "قصة s13v8 لا تقدّم رواية ابن إسحاق على أنها الواقع");
check(/4086/.test(srcOf("s13v7")) && /مرثد/.test(srcOf("s13v8")), "مصادر قصتي الرجيع محفوظة");
check(/منكبيه/.test(S.s4v11.story) && /مغشياً/.test(S.s4v11.story) && /إزاري إزاري/.test(S.s4v11.story) && !/همّ بذلك/.test(S.s4v11.story), "قصة الإزار بلفظ الصحيح");
check(/3829/.test(srcOf("s4v11")) && /340/.test(srcOf("s4v11")), "مصدر الإزار: البخاري (3829) ومسلم (340)");
check(/كتاب أمن/.test(S.s11av12.story) && !/موادعة/.test(S.s11av12.story), "كتاب سراقة: «كتاب أمن» (البخاري 3906)");
check(/ساخت/.test(S.s11av11.story) && /الركبتين/.test(S.s11av11.story) && /ساخت/.test(E.s11av11) && !/قوائم/.test(S.s11av11.story + E.s11av11), "سراقة: «ساخت يدا فرسه… حتى بلغتا الركبتين»");
check(/عشرون من أصحاب النبي ﷺ/.test(E.s11av1) && !/راكباً/.test(E.s11av1), "شرح s11av1: عشرون من أصحاب النبي ﷺ");
check(!/شهرين/.test(S.s12bv2.story) && /قبل غزوة بدر/.test(S.s12bv2.story), "قصة تحويل القبلة لا تحدد الشهر");
check(/بعض أهل السير/.test(E.s8v6) && !/فسُمّي/.test(E.s8v6), "شرح s8v6: «يسمّيه بعض أهل السير عام الحزن»");
check(!/ابن إسحاق والبخاري/.test(S.s13v11.note) && /ترجمة باب حديث بني النضير/.test(S.s13v11.note), "حاشية بني النضير: البخاري ذكر القولين");
check(!/حسّنه الترمذي/.test(srcOf("s10v8")) && /2925/.test(srcOf("s10v8")) && /غريب صحيح/.test(srcOf("s10v8")), "مصدر s10v8: الترمذي (2925) غريب صحيح");
check(/بشأنك/.test(S.s12bv6.story) && !/بإسلامك/.test(S.s12bv6.story) && /جحدم/.test(S.s12bv6.note) && !/عتبة بن عمرو/.test(S.s12bv6.note), "فداء العباس بلفظ أحمد (3310)");
check(has(S.s11bv1.story, "بني الديل") && !/الليثي/.test(S.s11bv1.story) && /3905/.test(srcOf("s11bv1")), "ابن أريقط من بني الدِّيل (البخاري 2264، 3905)");
check(/ابن هشام/.test((S.s10v10.sources || [])[0] || "") && /قبل أن تُفترض الحرب/.test(srcOf("s10v10")) && /3892/.test(srcOf("s10v10")), "مصدر العقبة الأولى: ابن هشام أولاً مع حديث عبادة");
check(!/المشهور/.test(S.s10v8.story) && !/أشهر الأقوال/.test(S.s4v3.story), "لا خلاف داخل نص قصتي s10v8 وs4v3");
check(!/فصلّى/.test(E.s12cv4), "شرح الأضحية لا يزيد «فصلّى» على البيت");
check(/أول جمعة صلّاها النبي ﷺ بالمدينة/.test(S.s11bv5.story) && /أسعد بن زرارة/.test(S.s11bv5.note || "") && /1069/.test(S.s11bv5.note || ""), "جمعة رانوناء ليست أول جمعة في الإسلام");
check(/غير شيخ/.test(S.s7v9.note || "") && /1067/.test(S.s7v9.note || ""), "حاشية سجود المشركين: استثناء ابن مسعود");
check(has(S.s12bv5.story, "استوصوا بالأسارى خيرا") && /طبراني/.test(srcOf("s12bv5")), "مادة سؤال النقاش عن أسرى بدر موثقة في القصة");
// ترضٍّ وصلاة
[["s12av4", "حمزة بن عبد المطلب رضي الله عنه"], ["s5v8", "عمرو بن عبسة رضي الله عنه"], ["s8v1", "مسعود رضي الله عنه"], ["s11av1", "عمر بن الخطاب رضي الله عنه"],
 ["s11av3", "أبي بكر رضي الله عنه"], ["s11av6", "فهيرة رضي الله عنه"], ["s11av12", "سراقة رضي الله عنه"], ["s11bv6", "زرارة رضي الله عنه"],
 ["s11bv7", "الربيع رضي الله عنهما"], ["s11bv9", "بلال رضي الله عنه"], ["s12av5", "الحارث رضي الله عنه"], ["s12av8", "وقاص رضي الله عنه"],
 ["s12bv6", "العباس رضي الله عنه"], ["s12cv3", "رضي الله عنهما"], ["s12cv10", "أبي بكر رضي الله عنهما"], ["s13v1", "جبير رضي الله عنه"],
 ["s13v4", "الزبير رضي الله عنهما"], ["s13v10", "ملحان رضي الله عنه"], ["s5v5", "خديجة رضي الله عنها"], ["s4v11", "العباس رضي الله عنه"]]
  .forEach(([id, t]) => check(S[id].story.includes(t), "الترضّي في قصة " + id + ": " + t));
check(/ثم أسلم وحشي بعد ذلك رضي الله عنه/.test(S.s13v2.story) && !/وحشي بن حرب رضي/.test(S.s13v2.story), "وحشي: يُذكر إسلامه ولا يُترضّى عليه عند ذكر القتل");
[["s13v2", "حمزة بن عبد المطلب رضي الله عنه"], ["s12av7", "وقاص رضي الله عنه"], ["s12bv6", "العباس رضي الله عنه"], ["s7v5", "رضي الله عنه"], ["s11av4", "الصديق رضي الله عنه"],
 ["s5v3", "خديجة رضي الله عنها"], ["s5v5", "خديجة رضي الله عنها"]]
  .forEach(([id, t]) => check(E[id].includes(t), "الترضّي في شرح " + id + ": " + t));
check(!Object.values(S).some(x => /يا رسول الله(?! ﷺ)/.test((x.story || "") + (x.note || ""))), "«يا رسول الله» تتبعها ﷺ");
// خلاف
["s2v3", "s4v3", "s5v10", "s10v8", "s11bv3", "s12bv2", "s13v8", "s13v11"].forEach(id => check(K[id] && K[id].sides.length >= 2, "صندوق خلاف " + id));
check(K.s11bv3 && K.s11bv3.sides.some(s => /1398/.test(s.source)) && K.s11bv3.think.some(t => /ابن كثير/.test(t)), "خلاف المسجد المؤسس على التقوى: مسلم (1398) وجمع ابن كثير");
check(K.s13v8 && K.s13v8.sides.some(s => /عاصم/.test(s.text) && /3045|4086/.test(s.source)) && K.s13v8.sides.some(s => /مرثد/.test(s.text)), "خلاف الرجيع: عاصم (البخاري) ومرثد (ابن إسحاق)");
check(K.s12bv2 && K.s12bv2.sides.some(s => /رجب/.test(s.text)) && K.s12bv2.sides.some(s => /شعبان/.test(s.text)), "خلاف شهر تحويل القبلة: رجب وشعبان");
check(!K.s8v3.sides.some(s => s.who === "ابن كثير") && K.s8v3.sides.some(s => /موسى بن عقبة/.test(s.who)), "خلاف الحصار: قول الثلاث لموسى بن عقبة عن الزهري (ابن كثير ناقل)");
// غريب ومكان ونقاش
["سيف البحر", "نصب", "الركاب", "العدى", "الانام", "جذع", "الحسب", "شدا", "الحانية", "المسدده"]
  .forEach(t => check(ctx.GLOSSARY.some(g => N(g.term) === N(t)), "الغريب يشمل «" + t + "»"));
check(/أكسوم/.test(ctx.GEO_PLACES["الحبشة"].note), "الحبشة: الإحداثيات لأكسوم");
check(ctx.DISCUSSION.s13.some(q => /في سبيل الله/.test(q)) && !ctx.DISCUSSION.s13.some(q => /ما يؤمنون/.test(q)), "سؤال النقاش: «في سبيل الله»");

if (fail) { console.log("❌ " + fail + " من تصحيحات المراجعة العلمية رجع"); process.exit(1); }
console.log("✅ تصحيحات المراجعة العلمية سليمة");
