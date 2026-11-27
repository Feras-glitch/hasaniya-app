#!/usr/bin/env node
/* رقم النسخة في كل مواضعه بأمر واحد (من توصيات مراجعة المطوّر في v113؛ كان الإصدار يحتاج 8 تعديلات في 6 ملفات):
     node tools/bump-version.js            يرفع الرقم واحداً (113 ← 114)
     node tools/bump-version.js 120        يضعه 120
     node tools/bump-version.js --check    يفحص التطابق فقط ويطبع ما يختلف (يستعمله البناء الآلي)
   المواضع: android/app/build.gradle (versionCode وversionName)، desktop/package.json (version)،
   web/sw.js (اسم الكاش)، web/js/config.js (APP_VERSION)، وسطر النسخة في README.md. */
"use strict";
const fs = require("fs"), path = require("path");
const R = path.join(__dirname, "..");
const P = {
  gradle: path.join(R, "android/app/build.gradle"),
  pkg: path.join(R, "desktop/package.json"),
  sw: path.join(R, "web/sw.js"),
  cfg: path.join(R, "web/js/config.js"),
  readme: path.join(R, "README.md")
};
const read = f => fs.readFileSync(f, "utf8");
function current() {
  const g = read(P.gradle), sw = read(P.sw), cfg = read(P.cfg), rd = read(P.readme);
  return {
    versionCode: (g.match(/^\s*versionCode\s+(\d+)/m) || [])[1],
    versionName: (g.match(/^\s*versionName\s+"([^"]+)"/m) || [])[1],
    pkg: JSON.parse(read(P.pkg)).version,
    sw: (sw.match(/^\s*const\s+CACHE\s*=\s*"hasaniya-v(\d+)-[A-Za-z0-9]+"/m) || [])[1],
    cfg: (cfg.match(/^const APP_VERSION = "(\d+)";/m) || [])[1],
    readme: (rd.match(/^\*\*النسخة:\*\* v(\d+)/m) || [])[1]
  };
}
function problems(c) {
  const n = c.versionCode, out = [];
  if (!/^\d+$/.test(n || "")) out.push(`versionCode غير موجود في ${P.gradle}`);
  if (c.versionName !== `${n}.0`) out.push(`versionName (${c.versionName}) يجب أن يكون ${n}.0`);
  if (c.pkg !== `${n}.0.0`) out.push(`desktop/package.json version (${c.pkg}) يجب أن يكون ${n}.0.0`);
  if (c.sw !== n) out.push(`web/sw.js: اسم الكاش يجب أن يبدأ بـ hasaniya-v${n}- (الموجود v${c.sw})`);
  if (c.cfg !== n) out.push(`web/js/config.js: APP_VERSION يجب أن يكون "${n}" (الموجود ${c.cfg})`);
  if (c.readme !== n) out.push(`README.md: سطر «**النسخة:** v${n}» (الموجود v${c.readme})`);
  return out;
}
const args = process.argv.slice(2);
const c = current();
if (args.includes("--check")) {
  const p = problems(c);
  p.forEach(x => console.log("❌ " + x));
  if (p.length) process.exit(1);
  console.log(`✅ رقم النسخة متطابق في كل المواضع: ${c.versionName}`);
  process.exit(0);
}
const to = args[0] ? parseInt(args[0], 10) : parseInt(c.versionCode, 10) + 1;
if (!(to > 0)) { console.error("✖ رقم غير صالح"); process.exit(1); }
const write = (f, fn) => { const s = read(f), t = fn(s); if (s === t) throw new Error("لم يتغيّر شيء في " + f); fs.writeFileSync(f, t); };
write(P.gradle, s => s.replace(/^(\s*versionCode\s+)\d+/m, `$1${to}`).replace(/^(\s*versionName\s+")[^"]+"/m, `$1${to}.0"`));
write(P.pkg, s => s.replace(/("version"\s*:\s*")[^"]+"/, `$1${to}.0.0"`));
write(P.sw, s => s.replace(/^(\s*const\s+CACHE\s*=\s*"hasaniya-v)\d+(-[A-Za-z0-9]+")/m, `$1${to}$2`));
write(P.cfg, s => s.replace(/^const APP_VERSION = "\d+";/m, `const APP_VERSION = "${to}";`));
write(P.readme, s => s.replace(/^\*\*النسخة:\*\* v\d+/m, `**النسخة:** v${to}`));
const p = problems(current());
if (p.length) { p.forEach(x => console.log("❌ " + x)); process.exit(1); }
console.log(`✅ صار رقم النسخة ${to}.0 في كل المواضع. إن تغيّر المحتوى فارفع CONTENT_VERSION أيضاً (انظر CONTRIBUTING.md).`);
