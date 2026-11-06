/* الحالة العامة والتخزين */
let content = { journeyData: JSON.parse(JSON.stringify(DEFAULT_JOURNEY)) };
let users = [];
let activeUserId = null;
let state = null;
let parentPinHash = null;

function createNewUser(name, avatar) {
  return {
    id: "u_" + Date.now() + "_" + Math.random().toString(36).slice(2,7),
    name: String(name || "طفلي").slice(0, 20),
    avatar: avatar || "🦁",
    createdAt: Date.now(),
    state: {
      version: 13,
      stationStatus: {},
      rewardUnlocked: {},
      versePositions: {},
      mistakes: {},
      seenVerses: {},
      verseStats: {},
      leitner: {}, weekly: null, storyUnlocked: {}, riddlesSolved: {},
      points: 0, streak: 0, lastPracticeDate: null,
      totalTimeSeconds: 0,
      achievements: {},
      stats: {perfectSessions:0, reviewSessions:0, shared:0, challengeSessions:0}
    }
  };
}

function getUserById(id) { return users.find(u => u.id === id); }
function getCurrentUser() { return getUserById(activeUserId); }
function getUserName() { return getCurrentUser()?.name || "الطفل"; }
function getUserAvatar() { return getCurrentUser()?.avatar || "👤"; }

function normalizeUserState(s) {
  s.stationStatus = s.stationStatus || {};
  s.rewardUnlocked = s.rewardUnlocked || {};
  s.versePositions = s.versePositions || {};
  s.mistakes = s.mistakes || {};
  s.seenVerses = s.seenVerses || {};
  s.verseStats = s.verseStats || {};
  s.leitner = s.leitner || {};
  s.weekly = s.weekly || null;
  s.storyUnlocked = s.storyUnlocked || {};
  s.riddlesSolved = s.riddlesSolved || {};
  s.points = s.points || 0;
  s.streak = s.streak || 0;
  s.totalTimeSeconds = s.totalTimeSeconds || 0;
  s.achievements = s.achievements || {};
  s.activeDays = s.activeDays || [];
  s.stampDates = s.stampDates || {};
  s.guideBadges = s.guideBadges || {};
  s.guideHue = s.guideHue || 0;
  s.meaningSeen = s.meaningSeen || {};
  s.najiFound = s.najiFound || null;
  s.najiCount = s.najiCount || 0;
  s.recentDone = s.recentDone || null;
  s.stats = Object.assign({perfectSessions:0, reviewSessions:0, shared:0, challengeSessions:0}, s.stats || {});
  return s;
}

/* v103: التطبيق مفتوح في نافذتين: حين تحفظ الأخرى تتوقف هذه عن الحفظ، فلا تمحو النسخة القديمة تقدّماً أحدث */
let staleTab = false;
window.addEventListener("storage", e => {
  if (staleTab || (e.key !== STORAGE_USERS && e.key !== STORAGE_CONTENT)) return;
  staleTab = true;
  if (typeof showStaleTabNotice === "function") showStaleTabNotice();
});
function showStaleTabNotice() {
  if (document.getElementById("staleTab")) return;
  const d = document.createElement("div");
  d.id = "staleTab"; d.className = "stale-tab";
  d.innerHTML = `<div class="stale-box"><div style="font-size:2rem">🪟</div>
    <p>التطبيق مفتوح في نافذة أخرى، وفيها التقدّم الأحدث. أُوقف الحفظ هنا حتى لا يضيع شيء.</p>
    <button class="action-btn btn-success" onclick="location.reload()">↻ حدّث هذه النافذة</button></div>`;
  document.body.appendChild(d);
}
/* v104: عدّاد كتابة مشترك بين النوافذ: إن كتبت نافذة أخرى بعد آخر كتابة لهذه النافذة فهي قديمة،
   فلا تكتب فوق الأحدث (لا يعتمد على وصول حدث storage في الوقت المناسب).
   ولا يُعاد كتابة المحتوى (نحو 140 ألف حرف) في كل نقرة إن لم يتغيّر. */
