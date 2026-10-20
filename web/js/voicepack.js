/* حزمة الصوت: يسجّل الوالد أو المعلم كل الأبيات والقصص مرة واحدة (بجودة 24 كيلوبت/ث)،
   ثم يصدّرها ملفات zip، ويستوردها الطفل على جهازه، فيسمع صوت المعلم بدل القراءة الآلية.

   - التسجيلات تُخزَّن بمفتاح "author|verse|<id>" أو "author|story|<id>"، مشتركة بين ملفات الأطفال على الجهاز.
   - كل تسجيل يحمل بصمة نص (fp). إن تغيّر النص بعد التسجيل تُرفض البصمة فلا يُشغَّل صوت لا يطابق الكلام.
   - الزيب يُكتب بلا ضغط (الصوت مضغوط أصلاً)، ويُقرأ بالطريقتين إن توفّر DecompressionStream.
   - الحزم تُقسَّم إلى أجزاء صغيرة: الجسر بين الويب وأندرويد لا يتحمّل ملفات بعشرات الميجابايت. */

const VP_VERSION = 2;                    // v101: الحزمة تحمل كل نصوص التطبيق (kind: line)، وتُقبل حزم الإصدار 1
const VP_RATE = 24000;                   // معدل تسجيل الصوت بالبت/ث
const VP_PART_BYTES = 4 * 1024 * 1024;   // أقصى حجم لكل ملف تصدير
const VP_PART_ITEMS = 80;                // أقصى عدد تسجيلات في الملف الواحد
const VP_MAX_FILES = 40;                 // أقصى عدد ملفات يُستورد دفعة واحدة
const VP_MAX_ITEMS = 1500;                // أقصى عدد عناصر في الحزمة الواحدة
const VP_MAX_BATCH_BYTES = 64 * 1024 * 1024; // أقصى مجموع تسجيلات تُحمَّل في الذاكرة دفعة واحدة
const VP_MAX_TOTAL_BYTES = 24 * 1024 * 1024; // أقصى حجم مفكوك لملف واحد (حماية من الملفات المنفوخة)

/* ---------- مفاتيح وبصمات ---------- */
/* ثلاثة أنواع: verse و story (بمعرّف البيت)، و line لكل نص آخر يراه الطفل (بمعرّف = بصمة النص نفسه).
   مفتاح السطر مشتق من نصه، فإن تغيّر النص تغيّر المفتاح، فلا يُشغَّل تسجيل قديم لنص جديد أبداً. */
function vpKindOf(kind) { return kind === "story" ? "story" : kind === "line" ? "line" : "verse"; }
function authorKey(kind, id) { return "author|" + vpKindOf(kind) + "|" + id; }
function vpIsAuthorKey(k) { return typeof k === "string" && k.split("|").length === 3 && k.startsWith("author|"); }
function vpTextOf(kind, v) { return kind === "story" ? ((v && v.story) || "") : kind === "line" ? ((v && v.text) || "") : ((v && v.fullVerse) || ""); }
/* توحيد النص قبل حساب بصمته: تُحذف الرموز التعبيرية وعلامات الترقيم والمحارف الخفية، وتبقى الحركات،
   لأن صيغة الولد وصيغة البنت تسجيلان مختلفان */
