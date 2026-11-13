/* v105 (بلا متصفح): الصوت المضمّن وأداة بنائه، والخط المضمّن، وسياسة أمان المحتوى، وحذف الإنجليزية، ونسخ الملفات في البناء */
const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");
const assert = require("assert");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const REPO = path.join(ROOT, "..");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");

/* ---------- 1) الصوت المضمّن: البصمة في config.js والملف متّسقان، وكل تسجيل يطابق النص الحالي ---------- */
const cfg = read("js/config.js");
const idm = /const BUNDLED_VOICE_ID = "([0-9a-f]*)";/.exec(cfg);
assert(idm, "BUNDLED_VOICE_ID غير موجود في config.js");
const BID = idm[1];
const PACK = path.join(ROOT, "audio", "voice-pack.zip");

const ctx = { TextEncoder, TextDecoder, Blob };
vm.createContext(ctx);
for (const f of ["js/data/manzumah.js", "js/data/stories.js", "js/data/explanations.js", "js/parser.js", "js/voicepack.js"])
  vm.runInContext(read(f), ctx, { filename: f });
const J = vm.runInContext("DEFAULT_JOURNEY", ctx);
const VERSES = new Map(J.flatMap(s => s.verses).map(v => [v.id, v]));
const fp = vm.runInContext("textFingerprint", ctx);
const zipStore = vm.runInContext("zipStore", ctx);
const lineId = vm.runInContext("lineId", ctx);

function readZip(file) {
  const b = fs.readFileSync(file);
  let eo = -1;
  for (let i = b.length - 22; i >= 0; i--) if (b.readUInt32LE(i) === 0x06054b50) { eo = i; break; }
  assert(eo >= 0, "ليس zip");
  const out = new Map();
  let p = b.readUInt32LE(eo + 16);
  for (let n = 0, c = b.readUInt16LE(eo + 10); n < c; n++) {
    const method = b.readUInt16LE(p + 10), csize = b.readUInt32LE(p + 20);
    const nlen = b.readUInt16LE(p + 28), xlen = b.readUInt16LE(p + 30), clen = b.readUInt16LE(p + 32), lho = b.readUInt32LE(p + 42);
    const name = b.subarray(p + 46, p + 46 + nlen).toString("utf8");
    p += 46 + nlen + xlen + clen;
    const start = lho + 30 + b.readUInt16LE(lho + 26) + b.readUInt16LE(lho + 28);
    const raw = b.subarray(start, start + csize);
    out.set(name, method === 8 ? zlib.inflateRawSync(raw) : raw);
  }
  return out;
}
function checkPack(file, id) {
  const z = readZip(file);
  const m = JSON.parse(z.get("manifest.json").toString("utf8"));
  assert.strictEqual(m.bundle, id, "بصمة الملف لا تطابق BUNDLED_VOICE_ID");
  assert(m.items.length > 0);
  for (const it of m.items) {
    const v = VERSES.get(it.id);
    assert(v, `${it.id}: بيت غير موجود`);
    assert(z.get(it.file) && z.get(it.file).length, `${it.id}: ملف الصوت مفقود`);
    const text = it.kind === "story" ? v.story : v.fullVerse;
    assert.strictEqual(it.fp, fp(text), `${it.kind} ${it.id}: التسجيل المضمّن لا يطابق النص الحالي. أعد تسجيله ثم ابنِ الحزمة من جديد`);
  }
  assert(fs.statSync(file).size < 24 * 1024 * 1024, "الملف أكبر مما يقبله التطبيق");
  return m;
}
if (BID) {
  assert(fs.existsSync(PACK), "BUNDLED_VOICE_ID مكتوب بلا ملف audio/voice-pack.zip");
  const m = checkPack(PACK, BID);
  console.log(`الصوت المضمّن: ${m.items.length} تسجيلاً بصوت ${m.author || "؟"}`);
} else {
  assert(!fs.existsSync(PACK), "ملف audio/voice-pack.zip موجود بلا بصمة في config.js: شغّل tools/bundle-voice-pack.js أو احذفه");
}