const STORAGE_SEQ = "hasaniya_write_seq";
let saveSeq = null, lastContentStr = null;
function saveSeqRead() { try { return localStorage.getItem(STORAGE_SEQ); } catch (e) { return null; } }
function saveState() {
  if (staleTab) return false;
  const cur = saveSeqRead();
  if (saveSeq !== null && cur !== null && cur !== saveSeq) {
    staleTab = true;
    if (typeof showStaleTabNotice === "function") showStaleTabNotice();
    return false;
  }
  try {
    if (state && activeUserId) {
      const u = getUserById(activeUserId);
      if (u) u.state = state;
    }
    const cStr = JSON.stringify({contentVersion: CONTENT_VERSION, journeyData: content.journeyData, edited: !!content.edited});
    if (cStr !== lastContentStr) { localStorage.setItem(STORAGE_CONTENT, cStr); lastContentStr = cStr; }
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
    localStorage.setItem(STORAGE_ACTIVE, activeUserId || "");
    // يُعتمد الرقم الجديد بعد نجاح كتابته فقط؛ وإلا تظن النافذة أن غيرها كتب بعدها فتتوقف عن الحفظ
    const seq = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    localStorage.setItem(STORAGE_SEQ, seq);
    saveSeq = seq;
    return true;
  } catch(e) {
    console.warn("save error", e);
    /* لا نفشل بصمت: تنبيه واحد في الدقيقة على الأكثر */
    const now = Date.now();
    if (now - (saveState.lastWarn || 0) > 60000 && typeof showToast === "function") {
      saveState.lastWarn = now;
      try { showToast("⚠ تعذّر حفظ التقدم، مساحة الجهاز ممتلئة. أخبر الوالد ليحرّر مساحة", "error"); } catch (_) {}
    }
    return false;
  }
}

function migrateFromV12() {
  const c = localStorage.getItem(OLD_V12_CONTENT);
  if (!c) return false;
  try {
    const u = localStorage.getItem(OLD_V12_USERS);
    const a = localStorage.getItem(OLD_V12_ACTIVE);
    const p = localStorage.getItem(OLD_V12_PIN);
    if (c) content = JSON.parse(c);
    if (u) users = JSON.parse(u);
    if (a) activeUserId = a;
    if (p) { parentPinHash = p; pinStoreSave(p); }
    users.forEach(u => {
      u.state = normalizeUserState(u.state || {});
      u.state.version = 13;
    });
    saveState();
    [OLD_V12_CONTENT, OLD_V12_USERS, OLD_V12_ACTIVE, OLD_V12_PIN].forEach(k => {
      try { localStorage.removeItem(k); } catch(e) {}
    });
    showToast("تم ترحيل بياناتك من V12", "success");
    return true;
  } catch(e) { console.warn("migrate V12 error", e); return false; }
}

/* v104: الرقم السري في مفتاح جديد لا تعرفه الإصدارات القديمة.
   كانت نسخة قديمة من التطبيق (ملف أو مجلد قديم على الجهاز نفسه) تشترك في التخزين نفسه،
   و«نسيت الرقم» القديم فيها يمحو المفتاح القديم فيسقط الرقم هنا. الآن يُقرأ الرقم من المفتاح الجديد وحده،
   ويُنقل إليه من القديم مرة واحدة فقط، ويُكتب في القديم نسخة حتى تطلبه الإصدارات القديمة أيضاً. */
function pinStoreLoad() {
  let h = null;
  try {
    h = localStorage.getItem(STORAGE_PIN2) || null;
    if (!h && !localStorage.getItem(STORAGE_PIN_MIG)) h = localStorage.getItem(STORAGE_PIN) || null;
    if (h) { localStorage.setItem(STORAGE_PIN2, h); if (localStorage.getItem(STORAGE_PIN) !== h) localStorage.setItem(STORAGE_PIN, h); }
    localStorage.setItem(STORAGE_PIN_MIG, "1");
  } catch (e) {}
  return h;
}
function pinStoreSave(h) {
  try { localStorage.setItem(STORAGE_PIN2, h); localStorage.setItem(STORAGE_PIN, h); localStorage.setItem(STORAGE_PIN_MIG, "1"); } catch (e) {}
}
function pinStoreRemove() {
  try { localStorage.removeItem(STORAGE_PIN2); localStorage.removeItem(STORAGE_PIN); localStorage.setItem(STORAGE_PIN_MIG, "1"); } catch (e) {}
}
function pinStoreHas() { try { return !!localStorage.getItem(STORAGE_PIN2); } catch (e) { return false; } }