function voiceNorm(t) {
  return String(t == null ? "" : t).normalize("NFC")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200B}-\u{200F}\u{2066}-\u{2069}]/gu, "")
    .replace(/[.,،؛;؟?!:…"'«»()\[\]{}\-–—_\/\\*~٭]/g, " ")
    .replace(/\s+/g, " ").trim();
}
function lineId(text) { return textFingerprint(voiceNorm(text)); }
function lineKey(text) { return authorKey("line", lineId(text)); }
function vpFindVerse(id) {
  for (const st of content.journeyData) for (const v of st.verses) if (v.id === id) return v;
  /* رقم قديم من قبل تقسيم المحطتين 11 و12 */
  if (typeof legacyVerseId === "function" && legacyMigrationApplies()) {
    const nid = legacyVerseId(id);
    if (nid !== id) return vpFindVerse(nid);
  }
  return null;
}
/* بصمة النص: FNV-1a 32 بت على النص بعد توحيد المسافات والتطبيع */
function textFingerprint(text) {
  const s = String(text == null ? "" : text).normalize("NFC").replace(/\s+/g, " ").trim();
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}
/* التسجيل الصالح للتشغيل فقط: موجود، وبصمته تطابق النص الحالي (أو لا بصمة له) */
/* notify: عند الدرس يُعلم الوالد إن كان تسجيله لم يعد مطابقاً للنص، بدل القراءة الآلية الصامتة */
async function authorRecFor(kind, v, notify) {
  if (!v) return null;
  const rec = await recGet(authorKey(kind, v.id));
  if (!rec || !rec.blob) return null;
  if (rec.fp && rec.fp !== textFingerprint(vpTextOf(kind, v))) {
    if (notify) showToast("تسجيل الوالد لهذا " + (kind === "story" ? "القصة" : "البيت") + " لم يعد مطابقاً للنص، فيُقرأ آلياً. أعد تسجيله من خانة الوالدين", "error");
    return null;
  }
  return rec;
}
function vpIsStale(rec, kind, v) {
  return !!(rec && rec.fp && v && rec.fp !== textFingerprint(vpTextOf(kind, v)));
}

/* ---------- تفضيلات (اسم المعلم، هل أُكمل الإعداد) ---------- */
function vpPref(k, v) {
  try {
    const p = getPrefs();
    if (v === undefined) return p[k];
    p[k] = v; localStorage.setItem(PREFS_KEY, JSON.stringify(p));
    return v;
  } catch(e) { return undefined; }
}
function vpAuthorName() { return String(vpPref("authorName") || "").trim(); }
function vpSetAuthor(raw) {
  const name = String(raw || "").trim().replace(/\s+/g, " ").slice(0, 40);
  vpPref("authorName", name);
  return name;
}

/* ---------- CRC-32 ---------- */
const VP_CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(u8) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < u8.length; i++) c = VP_CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/* ---------- كاتب zip (بلا ضغط) ---------- */
/* files: [{ name: ASCII, data: Uint8Array }] */
function zipStore(files) {
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data), size = f.data.length;
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
    lh.setUint16(8, 0, true); lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true);
    lh.setUint32(14, crc, true); lh.setUint32(18, size, true); lh.setUint32(22, size, true);
    lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    parts.push(lh.buffer, name, f.data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
    ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true);
    ch.setUint32(16, crc, true); ch.setUint32(20, size, true); ch.setUint32(24, size, true);
    ch.setUint16(28, name.length, true); ch.setUint16(30, 0, true); ch.setUint16(32, 0, true);
    ch.setUint16(34, 0, true); ch.setUint16(36, 0, true); ch.setUint32(38, 0, true); ch.setUint32(42, offset, true);
    central.push(ch.buffer, name);
    offset += 30 + name.length + size;
  }
  const cdSize = central.reduce((s, b) => s + b.byteLength, 0);
  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true); eocd.setUint16(4, 0, true); eocd.setUint16(6, 0, true);
  eocd.setUint16(8, files.length, true); eocd.setUint16(10, files.length, true);
  eocd.setUint32(12, cdSize, true); eocd.setUint32(16, offset, true); eocd.setUint16(20, 0, true);
  return new Blob([...parts, ...central, eocd.buffer], { type: "application/zip" });
}