/* ---------- 2) أداة البناء على حزمة تجريبية ---------- */
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hvp-"));
  async function mkPack(name, mut) {
    const vs = J[0].verses.slice(0, 3), story = J.flatMap(s => s.verses).find(v => v.story);
    const files = [], items = [];
    vs.forEach((v, i) => {
      const file = `audio/a${i + 1}.webm`;
      files.push({ name: file, data: new Uint8Array(100 + i).fill(i + 1) });
      items.push({ kind: "verse", id: v.id, file, mime: "audio/webm;codecs=opus", fp: fp(v.fullVerse), at: 10 + i, source: "rec", reviewed: true });
    });
    files.push({ name: "audio/s.webm", data: new Uint8Array(50).fill(9) });
    items.push({ kind: "story", id: story.id, file: "audio/s.webm", mime: "audio/webm", fp: fp(story.story), at: 5, source: "rec", reviewed: false });
    files.push({ name: "audio/l.webm", data: new Uint8Array(20).fill(7) });
    items.push({ kind: "line", id: lineId("أحسنت"), text: "أحسنت", file: "audio/l.webm", mime: "audio/webm", fp: lineId("أحسنت"), at: 6 });
    const m = { app: "hasaniya", type: "voicepack", version: 2, author: "قارئ تجريبي", items };
    if (mut) mut(m, files);
    files.unshift({ name: "manifest.json", data: new TextEncoder().encode(JSON.stringify(m)) });
    const f = path.join(tmp, name);
    fs.writeFileSync(f, Buffer.from(await zipStore(files).arrayBuffer()));
    return f;
  }
  const tool = (...a) => spawnSync(process.execPath, [path.join(ROOT, "tools", "bundle-voice-pack.js"), "--no-config", ...a], { encoding: "utf8" });
  const good = await mkPack("good.zip");
  const out1 = path.join(tmp, "o1.zip"), out2 = path.join(tmp, "o2.zip"), out3 = path.join(tmp, "o3.zip");
  let r = tool("--out", out1, good);
  assert.strictEqual(r.status, 0, r.stderr);
  const id1 = /البصمة ([0-9a-f]{12})/.exec(r.stdout)[1];
  const m1 = checkPack(out1, id1);
  assert.deepStrictEqual(m1.items.map(x => x.kind + x.id), ["verses1v1", "verses1v2", "verses1v3"], "الافتراضي: الأبيات وحدها");
  // نفس التسجيلات = نفس البصمة (فلا يُعاد التثبيت بلا سبب)
  r = tool("--out", out2, good);
  assert.strictEqual(/البصمة ([0-9a-f]{12})/.exec(r.stdout)[1], id1);
  // الأبيات والقصص معاً
  r = tool("--kinds", "verse,story", "--out", out3, good);
  assert.strictEqual(r.status, 0, r.stderr);
  const m3 = checkPack(out3, /البصمة ([0-9a-f]{12})/.exec(r.stdout)[1]);
  assert.strictEqual(m3.items.filter(x => x.kind === "story").length, 1);
  // تسجيل على نص قديم (تغيّر التشكيل) يرفض البناء كله
  const stale = await mkPack("stale.zip", m => { m.items[1].fp = "deadbeef"; });
  r = tool("--out", path.join(tmp, "o4.zip"), stale);
  assert.strictEqual(r.status, 1, "يجب أن يُرفض تسجيل لا يطابق النص");
  assert.match(r.stderr, /s1v2/);
  assert(!fs.existsSync(path.join(tmp, "o4.zip")), "لا يُكتب ملف عند الرفض");
  // رقم بيت غير موجود يُرفض
  const bad = await mkPack("bad.zip", m => { m.items[0].id = "s99v1"; });
  assert.strictEqual(tool("--out", path.join(tmp, "o5.zip"), bad).status, 1);
  // ليس حزمة صوت
  const notPack = await mkPack("np.zip", m => { m.type = "backup"; });
  assert.strictEqual(tool("--out", path.join(tmp, "o6.zip"), notPack).status, 1);
  fs.rmSync(tmp, { recursive: true, force: true });

  /* ---------- 3) الخط المضمّن ---------- */
  const css = read("css/styles.css");
  assert.match(css, /@font-face\s*{[^}]*font-family:\s*"HasaniyaNaskh"[^}]*url\("\.\.\/fonts\/NotoNaskhArabic\.woff"\)/, "تعريف الخط المضمّن");
  assert(fs.existsSync(path.join(ROOT, "fonts", "NotoNaskhArabic.woff")), "ملف الخط");
  assert(fs.existsSync(path.join(ROOT, "fonts", "OFL-NotoNaskhArabic.txt")), "رخصة الخط (OFL) يجب أن ترافقه");
  assert(fs.statSync(path.join(ROOT, "fonts", "NotoNaskhArabic.woff")).size < 400 * 1024, "الخط أكبر من المتوقع");
  assert(read("sw.js").includes('"./fonts/NotoNaskhArabic.woff"'), "الخط يُخزَّن دون اتصال");
  assert.match(css, /body\.system-font/, "خيار خط الجهاز");

  /* ---------- 4) سياسة أمان المحتوى: لا اتصال بأي موقع خارجي ---------- */
  const html = read("index.html");
  const csp = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html);
  assert(csp, "CSP مفقودة");
  for (const d of csp[1].split(";").map(s => s.trim()).filter(Boolean)) {
    assert(!/https?:|\*/.test(d), "CSP تسمح بموقع خارجي: " + d);
  }
  assert.match(csp[1], /object-src 'none'/);
  assert(html.indexOf("Content-Security-Policy") < html.indexOf("<script"), "CSP قبل أول سكربت");

  /* ---------- 5) لا إنجليزية في الواجهة ---------- */
  assert(!fs.existsSync(path.join(ROOT, "js", "i18n.js")), "i18n.js محذوف");
  assert(!/data-i18n|i18n\.js|tParent\(/.test(html + read("js/parent.js") + read("js/tools.js")), "بقايا الترجمة");

  /* ---------- 6) البناء ينسخ الخط ومجلد الصوت في كل النسخ ---------- */
  const ga = fs.readFileSync(path.join(REPO, ".github/workflows/build-all.yml"), "utf8");
  const dt = fs.readFileSync(path.join(REPO, ".github/workflows/device-test.yml"), "utf8");
  const pk = fs.readFileSync(path.join(REPO, "desktop/package.sh"), "utf8");
  for (const [name, s] of [["build-all", ga], ["device-test", dt], ["package.sh", pk]]) {
    assert(/web\/fonts/.test(s), name + ": لا ينسخ الخط");
    assert(/web\/audio/.test(s), name + ": لا ينسخ مجلد الصوت");
  }
  assert(/css js img fonts audio\)/.test(ga), "ملف الويب المضغوط يشمل الخط والصوت");
  // Android يعرف نوع الخط والحزمة
  const ma = fs.readFileSync(path.join(REPO, "android/app/src/main/java/com/hasaniya/app/MainActivity.java"), "utf8");
  assert(/\.woff"\)\) return "font\/woff"/.test(ma) && /\.zip"\)\) return "application\/zip"/.test(ma));

  console.log("v105: الصوت المضمّن وأداته، والخط، وCSP، وحذف الإنجليزية، ونسخ الملفات — سليمة");
})().catch(e => { console.error(e); process.exit(1); });
