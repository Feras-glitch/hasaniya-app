/* يتحقق من أن النصوص الموجّهة للطفل لا تحوي صيغة مذكّرة ثابتة بلا صيغة مؤنثة.
   القاعدة: كل سطر فيه فعل مخاطَب بالتاء المفتوحة (أحسنتَ، أتممتَ…) يجب أن يكون داخل gForm(...)،
   أو أن يُكتب بصيغة محايدة. */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const files = ["index.html"].concat(fs.readdirSync(path.join(root, "js"))
  .filter(f => f.endsWith(".js") && !f.startsWith("data")).map(f => "js/" + f));
const pattern = /[أ-ي]تَ(?=[\s"«»،!.)؟:]|$)/;
let bad = [];
for (const f of files) {
  fs.readFileSync(path.join(root, f), "utf8").split("\n").forEach((line, i) => {
    if (pattern.test(line) && !line.includes("gForm(") && !/^\s*(\w+:\s*)?\[".*",\s*".*"\],?\s*$/.test(line) && !/^\s*\/\//.test(line) && !/^\s*\/?\*/.test(line)) {
      bad.push(`${f}:${i + 1}: ${line.trim().slice(0, 120)}`);
    }
  });
}
if (bad.length) {
  console.error("صيغ مذكّرة ثابتة بلا gForm:\n" + bad.join("\n"));
  process.exit(1);
}
console.log("كل النصوص الموجّهة للطفل تراعي الجنس");