/* ---------- قارئ zip: يُرجع Map اسم -> بيانات، ويتحقق من CRC والحجم ---------- */
async function zipRead(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf);
  let eo = -1;
  const floor = Math.max(0, u8.length - 22 - 65535);
  for (let i = u8.length - 22; i >= floor; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eo = i; break; }
  }
  if (eo < 0) throw new Error("ليس ملف zip");
  const count = dv.getUint16(eo + 10, true);
  let p = dv.getUint32(eo + 16, true);
  if (count > VP_MAX_ITEMS + 10) throw new Error("عدد الملفات داخل الحزمة كبير");
  const out = new Map();
  const dec = new TextDecoder("utf-8");
  let total = 0;
  for (let n = 0; n < count; n++) {
    if (p + 46 > u8.length || dv.getUint32(p, true) !== 0x02014b50) throw new Error("فهرس الحزمة تالف");
    const method = dv.getUint16(p + 10, true);
    const crc = dv.getUint32(p + 16, true);
    const csize = dv.getUint32(p + 20, true);
    const usize = dv.getUint32(p + 24, true);
    const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
    const lho = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
    p += 46 + nlen + xlen + clen;
    if (lho + 30 > u8.length || dv.getUint32(lho, true) !== 0x04034b50) throw new Error("ترويسة الملف تالفة");
    const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
    if (start + csize > u8.length) throw new Error("بيانات الملف مقطوعة");
    total += usize;
    if (total > VP_MAX_TOTAL_BYTES) throw new Error("الحزمة أكبر من المسموح");
    if (out.has(name)) throw new Error("اسم مكرر داخل الحزمة");
    const raw = u8.subarray(start, start + csize);
    let data;
    if (method === 0) {
      if (csize !== usize) throw new Error("ملف داخل الحزمة تالف");
      data = raw;
    } else if (method === 8 && typeof DecompressionStream === "function") {
      /* فك بالتدفق: نتوقف فور تجاوز الحجم المعلن، فلا يُحمَّل ناتج منفوخ في الذاكرة */
      const ds = new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      const reader = ds.getReader();
      const chunks = []; let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        got += value.length;
        if (got > usize) { try { await reader.cancel(); } catch (e) {} throw new Error("حجم الملف الفعلي يتجاوز المعلن"); }
        chunks.push(value);
      }
      data = new Uint8Array(got); let off = 0;
      for (const c of chunks) { data.set(c, off); off += c.length; }
    } else throw new Error("طريقة ضغط غير مدعومة");
    if (data.length !== usize || crc32(data) !== crc) throw new Error("ملف داخل الحزمة تالف");
    out.set(name, data);
  }
  return out;
}

/* ---------- التحقق من المانيفست ---------- */
function vpValidateManifest(m) {
  const bad = msg => ({ ok: false, error: msg });
  if (!m || m.app !== "hasaniya" || m.type !== "voicepack") return bad("هذا ليس ملف حزمة صوت");
  if (m.version !== 1 && m.version !== VP_VERSION) return bad("إصدار الحزمة غير مدعوم");
  if (!Array.isArray(m.items) || m.items.length > VP_MAX_ITEMS) return bad("محتوى الحزمة غير صالح");
  for (const it of m.items) {
    const okKind = it && (it.kind === "verse" || it.kind === "story" || (it.kind === "line" && m.version >= 2));
    if (!okKind) return bad("عنصر غير معروف في الحزمة");
    if (typeof it.id !== "string" || !it.id || it.id.length > 20) return bad("رقم بيت غير صالح");
    if (it.kind === "line") {
      if (typeof it.text !== "string" || !it.text.trim() || it.text.length > 6000) return bad("نص غير صالح في الحزمة");
      if (!/^[0-9a-f]{8}$/.test(it.id) || lineId(it.text) !== it.id) return bad("بصمة نص غير صالحة");
    }
    if (typeof it.file !== "string" || !/^audio\/[A-Za-z0-9._-]{1,40}$/.test(it.file)) return bad("مسار ملف غير صالح");
    if (typeof it.mime !== "string" || !it.mime.startsWith("audio/")) return bad("نوع ملف غير صوتي");
    if (it.fp != null && !/^[0-9a-f]{8}$/.test(it.fp)) return bad("بصمة نص غير صالحة");
  }
  return { ok: true };
}

