/* كل نص في شاشة الأسرة له ترجمة إنجليزية، حتى لا تظهر عربية داخل الواجهة الإنجليزية */
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const ctx = { console, document: { getElementById: () => null } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "js/i18n.js"), "utf8"), ctx);
const dict = vm.runInContext("PARENT_EN", ctx);
let failed = 0;
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const screen = html.slice(html.indexOf('<div id="parentScreen">'), html.indexOf('<div class="modal-overlay" id="quizPopup">'));
const keys = [...screen.matchAll(/data-i18n="([^"]*)"/g)].map(m => m[1].replace(/&quot;/g, '"'));
const js = ["js/parent.js"].map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n");
const calls = [...js.matchAll(/tParent\("([^"]*)"\)/g)].map(m => m[1]);
for (const k of [...new Set([...keys, ...calls])]) {
  const ok = typeof dict[k] === "string" && dict[k].length > 0;
  if (!ok) { failed++; console.log("FAIL لا ترجمة لـ:", k); }
}
console.log(`عناصر مترجمة: ${keys.length}، نداءات: ${calls.length}`);
console.log(failed ? `${failed} فشل` : "كل نصوص وضع الأسرة مترجمة");
process.exit(failed ? 1 : 0);
