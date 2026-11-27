#!/usr/bin/env node
/* تشغيل كل الاختبارات بأمر واحد (من جذر المستودع):
     npm test                 = node tests/run-all.js           اختبارات Node (لا تحتاج متصفحاً)
     npm run test:e2e         = node tests/run-all.js --e2e     مع اختبارات المتصفح (تحتاج playwright)
   - الاختبارات تُكتشف آلياً: tests/unit/*.test.js وtests/e2e/*.e2e.js، فلا يُنسى ملف جديد.
   - المتصفح يفتح web/index.html افتراضياً؛ HASANIYA_URL يغيّره (البناء الآلي يمرّر الملف الواحد)،
     وCHROMIUM_PATH يختار متصفحاً بعينه. انظر tests/_env.js.
   - اختبار متصفح فشل يُعاد مرة واحدة، ويُعَدّ ويُذكر في الملخص (فلا يختفي التذبذب).
   يخرج برمز 1 عند فشل أي اختبار. */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const withE2e = process.argv.includes("--e2e");
const only = process.argv.slice(2).filter(a => !a.startsWith("--"));
const list = (sub, suffix) => fs.readdirSync(path.join(__dirname, sub)).filter(f => f.endsWith(suffix)).sort().map(f => path.join(sub, f));
let runs = list("unit", ".test.js").map(file => ({ file, kind: "node" }));
if (withE2e) runs = runs.concat(list("e2e", ".e2e.js").map(file => ({ file, kind: "browser" })));
if (only.length) runs = runs.filter(r => only.some(o => r.file.includes(o)));

let failed = 0;
const retriedOk = [];
for (const r of runs) {
  const t0 = Date.now();
  const run = () => spawnSync(process.execPath, [path.join(__dirname, r.file)], { encoding: "utf8", timeout: 300000, env: process.env });
  let res = run();
  /* اختبارات المتصفح تعتمد على توقيت: إن فشل أحدها يُعاد مرة واحدة، ويُذكر ذلك في النتيجة */
  if (res.status !== 0 && r.kind === "browser") {
    const first = res; res = run();
    if (res.status === 0) {
      retriedOk.push(r.file);
      console.log(`⚠ ${r.file} نجح في المحاولة الثانية. أول فشل:\n` + ((first.stdout || "") + (first.stderr || "")).trim().split("\n").slice(-6).join("\n").replace(/^/gm, "    "));
    }
  }
  const ok = res.status === 0;
  if (!ok) failed++;
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`${ok ? "✅" : "❌"} ${r.file}  (${r.kind}, ${secs}s)`);
  if (!ok) {
    const out = ((res.stdout || "") + (res.stderr || "")).trim().split("\n").slice(-15).join("\n");
    console.log(out.replace(/^/gm, "    "));
  }
}
console.log(failed ? `\nفشل ${failed} من ${runs.length}` : `\nنجحت كل الاختبارات (${runs.length})`);
if (retriedOk.length) {
  console.log(`⚠ نجح في المحاولة الثانية فقط (${retriedOk.length}): ${retriedOk.join("، ")}`);
  if (process.env.GITHUB_STEP_SUMMARY) { try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n⚠ اختبارات متذبذبة نجحت في المحاولة الثانية: ${retriedOk.join(", ")}\n`); } catch (e) {} }
}
if (!withE2e) console.log("ملاحظة: اختبارات المتصفح لم تُشغَّل. أضف --e2e لتشغيلها.");
process.exit(failed ? 1 : 0);