/* ---------- تقسيم العناصر إلى أجزاء (دالة نقية لتسهيل الاختبار) ---------- */
function vpSplit(items, maxBytes = VP_PART_BYTES, maxItems = VP_PART_ITEMS) {
  const parts = [];
  let cur = [], bytes = 0;
  for (const it of items) {
    const size = (it.blob && it.blob.size) || 0;
    if (cur.length && (cur.length >= maxItems || bytes + size > maxBytes)) { parts.push(cur); cur = []; bytes = 0; }
    cur.push(it); bytes += size;
  }
  if (cur.length) parts.push(cur);
  return parts;
}
function vpExt(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("webm")) return "webm";
  if (m.includes("mp4") || m.includes("m4a") || m.includes("aac")) return "m4a";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("ogg") || m.includes("opus")) return "ogg";
  if (m.includes("wav")) return "wav";
  return "bin";
}

/* ---------- قراءة كل تسجيلات المعلم من قاعدة التسجيلات ---------- */
async function vpAllAuthorRecs() {
  const db = await recDb();
  return new Promise((res, rej) => {
    const r = db.transaction("recs").objectStore("recs").getAll();
    r.onsuccess = () => res((r.result || []).filter(x => vpIsAuthorKey(x.key) && x.blob));
    r.onerror = () => rej(r.error);
  });
}
async function vpGetExportedMap() {
  try { const m = await recGet("meta|exported"); return (m && m.map) || {}; } catch(e) { return {}; }
}
function vpDownload(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function vpEstSeconds(rec) {
  if (rec.q && rec.q.duration && isFinite(rec.q.duration)) return rec.q.duration;
  return ((rec.blob && rec.blob.size) || 0) * 8 / VP_RATE;
}

/* تحديث سجل واحد داخل معاملة واحدة: يمنع أن يمحو تحديث متزامن (مثل المراجعة) تحديثاً آخر */
async function vpPatchRec(key, fn) {
  const db = await recDb();
  return new Promise((res, rej) => {
    const tx = db.transaction("recs", "readwrite");
    const st = tx.objectStore("recs");
    const g = st.get(key);
    let changed = false;
    g.onsuccess = () => { const cur = g.result; if (cur) { st.put(Object.assign({}, cur, fn(cur))); changed = true; } };
    tx.oncomplete = () => res(changed); tx.onerror = () => rej(tx.error);
  });
}

/* ---------- فحص الجودة بعد كل تسجيل: صمت، قصر شديد، أو قطع عند الحد الأقصى ---------- */
async function vpQualityCheck(key, blob, maxMs) {
  let q = { checked: false, duration: null, peak: null, warnings: [] };
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error("no AudioContext");
    const ctx = new AC();
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const data = buf.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < data.length; i += 4) { const a = Math.abs(data[i]); if (a > peak) peak = a; }
    q = { checked: true, duration: buf.duration, peak: +peak.toFixed(3), warnings: [] };
    if (peak < 0.02) q.warnings.push("الصوت صامت أو خافت جداً");
    if (buf.duration < 0.8) q.warnings.push("التسجيل قصير جداً");
    if (buf.duration >= maxMs / 1000 - 0.3) q.warnings.push("بلغ الحد الأقصى، وربما قُطع");
    if (ctx.close) ctx.close();
  } catch(e) { /* لا يمنع الحفظ على أجهزة لا تفك الترميز */ }
  await vpPatchRec(key, () => ({ q }));
  if (q.warnings.length) showToast("تنبيه في الصوت: " + q.warnings.join("، "), "error");
  if (document.getElementById("pvPopup") && document.getElementById("pvPopup").classList.contains("active")) renderParentVoice();
}

/* ---------- المراجعة: علامة «مراجَع» يضعها المعلم بعد أن يستمع ---------- */
async function vpToggleReviewed(kind, id) {
  await vpPatchRec(authorKey(kind, id), cur => ({ reviewed: !cur.reviewed, reviewedAt: cur.reviewed ? null : Date.now() }));
  renderParentVoice();
}

