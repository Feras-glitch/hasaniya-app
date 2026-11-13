/* v107: القصص القصيرة لابن السادسة (js/data/stories-short.js)
   1) كل قصة معروضة أطول من جملتين (وليست تكراراً للبيت الذي قبلها) لها قصة قصيرة مكتوبة باليد
   2) كل مفتاح معرّف بيت موجود وله قصة
   3) القصيرة قصيرة فعلاً (حد أعلى للطول، وأقصر من القصة الكاملة)، وبلا ألفاظ المسودات */
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.join(__dirname, "..");
const ctx = {}; vm.createContext(ctx);
["js/data/manzumah.js", "js/data/stories.js", "js/data/explanations.js", "js/parser.js", "js/data/stories-short.js"]
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), "utf8").replace(/\bconst\b|\blet\b/g, "var"), ctx, { filename: f }));
const J = ctx.DEFAULT_JOURNEY, S = ctx.STORIES_SHORT;
const parts = s => String(s || "").match(/[^.!؟]+[.!؟]*/g) || [];
const byId = {}; const need = [];
for (const st of J) st.verses.forEach((v, i) => {
  byId[v.id] = v;
  const same = i > 0 && v.story && st.verses[i - 1].story === v.story;
  if (v.story && !same && parts(v.story).length > 2) need.push(v.id);
});
const missing = need.filter(id => !S[id]);
assert.deepStrictEqual(missing, [], "قصص طويلة بلا قصة قصيرة: " + missing.join(" "));
for (const [id, t] of Object.entries(S)) {
  assert.ok(byId[id] && byId[id].story, `${id}: معرّف بلا قصة`);
  assert.ok(t.length <= 170, `${id}: القصة القصيرة طويلة (${t.length} حرفاً)`);
  assert.ok(t.length < byId[id].story.length, `${id}: القصيرة ليست أقصر من الكاملة`);
  assert.ok(!/لم أ|فراس|يُراجع|TODO/.test(t), `${id}: لفظ مسودة`);
}
console.log(`القصص القصيرة: ${Object.keys(S).length} قصة، وكل قصة طويلة لها قصيرة`);
