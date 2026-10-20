// تشغيل: node tests/validate.test.js
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const load = f => fs.readFileSync(path.join(root, f), "utf8");
const ctx = {}; vm.createContext(ctx);
["js/data/manzumah.js","js/data/stories.js","js/data/khilaf.js","js/data/scenes.js","js/data/explanations.js","js/data/quizzes.js","js/data/riddles.js","js/data/stickers.js","js/parser.js"].forEach(f => {
  if (fs.existsSync(path.join(root, f))) vm.runInContext(load(f) + "\n", ctx, {filename:f});
});
const run = s => vm.runInContext(s, ctx);
let fail = 0, warn = 0;
const bad = m => { console.log("❌ " + m); fail++; };
const wrn = m => { console.log("⚠️  " + m); warn++; };
const ok  = m => console.log("✅ " + m);

const journey = run("DEFAULT_JOURNEY");
const verses = journey.flatMap(s => s.verses);
verses.length === 161 ? ok("عدد الأبيات 161") : bad("عدد الأبيات " + verses.length);
const ids = new Set(verses.map(v => v.id));
ids.size === verses.length ? ok("معرّفات الأبيات فريدة") : bad("معرّفات مكررة");

const STORIES = run("STORIES"), norm = run("normalizeArabic");
let st = {ok:0, book:0, review:0}; let sharedCount = 0;
Object.entries(STORIES).forEach(([id, s]) => {
  const v = verses.find(x => x.id === id);
  if (!v) return bad("قصة بلا بيت: " + id);
  if (s.share) {
    // بيت تابع لقصة بيت آخر: يجب أن يشير إلى قصة موجودة وغير مراجَعة
    const t = STORIES[s.share];
    if (!t || t.share) bad(id + ": يشير إلى قصة غير موجودة أو متسلسلة «" + s.share + "»");
    else if (t.status === "review") bad(id + ": يشير إلى قصة بلا شاهد «" + s.share + "»");
    else sharedCount++;
    return;
  }
  if (!st.hasOwnProperty(s.status)) bad(id + ": حالة غير معروفة " + s.status); else st[s.status]++;
  if (!s.anchor) bad(id + ": لا anchor");
  else if (!norm(v.fullVerse).includes(norm(s.anchor))) bad(id + ": anchor «" + s.anchor + "» غير موجود في البيت «" + v.fullVerse + "»");
  if (s.status !== "review" && (!s.sources || !s.sources.length)) bad(id + ": قصة معروضة بلا مصادر");
  if (s.status !== "review" && (!s.story || s.story.length < 20)) bad(id + ": نص القصة قصير");
});
console.log("حالات القصص:", JSON.stringify(st), "| أبيات تشارك قصة:", sharedCount);
if (typeof ctx.EXPLANATIONS !== "undefined" || fs.existsSync(path.join(root,"js/data/explanations.js"))) {
  const E = run("EXPLANATIONS");
  verses.forEach(v => { if (!E[v.id]) bad("لا شرح للبيت " + v.id); });
  Object.keys(E).forEach(k => { if (!ids.has(k)) bad("شرح لبيت غير موجود: " + k); });
  ok("تغطية الشروح: " + verses.filter(v => E[v.id]).length + "/161");
}
if (run("typeof QUIZZES") !== "undefined") {
  const Q = run("QUIZZES"), vmap = Object.fromEntries(verses.map(x => [x.id, x]));
  Object.keys(Q).forEach(st => {
    if (Q[st].length !== 3) bad("المحطة " + st + " فيها " + Q[st].length + " أسئلة بدل 3");
    Q[st].forEach((it, n) => {
      const tag = st + "#" + (n + 1);
      const ref = vmap[it.ref];
      if (!ref) return bad(tag + ": مرجع غير موجود " + it.ref);
      if (!norm(ref.fullVerse).includes(norm(it.correct))) bad(tag + ": الإجابة «" + it.correct + "» غير موجودة في " + it.ref);
      if (it.wrong.length !== 2) bad(tag + ": يلزم مشتّتان");
      it.wrong.forEach(w => {
        if (norm(w) === norm(it.correct) || norm(it.correct).includes(norm(w)) || norm(w).includes(norm(it.correct))) bad(tag + ": مشتّت «" + w + "» قريب جداً من الإجابة");
      });
    });
  });
  ok("أسئلة المحطات: " + Object.values(Q).reduce((s, a) => s + a.length, 0) + " سؤالاً");
}
if (run("typeof RIDDLES") !== "undefined") {
  const R = run("RIDDLES"), vm2 = Object.fromEntries(verses.map(x => [x.id, x]));
  const stations = new Set(journey.map(s => s.id));
  R.forEach((r, n) => {
    const tag = "لغز#" + (n + 1);
    const ref = vm2[r.ref];
    if (!ref) return bad(tag + ": مرجع غير موجود " + r.ref);
    if (!r.riddle || !r.answer) return bad(tag + ": نص أو جواب فارغ");
    if (!norm(ref.fullVerse).includes(norm(r.answer))) bad(tag + ": الجواب «" + r.answer + "» غير موجود في " + r.ref);
    if (!stations.has(r.station)) bad(tag + ": محطة غير معروفة " + r.station);
  });
  ok("الألغاز: " + R.length + " لغزاً مرتبطة ببيت موجود");
}
if (run("typeof STICKERS") !== "undefined") {
  const S = run("STICKERS");
  journey.forEach(s => { if (!S[s.id]) bad("لا ملصق للمحطة " + s.id); });
  ok("الملصقات: " + Object.keys(S).length + " ملصقاً");
}
// صندوق الاختلاف: لا يُضاف إلا لقصة معروضة، ولكل جانب مصدر
if (run("typeof KHILAF") !== "undefined") {
  const K = run("KHILAF");
  Object.entries(K).forEach(([id, k]) => {
    const st = STORIES[id];
    if (!st || st.share || !["ok","book"].includes(st.status)) return bad("صندوق اختلاف لقصة غير معروضة: " + id);
    if (!k.title || !k.agreed || !k.question || !Array.isArray(k.think) || k.think.length < 2) return bad("صندوق اختلاف ناقص: " + id);
    if (!Array.isArray(k.sides) || k.sides.length < 2 || k.sides.some(x => !x.who || !x.text || !x.source)) return bad("جانب بلا مصدر في صندوق الاختلاف: " + id);
  });
  ok("صناديق الاختلاف: " + Object.keys(K).length);
}
// المشاهد التوضيحية: كل مفتاح بيت موجود، وكل ملف موجود على القرص
if (run("typeof SCENES") !== "undefined") {
  const SC = run("SCENES");
  Object.entries(SC).forEach(([id, file]) => {
    if (!ids.has(id)) return bad("مشهد لبيت غير موجود: " + id);
    if (!fs.existsSync(path.join(root, file))) return bad("ملف مشهد مفقود: " + file);
  });
  ok("المشاهد التوضيحية: " + Object.keys(SC).length);
}
console.log(fail ? `\nفشل: ${fail}` : "\nنجح كل شيء", warn ? `(تحذيرات: ${warn})` : "");
process.exit(fail ? 1 : 0);
