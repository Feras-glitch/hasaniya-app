/* v114: كل حقل تكتبه الشيفرة في حالة الطفل (state.X = …) معرّف في الجدول الواحد web/js/schema.js،
   فلا يُضاف حقل يضيع في الاستيراد أو لا يُصحَّح نوعه؛ وملف بأنواع خاطئة لا يعطّل الشاشات. */
const __env = require("../_env");
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const js = path.join(__env.WEB, "js");
const src = fs.readdirSync(js).filter(f => f.endsWith(".js")).map(f => fs.readFileSync(path.join(js, f), "utf8")).join("\n");
const ctx = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(js, "schema.js"), "utf8").replace(/\bconst\b/g, "var"), ctx);
const S = ctx.STATE_SCHEMA;
const written = new Set([...src.matchAll(/\bstate\.([a-zA-Z_]+)\s*(?:=[^=]|\|\|=)/g)].map(m => m[1]));
const missing = [...written].filter(k => !S[k]);
assert.deepStrictEqual(missing, [], "حقول تُكتب في حالة الطفل وليست في web/js/schema.js: " + missing.join(" "));
// أنواع خاطئة تُصحَّح، والمجهول يُسقط في الاستيراد
const s = ctx.schemaNormalize({ certs: { a: 1 }, reflections: "x", points: "9", weekly: 5, stats: { shared: 2 } });
assert(Array.isArray(s.certs) && typeof s.reflections === "object" && s.points === 0 && s.weekly === null && s.stats.shared === 2 && s.stats.reviewSessions === 0);
const d = ctx.schemaDropUnknown({ points: 1, evil: 2 });
assert(!("evil" in d) && d.points === 1);
const c = ctx.schemaCleanup({ seenVerses: { s1v1: true, zz: true }, stationStatus: { s1: "completed", zz: "current" }, recEval: { "sec:station-0": {}, zz: {} } }, new Set(["s1v1"]), new Set(["s1"]));
assert(!c.seenVerses.zz && !c.stationStatus.zz && c.recEval["sec:station-0"] && !c.recEval.zz);
console.log(`state-schema: ok (${Object.keys(S).length} حقلاً، ${written.size} منها تكتبه الشيفرة)`);