/* ---------- v104: النسخة السابقة من المحتوى (قبل تحديث أو استيراد أو حذف في المحرر) ---------- */
const STORAGE_CONTENT_PREV = "hasaniya_content_prev";
const SEC_EVAL_KEY = /^sec:(all|station-\d{1,2})$/;
/* edited: true (عدّله الوالد)، false، أو "unknown" (محتوى من إصدار قبل v104 لم يكن يسجّل التعديل) */
function contentSnapshotSave(journeyData, reason, edited, fromVersion) {
  try {
    // النسخة نفسها محفوظة من قبل (نسخة قديمة من التطبيق تتناوب مع هذه على التخزين نفسه): لا تُكتب فوقها ولا يتكرر التنبيه
    const old = contentSnapshotGet();
    if (old && old.fromVersion === (fromVersion || CONTENT_VERSION) && JSON.stringify(old.journeyData) === JSON.stringify(journeyData)) return true;
    localStorage.setItem(STORAGE_CONTENT_PREV, JSON.stringify({ at: Date.now(), reason, edited: edited === "unknown" ? "unknown" : !!edited, fromVersion: fromVersion || CONTENT_VERSION, journeyData }));
    return true;
  } catch (e) { return false; }
}
function contentSnapshotGet() {
  try { const o = JSON.parse(localStorage.getItem(STORAGE_CONTENT_PREV) || "null"); return o && Array.isArray(o.journeyData) && o.journeyData.length ? o : null; } catch (e) { return null; }
}
/* تنبيه الوالد: حُدّث المحتوى وكانت فيه تعديلات من المحرر */
function contentPrevInfo() {
  const o = contentSnapshotGet();
  if (!o || !o.edited || o.dismissed || Date.now() - o.at > 30 * 86400000) return "";
  if (o.edited === "unknown") return `<div class="parent-alert">📝 تحدّث محتوى التطبيق (تصحيحات علمية). إن كنت عدّلت شيئاً في المحرر قبل التحديث، فالمحتوى السابق محفوظ وتسترجعه من «المحرر» ← «↩️ المحتوى السابق».
    <button class="tool-btn" onclick="contentPrevDismiss()">حسناً</button></div>`;
  return `<div class="parent-alert">📝 تغيّر محتوى التطبيق (${escapeHtml(o.reason || "")})، وكانت فيه تعديلات منك في المحرر. التعديلات محفوظة، وتسترجعها من «المحرر» ← «↩️ المحتوى السابق».
    <button class="tool-btn" onclick="contentPrevDismiss()">حسناً</button></div>`;
}
function contentPrevDismiss() {
  const o = contentSnapshotGet(); if (!o) return;
  o.dismissed = true; try { localStorage.setItem(STORAGE_CONTENT_PREV, JSON.stringify(o)); } catch (e) {}
  if (typeof renderParentAlerts === "function") renderParentAlerts();
}

function loadAll() {
  migrateFromV12();

  /* كل مخزن يُقرأ على حدة: تلف أحدها لا يُسقط الآخر، ويُحفظ نصه الخام قبل أن يُكتب فوقه */
  let cRaw = null, uRaw = null, usersOk = false, contentChanged = false;
  saveSeq = saveSeqRead();
  try {
    cRaw = localStorage.getItem(STORAGE_CONTENT);
    if (cRaw) {
      const c = JSON.parse(cRaw);
      if (c && c.contentVersion === CONTENT_VERSION && Array.isArray(c.journeyData) && c.journeyData.length > 0) {
        content.journeyData = c.journeyData;
        content.edited = !!c.edited;
      } else if (c && Array.isArray(c.journeyData) && c.journeyData.length > 0) {
        /* v104: تحديث المحتوى يستبدل المخزّن، فتُحفظ نسخته السابقة (وفيها تعديلات المحرر إن وُجدت) لتُسترجع */
        // ما قبل v104 لم يكن يسجّل تعديل المحرر: لا نعرف إن عُدّل، فيُنبَّه الوالد تنبيهاً مخففاً
        contentSnapshotSave(c.journeyData, "قبل تحديث محتوى التطبيق", c.edited === undefined && +c.contentVersion < 39 ? "unknown" : !!c.edited, c.contentVersion);
        contentChanged = true;
      }
    }
  } catch(e) {
    console.warn("content load error", e);
    stashCorruptRaw("hasaniya_content", cRaw);
  }
  try {
    uRaw = localStorage.getItem(STORAGE_USERS);
    if (uRaw) {
      const parsed = JSON.parse(uRaw);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(u => u && typeof u === "object" && typeof u.id === "string")) { users = parsed; usersOk = true; }
      else stashCorruptRaw("hasaniya_users", uRaw);
    }
  } catch(e) {
    console.warn("users load error", e);
    stashCorruptRaw("hasaniya_users", uRaw);
  }
  try { activeUserId = localStorage.getItem(STORAGE_ACTIVE) || null; } catch(e) { activeUserId = null; }
  parentPinHash = pinStoreLoad();

  if (!users || !Array.isArray(users) || users.length === 0) {
    const u = createNewUser("طفلي", "🦁");
    users = [u];
    activeUserId = u.id;
  }
  users.forEach(u => { u.state = normalizeUserState(u.state || {}); });

  let active = getUserById(activeUserId);
  if (!active) { active = users[0]; activeUserId = active.id; }
  state = active.state;

  users.forEach(u => migrateLegacyState(u.state));
  // تحديث المحتوى قد يحذف تقدّم أبيات لم تعد موجودة: نسخة احتياطية قبل ذلك
  if (contentChanged && usersOk && typeof safetyBackupPush === "function") safetyBackupPush("قبل تحديث المحتوى");
  cleanupOrphanedState();
  users.forEach(u => ensureCurrentStation(u.state));
  saveState();
  if (usersOk && typeof safetyBackupAfterGoodLoad === "function") safetyBackupAfterGoodLoad();
}

