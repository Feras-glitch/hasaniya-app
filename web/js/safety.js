/* v87: التحقق الموحّد من كل ما يدخل التطبيق من ملفات خارجية، والنسخ الاحتياطية التلقائية.
   لا يُبنى HTML من حقول خارجية، ولا يُستبدل تقدّم الطفل إلا بعد اجتياز التحقق كاملاً. */

const SAFE_BAD_KEYS = ["__proto__", "constructor", "prototype"];
const SAFE_MAX_FILE = 40 * 1024 * 1024;
/* أنواع الصوت المقبولة فقط، مع معامل codecs اختياري بحروف بسيطة */
const SAFE_AUDIO_MIME = /^audio\/(webm|ogg|mp4|mpeg|mp3|wav|x-wav|x-m4a|aac)(;\s*codecs=[A-Za-z0-9.,=\-]{1,60})?$/i;
const SAFE_BASE64 = /^[A-Za-z0-9+\/]+={0,2}$/;
const SAFE_BACKUP_KEY = "hasaniya_safety_backups";
const SAFE_BACKUP_MAX = 4;
const SAFE_BACKUP_MAX_BYTES = 1500 * 1024;

/* نسخة عميقة من بيانات JSON خالية من المفاتيح الخطرة، بعمق وعدد محدودين */
function safeClone(v, depth) {
  depth = depth || 0;
  if (depth > 8) return undefined;
  if (Array.isArray(v)) return v.slice(0, 5000).map(x => safeClone(x, depth + 1));
  if (v && typeof v === "object") {
    const o = {}; let n = 0;
    for (const k of Object.keys(v)) {
      if (SAFE_BAD_KEYS.includes(k)) continue;
      if (++n > 5000) break;
      o[k] = safeClone(v[k], depth + 1);
    }
    return o;
  }
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (typeof v === "string") return v.length > 20000 ? v.slice(0, 20000) : v;
  if (typeof v === "boolean" || v === null) return v;
  return undefined;
}
const _isObj = x => !!x && typeof x === "object" && !Array.isArray(x);
const _num = (x, min, max, dflt) => (typeof x === "number" && isFinite(x)) ? Math.max(min, Math.min(max, x)) : dflt;
const _int = (x, min, max, dflt) => Math.floor(_num(x, min, max, dflt));

