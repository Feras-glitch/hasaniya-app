/* تسجيل الأبيات بصوت الطفل، وإرسالها للوالدين أو المعلم، واستلام التقييم */

/* ---------- قاعدة التسجيلات (IndexedDB) ---------- */
let recDbPromise = null;
function recDb() {
  if (!recDbPromise) recDbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open("hasaniya-rec", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("recs", { keyPath: "key" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return recDbPromise;
}
async function recPut(rec) {
  const db = await recDb();
  return new Promise((res, rej) => {
    const tx = db.transaction("recs", "readwrite");
    tx.objectStore("recs").put(rec);
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
  });
}
/* إن تعذّر مخزن التسجيلات على هذا المتصفح نُعلم الوالد مرة واحدة، ولا تتوقف القراءة الآلية */
let recStorageWarned = false;
function recStorageFailed() {
  if (recStorageWarned) return;
  recStorageWarned = true;
  showToast("التسجيلات لا تُحفظ في هذا المتصفح. جرّب فتح التطبيق من خادم محلي، أو ثبّته كتطبيق", "error");
}
async function recGet(key) {
  let db;
  try { db = await recDb(); } catch(e) { recStorageFailed(); return null; }
  return new Promise(res => {
    try {
      const r = db.transaction("recs").objectStore("recs").get(key);
      r.onsuccess = () => res(r.result || null);
      r.onerror = () => { recStorageFailed(); res(null); };
    } catch(e) { recStorageFailed(); res(null); }
  });
}
async function recDelete(key) {
  const db = await recDb();
  return new Promise((res, rej) => {
    const tx = db.transaction("recs", "readwrite");
    tx.objectStore("recs").delete(key);
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
  });
}
async function recAllForUser(uid) {
  const db = await recDb();
  return new Promise((res, rej) => {
    const r = db.transaction("recs").objectStore("recs").getAll();
    r.onsuccess = () => res((r.result || []).filter(x => x.key.startsWith(uid + "|")));
    r.onerror = () => rej(r.error);
  });
}
const recKey = verseId => (activeUserId || "x") + "|" + verseId;

/* ---------- التسجيل ---------- */
let recState = { recorder: null, stream: null, verseId: null, chunks: [], timer: null, onDone: null };
const REC_MAX_MS = 25000;

async function recToggle(verseId, onDone, opts = {}) {
  if (recState.recorder) { recStop(); return; }
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    showToast(window.isSecureContext === false
      ? "المتصفح يمنع الميكروفون لأن الملف فُتح من مكان غير آمن. الحل: تثبيت التطبيق على الجهاز"
      : "التسجيل غير مدعوم في هذا المتصفح", "error");
    return;
  }
  audioStopAll();
  try {
    recState.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch(e) { kidToast(kidLine("allowMic"), "error"); return; }
  audioStopAll();
  const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
             : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
  const rec = new MediaRecorder(recState.stream, { mimeType: mime || undefined, audioBitsPerSecond: 24000 });
  recState.recorder = rec; recState.verseId = verseId; recState.chunks = []; recState.onDone = onDone;
  recState.storeKey = opts.storeKey || recKey(verseId); recState.kind = opts.kind || "verse";
  recState.fp = opts.fp || null; recState.source = opts.source || "rec"; recState.author = !!opts.author;
  recState.check = !!opts.check; recState.maxMs = opts.maxMs || REC_MAX_MS;
  /* recId: المعرّف الذي يُحفظ مع التسجيل (البيت أو بصمة النص)، لا مفتاح الزر */
  recState.recId = opts.recId || verseId; recState.text = opts.text || null;
  rec.ondataavailable = e => { if (e.data && e.data.size) recState.chunks.push(e.data); };
  rec.onstop = async () => {
    const type = rec.mimeType || mime || "audio/webm";
    const blob = new Blob(recState.chunks, { type });
    const vid = recState.verseId, cb = recState.onDone, sk = recState.storeKey, kind = recState.kind;
    const fp = recState.fp, src = recState.source, isAuthor = recState.author, chk = recState.check, mx = recState.maxMs;
    const rid = recState.recId, rtext = recState.text;
    recState.stream.getTracks().forEach(t => t.stop());
    clearTimeout(recState.timer);
    recState.recorder = null; recState.stream = null; recState.chunks = [];
    if (blob.size > 0) {
      try {
        const row = { key: sk, verseId: rid || vid, kind, uid: isAuthor ? "author" : activeUserId, mime: type, blob, fp, source: src, at: Date.now() };
        if (rtext) row.text = rtext;
        await recPut(row);
        if (!isAuthor && typeof guideOnRecorded === "function") guideOnRecorded(kind);
        if (chk && typeof vpQualityCheck === "function") vpQualityCheck(sk, blob, mx);
      } catch(e) { showToast("تعذّر حفظ التسجيل على هذا المتصفح، لم يُحفظ", "error"); }
    }
    if (cb) cb(vid);
  };
  rec.start();
  audioStopAll();
  if (typeof guideSetMood === "function") guideSetMood("eager", 4000);
  recState.timer = setTimeout(recStop, opts.maxMs || REC_MAX_MS);
  if (onDone) onDone(verseId, true);
}
function recStop() {
  if (recState.recorder && recState.recorder.state !== "inactive") recState.recorder.stop();
}
function recIsRecording(verseId) { return recState.recorder && recState.verseId === verseId; }

/* ---------- نافذة تسجيلاتي (طفل) وصوت الوالد (للقصص) ---------- */
let recMode = "child";
async function openRecPopup(opts = {}) {
  recMode = opts.mode || "child";
  document.getElementById("recMode").value = recMode;
  const sel = document.getElementById("recStation");
  sel.innerHTML = content.journeyData.map((st, i) => `<option value="${i}">${escapeHtml(st.title)}</option>`).join("");
  sel.value = String(state.selectedStation || 0);
  const rsel = document.getElementById("secRange");
  rsel.innerHTML = `<option value="all">كل ما حُفظ حتى الآن</option>` +
    content.journeyData.map((st, i) => `<option value="station-${i}">${escapeHtml(st.title)}</option>`).join("");
  rsel.value = opts.range || "all";
  applyRecMode();
  renderStorageInfo();
  document.getElementById("recPopup").classList.add("active");
}
function setRecMode(m) { recMode = m; applyRecMode(); }
function applyRecMode() {
  const child = recMode === "child";
  document.getElementById("recMode").value = recMode;
  document.getElementById("secBox").style.display = child ? "block" : "none";
  document.getElementById("childExport").style.display = child ? "block" : "none";
  document.getElementById("recPrivacy").textContent = child
    ? "🔒 التسجيلات تبقى على هذا الجهاز، ولا تُرسل إلا عندما تضغط زر الإرسال بنفسك."
    : "🔒 صوت الوالد يبقى على هذا الجهاز، ويُسمَع بدلاً من القراءة الآلية للقصة.";
  renderRecList();
  if (child) renderSectionStatus();
}
async function renderRecList() {
  const si = +document.getElementById("recStation").value;
  const st = content.journeyData[si];
  const body = document.getElementById("recBody");
  if (!st) return;
  const verses = recMode === "parent" ? st.verses.filter(v => v.story) : st.verses;
  if (!verses.length) { body.innerHTML = `<p class="empty-state">لا توجد قصص في هذه المحطة.</p>`; document.getElementById("recCount").textContent = ""; return; }
  const rows = [];
  let done = 0;
  for (const [j, v] of verses.entries()) {
    const key = recMode === "parent" ? authorKey("story", v.id) : recKey(v.id);
    const rec = await recGet(key);
    if (rec) done++;
    const ev = (state.recEval || {})[v.id];
    const evalHtml = ev ? `⭐ ${escapeHtml(String(ev.memory))}/5 · نطق ${escapeHtml(String(ev.pronunciation))}/5 · ترتيب ${escapeHtml(String(ev.order))}/5${ev.note ? `<div class="rec-note">📝 ${escapeHtml(ev.note)}</div>` : ""}` : "";
    const label = recMode === "parent" ? "القصة" : v.fullVerse;
    const recordFn = recMode === "parent" ? `recToggleParent('${escapeForAttr(v.id)}')` : `recToggleUi('${escapeForAttr(v.id)}')`;
    rows.push(`<div class="rec-row">
      <div class="rec-text">${recMode === "parent" ? "📖 " : (j + 1) + ". "}${escapeHtml(recMode === "parent" ? (v.story || "").slice(0, 90) + "…" : label)}</div>
      <div class="rec-actions">
        <button class="tool-btn" onclick="${recordFn}">${recIsRecording(recMode === "parent" ? "p:" + v.id : v.id) ? "⏹ أوقف" : (rec ? "🔁 أعد" : "⏺ سجّل")}</button>
        ${rec ? `<button class="tool-btn" onclick="recPlayKey('${escapeForAttr(key)}')">▶ استمع</button>
        <button class="tool-btn" onclick="recRemoveKey('${escapeForAttr(key)}')">🗑</button>` : ""}
      </div>
      ${evalHtml ? `<div class="rec-eval">${evalHtml}</div>` : ""}
    </div>`);
  }
  body.innerHTML = rows.join("");
  document.getElementById("recCount").textContent = `سُجّل ${done} من ${verses.length} ${recMode === "parent" ? "قصص" : "أبيات"}`;
}
function recToggleParent(verseId) {
  const v = vpFindVerse(verseId);
  recToggle("p:" + verseId, () => renderRecList(), { storeKey: authorKey("story", verseId), recId: verseId, kind: "story", maxMs: 180000, fp: textFingerprint(v ? v.story : ""), author: true });
}
async function recPlayKey(key) {
  if (!audioBegin()) return;
  const token = seqToken;
  const rec = await recGet(key);
  if (!rec || token !== seqToken) return;
  seqAudio = blobAudio(rec.blob);
  audioPlayEl(seqAudio).catch(() => showToast("تعذّر التشغيل", "error"));
}
async function recRemoveKey(key) {
  if (!confirm("حذف هذا التسجيل؟")) return;
  await recDelete(key);
  renderRecList();
  if (recMode === "child") renderSectionStatus();
  renderStorageInfo();
}

/* ---------- مساحة التسجيلات وحذفها: يطلب الرقم السري (موافقة الوالد) ---------- */
function fmtBytes(n) {
  return n >= 1048576 ? (n / 1048576).toFixed(1) + " ميغابايت" : Math.max(1, Math.round(n / 1024)) + " كيلوبايت";
}
async function recUsage() {
  const all = await recAllForUser(activeUserId);
  return { count: all.length, bytes: all.reduce((s, r) => s + ((r.blob && r.blob.size) || 0), 0) };
}
async function renderStorageInfo() {
  const el = document.getElementById("recStorage");
  if (!el) return;
  try {
    const { count, bytes } = await recUsage();
    el.textContent = count
      ? `📦 التسجيلات على هذا الجهاز: ${count} ملف · ${fmtBytes(bytes)}`
      : "📦 لا توجد تسجيلات محفوظة على هذا الجهاز";
    document.getElementById("recWipeBtn").style.display = count ? "inline-block" : "none";
  } catch(e) { el.textContent = "تعذّر حساب مساحة التسجيلات"; }
}
function requestWipeRecordings() {
  requirePin(wipeRecordings, "حذف تسجيلات الطفل يحتاج موافقة الوالد");
}
async function wipeRecordings() {
  if (!confirm("حذف كل تسجيلات هذا الطفل من هذا الجهاز؟ لا يمكن التراجع عنه.")) return;
  try {
    const all = await recAllForUser(activeUserId);
    for (const r of all) await recDelete(r.key);
    showToast(`تم حذف ${all.length} تسجيل`, "success");
  } catch(e) { showToast("تعذّر الحذف", "error"); }
  renderRecList();
  if (recMode === "child") renderSectionStatus();
  renderStorageInfo();
}

/* ---------- التسميع المتصل: كل ما وصل إليه الطفل في تسجيل واحد ---------- */
function learnedVerses(rangeKey) {
  const out = [];
  content.journeyData.forEach((st, i) => {
    if (rangeKey && rangeKey !== "all" && rangeKey !== "station-" + i) return;
    const status = getStationStatus(st);
    if (status === "locked") return;
    if (status === "completed") out.push(...st.verses);
    else out.push(...st.verses.slice(0, state.versePositions[st.id] || 0));
  });
  return out;
}
function sectionKey(rangeKey) { return (activeUserId || "x") + "|sec|" + rangeKey; }
function currentRange() { return document.getElementById("secRange").value || "all"; }
async function renderSectionStatus() {
  const range = currentRange();
  const verses = learnedVerses(range);
  const text = verses.map(v => v.fullVerse).join("\n");
  document.getElementById("secText").innerText = verses.length ? text : "لم تُحفظ أبيات في هذا النطاق بعد.";
  const sec = await recGet(sectionKey(range));
  document.getElementById("secStatus").textContent = sec ? "✅ يوجد تسميع متصل مسجّل لهذا النطاق" : "لا يوجد تسميع متصل بعد";
  document.getElementById("secRecBtn").textContent = recIsRecording(range) ? "⏹ أوقف التسجيل" : "⏺ سجّل التسميع المتصل";
  document.getElementById("secDelBtn").style.display = sec ? "inline-block" : "none";
}
function recSection() {
  const range = currentRange();
  if (!learnedVerses(range).length) { kidToast(kidLine("noLearned"), "error"); return; }
  recToggle(range, () => renderSectionStatus(), { storeKey: sectionKey(range), kind: "section", maxMs: 15 * 60 * 1000 });
  renderSectionStatus();
}
async function deleteSection() {
  const range = currentRange();
  if (!confirm("حذف التسميع المتصل لهذا النطاق؟")) return;
  await recDelete(sectionKey(range));
  renderSectionStatus();
  renderStorageInfo();
}

/* التشغيل المتتابع: تسجيل المتصل إن وُجد، وإلا تسجيلات الأبيات الفردية، وإلا القراءة الآلية */
function stopSequence() {
  audioStopAll();
}
/* جزء واحد من التسميع: تسجيل الطفل أو نطق آلي. يُحلّ عند انتهائه أو عند الإيقاف */
function playPart(token, rec, text) {
  return new Promise(resolve => {
    const done = () => { seqWaiters.delete(done); resolve(); };
    if (token !== seqToken) return done();
    seqWaiters.add(done);
    if (rec) {
      seqAudio = blobAudio(rec.blob);
      seqAudio.onended = done; seqAudio.onerror = done;
      audioPlayEl(seqAudio).catch(done);
    } else {
      if (!("speechSynthesis" in window)) return done();
      const u = new SpeechSynthesisUtterance(ttsText(text));
      u.lang = "ar-SA"; u.rate = speechRate();
      const ar = window.speechSynthesis.getVoices().find(x => x.lang && x.lang.toLowerCase().startsWith("ar"));
      if (ar) u.voice = ar;
      u.onend = done; u.onerror = done;
      window.speechSynthesis.speak(u);
    }
  });
}
/* الأحدث يفوز: إذا بدأ صوت آخر أثناء الانتظار يُلغى هذا التشغيل */
async function playReview(rangeKey) {
  if (!audioBegin()) return;
  const token = seqToken;
  const sec = await recGet(sectionKey(rangeKey));
  if (token !== seqToken) return;
  if (sec) {
    seqAudio = blobAudio(sec.blob);
    guideDance(true);
    seqAudio.onended = () => guideDance(false);
    audioPlayEl(seqAudio).catch(() => guideDance(false));
    return;
  }
  const verses = learnedVerses(rangeKey);
  if (!verses.length) { kidToast(kidLine("noSaved"), "error"); return; }
  const parts = [];
  for (const v of verses) {
    const rec = (await recGet(recKey(v.id))) || (await authorRecFor("verse", v));
    if (token !== seqToken) return;
    parts.push({ rec, text: v.fullVerse });
  }
  guideDance(true);
  for (const p of parts) { if (token !== seqToken) break; await playPart(token, p.rec, p.text); }
  if (token === seqToken) guideDance(false);
}

/* صوت الوالد للقصة: يُسمع بدل القراءة الآلية إن وُجد */
async function playStoryAudio(v) {
  if (!v || !v.story) return;
  if (!audioBegin()) return;
  const token = seqToken;
  const rec = await authorRecFor("story", v);
  if (token !== seqToken) return;
  if (rec) {
    seqAudio = blobAudio(rec.blob);
    audioPlayEl(seqAudio).catch(() => { if (token === seqToken) speakQueue([v.story]); });
  } else speakQueue([v.story]);
}

/* عرض تنبيه لطيف بعد كل بيت جديد يقترح التسميع المتصل */
function offerReview() {
  if (learnedVerses("all").length < 2) return;
  const old = document.getElementById("reviewOffer"); if (old) old.remove();
  const d = document.createElement("div");
  d.id = "reviewOffer"; d.className = "review-offer";
  d.innerHTML = `<span>🐪 ${escapeHtml(guideVocative())}، ${gForm("هل تُسمِّع ما سبق في تسجيل واحد؟", "هل تُسمّعين ما سبق في تسجيل واحد؟")}</span>
    <button class="tool-btn" id="roGo">🔁 سمّع</button><button class="tool-btn" id="roX">✕</button>`;
  document.body.appendChild(d);
  d.querySelector("#roGo").onclick = () => { d.remove(); openRecPopup({ mode: "child", range: "all" }); };
  d.querySelector("#roX").onclick = () => d.remove();
  guideSay("review");
  setTimeout(() => { if (d.isConnected) d.remove(); }, 9000);
}

function recToggleUi(verseId) {
  recToggle(verseId, () => renderRecList());
}
async function recPlay(verseId) {
  if (!audioBegin()) return;
  const token = seqToken;
  const rec = await recGet(recKey(verseId));
  if (!rec || token !== seqToken) return;
  const a = blobAudio(rec.blob);
  audioPlayEl(a).catch(() => showToast("تعذّر التشغيل", "error"));
}
async function recRemove(verseId) {
  if (!confirm("حذف هذا التسجيل؟")) return;
  await recDelete(recKey(verseId));
  renderRecList();
}

/* ---------- تصدير التسجيلات للوالد أو المعلم ---------- */
function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1]);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}
/* تقسيم التصدير إلى أجزاء صغيرة: الجسر بين الويب وأندرويد لا يتحمّل رسالة بحجم عشرات الميجابايت */
const EXPORT_PACK_BYTES = 400 * 1024;
const EXPORT_PACK_ITEMS = 15;
function packItems(items) {
  const packs = [];
  let cur = [], curBytes = 0;
  for (const it of items) {
    const size = (it.blob && it.blob.size) || 0;
    if (cur.length && (cur.length >= EXPORT_PACK_ITEMS || curBytes + size > EXPORT_PACK_BYTES)) {
      packs.push(cur); cur = []; curBytes = 0;
    }
    cur.push(it); curBytes += size;
  }
  if (cur.length) packs.push(cur);
  return packs;
}
async function exportRecitation() {
  const u = getCurrentUser();
  const includePhoto = document.getElementById("recIncludePhoto").checked;
  const all = (await recAllForUser(activeUserId)).sort((a, b) => a.at - b.at);
  if (!all.length) { kidToast(kidLine("noRecs"), "error"); return; }
  const packs = packItems(all);
  const stamp = Date.now();
  const child = { name: u.name, gender: u.gender || null, photo: includePhoto ? (safeImg(u.photo) || null) : null };
  for (const [i, pack] of packs.entries()) {
    const items = [];
    for (const r of pack) {
      const verse = content.journeyData.flatMap(st => st.verses).find(v => v.id === r.verseId);
      items.push({ verseId: r.verseId, text: verse ? verse.fullVerse : "", mime: r.mime, data: await blobToBase64(r.blob) });
    }
    const doc = {
      app: "hasaniya", type: "recitation", exportedAt: new Date().toISOString(),
      part: i + 1, parts: packs.length,
      child, items
    };
    const name = packs.length > 1
      ? `recitation-${stamp}-${i + 1}of${packs.length}.json`
      : `recitation-${stamp}.json`;
    downloadJson(doc, name);
    if (packs.length > 1) showToast(`الجزء ${i + 1} من ${packs.length} جاهز`, "success");
    if (i < packs.length - 1) await new Promise(res => setTimeout(res, 800));
  }
  showToast(packs.length > 1 ? `تم تصدير ${all.length} تسجيلاً في ${packs.length} أجزاء` : "تم تصدير التسجيلات", "success");
}
function downloadJson(obj, name) {
  const blob = new Blob([JSON.stringify(obj)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ---------- فتح الملفات: تقدّم، أو تسجيلات للتقييم، أو تقييم مُعاد ---------- */
let evalDoc = null;
function importProgressDoc(data) {
  if (importProgressSafely(data)) showMap();
}
function openSharedFile(file) {
  if (!file) return;
  if (file.size > SAFE_MAX_FILE) { showToast("الملف أكبر من المسموح", "error"); return; }
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try { data = JSON.parse(reader.result); } catch(e) { showToast("ملف غير صالح", "error"); return; }
    if (data && data.app === "hasaniya" && data.type === "recitation") openEvalFromDoc(data);
    else if (data && data.app === "hasaniya" && data.type === "evaluation") importEvaluation(data);
    else if (data && data.app === "hasaniya" && data.state) importProgressDoc(data);
    else showToast("ملف غير معروف", "error");
  };
  reader.readAsText(file);
}

/* ---------- تقييم التسجيلات (للوالد أو المعلم) ---------- */
function openEvalFromDoc(rawDoc) {
  const v = validateRecitationDoc(rawDoc);
  if (!v.ok) { showToast(v.error, "error"); return; }
  const doc = v.doc;
  evalDoc = { doc, ratings: {} };
  document.getElementById("evalTitle").textContent = "🎧 تقييم تسجيلات: " + doc.child.name + (doc.parts > 1 ? ` (الجزء ${doc.part} من ${doc.parts})` : "");
  const list = document.getElementById("evalBody");
  list.textContent = "";
  /* بناء العناصر بالـDOM: لا يُركَّب HTML من حقول الملف */
  const mk = (tag, props, kids) => { const e = document.createElement(tag); Object.assign(e, props || {}); (kids || []).forEach(k => e.appendChild(k)); return e; };
  doc.items.forEach((it, i) => {
    const row = mk("div", { className: "rec-row" });
    row.dataset.i = String(i);
    row.appendChild(mk("div", { className: "rec-text", textContent: `${i + 1}. ${it.text}` }));
    const audio = mk("audio", { controls: true, preload: "none" });
    audio.src = `data:${it.mime};base64,${it.data}`;
    row.appendChild(audio);
    const grid = mk("div", { className: "eval-grid" });
    [["memory", "الحفظ"], ["pronunciation", "النطق والتجويد"], ["order", "الترتيب"]].forEach(([k, label]) => {
      const sel = mk("select");
      sel.dataset.k = k; sel.dataset.v = String(i);
      [1, 2, 3, 4, 5].forEach(n => sel.appendChild(mk("option", { value: String(n), textContent: String(n) })));
      grid.appendChild(mk("label", {}, [document.createTextNode(label + " "), sel]));
    });
    row.appendChild(grid);
    row.appendChild(mk("textarea", { className: "eval-note", placeholder: "ملاحظة (اختيارية)", rows: 2 }));
    list.appendChild(row);
  });
  document.getElementById("evalPopup").classList.add("active");
}
function collectEvaluation() {
  const out = {};
  document.querySelectorAll("#evalBody .rec-row").forEach(row => {
    const i = +row.dataset.i;
    const it = evalDoc.doc.items[i];
    const get = k => +row.querySelector(`select[data-k="${k}"]`).value;
    out[it.verseId] = { memory: get("memory"), pronunciation: get("pronunciation"), order: get("order"),
      note: row.querySelector(".eval-note").value.trim().slice(0, 300) };
  });
  return out;
}
function saveEvaluation() {
  const evaluatorName = (document.getElementById("evaluatorName").value || "المقيّم").trim().slice(0, 30);
  const doc = { app: "hasaniya", type: "evaluation", evaluatedAt: new Date().toISOString(),
    evaluator: evaluatorName, child: evalDoc.doc.child?.name || "", ratings: collectEvaluation() };
  downloadJson(doc, "evaluation-" + Date.now() + ".json");
  document.getElementById("evalPopup").classList.remove("active");
  showToast("تم حفظ التقييم", "success");
}

/* ---------- الطفل يستلم التقييم ---------- */
function importEvaluation(rawDoc) {
  const v = validateEvaluationDoc(rawDoc);
  if (!v.ok) { showToast(v.error, "error"); return; }
  state.recEval = state.recEval || {};
  let n = 0;
  for (const [vid, r] of Object.entries(v.ratings)) { state.recEval[vid] = r; n++; }
  saveState();
  showToast(`تم استلام تقييم ${n} بيت من ${v.evaluator}`, "success");
  if (document.getElementById("recPopup").classList.contains("active")) renderRecList();
}

/* تشغيل البيت ثم القصة (بصوت الوالد إن وُجد) */
async function playVerseAndStory(v, withStory) {
  if (!audioBegin()) return;
  const token = seqToken;
  const vrec = await authorRecFor("verse", v, true);
  if (token !== seqToken) return;
  await playPart(token, vrec, v.fullVerse);
  if (withStory && v.story && token === seqToken) {
    const rec = await authorRecFor("story", v, true);
    if (token === seqToken) await playPart(token, rec, v.story);
  }
}

/* صورة الطفل على بطاقة المشاركة */
function drawSharePhoto(ctx, cx, cy) {
  const ph = rewardPhoto();
  if (!ph) return;
  const img = new Image();
  img.onload = () => {
    const r = 46;
    ctx.save();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx, cy, r + 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  };
  img.src = ph;
}

/* ---------- تسميع متصل: أمر المحفوظ فقط بعد كل بيت جديد ---------- */

/* v101: صوت الوالد صار «استوديو التسجيل» في studio.js */
