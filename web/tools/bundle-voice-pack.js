#!/usr/bin/env node
/* v105: يبني «الصوت البشري المضمّن» من حزمة صوت صدّرها القارئ من التطبيق (استوديو التسجيل ← تصدير).

   الاستعمال (من مجلد web):
     node tools/bundle-voice-pack.js hasaniya-voicepack-…-1of3.zip …-2of3.zip …-3of3.zip
     node tools/bundle-voice-pack.js --kinds verse,story pack.zip     (الأبيات والقصص؛ الافتراضي الأبيات وحدها)
     node tools/bundle-voice-pack.js --author "اسم القارئ" pack.zip    (الاسم الظاهر للوالد)
     node tools/bundle-voice-pack.js --remove                          (يحذف الصوت المضمّن)

   ينتج audio/voice-pack.zip، ويكتب بصمته في BUNDLED_VOICE_ID داخل js/config.js.
   ويرفض البناء كله إن كان تسجيل لا يطابق النص الحالي (تغيّر التشكيل بعد التسجيل)، ويطبع الأبيات الناقصة.
   خيارات الاختبار: --out <ملف> و --no-config (لا يغيّر ملفات التطبيق). */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const MAX_BYTES = 23 * 1024 * 1024;   // التطبيق يرفض ملفاً مفكوكاً فوق 24 ميجابايت (VP_MAX_TOTAL_BYTES)
const MAX_ITEMS = 1500;               // VP_MAX_ITEMS

function fail(msg) { console.error("✖ " + msg); process.exit(1); }

/* ---------- الخيارات ---------- */
const args = process.argv.slice(2);
const opt = { kinds: ["verse"], files: [], author: null, out: path.join(ROOT, "audio", "voice-pack.zip"), config: true, remove: false };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--kinds") opt.kinds = String(args[++i] || "").split(",").map(s => s.trim()).filter(Boolean);
  else if (a === "--author") opt.author = String(args[++i] || "").trim().slice(0, 40);
  else if (a === "--out") opt.out = path.resolve(args[++i] || "");
  else if (a === "--no-config") opt.config = false;
  else if (a === "--remove") opt.remove = true;
  else if (a.startsWith("--")) fail("خيار غير معروف: " + a);
  else opt.files.push(a);
}
if (opt.kinds.some(k => k !== "verse" && k !== "story")) fail("--kinds يقبل verse وstory فقط");

/* ---------- كتابة البصمة في config.js ---------- */
function writeConfigId(id) {
  const p = path.join(ROOT, "js", "config.js");
  const s = fs.readFileSync(p, "utf8");
  const re = /const BUNDLED_VOICE_ID = "[0-9a-f]*";/;
  if (!re.test(s)) fail("لم أجد السطر BUNDLED_VOICE_ID في js/config.js");
  fs.writeFileSync(p, s.replace(re, `const BUNDLED_VOICE_ID = "${id}";`));
}

if (opt.remove) {
  if (fs.existsSync(opt.out)) fs.unlinkSync(opt.out);
  if (opt.config) writeConfigId("");
  console.log("✔ حُذف الصوت المضمّن");
  process.exit(0);
}
if (!opt.files.length) fail("أعطني ملف الحزمة (أو أجزاءها). انظر أول هذا الملف للاستعمال");

/* ---------- المحتوى الحالي: الأبيات والقصص كما يبنيها التطبيق ---------- */
const ctx = {};
vm.createContext(ctx);
for (const f of ["js/data/manzumah.js", "js/data/stories.js", "js/data/explanations.js", "js/parser.js"]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
}
const JOURNEY = vm.runInContext("DEFAULT_JOURNEY", ctx);
const VERSES = new Map();
for (const st of JOURNEY) for (const v of st.verses) VERSES.set(v.id, v);

/* نفس بصمة التطبيق (voicepack.js: textFingerprint) */
function textFingerprint(text) {
  const s = String(text == null ? "" : text).normalize("NFC").replace(/\s+/g, " ").trim();
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}
const textOf = (kind, v) => kind === "story" ? (v.story || "") : (v.fullVerse || "");