/* ============================================================
   7. ترحيل أرقام الأبيات القديمة (v94)
   في v90 قُسّمت المحطة 11 إلى s11a وs11b، والمحطة 12 إلى s12a وs12b وs12c.
   الأبيات نفسها بالترتيب نفسه، فيُحوَّل الرقم القديم بالموضع:
   s11v1..12 → s11av1..12، s11v13..22 → s11bv1..10
   s12v1..11 → s12av1..11، s12v12..18 → s12bv1..7، s12v19..29 → s12cv1..11
   ============================================================ */
const LEGACY_SPLIT = {
  s11: [["s11a", 12], ["s11b", 10]],
  s12: [["s12a", 11], ["s12b", 7], ["s12c", 11]]
};
/* المحطة القديمة + الموضع فيها ← [المحطة الجديدة، الموضع فيها]، أو null إن خرج عن الحد */
function legacySplitPos(oldStation, pos) {
  const parts = LEGACY_SPLIT[oldStation];
  if (!parts) return null;
  let p = Math.max(0, Math.floor(+pos || 0));
  for (const [id, len] of parts) { if (p < len) return [id, p]; p -= len; }
  return null;
}
function legacyVerseId(id) {
  const m = /^s(11|12)v(\d+)$/.exec(String(id));
  if (!m) return id;
  const r = legacySplitPos("s" + m[1], +m[2] - 1);
  return r ? r[0] + "v" + (r[1] + 1) : id;
}
/* يعمل فقط حين يكون المحتوى الحالي هو المحتوى المقسَّم (فيه s11a وليس فيه s11) */
function legacyMigrationApplies() {
  const ids = new Set(content.journeyData.map(s => s.id));
  return ids.has("s11a") && ids.has("s12a") && !ids.has("s11") && !ids.has("s12");
}
const LEGACY_STATION_FIELDS = ["stationStatus", "rewardUnlocked", "versePositions", "stampDates", "charms"];
/* يحوّل حالة طفل قديمة في مكانها، ويُرجع true إن غيّر شيئاً */
function migrateLegacyState(st) {
  if (!st || typeof st !== "object" || !legacyMigrationApplies()) return false;
  const hasOldStations = LEGACY_STATION_FIELDS.some(f => st[f] && typeof st[f] === "object" && ("s11" in st[f] || "s12" in st[f]));
  let raw;
  try { raw = JSON.stringify(st); } catch (e) { return false; }
  const hasOldVerses = /\bs1[12]v\d+\b/.test(raw);
  if (!hasOldStations && !hasOldVerses) return false;

  /* 1) موضع الطفل الحالي (رقم المحطة بالترتيب): القديم s11=10، s12=11، s13=12 */
  if (hasOldStations && typeof st.selectedStation === "number") {
    const oldOrder = ["s11", "s12"];
    const si = st.selectedStation;
    if (si === 10 || si === 11) {
      const r = legacySplitPos(oldOrder[si - 10], st.selectedVerse);
      if (r) {
        st.selectedStation = content.journeyData.findIndex(s => s.id === r[0]);
        st.selectedVerse = r[1];
      }
    } else if (si === 12) {
      st.selectedStation = content.journeyData.findIndex(s => s.id === "s13");
    }
  }

  /* 2) حقول المحطات */
  Object.keys(LEGACY_SPLIT).forEach(old => {
    const parts = LEGACY_SPLIT[old].map(p => p[0]);
    const ss = st.stationStatus || {};
    const status = ss[old];
    const pos = (st.versePositions || {})[old];
    if (status === "completed") {
      parts.forEach(id => { if (ss[id] !== "completed") ss[id] = "completed"; });
    } else if (status === "current") {
      const r = legacySplitPos(old, pos || 0) || [parts[0], 0];
      for (const id of parts) {
        if (id === r[0]) { if (ss[id] !== "completed") ss[id] = "current"; break; }
        ss[id] = "completed";
      }
      st.versePositions = st.versePositions || {};
      st.versePositions[r[0]] = r[1];
    }
    ["rewardUnlocked", "charms", "stampDates"].forEach(f => {
      if (!st[f] || !(old in st[f])) return;
      parts.forEach(id => { if ((ss[id] === "completed") && !(id in st[f])) st[f][id] = st[f][old]; });
    });
    LEGACY_STATION_FIELDS.forEach(f => { if (st[f] && typeof st[f] === "object") delete st[f][old]; });
  });

  /* 3) أرقام الأبيات في كل مكان (مفاتيح وقيم ومفاتيح مركّبة مثل «s11v5::كلمة») */
  try {
    const fixed = JSON.parse(JSON.stringify(st).replace(/\bs(11|12)v(\d+)\b/g, m => legacyVerseId(m)));
    Object.keys(st).forEach(k => delete st[k]);
    Object.assign(st, fixed);
  } catch (e) { return false; }

  /* 4) رقم المحطة داخل الأخطاء */
  Object.values(st.mistakes || {}).forEach(m => {
    if (m && (m.stationId === "s11" || m.stationId === "s12") && typeof m.verseId === "string")
      m.stationId = m.verseId.replace(/v\d+$/, "");
  });
  return true;
}
/* حارس: ما دامت الرحلة لم تكتمل، توجد دائماً محطة حالية يستطيع الطفل أن يبدأها */
function ensureCurrentStation(st) {
  if (!st || !content.journeyData.length) return;
  const ss = st.stationStatus = st.stationStatus || {};
  if (content.journeyData.some(s => ss[s.id] === "current")) return;
  const first = content.journeyData.find(s => ss[s.id] !== "completed");
  if (first) ss[first.id] = "current";
}