/* يتحقق من حالة طفل مستوردة ويُرجع {ok, state, summary} أو {ok:false, error}. لا يمسّ الحالة الحالية */
function sanitizeImportedState(raw) {
  if (!_isObj(raw)) return { ok: false, error: "ملف التقدم ليس بالشكل المتوقع" };
  if (!_isObj(raw.stationStatus)) return { ok: false, error: "ملف التقدم ناقص: لا توجد حالة المحطات" };
  const s = safeClone(raw);
  /* نسخة احتياطية من قبل تقسيم المحطتين 11 و12 تُحوَّل أرقامها أولاً */
  if (typeof migrateLegacyState === "function") migrateLegacyState(s);
  const stations = content.journeyData;
  const stationIds = new Set(stations.map(x => x.id));
  const verseIds = new Set(stations.flatMap(x => x.verses.map(v => v.id)));
  const lenOf = {}; stations.forEach(x => { lenOf[x.id] = x.verses.length; });
  if (!Object.keys(s.stationStatus).some(k => stationIds.has(k)))
    return { ok: false, error: "ملف التقدم لا يطابق محطات هذا التطبيق" };

  const objOr = k => { if (!_isObj(s[k])) s[k] = {}; };
  ["stationStatus", "rewardUnlocked", "versePositions", "mistakes", "seenVerses", "verseStats", "leitner",
   "storyUnlocked", "riddlesSolved", "achievements", "stampDates", "guideBadges", "meaningSeen", "stats",
   "dailyCredits", "follow", "eventMisses", "recEval", "masteredNotified"].forEach(objOr);

  const ST = { completed: 1, current: 1, locked: 1 };
  const pick = (obj, ok, map) => { const o = {}; for (const k of Object.keys(obj)) if (ok(k)) { const v = map(obj[k], k); if (v !== undefined) o[k] = v; } return o; };
  s.stationStatus = pick(s.stationStatus, k => stationIds.has(k), v => ST[v] ? v : undefined);
  s.rewardUnlocked = pick(s.rewardUnlocked, k => stationIds.has(k), v => !!v);
  s.versePositions = pick(s.versePositions, k => stationIds.has(k), (v, k) => _int(v, 0, Math.max(0, lenOf[k] - 1), 0));
  ["seenVerses", "storyUnlocked", "meaningSeen", "masteredNotified"].forEach(f => {
    s[f] = pick(s[f], k => verseIds.has(k), () => true);
  });
  s.riddlesSolved = pick(s.riddlesSolved, k => k.length <= 40, () => true);
  s.verseStats = pick(s.verseStats, k => verseIds.has(k), v => _isObj(v) ? ({
    correct: _int(v.correct, 0, 100000, 0), wrong: _int(v.wrong, 0, 100000, 0),
    lastCorrect: _num(v.lastCorrect, 0, 9e15, 0), lastWrong: _num(v.lastWrong, 0, 9e15, 0) }) : undefined);
  s.mistakes = pick(s.mistakes, k => k.length <= 200, v => (_isObj(v) && typeof v.verseId === "string" && verseIds.has(v.verseId)) ? ({
    word: String(v.word || "").slice(0, 80), verseId: v.verseId,
    stationId: stationIds.has(v.stationId) ? v.stationId : "", context: String(v.context || "").slice(0, 400),
    level: _int(v.level, 0, 20, 0), addedAt: _num(v.addedAt, 0, 9e15, 0), lastAttempt: _num(v.lastAttempt, 0, 9e15, 0) }) : undefined);
  s.leitner = pick(s.leitner, k => verseIds.has(k), v => _isObj(v) ? ({ box: _int(v.box, 1, 5, 1), due: _num(v.due, 0, 9e15, 0) }) : undefined);
  s.eventMisses = pick(s.eventMisses, k => verseIds.has(k), v => _int(v, 0, 1000, 0));
  s.follow = pick(s.follow, k => verseIds.has(k), v => _isObj(v) ? ({ h: !!v.h, r: !!v.r, u: !!v.u }) : undefined);
  s.dailyCredits = pick(s.dailyCredits, k => k.length <= 80, v => typeof v === "string" ? v.slice(0, 40) : undefined);
  s.recEval = pick(s.recEval, k => verseIds.has(k), v => _isObj(v) ? sanitizeRating(v, v.evaluator, v.date) : undefined);
  const achIds = new Set((typeof ACHIEVEMENTS !== "undefined" ? ACHIEVEMENTS : []).map(a => a.id));
  s.achievements = pick(s.achievements, k => achIds.size === 0 || achIds.has(k), v => (typeof v === "string" || typeof v === "number" || v === true) ? v : true);
  s.stats = { perfectSessions: _int(s.stats.perfectSessions, 0, 1e6, 0), reviewSessions: _int(s.stats.reviewSessions, 0, 1e6, 0),
    shared: _int(s.stats.shared, 0, 1e6, 0), challengeSessions: _int(s.stats.challengeSessions, 0, 1e6, 0) };
  s.points = _int(s.points, 0, 1e8, 0);
  s.streak = _int(s.streak, 0, 100000, 0);
  s.totalTimeSeconds = _int(s.totalTimeSeconds, 0, 1e9, 0);
  s.guideHue = _int(s.guideHue, 0, 360, 0);
  s.najiCount = _int(s.najiCount, 0, 1e6, 0);
  s.activeDays = Array.isArray(s.activeDays) ? s.activeDays.filter(x => typeof x === "string").slice(-3650).map(x => x.slice(0, 40)) : [];
  s.selectedStation = (typeof s.selectedStation === "number" && s.selectedStation >= 0 && s.selectedStation < stations.length) ? Math.floor(s.selectedStation) : 0;
  s.selectedVerse = _int(s.selectedVerse, 0, 1000, 0);
  s.dailyLeft = null; s.dailyIds = [];
  normalizeUserState(s);
  if (typeof ensureCurrentStation === "function") ensureCurrentStation(s);
  const completed = Object.values(s.stationStatus).filter(v => v === "completed").length;
  return { ok: true, state: s, summary: { points: s.points, seen: Object.keys(s.seenVerses).length, completed, total: stations.length } };
}

