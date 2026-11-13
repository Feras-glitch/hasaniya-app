/* v106: معرّفات الأبيات ثابتة. كان المعرّف يُحسب من موضع البيت، فإضافة بيت في وسط محطة (بعد مراجعة التشكيل،
   أو في القسم الثاني) تُزحزح ما بعده، فيُنسب تقدّم الطفل وتسجيلات المعلم إلى بيت آخر.
   يتحقق هذا الاختبار من:
   1) كل بيت في manzumah.js معرّفه مكتوب في سطره، بلا تكرار، وبلا تحذير من المحلل
   2) كل معرّف في القائمة المجمّدة (tests/data/verse-ids.json) ما زال موجوداً، وبالترتيب نفسه
      (بيت جديد يُضاف إلى القائمة في موضعه؛ ولا يُحذف منها شيء ولا يُغيَّر)
   3) رقم البيت في الكتاب (n) متسلسل من 1
   4) لا يستنتج الكود المحطة من شكل المعرّف (split("v") ونحوه)، لأن البيت قد يُنقل ويبقى معرّفه */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const ROOT = path.join(__dirname, "..");
const ctx = {};
vm.createContext(ctx);
for (const f of ["js/data/manzumah.js", "js/data/stories.js", "js/data/explanations.js", "js/parser.js"])
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
const J = vm.runInContext("DEFAULT_JOURNEY", ctx);
const warnings = Array.from(vm.runInContext("PARSE_WARNINGS", ctx)).filter(w => /معرّف/.test(w));
assert.deepStrictEqual(warnings, [], "تحذيرات معرّفات: " + warnings.join(" | "));

const verses = Array.from(J).flatMap(s => Array.from(s.verses));   // مصفوفات محلية (السياق المنفصل له نماذجه)
const ids = verses.map(v => v.id);
assert.strictEqual(new Set(ids).size, ids.length, "معرّف مكرر");

// 1) المعرّف مكتوب في كل سطر بيت
const raw = fs.readFileSync(path.join(ROOT, "js/data/manzumah.js"), "utf8");
const body = raw.slice(raw.indexOf("`") + 1, raw.lastIndexOf("`"));
const lines = body.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("@"));
assert.strictEqual(lines.length, verses.length);
lines.forEach((l, i) => {
  const p = l.split("||");
  assert.strictEqual(p.length, 3, `السطر ${i + 1} ليس بالصيغة «البيت||الحدث||المعرّف»`);
  assert.strictEqual(p[2].trim(), ids[i], `السطر ${i + 1}: المعرّف المكتوب لا يطابق`);
});

// 2) القائمة المجمّدة: كل معرّف قديم موجود وبالترتيب نفسه
const frozen = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "verse-ids.json"), "utf8")).ids;
const missing = frozen.filter(id => !ids.includes(id));
assert.deepStrictEqual(missing, [], "معرّفات أبيات اختفت أو تغيّرت (يضيع تقدّم الأطفال عليها): " + missing.join(" "));
const order = ids.filter(id => frozen.includes(id));
assert.deepStrictEqual(order, frozen, "تغيّر ترتيب الأبيات المجمّدة");
const added = ids.filter(id => !frozen.includes(id));
assert.deepStrictEqual(added, [], "أبيات جديدة لم تُضف إلى tests/data/verse-ids.json: " + added.join(" "));

// 3) رقم الكتاب متسلسل
verses.forEach((v, i) => assert.strictEqual(v.n, i + 1, `${v.id}: رقمه في الكتاب ${v.n} والمتوقع ${i + 1}`));

// 4) لا استنتاج للمحطة من شكل المعرّف في الكود (عدا ترحيل الأرقام القديمة قبل v94 في storage.js)
const offenders = [];
for (const f of fs.readdirSync(path.join(ROOT, "js")).filter(f => f.endsWith(".js"))) {
  const src = fs.readFileSync(path.join(ROOT, "js", f), "utf8");
  src.split("\n").forEach((line, i) => {
    if (/\.split\(\s*["']v["']\s*\)|replace\(\/v\\d\+\$\//.test(line) && !(f === "storage.js" && /s11|s12|legacy/i.test(src.split("\n").slice(Math.max(0, i - 6), i + 1).join("\n"))))
      offenders.push(`${f}:${i + 1}`);
  });
}
assert.deepStrictEqual(offenders, [], "كود يستنتج المحطة من شكل المعرّف: " + offenders.join(" "));

console.log(`معرّفات الأبيات ثابتة: ${ids.length} بيتاً، ورقم الكتاب من 1 إلى ${verses[verses.length - 1].n}`);