/* ============================================================
   8. تنظيف البيانات اليتيمة
   ============================================================ */
function cleanupOrphanedState() {
  const validVerseIds = new Set();
  const validStationIds = new Set();
  content.journeyData.forEach(s => {
    validStationIds.add(s.id);
    s.verses.forEach(v => validVerseIds.add(v.id));
  });
  users.forEach(u => {
    const st = u.state;
    ["stationStatus", "rewardUnlocked", "versePositions", "stampDates", "charms"].forEach(f => {
      if (!st[f] || typeof st[f] !== "object") return;
      Object.keys(st[f]).forEach(id => { if (!validStationIds.has(id)) delete st[f][id]; });
    });
    ["leitner", "storyUnlocked", "meaningSeen", "recEval", "follow", "eventMisses", "masteredNotified", "parentChecks"].forEach(f => {
      if (!st[f] || typeof st[f] !== "object") return;
      // v104: تقييم التسميع المتصل مفتاحه sec:all أو sec:station-N، لا رقم بيت
      Object.keys(st[f]).forEach(id => { if (!validVerseIds.has(id) && !(f === "recEval" && SEC_EVAL_KEY.test(id))) delete st[f][id]; });
    });
    Object.keys(st.mistakes || {}).forEach(key => {
      const m = st.mistakes[key];
      if (!m || !validVerseIds.has(m.verseId)) delete st.mistakes[key];
    });
    Object.keys(st.seenVerses || {}).forEach(id => {
      if (!validVerseIds.has(id)) delete st.seenVerses[id];
    });
    Object.keys(st.verseStats || {}).forEach(id => {
      if (!validVerseIds.has(id)) delete st.verseStats[id];
    });
  });
  saveState();
}