/* تقييم واحد: أعداد صحيحة من 1 إلى 5 وملاحظة قصيرة */
function sanitizeRating(r, evaluator, date) {
  return {
    memory: _int(r.memory, 1, 5, 3), pronunciation: _int(r.pronunciation, 1, 5, 3), order: _int(r.order, 1, 5, 3),
    note: String(r.note || "").slice(0, 300),
    evaluator: String(evaluator || "المقيّم").slice(0, 30),
    date: String(date || "").slice(0, 40)
  };
}

/* ملف تسميع مصدَّر: يُرجع الوثيقة المنظَّفة أو خطأ. كل حقل صوتي يمرّ بقائمة بيضاء */
function validateRecitationDoc(doc) {
  if (!_isObj(doc) || doc.app !== "hasaniya" || doc.type !== "recitation") return { ok: false, error: "ملف التسجيلات غير صالح" };
  if (!Array.isArray(doc.items) || doc.items.length === 0 || doc.items.length > 500) return { ok: false, error: "محتوى ملف التسجيلات غير صالح" };
  const verseIds = new Set(content.journeyData.flatMap(st => st.verses.map(v => v.id)));
  const items = []; let bytes = 0;
  for (const it of doc.items) {
    if (_isObj(it) && typeof it.verseId === "string" && typeof legacyVerseId === "function" && legacyMigrationApplies()) it.verseId = legacyVerseId(it.verseId);
    if (!_isObj(it) || typeof it.verseId !== "string" || !verseIds.has(it.verseId)) return { ok: false, error: "تسجيل يشير إلى بيت غير موجود" };
    if (typeof it.mime !== "string" || !SAFE_AUDIO_MIME.test(it.mime)) return { ok: false, error: "نوع صوت غير مقبول في الملف" };
    if (typeof it.data !== "string" || !it.data.length || !SAFE_BASE64.test(it.data)) return { ok: false, error: "بيانات صوت غير صالحة في الملف" };
    bytes += it.data.length;
    if (bytes > 40 * 1024 * 1024) return { ok: false, error: "الملف أكبر من المسموح" };
    items.push({ verseId: it.verseId, text: typeof it.text === "string" ? it.text.slice(0, 600) : "", mime: it.mime, data: it.data });
  }
  const part = _int(doc.part, 1, 1000, 1), parts = _int(doc.parts, 1, 1000, 1);
  const name = _isObj(doc.child) && typeof doc.child.name === "string" ? doc.child.name.slice(0, 40) : "الطفل";
  return { ok: true, doc: { child: { name }, part, parts, items } };
}

/* ملف تقييم: ينقّي كل تقييم ويُسقط ما لا يطابق بيتاً حقيقياً */
function validateEvaluationDoc(doc) {
  if (!_isObj(doc) || doc.app !== "hasaniya" || doc.type !== "evaluation" || !_isObj(doc.ratings)) return { ok: false, error: "تقييم غير صالح" };
  const verseIds = new Set(content.journeyData.flatMap(st => st.verses.map(v => v.id)));
  const evaluator = String(doc.evaluator || "المقيّم").slice(0, 30);
  const date = String(doc.evaluatedAt || "").slice(0, 40);
  const ratings = {};
  for (const k0 of Object.keys(doc.ratings)) {
    const k = (typeof legacyVerseId === "function" && legacyMigrationApplies()) ? legacyVerseId(k0) : k0;
    if (SAFE_BAD_KEYS.includes(k0) || !verseIds.has(k) || !_isObj(doc.ratings[k0])) continue;
    ratings[k] = sanitizeRating(doc.ratings[k0], evaluator, date);
  }
  if (!Object.keys(ratings).length) return { ok: false, error: "التقييم لا يطابق أبيات هذا التطبيق" };
  return { ok: true, evaluator, ratings };
}

