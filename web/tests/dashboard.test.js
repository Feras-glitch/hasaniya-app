/* اختبار لوحة الصف (بدون متصفح): قبول تقرير الطفل ورفض غيره، وصف الطفل، ودمج أحدث تقرير لكل طفل */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
const src = fs.readFileSync(path.join(__dirname, "..", "js", "dashboard.js"), "utf8");
const D = vm.runInNewContext(src + "\n;({ dashValid, dashValidBackup, dashRow, dashRowFromUser, dashWeakVerses, dashMerge })", { Date, Math, Map, Number, String, Array, Object, isFinite, Date: Date,
  isSafeId: s => typeof s === "string" && /^[A-Za-z0-9_-]{1,60}$/.test(s) });

const report = (name, exportedAt, extra = {}) => Object.assign({
  exportedAt, user: { name, avatar: "🌸" }, mastery: { percent: 72.4, stars: 3, level: "x" },
  points: 50, streak: 2, totalTimeMinutes: 30, completedStations: 4, totalStations: 10,
  achievements: ["a"], mistakes: [{}, {}]
}, extra);

assert.strictEqual(D.dashValid(report("ليلى", new Date().toISOString())), true);
assert.strictEqual(D.dashValid({ hello: 1 }), false);
assert.strictEqual(D.dashValid(null), false);
assert.strictEqual(D.dashValid(report("ليلى", "x", { totalStations: 0 })), false);
assert.strictEqual(D.dashValid(report("ليلى", "x", { mastery: { percent: "72" } })), false);

const now = Date.parse("2026-10-14T00:00:00Z");
const r = D.dashRow(report("ليلى", "2026-10-07T00:00:00Z"), now);
assert.strictEqual(r.percent, 72);
assert.strictEqual(r.completed, 4);
assert.strictEqual(r.total, 10);
assert.strictEqual(r.mistakes, 2);
assert.strictEqual(r.days, 7);
assert.strictEqual(D.dashRow(report("س", "2026-10-07T00:00:00Z", { mastery: { percent: 250 } }), now).percent, 100);

// دمج: أحدث تقرير لكل طفل
const merged = D.dashMerge([
  D.dashRow(report("ليلى", "2026-10-01T00:00:00Z")),
  D.dashRow(report("ليلى", "2026-10-09T00:00:00Z", { completedStations: 6 })),
  D.dashRow(report("يوسف", "2026-10-02T00:00:00Z"))
]);
assert.strictEqual(merged.length, 2);
assert.strictEqual(merged.find(x => x.name === "ليلى").completed, 6);
// طفلان باسم واحد من بيتين مختلفين لا يندمجان، والتقرير القديم بلا رقم يُلحق بصاحب الاسم الوحيد
const twins = D.dashMerge([
  D.dashRow(report("محمد", "2026-10-05T00:00:00Z", { user: { name: "محمد", id: "u_1_aa" } })),
  D.dashRow(report("محمد", "2026-10-06T00:00:00Z", { user: { name: "محمد", id: "u_2_bb" } })),
  D.dashRow(report("سارة", "2026-10-07T00:00:00Z", { user: { name: "سارة", id: "u_3_cc" }, completedStations: 7 })),
  D.dashRow(report("سارة", "2026-10-01T00:00:00Z"))
]);
assert.strictEqual(twins.filter(x => x.name === "محمد").length, 2);
assert.strictEqual(twins.filter(x => x.name === "سارة").length, 1);
assert.strictEqual(twins.find(x => x.name === "سارة").completed, 7);
assert.strictEqual(D.dashRow(report("x", "2026-10-07T00:00:00Z", { user: { name: "x", id: "<bad>" } })).childId, "");
// النسخة الاحتياطية
const backup = { app: "hasaniya", format: 1, exportedAt: "2026-10-13T00:00:00Z", users: [
  { id: "a", name: "نور", avatar: "🌟", photo: "data:image/png;base64,AAAA", parentSig: "data:image/png;base64,AAAA",
    state: { stationStatus: { s1: "completed", s2: "current" }, mistakes: { "s1v1|x": { verseId: "s1v1" }, "s1v2|y": { verseId: "s1v1" }, "s2v1|z": { verseId: "s2v1" } }, totalTimeSeconds: 610, points: 40, streak: 3 } }
] };
assert.strictEqual(D.dashValidBackup(backup), true);
assert.strictEqual(D.dashValidBackup({ app: "other", users: [{}] }), false);
assert.strictEqual(D.dashValidBackup({ app: "hasaniya", users: [{ name: "x" }] }), false);
assert.strictEqual(D.dashValidBackup({ app: "hasaniya", users: [] }), false);
const lookup = id => (id === "s1v1" ? { fullVerse: "بيت اختبار" } : null);
const weak = D.dashWeakVerses(backup.users[0].state, lookup, 2);
assert.strictEqual(JSON.stringify(weak), JSON.stringify([{ id: "s1v1", n: 2, text: "بيت اختبار" }, { id: "s2v1", n: 1, text: "s2v1" }]));
const row = D.dashRowFromUser(backup.users[0], backup.exportedAt, now, lookup, () => 55, 10);
assert.strictEqual(row.percent, 55);
assert.strictEqual(row.completed, 1);
assert.strictEqual(row.total, 10);
assert.strictEqual(row.minutes, 10);
assert.strictEqual(row.mistakes, 3);
assert.strictEqual(row.source, "نسخة");
assert.strictEqual(row.calcFailed, false);
assert.strictEqual("photo" in row || "parentSig" in row, false, "الصور والتوقيع لا تدخل اللوحة");
const failed = D.dashRowFromUser(backup.users[0], backup.exportedAt, now, lookup, () => { throw new Error("bad"); }, 10);
assert.strictEqual(failed.calcFailed, true);
assert.strictEqual(failed.percent, 0);
console.log("dashboard: ok");