/* ---------- zip: قراءة (مخزّن أو مضغوط) وكتابة (مخزّن) ---------- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

function zipRead(file) {
  const b = fs.readFileSync(file);
  let eo = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 65535); i--) if (b.readUInt32LE(i) === 0x06054b50) { eo = i; break; }
  if (eo < 0) fail(`${path.basename(file)}: ليس ملف zip`);
  const count = b.readUInt16LE(eo + 10);
  let p = b.readUInt32LE(eo + 16);
  const out = new Map();
  for (let n = 0; n < count; n++) {
    if (b.readUInt32LE(p) !== 0x02014b50) fail(`${path.basename(file)}: فهرس تالف`);
    const method = b.readUInt16LE(p + 10), crc = b.readUInt32LE(p + 16);
    const csize = b.readUInt32LE(p + 20), usize = b.readUInt32LE(p + 24);
    const nlen = b.readUInt16LE(p + 28), xlen = b.readUInt16LE(p + 30), clen = b.readUInt16LE(p + 32);
    const lho = b.readUInt32LE(p + 42);
    const name = b.subarray(p + 46, p + 46 + nlen).toString("utf8");
    p += 46 + nlen + xlen + clen;
    const start = lho + 30 + b.readUInt16LE(lho + 26) + b.readUInt16LE(lho + 28);
    const raw = b.subarray(start, start + csize);
    const data = method === 0 ? raw : method === 8 ? zlib.inflateRawSync(raw) : fail(`${name}: ضغط غير مدعوم`);
    if (data.length !== usize || crc32(data) !== crc) fail(`${path.basename(file)}: الملف ${name} تالف`);
    out.set(name, new Uint8Array(data));
  }
  return out;
}

function zipStore(files) {
  const parts = [], central = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, "utf8"), crc = crc32(f.data), size = f.data.length;
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6);
    lh.writeUInt16LE(0, 8); lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0x21, 12);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(size, 18); lh.writeUInt32LE(size, 22);
    lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    parts.push(lh, name, Buffer.from(f.data));
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(0, 10); ch.writeUInt16LE(0, 12); ch.writeUInt16LE(0x21, 14);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(size, 20); ch.writeUInt32LE(size, 24);
    ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(offset, 42);
    central.push(ch, name);
    offset += 30 + name.length + size;
  }
  const cd = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(files.length, 8); eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cd, eocd]);
}
function ext(mime) {
  const m = String(mime).toLowerCase();
  return m.includes("webm") ? "webm" : (m.includes("mp4") || m.includes("m4a") || m.includes("aac")) ? "m4a"
    : (m.includes("mpeg") || m.includes("mp3")) ? "mp3" : (m.includes("ogg") || m.includes("opus")) ? "ogg" : m.includes("wav") ? "wav" : "bin";
}

/* ---------- جمع العناصر من كل الأجزاء ---------- */
const chosen = new Map();   // kind|id -> {it, data}
const authors = new Set();
const problems = [], skipped = [];
for (const f of opt.files) {
  const entries = zipRead(f);
  const mf = entries.get("manifest.json");
  if (!mf) fail(`${path.basename(f)}: لا يوجد manifest.json`);
  const m = JSON.parse(Buffer.from(mf).toString("utf8"));
  if (m.app !== "hasaniya" || m.type !== "voicepack" || (m.version !== 1 && m.version !== 2) || !Array.isArray(m.items)) fail(`${path.basename(f)}: ليس حزمة صوت للتطبيق`);
  if (m.author) authors.add(String(m.author).trim());
  for (const it of m.items) {
    if (!opt.kinds.includes(it.kind)) continue;
    const v = VERSES.get(it.id);
    const data = entries.get(it.file);
    if (!v) { problems.push(`${it.kind} ${it.id}: لا يوجد بيت بهذا الرقم في هذه النسخة`); continue; }
    if (!data || !data.length) { problems.push(`${it.kind} ${it.id}: ملف الصوت مفقود`); continue; }
    if (typeof it.mime !== "string" || !it.mime.startsWith("audio/")) { problems.push(`${it.kind} ${it.id}: ليس ملف صوت`); continue; }
    if (it.kind === "story" && !v.story) { skipped.push(`قصة ${it.id}: لا تُعرض في هذه النسخة`); continue; }
    if (!it.fp) { problems.push(`${it.kind} ${it.id}: بلا بصمة نص (حزمة قديمة جداً)، أعد تصديرها`); continue; }
    if (it.fp !== textFingerprint(textOf(it.kind, v))) { problems.push(`${it.kind} ${it.id}: سُجّل على نص غير النص الحالي (تغيّر التشكيل؟)، يحتاج إعادة تسجيل`); continue; }
    const key = it.kind + "|" + it.id;
    const prev = chosen.get(key);
    if (!prev || (Number(it.at) || 0) > (Number(prev.it.at) || 0)) chosen.set(key, { it, data });
  }
}
if (problems.length) fail("رفضتُ البناء:\n  " + problems.join("\n  "));
if (!chosen.size) fail("لا يوجد في الحزمة شيء من النوع المطلوب (" + opt.kinds.join("،") + ")");
const author = opt.author || [...authors][0] || "";
if (!opt.author && authors.size > 1) console.warn("⚠ أكثر من اسم قارئ في الأجزاء (" + [...authors].join("، ") + ")؛ اخترت الأول. غيّره بـ --author");