/* ---------- استبدال ذري لحالة الطفل الحالي ---------- */
function applyImportedState(clean) {
  const before = JSON.stringify(state);
  safetyBackupPush("قبل الاستيراد");
  try {
    Object.keys(state).forEach(k => delete state[k]);
    Object.assign(state, clean);
    if (saveState() === false) throw new Error("تعذّر الحفظ");
    return true;
  } catch (e) {
    try {
      const old = JSON.parse(before);
      Object.keys(state).forEach(k => delete state[k]);
      Object.assign(state, old);
      saveState();
    } catch (_) {}
    return false;
  }
}
/* نقطة واحدة لكل مسارات استيراد التقدّم: تحقق، ثم ملخص وموافقة، ثم استبدال ذري */
function importProgressSafely(data) {
  const r = sanitizeImportedState(data && data.state);
  if (!r.ok) { showToast(r.error, "error"); return false; }
  const m = r.summary;
  if (!confirm(`استعادة تقدّم: ${m.points} نقطة، ${m.completed} من ${m.total} محطات مكتملة، ${m.seen} بيتاً مرئياً.\nسيُستبدل تقدّم «${getUserName()}» الحالي، وتُحفظ نسخة منه يمكن استعادتها من وضع الوالد. المتابعة؟`)) return false;
  if (!applyImportedState(r.state)) { showToast("تعذّرت الاستعادة وبقي التقدم الحالي كما هو", "error"); return false; }
  showToast("تم استعادة التقدم", "success");
  return true;
}

