#!/usr/bin/env node
/* v110: يقرأ ملف مراجعة صدّره الوالد أو المعلم من «📝 وضع المراجعة»، ويطبع تقريراً مقروءاً
   مرتباً بالنوع: النص الأصلي، والمعدَّل، والحكم، والملاحظة. ليُدمج في ملفات البيانات ثم تُشغَّل الاختبارات.
   الاستعمال (من مجلد web): node tools/review-report.js hasaniya-review-….json [--md تقرير.md] */
"use strict";
const fs = require("fs");
const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith("--"));
if (!file) { console.error("✖ أعطني ملف المراجعة"); process.exit(1); }
const d = JSON.parse(fs.readFileSync(file, "utf8"));
if (d.app !== "hasaniya" || d.type !== "review" || !Array.isArray(d.items)) { console.error("✖ ليس ملف مراجعة"); process.exit(1); }
const V = { ok: "✅ صحيح", check: "⚠ يحتاج نظراً", hard: "👶 صعب على الصغير", edited: "✏️ عُدّل" };
const ROLE = { parent: "ولي أمر", teacher: "معلم" };
const out = [];
out.push(`# مراجعة ${d.reviewer && d.reviewer.name} (${ROLE[d.reviewer && d.reviewer.role] || ""}) — ${String(d.createdAt || "").slice(0, 10)}`);
const edits = d.items.filter(x => x.text != null), verdicts = d.items.filter(x => x.text == null);
out.push(`\n${edits.length} تعديلاً، و${verdicts.length} حكماً بلا تعديل. (المحتوى ${d.contentVersion})\n`);
const bySec = {};
for (const x of d.items) (bySec[x.key.split("|")[0]] = bySec[x.key.split("|")[0]] || []).push(x);
for (const [sec, list] of Object.entries(bySec)) {
  out.push(`\n## ${sec} (${list.length})`);
  for (const x of list) {
    out.push(`\n### ${x.key} — ${x.label || ""} ${x.verdict ? "· " + (V[x.verdict] || x.verdict) : ""}`);
    if (x.text != null) { out.push(`- الأصل: ${x.orig}`); out.push(`- المعدَّل: ${x.text}`); }
    else out.push(`- النص: ${x.orig}`);
    if (x.note) out.push(`- ملاحظة: ${x.note}`);
  }
}
const md = out.join("\n");
const i = args.indexOf("--md");
if (i >= 0 && args[i + 1]) { fs.writeFileSync(args[i + 1], md); console.log("✔ " + args[i + 1]); } else console.log(md);