/* ---------- البناء: ترتيب ثابت، فالبصمة لا تتغيّر لنفس التسجيلات ---------- */
const order = [...VERSES.keys()];
const list = [...chosen.values()].sort((a, b) =>
  (a.it.kind === b.it.kind ? 0 : a.it.kind === "verse" ? -1 : 1) || order.indexOf(a.it.id) - order.indexOf(b.it.id));
if (list.length > MAX_ITEMS) fail("عدد التسجيلات أكبر من المسموح");
const items = [], files = [];
const sig = crypto.createHash("sha256");
let bytes = 0;
list.forEach(({ it, data }, i) => {
  const file = `audio/b${String(i + 1).padStart(4, "0")}.${ext(it.mime)}`;
  files.push({ name: file, data });
  bytes += data.length;
  items.push({ kind: it.kind, id: it.id, file, mime: it.mime, fp: it.fp, at: 1, source: "rec", reviewed: true });
  sig.update([it.kind, it.id, it.fp, it.mime, crypto.createHash("sha256").update(data).digest("hex")].join("|") + "\n");
});
if (bytes > MAX_BYTES) fail(`الحجم ${(bytes / 1048576).toFixed(1)} ميجابايت أكبر من المسموح (${MAX_BYTES / 1048576}). اكتفِ بالأبيات، أو قسّم`);
const id = sig.update("author|" + author).digest("hex").slice(0, 12);
const manifest = { app: "hasaniya", type: "voicepack", version: 2, author, createdAt: new Date().toISOString(), bundle: id, items };
files.unshift({ name: "manifest.json", data: new Uint8Array(Buffer.from(JSON.stringify(manifest), "utf8")) });
fs.mkdirSync(path.dirname(opt.out), { recursive: true });
fs.writeFileSync(opt.out, zipStore(files));
if (opt.config) writeConfigId(id);

/* ---------- تقرير ---------- */
const verses = items.filter(x => x.kind === "verse").map(x => x.id);
const missing = order.filter(v => !verses.includes(v));
console.log(`✔ ${path.relative(process.cwd(), opt.out)}  البصمة ${id}`);
console.log(`  القارئ: ${author || "(بلا اسم)"} · أبيات ${verses.length}/${order.length} · قصص ${items.length - verses.length} · ${(bytes / 1048576).toFixed(2)} ميجابايت`);
if (missing.length) console.log(`  ⚠ أبيات بلا تسجيل (${missing.length}) تبقى بالقارئ الآلي: ${missing.slice(0, 25).join(" ")}${missing.length > 25 ? " …" : ""}`);
if (skipped.length) console.log("  تُرك: " + skipped.join("، "));
