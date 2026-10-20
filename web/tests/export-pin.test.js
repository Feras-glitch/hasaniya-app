/* اختبار: تصدير التسجيلات وحزمة الصوت محمي بالرقم السري في الواجهة (ثابت: يفحص index.html) */
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
for (const fn of ["exportRecitation", "exportVoicePack"]) {
  const btn = html.split("\n").find(l => l.includes("onclick=") && (l.includes(`requirePin(${fn},`) || l.includes(`onclick="${fn}(`)));
  assert.ok(btn, `زر ${fn} غير موجود`);
  assert.ok(btn.includes(`requirePin(${fn},`), `زر ${fn} بلا رقم سري`);
  assert.ok(!/onclick="\s*exportRecitation\(\)|onclick="\s*exportVoicePack\(\)/.test(btn), `استدعاء مباشر لـ ${fn}`);
}
console.log("export-pin: ok");