/* ---------- تخطيط التصدير: ماذا يُرسل، وما الذي يُستثنى، ومن أين النقص ---------- */
async function vpPlanExport(opts) {
  const recs = (await vpAllAuthorRecs()).sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const exported = await vpGetExportedMap();
  const unreviewed = recs.filter(r => !r.reviewed).length;
  const selected = recs.filter(r =>
    (!opts.onlyReviewed || r.reviewed) &&
    (!opts.deltaOnly || exported[r.key] !== (r.at || 0)));
  const stale = recs.filter(r => {
    if (r.kind === "line") return false;
    const ver = vpFindVerse(r.verseId);
    return ver && vpIsStale(r, r.kind === "story" ? "story" : "verse", ver);
  }).length;
  /* أقسام الاستوديو: كم سُجّل من كل قسم */
  const sections = typeof voiceProgress === "function" ? voiceProgress(recs) : [];
  const flagged = recs.filter(r => r.q && r.q.warnings && r.q.warnings.length).length;
  const seconds = selected.reduce((s, r) => s + vpEstSeconds(r), 0);
  const stations = content.journeyData.map((st, i) => {
    const vTotal = st.verses.length, sTotal = st.verses.filter(v => v.story).length;
    const has = (kind, v) => recs.some(r => r.verseId === v.id && (kind === "story" ? r.kind === "story" : (r.kind !== "story" && r.kind !== "line")));
    const vDone = st.verses.filter(v => has("verse", v)).length;
    const sDone = st.verses.filter(v => v.story && has("story", v)).length;
    return { n: i + 1, title: st.title, vDone, vTotal, sDone, sTotal };
  });
  const totalV = content.journeyData.reduce((s, st) => s + st.verses.length, 0);
  const totalS = content.journeyData.reduce((s, st) => s + st.verses.filter(v => v.story).length, 0);
  return { recs, selected, unreviewed, stale, flagged, seconds, stations, sections, totalV, totalS,
    doneV: stations.reduce((s, x) => s + x.vDone, 0), doneS: stations.reduce((s, x) => s + x.sDone, 0) };
}
function vpFmtDuration(sec) {
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return m ? `${m} د ${s} ث` : `${s} ث`;
}
async function vpRefreshExportReport() {
  const body = document.getElementById("vpReportBody");
  if (!body) return;
  const opts = { onlyReviewed: document.getElementById("vpOnlyReviewed").checked, deltaOnly: document.getElementById("vpDeltaOnly").checked };
  const p = await vpPlanExport(opts);
  const rows = p.sections.filter(x => x.done < x.total).map(x =>
    `<div>${escapeHtml(x.title)}: ${x.done}/${x.total}</div>`).join("");
  body.innerHTML = `
    <div><strong>المؤلف:</strong> ${escapeHtml(vpAuthorName())}</div>
    <div><strong>مسجّل:</strong> ${p.doneV}/${p.totalV} بيتاً · ${p.doneS}/${p.totalS} قصة</div>
    <div><strong>سيُرسل الآن:</strong> ${p.selected.length} تسجيلاً · مدة تقريبية ${vpFmtDuration(p.seconds)}</div>
    <div style="color:#666">غير مراجَع: ${p.unreviewed} · نص تغيّر ويحتاج إعادة: ${p.stale} · تنبيه صوت: ${p.flagged}</div>
    <div style="margin-top:8px"><strong>ما بقي للتسجيل:</strong></div>
    ${rows || "<div>✅ كل النصوص مسجّلة</div>"}`;
  document.getElementById("vpDoExportBtn").disabled = p.selected.length === 0;
}

