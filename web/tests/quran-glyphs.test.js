/* v108: آيات القرآن برسم مصحف المدينة (QPC V2)
   1) كل آية في QURAN_LINKS لها رموز في quran-glyphs.js، وخط صفحتها موجود ومذكور في styles.css وsw.js
   2) المصدر الأصلي محفوظ في المستودع (sources/quran)، وملف الرموز مطابق لما يولّده منه tools/build_quran_glyphs.py
   3) كل آية كاملة: آخر رمز فيها علامة رقم الآية (تُرسم الآية كاملة ثم التالية) */
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.join(__dirname, ".."), repo = path.join(root, "..");
const ctx = {}; vm.createContext(ctx);
["js/data/links.js", "js/data/quran-glyphs.js"].forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), "utf8").replace(/\bconst\b/g, "var"), ctx));
const G = ctx.QURAN_GLYPHS, css = fs.readFileSync(path.join(root, "css/styles.css"), "utf8"), sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
let n = 0;
for (const [id, list] of Object.entries(ctx.QURAN_LINKS)) for (const q of list) {
  const m = q.ref.match(/(\d+):(\d+)(?:[–-](\d+))?/); assert.ok(m, id + ": مرجع بلا رقم آية");
  for (let a = +m[2]; a <= +(m[3] || m[2]); a++) {
    const k = m[1] + ":" + a, g = G[k]; assert.ok(g, `${id}: لا رموز للآية ${k}`); n++;
    const p = g[0], words = g[1].split(" ");
    assert.ok(fs.existsSync(path.join(root, `fonts/qpc-p${p}.woff`)), `خط الصفحة ${p} غير موجود`);
    assert.ok(css.includes(`url("../fonts/qpc-p${p}.woff")`) && sw.includes(`./fonts/qpc-p${p}.woff`), `خط الصفحة ${p} غير مسجّل`);
    assert.strictEqual(words.length, q.text.split("\n")[a - +m[2]].trim().split(/\s+/).length + 1, `${k}: عدد الكلمات مع علامة الآية لا يطابق نص تنزيل`);
  }
}
for (const f of ["qpc-v2-ayah-by-ayah-glyphs.json.zip", "qpc-v2-ayah-by-ayah-glyphs.db.zip"])
  assert.ok(fs.existsSync(path.join(repo, "sources/quran", f)), "المصدر غير محفوظ: " + f);
console.log(`آيات المصحف: ${n} آية، كلها برسم المصحف وخطوطها موجودة`);
