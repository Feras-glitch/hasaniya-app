/* يتحقق من تقسيم تصدير التسجيلات: لا تتجاوز الحزمة 15 تسجيلاً ولا حدّ الحجم، ولا يضيع تسجيل */
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "js/recitation.js"), "utf8");
const limits = src.match(/const EXPORT_PACK_BYTES = (.+);\nconst EXPORT_PACK_ITEMS = (\d+);/);
const fnSrc = src.slice(src.indexOf("function packItems"), src.indexOf("async function exportRecitation"));
const packItems = new Function("EXPORT_PACK_BYTES", "EXPORT_PACK_ITEMS", fnSrc + "\nreturn packItems;")(
  eval(limits[1]), Number(limits[2]));

const fail = [];
const mk = (n, size) => Array.from({ length: n }, (_, i) => ({ key: "k" + i, blob: { size } }));
const cases = [
  ["فارغ", [], 0],
  ["تسجيلات صغيرة", mk(40, 1000), 3],
  ["تسجيلات كبيرة", mk(10, 150 * 1024), null],
  ["تسجيل واحد أكبر من الحد", [{ key: "big", blob: { size: 900 * 1024 } }], 1],
];
for (const [name, items, expected] of cases) {
  const packs = packItems(items);
  const flat = packs.flat();
  if (flat.length !== items.length) fail.push(`${name}: فُقد تسجيل`);
  if (packs.some(p => p.length > Number(limits[2]))) fail.push(`${name}: تجاوز عدد الحزمة`);
  if (packs.some(p => p.length > 1 && p.reduce((s, x) => s + x.blob.size, 0) > eval(limits[1]))) fail.push(`${name}: تجاوز الحجم`);
  if (expected !== null && packs.length !== expected) fail.push(`${name}: عدد الحزم ${packs.length} بدلاً من ${expected}`);
}
if (fail.length) { console.error(fail.join("\n")); process.exit(1); }
console.log("تقسيم التصدير يحترم حدود الحجم والعدد ولا يفقد تسجيلات");
