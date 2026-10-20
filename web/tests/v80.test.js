/* اختبارات v80: مراجعة نهائية. تشغيل: node tests/v80.test.js */
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const load = f => fs.readFileSync(path.join(root, f), "utf8");
let fail = 0;
const check = (n, c, d) => { if (c) console.log("ok   ", n); else { fail++; console.log("FAIL ", n, d || ""); } };

// 1) معنى s1v1 يطابق لفظ البيت
{
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(load("js/data/explanations.js"), ctx);
  const m = vm.runInContext("EXPLANATIONS.s1v1", ctx) || "";
  check("معنى s1v1 يذكر الحمد لا «باسم الله»", m.includes("الحمد") && !m.includes("باسم الله"), m);
}
// 2) المحطة الأولى لها موضع على الخريطة
{
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(load("js/journey.js").split("function showJourneyMap")[0], ctx);
  check("المحطة s1 موجودة في PLACES", !!vm.runInContext("PLACES.s1", ctx));
}
// 3) سؤال «أول كلمة» لم يعد يعترض قبل المحطة: maybeWarmup يكمل فوراً دون لمس الشاشة
{
  let done = 0;
  const ctx = { document: { getElementById: () => { throw new Error("warm-up touched the DOM"); } }, state: {} };
  vm.createContext(ctx);
  const src = load("js/guide.js");
  const line = src.split("\n").find(l => l.startsWith("function maybeWarmup"));
  vm.runInContext(line, ctx);
  let threw = false;
  try { vm.runInContext("maybeWarmup({id:'s2', verses:[{id:'s2v1', words:['a','b']}]}, () => { globalThis.__done = 1; })", ctx); } catch(e) { threw = true; }
  check("maybeWarmup يكمل فوراً دون عرض سؤال", !threw && ctx.__done === 1);
}
// 4) النقاط والإتقان: مرة واحدة لكل بيت في اليوم
{
  const ctx = { state: {}, saveState: () => {} };
  vm.createContext(ctx);
  const src = load("js/shadow.js");
  vm.runInContext(src.slice(src.indexOf("function firstCreditToday"), src.indexOf("/* رتّب الكلمات")), ctx);
  const first = vm.runInContext("firstCreditToday('lesson|s1v1')", ctx);
  const second = vm.runInContext("firstCreditToday('lesson|s1v1')", ctx);
  const other = vm.runInContext("firstCreditToday('lesson|s1v2')", ctx);
  check("الاحتساب الأول لبيت اليوم مسموح", first === true);
  check("الاحتساب الثاني لنفس البيت في اليوم ممنوع", second === false);
  check("بيت آخر له احتسابه الخاص", other === true);
}
// 5) الخلط لا يُعيد دائماً الترتيب الأصلي
{
  const ctx = {}; vm.createContext(ctx);
  const src = load("js/shadow.js");
  vm.runInContext(src.slice(src.indexOf("function shuffleWords"), src.indexOf("function startTapOrder")), ctx);
  let identical = 0;
  for (let k = 0; k < 2000; k++) {
    const out = vm.runInContext("shuffleWords([0,1,2,3,4,5])", ctx);
    if (out.every((x, i) => x === i)) identical++;
  }
  check("نسبة الترتيب الأصلي بعد الخلط تقارب 1/720 (أقل من 1%)", identical / 2000 < 0.01, identical);
}
// 6) «ردّد معي» لا يستخدم التعرّف على الصوت
check("ردّد معي لا يستدعي SpeechRecognition", !/SpeechRecognition/.test(load("js/shadow.js")));

console.log(fail ? `\n${fail} فشل` : "\nكل اختبارات v80 نجحت");
process.exit(fail ? 1 : 0);
