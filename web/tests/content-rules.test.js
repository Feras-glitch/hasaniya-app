/* قواعد أمانة المحتوى (v90): لا مسودات ولا مصادر غير معاينة في ما يُعرض للوالد والطفل */
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const ctx = {}; vm.createContext(ctx);
["js/data/stories.js", "js/data/khilaf.js"].forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), "utf8").replace(/\bconst\b/g, "var"), ctx));
const S = ctx.STORIES, K = ctx.KHILAF;
let fail = 0; const bad = m => { console.log("❌ " + m); fail++; };
const SHOWN = ["ok", "book"];
// 1) اسم صاحب المشروع لا يظهر في أي بيانات تُشحن
fs.readdirSync(path.join(root, "js/data")).forEach(f => { if (/فراس/.test(fs.readFileSync(path.join(root, "js/data", f), "utf8"))) bad("اسم شخصي في js/data/" + f); });
Object.entries(S).forEach(([id, x]) => {
  const shown = SHOWN.includes(x.status);
  // 2) لا مصدر معروض يعترف بأنه لم يُعاين
  if (shown) (x.sources || []).forEach(s => { if (/لم يُعاين|لم أتحقق|لم يُتحقق|لم أرَ|تحققتُ/.test(s)) bad(id + ": مصدر غير معاين معروض: " + s.slice(0, 60)); });
  // 3) لا مسودة بصيغة المتكلم في note
  if (x.note && /لم أ|لم يُ|فراس|يُطابق على|قبل النشر/.test(x.note)) bad(id + ": مسودة داخلية في note");
  // 3ب) ملاحظة معروضة للوالد: صياغة قابلة للقراءة
  if (shown && x.note && /رأيت|فحُذف|يلزم تدقيقه|لم تطابق|في الكتاب خطأ|مؤكد عندي/.test(x.note)) bad(id + ": ملاحظة بصياغة مذكرة عمل");
  // 4) قصة معروضة ليست مبتورة (الحد الأدنى للطول) ولها مصدر
  if (shown && !x.share) {
    if ((x.story || "").length < 40) bad(id + ": قصة قصيرة جداً (" + (x.story || "").length + ")");
    if (!(x.sources || []).length) bad(id + ": قصة معروضة بلا مصدر");
  }
});
// 5) لا مرجع معاصر يُقابَل بمصدر أصلي في صندوق الخلاف
Object.entries(K).forEach(([id, k]) => k.sides.forEach(s => { if (/غلوش/.test(s.who + s.source)) bad(id + ": مرجع معاصر في الخلاف"); }));
if (fail) { console.log("فشل " + fail); process.exit(1); }
console.log("✅ قواعد أمانة المحتوى");
