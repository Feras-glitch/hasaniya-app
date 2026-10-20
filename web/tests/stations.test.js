/* بنية المحطات بعد تقسيم المحطتين 11 و12 (v91) */
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const ctx = { console }; vm.createContext(ctx);
["js/data/manzumah.js", "js/data/stories.js", "js/data/explanations.js", "js/parser.js", "js/data/quizzes.js", "js/data/discussion.js", "js/data/stickers.js", "js/data/riddles.js", "js/journey.js"]
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), "utf8").replace(/\bconst\b|\blet\b/g, "var"), ctx, { filename: f }));
let fail = 0; const bad = m => { console.log("❌ " + m); fail++; };
const J = ctx.DEFAULT_JOURNEY;
const expected = "s1 s2 s3 s4 s5 s6 s7 s8 s9 s10 s11a s11b s12a s12b s12c s13".split(" ");
if (J.map(s => s.id).join(" ") !== expected.join(" ")) bad("ترتيب المحطات: " + J.map(s => s.id).join(" "));
if (J.reduce((n, s) => n + s.verses.length, 0) !== 161) bad("عدد الأبيات ليس 161");
J.forEach(s => {
  if (/^s1[12][abc]$/.test(s.id) && s.verses.length > 12) bad(s.id + ": أكثر من 12 بيتاً (" + s.verses.length + ")");
  s.verses.forEach((v, i) => { if (v.id !== s.id + "v" + (i + 1)) bad("معرّف غير متسلسل: " + v.id); });
  if (!(ctx.QUIZZES[s.id] || []).length) bad(s.id + ": بلا اختبار");
  if (!(ctx.DISCUSSION[s.id] || []).length) bad(s.id + ": بلا أسئلة نقاش");
  if (!ctx.STICKERS[s.id]) bad(s.id + ": بلا ملصق");
  if (!ctx.PLACES[s.id]) bad(s.id + ": بلا موضع على الخريطة");
  if (!s.reward || !s.reward.name) bad(s.id + ": بلا مكافأة");
});
ctx.RIDDLES.forEach(r => { if (!expected.includes(r.station)) bad("لغز لمحطة غير موجودة: " + r.station); });
["QUIZZES", "DISCUSSION", "STICKERS", "PLACES"].forEach(n => Object.keys(ctx[n]).forEach(k => { if (!expected.includes(k)) bad(n + ": مفتاح محطة غير موجود " + k); }));
if (ctx.PARSE_WARNINGS.length) bad("تحذيرات المحلل: " + ctx.PARSE_WARNINGS.join(" | "));
if (fail) { console.log("فشل " + fail); process.exit(1); }
console.log("✅ بنية المحطات (16 محطة، 161 بيتاً)");
