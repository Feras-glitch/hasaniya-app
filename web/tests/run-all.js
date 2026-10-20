#!/usr/bin/env node
/* تشغيل كل الاختبارات بأمر واحد:
     node tests/run-all.js           اختبارات Node (لا تحتاج متصفحاً)
     node tests/run-all.js --e2e     مع اختبارات المتصفح (تحتاج playwright وchromium)
   المتصفح: ضع مسار Chromium في CHROMIUM_PATH، وإن كان playwright خارج المشروع فاضبط NODE_PATH.
   يخرج برمز 1 عند فشل أي اختبار. */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const dir = __dirname;
const withE2e = process.argv.includes("--e2e");
const unit = fs.readdirSync(dir).filter(f => f.endsWith(".test.js")).sort();
const browser = ["smoke.js", "screens.e2e.js", "v68.e2e.js", "v69.e2e.js", "v70.e2e.js", "v75.e2e.js", "v78.e2e.js", "v80.e2e.js", "v81.e2e.js", "v83.e2e.js", "v85.e2e.js", "v86.e2e.js", "v87.e2e.js", "v88.e2e.js", "v89.e2e.js", "v90.e2e.js", "v91.e2e.js", "v94.e2e.js", "v95.e2e.js", "v99.e2e.js", "v100.e2e.js", "v101.e2e.js"];

const runs = unit.map(f => ({ file: f, kind: "node" }));
if (withE2e) browser.forEach(f => runs.push({ file: f, kind: "browser" }));

let failed = 0;
for (const r of runs) {
  const t0 = Date.now();
  const run = () => spawnSync(process.execPath, [path.join(dir, r.file)], { encoding: "utf8", timeout: 300000, env: process.env });
  let res = run();
  /* اختبارات المتصفح تعتمد على توقيت: إن فشل أحدها يُعاد مرة واحدة، ويُذكر ذلك في النتيجة */
  let retried = false;
  if (res.status !== 0 && r.kind === "browser") { const first = res; res = run(); retried = true; if (res.status === 0) console.log(`⚠ ${r.file} نجح في المحاولة الثانية. أول فشل:\n` + ((first.stdout || "") + (first.stderr || "")).trim().split("\n").slice(-6).join("\n").replace(/^/gm, "    ")); }
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
if (!withE2e) console.log("ملاحظة: اختبارات المتصفح لم تُشغَّل. أضف --e2e لتشغيلها.");
process.exit(failed ? 1 : 0);
