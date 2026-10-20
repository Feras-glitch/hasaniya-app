/* v101: كل رسالة ثابتة للطفل يجب أن تكون في KID_LINES (voice.js) حتى تظهر في «استوديو التسجيل» بصيغتيها.
   يفشل هذا الاختبار إن كُتب نص ثابت مباشرة في kidToast أو guidePanel أو guideSay أو autoSay،
   لأنه حينها لا يمكن تسجيله. النصوص المتغيّرة (فيها ${…}) مستثناة: أرقام وأسماء تُقرأ آلياً. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
const root = path.join(__dirname, "..");
const files = fs.readdirSync(path.join(root, "js")).filter(f => f.endsWith(".js")).map(f => "js/" + f);
const rules = [
  [/kidToast\(\s*(["']|gForm\()/, "kidToast بنص ثابت"],
  [/guidePanel\(\s*(["']|gForm\()/, "guidePanel بنص ثابت"],
  [/guideSay\(\s*"\w+"\s*,\s*(["']|gForm\()/, "guideSay بنص ثابت"],
  [/autoSay(Now)?\(\s*["']/, "autoSay بنص ثابت"]
];
const bad = [];
for (const f of files) {
  fs.readFileSync(path.join(root, f), "utf8").split("\n").forEach((line, i) => {
    if (line.includes("${")) return;   // نص متغيّر
    for (const [re, msg] of rules) if (re.test(line)) bad.push(`${f}:${i + 1}: ${msg}: ${line.trim().slice(0, 100)}`);
  });
}
assert.deepStrictEqual(bad, [], "نصوص لا يمكن تسجيلها:\n" + bad.join("\n"));

/* KID_LINES: كل مفتاح مستعمل موجود، وكل مدخل صيغة أو صيغتان غير فارغتين */
const src = fs.readFileSync(path.join(root, "js/voice.js"), "utf8");
const ctx = { gForm: (a, b) => a, console };
vm.createContext(ctx);
vm.runInContext(src.replace(/^const KID_LINES/m, "var KID_LINES"), ctx);
const KL = ctx.KID_LINES;
for (const [k, v] of Object.entries(KL)) {
  assert.ok(Array.isArray(v) && (v.length === 1 || v.length === 2) && v.every(x => typeof x === "string" && x.trim()), "مدخل غير صالح: " + k);
}
const used = new Set();
for (const f of files) {
  const s = fs.readFileSync(path.join(root, f), "utf8");
  for (const m of s.matchAll(/kidLine\("(\w+)"\)/g)) used.add(m[1]);
  for (const m of s.matchAll(/kidLine\(\w+ ===[^?]+\? "(\w+)" : "(\w+)"\)/g)) { used.add(m[1]); used.add(m[2]); }
}
const missing = [...used].filter(k => !KL[k]);
assert.deepStrictEqual(missing, [], "مفاتيح غير معرّفة في KID_LINES: " + missing.join("، "));
console.log(`رسائل الطفل الثابتة كلها قابلة للتسجيل (${Object.keys(KL).length} رسالة، ${used.size} مستعملة)`);
