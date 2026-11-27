#!/usr/bin/env node
/* فحص الكود آلياً (من توصيات مراجعة المطوّر في v113): سكربتات التطبيق كلها فضاء عام واحد،
   فلا يصح فحص كل ملف وحده. هنا تُدمج بترتيب index.html ثم يُفحص الناتج بقواعد قليلة لا ضوضاء فيها:
   اسم غير معرّف، وتعريف مكرر، ومفتاح مكرر في كائن، وكود لا يصل إليه التنفيذ.
   الاستعمال: npm run lint   (يحتاج eslint وglobals من devDependencies) */
"use strict";
const fs = require("fs"), path = require("path");
const { Linter } = require("eslint");
const globals = require("globals");
const WEB = path.join(__dirname, "..", "web");
const html = fs.readFileSync(path.join(WEB, "index.html"), "utf8");
const files = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
let code = "", map = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(WEB, f), "utf8") + "\n";
  map.push({ f, from: code.split("\n").length, lines: src.split("\n").length - 1 });
  code += src;
}
const linter = new Linter();
const messages = linter.verify(code, {
  languageOptions: { ecmaVersion: 2022, sourceType: "script", globals: Object.assign({}, globals.browser, { AndroidBridge: "readonly", HasaniyaDesktop: "readonly" }) },
  rules: { "no-undef": "error", "no-redeclare": "error", "no-dupe-keys": "error", "no-unreachable": "error", "no-const-assign": "error", "no-dupe-args": "error" }
});
const where = line => { const m = map.slice().reverse().find(x => line >= x.from); return m ? `${m.f}:${line - m.from + 1}` : String(line); };
for (const m of messages) console.log(`❌ ${where(m.line)}  ${m.message}  (${m.ruleId || ""})`);
console.log(messages.length ? `\nفشل الفحص: ${messages.length}` : `✅ الفحص نظيف (${files.length} سكربتاً)`);
process.exit(messages.length ? 1 : 0);
