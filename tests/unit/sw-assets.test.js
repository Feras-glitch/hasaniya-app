/* قائمة «العمل دون إنترنت» (ASSETS في web/sw.js) تُكتب باليد. كانت الاختبارات لا تتحقق من السكربتات،
   فنسيان سطر عند إضافة ملف كود يمرّ من كل الفحوص وتختفي الميزة دون إنترنت بصمت (وجده مراجع المطوّر في v113).
   هنا: كل سكربت وورقة أنماط وخط وصورة في index.html موجود في ASSETS، وكل ما في ASSETS موجود على القرص، بلا تكرار. */
const __env = require("../_env");
const fs = require("fs"), path = require("path"), assert = require("assert");
const html = fs.readFileSync(path.join(__env.WEB, "index.html"), "utf8");
const sw = fs.readFileSync(path.join(__env.WEB, "sw.js"), "utf8");
const m = sw.match(/const ASSETS = (\[[\s\S]*?\]);/);
assert(m, "لم أجد ASSETS في sw.js");
const assets = JSON.parse(m[1]);
const norm = p => "./" + p.replace(/^\.\//, "");
const used = new Set();
for (const re of [/<script[^>]+src="([^"]+)"/g, /<link[^>]+href="([^"]+)"/g, /<img[^>]+src="([^"]+)"/g]) {
  for (const x of html.matchAll(re)) if (!/^(https?:|data:|#)/.test(x[1])) used.add(norm(x[1]));
}
const css = fs.readFileSync(path.join(__env.WEB, "css/styles.css"), "utf8");
for (const x of css.matchAll(/url\("?\.\.\/([^")]+)"?\)/g)) used.add(norm(x[1]));
const missing = [...used].filter(p => !assets.includes(p));
assert.deepStrictEqual(missing, [], "ملفات في index.html أو styles.css ليست في ASSETS (لن تعمل دون إنترنت): " + missing.join(" "));
const absent = assets.filter(p => p !== "./" && !fs.existsSync(path.join(__env.WEB, p)));
assert.deepStrictEqual(absent, [], "ملفات في ASSETS غير موجودة على القرص: " + absent.join(" "));
const dup = assets.filter((p, i) => assets.indexOf(p) !== i);
assert.deepStrictEqual(dup, [], "ملفات مكررة في ASSETS: " + dup.join(" "));
console.log(`sw-assets: ok (${used.size} ملفاً مستعملاً، ${assets.length} في ASSETS)`);