/* ---------- التصدير ---------- */
async function exportVoicePack() {
  if (!vpAuthorName()) { showToast("اكتب اسم المعلم أو الوالد أولاً، ثم صدّر", "error"); return; }
  try {
    if (!(await vpAllAuthorRecs()).length) { showToast("لا توجد تسجيلات للتصدير بعد", "error"); return; }
  } catch(e) { showToast("تعذّر قراءة التسجيلات", "error"); return; }
  document.getElementById("vpExportPopup").classList.add("active");
  vpRefreshExportReport();
}
async function vpDoExport() {
  const author = vpAuthorName();
  const opts = { onlyReviewed: document.getElementById("vpOnlyReviewed").checked, deltaOnly: document.getElementById("vpDeltaOnly").checked };
  const plan = await vpPlanExport(opts);
  const list = plan.selected;
  if (!list.length) { showToast("لا شيء جديد للتصدير بحسب الخيارات المختارة", "error"); return; }
  const parts = vpSplit(list);
  const stamp = Date.now();
  let produced = 0;
  try {
    for (const [i, part] of parts.entries()) {
      const files = [], items = [];
      for (const [j, r] of part.entries()) {
        const file = `audio/a${String(j + 1).padStart(4, "0")}.${vpExt(r.mime)}`;
        files.push({ name: file, data: new Uint8Array(await r.blob.arrayBuffer()) });
        const kind = vpKindOf(r.kind);
        const item = { kind, id: r.key.split("|")[2], file,
          mime: r.mime || "audio/webm", fp: r.fp || null, at: r.at || 0,
          source: r.source === "upload" ? "upload" : "rec", reviewed: !!r.reviewed };
        if (kind === "line") item.text = r.text || "";
        items.push(item);
      }
      const manifest = { app: "hasaniya", type: "voicepack", version: VP_VERSION, author,
        createdAt: new Date().toISOString(), part: i + 1, parts: parts.length, items };
      files.unshift({ name: "manifest.json", data: new TextEncoder().encode(JSON.stringify(manifest)) });
      const name = parts.length > 1 ? `hasaniya-voicepack-${stamp}-${i + 1}of${parts.length}.zip` : `hasaniya-voicepack-${stamp}.zip`;
      vpDownload(zipStore(files), name);
      produced++;
      if (i < parts.length - 1) await new Promise(res => setTimeout(res, 900));
    }
    // نسجّل ما صُدّر حتى يكون التصدير التالي للفروق فقط إن طُلب
    const map = Object.assign({}, await vpGetExportedMap());
    for (const r of list) map[r.key] = r.at || 0;
    await recPut({ key: "meta|exported", map, at: Date.now() });
    closePopup("vpExportPopup");
    showToast(parts.length > 1 ? `تم تصدير ${list.length} تسجيلاً في ${parts.length} ملفات` : `تم تصدير ${list.length} تسجيلاً`, "success");
  } catch(e) {
    showToast(`تعذّر التصدير (تم ${produced} من ${parts.length})`, "error");
  }
}

