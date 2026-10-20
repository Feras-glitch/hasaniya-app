/* يتحقق من أن كل مشهد مرجعي موجود على القرص، وأن الصور WebP، وأن أزرار الرموز لها تسمية */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.join(__dirname, "..");
const errors = [];

const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "js/data/scenes.js"), "utf8") + "\n;this.SCENES = SCENES;", ctx);
const scenes = ctx.SCENES || {};
const entries = Object.entries(scenes);
if (!entries.length) errors.push("SCENES فارغ");
for (const [vid, rel] of entries) {
  if (!/\.webp$/.test(rel)) errors.push(`${vid}: الصورة ليست WebP (${rel})`);
  if (!fs.existsSync(path.join(root, rel))) errors.push(`${vid}: الملف غير موجود (${rel})`);
}
let totalBytes = 0;
for (const [vid, rel] of entries) {
  const f = path.join(root, rel);
  if (!fs.existsSync(f)) continue;
  const n = fs.statSync(f).size; totalBytes += n;
  if (n > 60 * 1024) errors.push(`${vid}: الصورة ${Math.round(n / 1024)}KB أكبر من 60KB، شغّل tools/compress_scenes.py`);
}
if (totalBytes > 9 * 1024 * 1024) errors.push("مجموع الصور أكبر من 9MB");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
for (const [, rel] of entries) {
  if (!sw.includes('"./' + rel + '"')) errors.push(`sw.js لا يخزّن ${rel} دون اتصال`);
}
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const buttons = html.match(/<button[^>]*>[\s\S]*?<\/button>/g) || [];
for (const b of buttons) {
  const text = b.replace(/<[^>]+>/g, "").replace(/[^\p{L}\p{N}]/gu, "");
  if (!text && !/aria-label=/.test(b)) errors.push("زر بلا نص ولا تسمية: " + b.slice(0, 80));
}

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`كل المشاهد (${entries.length}) موجودة بصيغة WebP، والأزرار مسمّاة`);
