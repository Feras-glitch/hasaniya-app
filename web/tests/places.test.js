/* اختبارات الأماكن والنقاش: كل زيارة على الخريطة مثبتة بنص قصتها، وكل محطة لها أسئلة نقاش */
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const ctx = { console };
vm.createContext(ctx);
["js/data/manzumah.js", "js/data/stories.js", "js/data/explanations.js", "js/data/links.js", "js/data/quizzes.js", "js/parser.js", "js/data/places.js", "js/data/discussion.js"]
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f }));
const get = e => vm.runInContext(e, ctx);
const norm = get("normalizeArabic");
const byId = Object.fromEntries(get("DEFAULT_JOURNEY").flatMap(st => st.verses).map(v => [v.id, v]));
const stations = get("DEFAULT_JOURNEY").map(s => s.id);
const STORIES = get("STORIES");
let failed = 0;
const check = (n, c, d) => { if (c) console.log("ok   ", n); else { failed++; console.log("FAIL ", n, d || ""); } };

for (const v of get("PLACE_VISITS")) {
  const story = (STORIES[v.ref] || {}).story || "";
  check(`زيارة «${v.place}» مثبتة بقصة ${v.ref}`, !!byId[v.ref] && norm(story).includes(norm(v.place)));
  check(`مكان «${v.place}» له إحداثيات`, !!get("GEO_PLACES")[v.place]);
}
for (const sid of stations) check(`للمحطة ${sid} أسئلة نقاش`, (get("DISCUSSION")[sid] || []).length >= 2);
console.log(failed ? `\n${failed} فشل` : "\nكل اختبارات الأماكن والنقاش نجحت");
process.exit(failed ? 1 : 0);
