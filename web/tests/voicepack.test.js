/* اختبار حزمة الصوت (بدون متصفح): الزيب بالكتابة والقراءة، بصمة النص، التحقق من المانيفست، تقسيم الأجزاء */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const src = fs.readFileSync(path.join(__dirname, "..", "js", "voicepack.js"), "utf8");
const ctx = { TextEncoder, TextDecoder, Blob, Response, DecompressionStream, Uint8Array, Uint32Array, DataView, ArrayBuffer, Map, Set, Math, console };
const V = vm.runInNewContext(src + "\n;({ crc32, zipStore, zipRead, textFingerprint, vpValidateManifest, vpSplit, vpExt, voiceNorm, lineId, authorKey })", ctx);

(async () => {
  // CRC-32 بالمتجه المعياري
  assert.strictEqual(V.crc32(new TextEncoder().encode("123456789")), 0xCBF43926);

  // البصمة: ثابتة، تتجاهل المسافات الزائدة، وتتغيّر مع أي تغيير في الحروف أو الحركات
  const a = V.textFingerprint("بِسْمِ اللَّهِ الرَّحْمَنِ");
  assert.match(a, /^[0-9a-f]{8}$/);
  assert.strictEqual(a, V.textFingerprint("  بِسْمِ   اللَّهِ الرَّحْمَنِ  "));
  assert.notStrictEqual(a, V.textFingerprint("بِسْمِ اللَّهِ الرَّحِيمِ"));
  assert.notStrictEqual(a, V.textFingerprint("بِسْمِ اللَّهِ الرَّحْمَنِ "+"ً"));

  // الزيب: كتابة ثم قراءة تعيد البيانات كما هي
  const audio1 = new Uint8Array([1, 2, 3, 4, 5, 250, 251]);
  const audio2 = new Uint8Array(70000).map((_, i) => (i * 31) & 255);
  const manifest = new TextEncoder().encode(JSON.stringify({ app: "hasaniya" }));
  const blob = V.zipStore([
    { name: "manifest.json", data: manifest },
    { name: "audio/a0001.webm", data: audio1 },
    { name: "audio/a0002.webm", data: audio2 }
  ]);
  const buf = await blob.arrayBuffer();
  const back = await V.zipRead(buf);
  assert.strictEqual([...back.keys()].sort().join(","), "audio/a0001.webm,audio/a0002.webm,manifest.json");
  assert.deepStrictEqual([...back.get("audio/a0001.webm")], [...audio1]);
  assert.deepStrictEqual([...back.get("audio/a0002.webm")], [...audio2]);
  assert.strictEqual(new TextDecoder().decode(back.get("manifest.json")), '{"app":"hasaniya"}');

  // ملف تالف داخل الزيب يُرفض (CRC لا يطابق)
  const corrupt = new Uint8Array(buf.slice(0));
  const pos = corrupt.indexOf(250);
  corrupt[pos] = 7;
  await assert.rejects(() => V.zipRead(corrupt.buffer), /تالف/);

  // ملف ليس zip يُرفض
  await assert.rejects(() => V.zipRead(new TextEncoder().encode("hello world").buffer), /zip/);

  // التحقق من المانيفست
  const good = { app: "hasaniya", type: "voicepack", version: 1, author: "أحمد", items: [
    { kind: "verse", id: "s1v1", file: "audio/a0001.webm", mime: "audio/webm;codecs=opus", fp: a, at: 1 },
    { kind: "story", id: "s1v1", file: "audio/a0002.mp3", mime: "audio/mpeg", fp: null, at: 2 }
  ] };
  assert.strictEqual(V.vpValidateManifest(good).ok, true);
  const mut = (f) => { const m = JSON.parse(JSON.stringify(good)); f(m); return V.vpValidateManifest(m); };
  assert.strictEqual(mut(m => { m.type = "recitation"; }).ok, false);
  assert.strictEqual(mut(m => { m.version = 3; }).ok, false);
  // v101: الإصدار 2 يقبل نوع «line» (أي نص آخر) بشرط أن تطابق البصمة نصه، والإصدار 1 لا يقبله
  const lineText = "حاولي مرة أخرى";
  const v2 = mut(m => { m.version = 2; m.items.push({ kind: "line", id: V.lineId(lineText), text: lineText, file: "audio/a0003.webm", mime: "audio/webm", fp: V.lineId(lineText), at: 3 }); });
  assert.strictEqual(v2.ok, true, v2.error);
  assert.strictEqual(mut(m => { m.items.push({ kind: "line", id: V.lineId(lineText), text: lineText, file: "audio/a0003.webm", mime: "audio/webm", at: 3 }); }).ok, false);
  assert.strictEqual(mut(m => { m.version = 2; m.items.push({ kind: "line", id: V.lineId(lineText), text: "نص آخر", file: "audio/a0003.webm", mime: "audio/webm", at: 3 }); }).ok, false);
  assert.strictEqual(mut(m => { m.version = 2; m.items.push({ kind: "line", id: "../x", text: lineText, file: "audio/a0003.webm", mime: "audio/webm", at: 3 }); }).ok, false);
  // توحيد النص: الرموز والترقيم لا تغيّر البصمة، والحركات تغيّرها
  assert.strictEqual(V.lineId("🎉 أحسنتَ!"), V.lineId("أحسنتَ"));
  assert.notStrictEqual(V.lineId("أحسنتَ"), V.lineId("أحسنتِ"));
  assert.strictEqual(V.authorKey("line", "abc"), "author|line|abc");
  assert.strictEqual(V.authorKey("story", "s1v1"), "author|story|s1v1");
  assert.strictEqual(V.authorKey("verse", "s1v1"), "author|verse|s1v1");
  assert.strictEqual(mut(m => { m.items[0].kind = "poem"; }).ok, false);
  assert.strictEqual(mut(m => { m.items[0].file = "../../evil.js"; }).ok, false);
  assert.strictEqual(mut(m => { m.items[0].mime = "text/html"; }).ok, false);
  assert.strictEqual(mut(m => { m.items[0].fp = "XYZ"; }).ok, false);
  assert.strictEqual(mut(m => { m.items = "nope"; }).ok, false);

  // التقسيم: لا يتجاوز الحد إلا عنصر واحد أكبر من الحد، ولا يفقد عناصر
  const items = [5, 5, 5, 20, 1, 1, 1].map(n => ({ blob: { size: n }, n }));
  const parts = V.vpSplit(items, 10, 100);
  assert.strictEqual(parts.flat().length, items.length);
  assert.strictEqual(JSON.stringify(parts.map(p => p.map(x => x.n))), "[[5,5],[5],[20],[1,1,1]]");
  const many = Array.from({ length: 7 }, (_, i) => ({ blob: { size: 1 }, i }));
  assert.strictEqual(JSON.stringify(V.vpSplit(many, 1000, 3).map(p => p.length)), "[3,3,1]");

  // امتداد الملف حسب النوع
  assert.strictEqual(V.vpExt("audio/webm;codecs=opus"), "webm");
  assert.strictEqual(V.vpExt("audio/mp4"), "m4a");
  assert.strictEqual(V.vpExt("audio/mpeg"), "mp3");
  assert.strictEqual(V.vpExt("text/plain"), "bin");

  console.log("voicepack: ok");
})().catch(e => { console.error(e); process.exit(1); });