/* ---------- الاستيراد: معاينة أولاً، ثم تأكيد ---------- */
let vpStaged = null;
function openVoiceImport() {
  vpStaged = null;
  const el = document.getElementById("vpImportStatus"); if (el) el.textContent = "";
  const pv = document.getElementById("vpPreview"); if (pv) pv.innerHTML = "";
  const cb = document.getElementById("vpCommitBtn"); if (cb) cb.style.display = "none";
  document.getElementById("vpImportPopup").classList.add("active");
}
/* يقرأ الملفات ويحسب ما سيحدث لكل عنصر دون أن يكتب شيئاً */
async function importVoicePacks(fileList) {
  const files = [...(fileList || [])].slice(0, VP_MAX_FILES);
  if (!files.length) return;
  const staged = { items: [], errors: [], authors: new Set() };
  let stagedBytes = 0;
  for (const f of files) {
    try {
      if (f.size > VP_MAX_TOTAL_BYTES + 2 * 1024 * 1024) throw new Error("الملف أكبر من المسموح");
      if (stagedBytes + f.size > VP_MAX_BATCH_BYTES) throw new Error("تجاوزت الدفعة الحجم المسموح، استورد هذا الملف في دفعة أخرى");
      const entries = await zipRead(await f.arrayBuffer());
      const mf = entries.get("manifest.json");
      if (!mf) throw new Error("لا يوجد manifest.json");
      const m = JSON.parse(new TextDecoder().decode(mf));
      const v = vpValidateManifest(m);
      if (!v.ok) throw new Error(v.error);
      const author = String(m.author || "").slice(0, 40);
      if (author) staged.authors.add(author);
      for (const it of m.items) {
        if (it.kind !== "line" && typeof legacyVerseId === "function" && legacyMigrationApplies()) it.id = legacyVerseId(it.id);
        const ver = it.kind === "line" ? { text: it.text } : vpFindVerse(it.id);
        const data = entries.get(it.file);
        if (!ver || !data) { staged.errors.push(`${f.name}: عنصر لا يطابق المحتوى (${it.id})`); continue; }
        const key = authorKey(it.kind, it.id);
        const existing = await recGet(key);
        const action = !existing ? "add" : ((existing.at || 0) >= (it.at || 0) ? "same" : "replace");
        stagedBytes += data.length;
        staged.items.push({ action, key, it, data, author, stale: it.kind !== "line" && vpIsStale({ fp: it.fp }, it.kind, ver) });
      }
    } catch(e) {
      staged.errors.push(`${f.name}: ${e.message || "ملف غير صالح"}`);
    }
  }
  vpStaged = staged;
  const count = a => staged.items.filter(x => x.action === a).length;
  const stale = staged.items.filter(x => x.stale && x.action !== "same").length;
  const who = [...staged.authors].join("، ") || "غير معروف";
  document.getElementById("vpPreview").innerHTML = `
    <div><strong>المؤلف:</strong> ${escapeHtml(who)}</div>
    <div>📥 جديد: ${count("add")} · ♻️ يستبدل تسجيلاً أقدم: ${count("replace")} · ⏭️ موجود بنسخة أحدث: ${count("same")}</div>
    ${stale ? `<div style="color:#b26a00">⚠ ${stale} تسجيل لا يطابق النص الحالي فيُقرأ آلياً حتى يُعاد</div>` : ""}
    ${staged.errors.length ? `<div style="color:var(--danger)">${staged.errors.map(escapeHtml).join("<br>")}</div>` : ""}`;
  const cb = document.getElementById("vpCommitBtn");
  cb.style.display = count("add") + count("replace") ? "block" : "none";
  document.getElementById("vpImportStatus").textContent = "";
}
async function vpCommitVoicePacks() {
  if (!vpStaged) return;
  let added = 0;
  try {
    for (const x of vpStaged.items) {
      if (x.action !== "add" && x.action !== "replace") continue;
      const rec = { key: x.key, verseId: x.it.id, kind: x.it.kind, uid: "author", mime: x.it.mime,
        blob: new Blob([x.data], { type: x.it.mime }), fp: x.it.fp || null, at: x.it.at || Date.now(),
        source: x.it.source === "upload" ? "upload" : "rec", reviewed: !!x.it.reviewed, author: x.author };
      if (x.it.kind === "line") { rec.text = x.it.text; rec.fp = x.it.id; }
      await recPut(rec);
      added++;
    }
  } catch(e) { showToast("تعذّر حفظ بعض التسجيلات", "error"); }
  if (vpStaged.authors.size) vpPref("importedAuthor", [...vpStaged.authors][0]);
  vpStaged = null;
  document.getElementById("vpCommitBtn").style.display = "none";
  document.getElementById("vpImportStatus").textContent = `تم استيراد ${added} تسجيلاً.`;
  showToast(added ? "تم استيراد حزمة الصوت" : "لم يُستورد شيء", added ? "success" : "error");
  renderVoiceStatus();
  if (document.getElementById("pvPopup").classList.contains("active")) renderParentVoice();
  if (document.getElementById("recPopup").classList.contains("active") && typeof renderRecList === "function") renderRecList();
  if (typeof voiceCacheReset === "function") voiceCacheReset();
}

/* ---------- حالة حزمة الصوت على الجهاز ---------- */
async function renderVoiceStatus() {
  const el = document.getElementById("vpStatus");
  if (!el) return;
  try {
    const recs = await vpAllAuthorRecs();
    const verses = recs.filter(r => r.kind !== "story" && r.kind !== "line").length;
    const stories = recs.filter(r => r.kind === "story").length;
    const lines = recs.filter(r => r.kind === "line").length;
    const stale = recs.filter(r => {
      if (r.kind === "line") return false;
      const ver = vpFindVerse(r.verseId);
      return ver && vpIsStale(r, r.kind === "story" ? "story" : "verse", ver);
    }).length;
    const reviewed = recs.filter(r => r.reviewed).length;
    const from = vpPref("importedAuthor");
    el.textContent = recs.length
      ? `🎙️ على هذا الجهاز: ${verses} بيتاً و${stories} قصة و${lines} نصاً آخر · مراجَع ${reviewed}${from ? ` · من: ${from}` : ""}${stale ? ` · ${stale} تسجيل يحتاج إعادة (النص تغيّر)` : ""}`
      : "🎙️ لا توجد حزمة صوت على هذا الجهاز بعد";
  } catch(e) { el.textContent = ""; }
}