/* ---------- نسخ احتياطية تلقائية قابلة للاستعادة ---------- */
function _stripUsers(list) {
  return (list || []).map(u => ({ id: u.id, name: u.name, avatar: u.avatar, gender: u.gender || null, createdAt: u.createdAt, state: u.state }));
}
function safetyBackupList() {
  try { const a = JSON.parse(localStorage.getItem(SAFE_BACKUP_KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
function safetyBackupWrite(arr) {
  for (let n = 0; n < 3; n++) {
    try { localStorage.setItem(SAFE_BACKUP_KEY, JSON.stringify(arr)); return true; } catch (e) { arr = arr.slice(1); if (!arr.length) return false; }
  }
  return false;
}
/* kind: «قبل الاستيراد» تُضاف دائماً، و«آخر نسخة سليمة» تُستبدل ولا تتكرر */
function safetyBackupPush(kind, usersList) {
  try {
    const entry = { t: new Date().toISOString(), kind, users: _stripUsers(usersList || users) };
    if (JSON.stringify(entry).length > SAFE_BACKUP_MAX_BYTES) return false;
    let arr = safetyBackupList();
    if (kind === "آخر نسخة سليمة") arr = arr.filter(e => e.kind !== kind);
    arr.push(entry);
    while (arr.length > SAFE_BACKUP_MAX) { const i = arr.findIndex(e => e.kind !== "آخر نسخة سليمة"); arr.splice(i < 0 ? 0 : i, 1); }
    return safetyBackupWrite(arr);
  } catch (e) { return false; }
}
/* بعد كل تحميل سليم: لقطة «آخر نسخة سليمة» مرة كل 12 ساعة على الأكثر */
function safetyBackupAfterGoodLoad() {
  try {
    const last = safetyBackupList().find(e => e.kind === "آخر نسخة سليمة");
    if (last && Date.now() - Date.parse(last.t) < 12 * 3600 * 1000) return;
    safetyBackupPush("آخر نسخة سليمة");
  } catch (e) {}
}
/* حفظ النص الخام لمخزن فشلت قراءته، قبل أن يُكتب فوقه، دون دهس نسخة أقدم مختلفة */
function stashCorruptRaw(key, raw) {
  if (!raw) return;
  try {
    const slot = key + "_corrupt_backup";
    const old = localStorage.getItem(slot);
    if (old === raw) return;
    if (old) { try { localStorage.setItem(slot + "2", old); } catch (_) {} }
    localStorage.setItem(slot, raw);
  } catch (e) {}
}

/* استعادة مستخدمين من قائمة نسخة احتياطية، بعد تنقية حالة كل طفل */
function restoreUsersFromList(list) {
  if (!Array.isArray(list) || !list.length) return { ok: false, error: "النسخة فارغة" };
  const out = []; const seen = new Set();
  for (const u of list.slice(0, 50)) {
    if (!_isObj(u) || typeof u.name !== "string") continue;
    if (typeof u.id === "string" && seen.has(u.id)) continue; // معرّف مكرر: يُحتفظ بالأول فقط
    if (typeof u.id === "string") seen.add(u.id);
    const r = sanitizeImportedState(u.state || {});
    const st = r.ok ? r.state : normalizeUserState({});
    out.push({
      id: typeof u.id === "string" && u.id ? u.id.slice(0, 60) : "u" + Date.now() + out.length,
      name: u.name.slice(0, 30) || "طفلي", avatar: typeof u.avatar === "string" ? u.avatar.slice(0, 4) : "🦁",
      gender: u.gender === "girl" || u.gender === "boy" ? u.gender : null, createdAt: _num(u.createdAt, 0, 9e15, Date.now()),
      photo: (typeof safeImg === "function" ? safeImg(u.photo) : null) || null, showPhoto: u.showPhoto !== false, parentSig: (typeof safeImg === "function" ? safeImg(u.parentSig) : null) || null, state: st
    });
  }
  if (!out.length) return { ok: false, error: "لا أطفال صالحون في النسخة" };
  return { ok: true, users: out };
}
function safetyRestore(index) {
  const b = safetyBackupList()[index];
  if (!b) return;
  const r = restoreUsersFromList(b.users);
  if (!r.ok) { showToast(r.error, "error"); return; }
  const pts = r.users.reduce((s, u) => s + (u.state.points || 0), 0);
  if (!confirm(`استعادة ${r.users.length} طفل (${pts} نقطة) من نسخة «${b.kind}» بتاريخ ${new Date(b.t).toLocaleString("ar")}؟\nسيُستبدل ما على الجهاز الآن، وتُحفظ نسخة منه. صور الأطفال لا تُحفظ في النسخ التلقائية.`)) return;
  const keepPhoto = {}; users.forEach(u => { keepPhoto[u.id] = { photo: u.photo, showPhoto: u.showPhoto, parentSig: u.parentSig }; });
  safetyBackupPush("قبل الاستعادة");
  r.users.forEach(u => { const k = keepPhoto[u.id]; if (k) { u.photo = k.photo || null; u.showPhoto = k.showPhoto !== false; u.parentSig = k.parentSig || null; } });
  users = r.users; activeUserId = users[0].id;
  state = users[0].state;
  if (saveState() === false) { showToast("تعذّر الحفظ", "error"); return; }
  showToast("تمت الاستعادة", "success");
  setTimeout(() => location.reload(), 700);
}
function corruptRawDownload(key) {
  const raw = localStorage.getItem(key); if (!raw) return;
  const blob = new Blob([raw], { type: "text/plain" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = key + ".txt"; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
/* واجهة وضع الوالد */
function showRecoveryHub() {
  const list = safetyBackupList();
  const rows = list.map((b, i) => {
    const pts = (b.users || []).reduce((s, u) => s + ((u.state && u.state.points) || 0), 0);
    return `<div class="board-row"><span>${escapeHtml(b.kind)}<br><small>${escapeHtml(new Date(b.t).toLocaleString("ar"))} · ${(b.users || []).length} طفل · ${pts} نقطة</small></span>
      <button class="tool-btn" onclick="safetyRestore(${i})">استعادة</button></div>`;
  }).reverse().join("");
  const corrupt = ["hasaniya_users_corrupt_backup", "hasaniya_users_corrupt_backup2", "hasaniya_content_corrupt_backup"].filter(k => localStorage.getItem(k));
  const raws = corrupt.map(k => `<div class="board-row"><span>${k.includes("content") ? "محتوى تالف" : "بيانات أطفال تالفة"}<br><small>نسخة خام يمكن تنزيلها وإصلاحها</small></span>
      <button class="tool-btn" onclick="corruptRawDownload('${k}')">تنزيل</button></div>`).join("");
  openHub("🛟 استعادة من نسخة احتياطية تلقائية", `
    <p style="color:#666;font-size:.88rem">يحفظ التطبيق نسخة تلقائية قبل كل استيراد وكل استعادة، ولقطة من آخر حالة سليمة كل نصف يوم. الصور لا تدخل فيها.</p>
    ${rows || '<p style="color:#888">لا توجد نسخ تلقائية بعد.</p>'}
    ${raws ? '<h4 style="margin:14px 0 4px">ملفات تالفة محفوظة</h4>' + raws : ""}`);
}
