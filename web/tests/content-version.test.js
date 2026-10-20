/* حارس CONTENT_VERSION: أي تغيير في المحتوى المحلَّل (الأبيات والقصص والشروح والمصادر) يوجب رفع CONTENT_VERSION،
   وإلا بقيت المتصفحات تعرض النسخة المخزّنة القديمة. بعد رفع الرقم حدّث tests/content-version.json بالقيم التي يطبعها الاختبار. */
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto");
const root = path.join(__dirname, "..");
const ctx = { console }; vm.createContext(ctx);
["js/config.js", "js/data/manzumah.js", "js/data/stories.js", "js/data/explanations.js", "js/parser.js"]
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), "utf8").replace(/\bconst\b|\blet\b/g, "var"), ctx, { filename: f }));
const hash = crypto.createHash("sha1").update(JSON.stringify(ctx.DEFAULT_JOURNEY)).digest("hex").slice(0, 16);
const ver = ctx.CONTENT_VERSION;
const file = path.join(__dirname, "content-version.json");
const saved = JSON.parse(fs.readFileSync(file, "utf8"));
if (saved.hash === hash && saved.version === ver) { console.log("✅ CONTENT_VERSION متسق مع المحتوى (" + ver + ")"); process.exit(0); }
if (saved.hash !== hash && saved.version === ver) { console.log("❌ تغيّر المحتوى دون رفع CONTENT_VERSION (ما زال " + ver + "). ارفعه ثم حدّث tests/content-version.json إلى: " + JSON.stringify({ version: ver + 1, hash })); process.exit(1); }
console.log("❌ حدّث tests/content-version.json إلى: " + JSON.stringify({ version: ver, hash })); process.exit(1);