/* ---------- ترحيل مفاتيح صوت الوالد القديمة (uid|parent|id و uid|pverse|id) إلى المفاتيح المشتركة ---------- */
/* v94: التسجيلات المحفوظة بأرقام الأبيات القديمة (قبل تقسيم المحطتين 11 و12) تُنقل إلى الأرقام الجديدة مرة واحدة */
async function migrateLegacyRecIds() {
  if (vpPref("recIdsV94") || typeof legacyVerseId !== "function" || !legacyMigrationApplies()) return;
  const db = await recDb();
  const all = await new Promise((res, rej) => {
    const r = db.transaction("recs").objectStore("recs").getAll();
    r.onsuccess = () => res(r.result || []); r.onerror = () => rej(r.error);
  });
  const re = /\bs(11|12)v(\d+)\b/g;
  for (const r of all) {
    const key = String(r.key || "");
    const nkey = key.replace(re, m => legacyVerseId(m));
    const nvid = typeof r.verseId === "string" ? legacyVerseId(r.verseId) : r.verseId;
    if (nkey === key && nvid === r.verseId) continue;
    const cur = nkey !== key ? await recGet(nkey) : null;
    if (!cur || (cur.at || 0) < (r.at || 0)) await recPut(Object.assign({}, r, { key: nkey, verseId: nvid }));
    if (nkey !== key) await recDelete(key);
  }
  vpPref("recIdsV94", true);
}
/* v101: تسجيلات الوالد القديمة حُفظت بمعرّف الزر ("pv:s1v1") بدل معرّف البيت، فلم تُحسب ولم تُستورد. تُصحَّح مرة واحدة */
async function vpFixRecIds() {
  const recs = await vpAllAuthorRecs();
  for (const r of recs) {
    if (typeof r.verseId === "string" && /^(pv|p):/.test(r.verseId)) {
      const id = r.key.split("|")[2];
      await vpPatchRec(r.key, () => ({ verseId: id }));
    }
  }
}
async function migrateVoiceKeys() {
  if (vpPref("voiceKeysV2")) return;
  const db = await recDb();
  const all = await new Promise((res, rej) => {
    const r = db.transaction("recs").objectStore("recs").getAll();
    r.onsuccess = () => res(r.result || []); r.onerror = () => rej(r.error);
  });
  for (const r of all) {
    const m = /^[^|]+\|(parent|pverse)\|(.+)$/.exec(r.key || "");
    if (!m) continue;
    const kind = m[1] === "parent" ? "story" : "verse";
    const id = m[2];
    const ver = vpFindVerse(id);
    if (!ver || !r.blob) continue; // يبقى كما هو إن لم نجد البيت
    const key = authorKey(kind, id);
    const cur = await recGet(key);
    if (!cur || (cur.at || 0) < (r.at || 0)) {
      await recPut({ key, verseId: id, kind, uid: "author", mime: r.mime || r.blob.type || "audio/webm",
        blob: r.blob, fp: textFingerprint(vpTextOf(kind, ver)), at: r.at || Date.now(),
        source: r.kind === "upload" ? "upload" : "rec" });
    }
    await recDelete(r.key);
  }
  vpPref("voiceKeysV2", true);
}

/* ---------- إعداد الطفل لأول مرة: يُكمل بياناته ثم يعرض استيراد الصوت ---------- */
function maybeOnboard() {
  const u = getCurrentUser();
  if (!u || u.gender || vpPref("onboarded")) return;
  openUserEditor(u.id, { onboarding: true });
}
function afterOnboarding() {
  vpPref("onboarded", true);
  vpAllAuthorRecs().then(recs => { if (!recs.length) openVoiceImport(); }).catch(() => {});
}
