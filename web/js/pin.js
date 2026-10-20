/* PIN */
/* الرقم السري: PBKDF2 بملح عشوائي لكل تخزين (صيغة p1)، مع قبول الصيغ القديمة والترقية عند أول دخول ناجح */
const PIN_SALT = "hasaniya_v13_salt_2024";
const PIN_ITER = 200000;
let pinUnavailable = false;

function pinHasWebCrypto() { return !!(window.crypto && crypto.subtle && crypto.getRandomValues); }
function pinB64(bytes) { let s = ""; bytes.forEach(b => { s += String.fromCharCode(b); }); return btoa(s); }
function pinUnb64(str) { const s = atob(str); return Uint8Array.from(s, c => c.charCodeAt(0)); }

async function pinDerive(pin, salt, iter) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, key, 256);
  return new Uint8Array(bits);
}

/* يُرجع null إذا لم يتوفر التشفير في هذا المتصفح، فلا يُحفظ رقم ضعيف بصمت */
async function hashPin(pin) {
  if (!pinHasWebCrypto()) return null;
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const out = await pinDerive(pin, salt, PIN_ITER);
  return "p1:" + PIN_ITER + ":" + pinB64(salt) + ":" + pinB64(out);
}

/* الصيغ القديمة: s2 (SHA-256 بملح ثابت)، f1 (بصمة 32 بت)، h (قبل v13) */
async function pinLegacyHash(pin, kind) {
  if (kind === "s2") {
    if (!pinHasWebCrypto()) return null;
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(PIN_SALT + ":" + pin));
    return "s2:" + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }
  let h = 0;
  const s = kind === "f1" ? PIN_SALT + ":" + pin : pin;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return kind === "f1" ? "f1:" + Math.abs(h).toString(36) : "h" + Math.abs(h).toString(36);
}

async function verifyPin(pin) {
  pinUnavailable = false;
  const h = parentPinHash;
  if (!h) return false;
  if (h.startsWith("p1:")) {
    if (!pinHasWebCrypto()) { pinUnavailable = true; return false; }
    const [, it, salt, want] = h.split(":");
    return pinB64(await pinDerive(pin, pinUnb64(salt), +it)) === want;
  }
  const kind = h.startsWith("s2:") ? "s2" : h.startsWith("f1:") ? "f1" : "h";
  const want = await pinLegacyHash(pin, kind);
  if (want === null) { pinUnavailable = true; return false; }
  if (want !== h) return false;
  const upgraded = await hashPin(pin);
  if (upgraded) { parentPinHash = upgraded; try { localStorage.setItem(STORAGE_PIN, upgraded); } catch(e) {} }
  return true;
}

let pinCallback = null;
let pinMode = "verify";

function hasPin() { return !!parentPinHash; }

/* مدخل الوالدين: رقم سري قبل أي تقرير، ويُطلب ضبطه مرة واحدة مع شرح واضح */
function parentEntry() {
  if (hasPin()) {
    requirePin(showParentScreen, "منطقة الوالدين محمية، أدخل الرقم السري");
    return;
  }
  pinMode = "set";
  pinCallback = showParentScreen;
  showPinModal("👨‍👩‍👧 منطقة الوالدين",
    "اختر رقماً سرياً من 4 إلى 6 أرقام. سيُطلب منك عند كل دخول، ولا يعرفه الطفل. احفظه في مكان آمن.");
}

function requirePin(cb, message) {
  if (!hasPin()) {
    pinMode = "set";
    pinCallback = cb;
    showPinModal("🔐 ضبط الرقم السري", "أدخل رقماً من 4 إلى 6 أرقام لحماية منطقة الوالدين");
    return;
  }
  pinMode = "verify";
  pinCallback = cb;
  showPinModal("🔐 الرقم السري", message || "هذه المنطقة محمية");
}

function showPinModal(title, subtitle) {
  document.getElementById("pinTitle").textContent = title;
  document.getElementById("pinSubtitle").textContent = subtitle;
  document.getElementById("pinInput").value = "";
  document.getElementById("pinConfirm").value = "";
  document.getElementById("pinConfirmWrap").style.display = pinMode === "set" ? "block" : "none";
  document.getElementById("pinError").textContent = "";
  document.getElementById("pinPopup").classList.add("active");
  setTimeout(() => { const i = document.getElementById("pinInput"); if (i) i.focus(); }, 100);
}

/* قفل مؤقت بعد 5 محاولات خاطئة متتالية، يتضاعف حتى 15 دقيقة، ويبقى بعد إعادة التحميل */
const PIN_LOCK_KEY = "hasaniya_pin_lock";
function pinLockState() {
  try { const o = JSON.parse(localStorage.getItem(PIN_LOCK_KEY) || "{}"); return { fails: +o.fails || 0, until: +o.until || 0 }; }
  catch (e) { return { fails: 0, until: 0 }; }
}
function pinLockSave(o) { try { localStorage.setItem(PIN_LOCK_KEY, JSON.stringify(o)); } catch (e) {} }
function pinLockMessage(ms) {
  const s = Math.ceil(ms / 1000), m = Math.floor(s / 60);
  return "محاولات كثيرة خاطئة. حاول بعد " + (m >= 1 ? m + " دقيقة" : s + " ثانية");
}
async function submitPin() {
  const pin = document.getElementById("pinInput").value.trim();
  const confirm = document.getElementById("pinConfirm").value.trim();
  const err = document.getElementById("pinError");

  if (!/^\d{4,6}$/.test(pin)) {
    err.textContent = "الرقم يجب أن يكون من 4 إلى 6 أرقام";
    return;
  }
  if (pinMode === "set") {
    if (pin !== confirm) { err.textContent = "الرقمان غير متطابقان"; return; }
    const nh = await hashPin(pin);
    if (!nh) { err.textContent = "هذا المتصفح لا يدعم حفظ الرقم بأمان. افتح التطبيق من متصفح حديث أو من تطبيق الأندرويد"; return; }
    parentPinHash = nh;
    try { localStorage.setItem(STORAGE_PIN, parentPinHash); } catch(e) {}
    closePopup("pinPopup");
    showToast("تم ضبط الرقم السري", "success");
    updatePinStatus();
    const cb = pinCallback; pinCallback = null;
    if (cb) setTimeout(cb, 200);
    return;
  }
  const lock = pinLockState();
  if (lock.until > Date.now()) { err.textContent = pinLockMessage(lock.until - Date.now()); document.getElementById("pinInput").value = ""; return; }
  const ok = await verifyPin(pin);
  if (ok) pinLockSave({ fails: 0, until: 0 });
  if (!ok && !pinUnavailable) {
    const fails = lock.fails + 1;
    const next = { fails, until: 0 };
    if (fails % 5 === 0) next.until = Date.now() + Math.min(15 * 60000, 60000 * Math.pow(2, fails / 5 - 1));
    pinLockSave(next);
  }
  if (!ok) {
    err.textContent = pinUnavailable
      ? "تعذّر التحقق من الرقم في هذا المتصفح. افتح التطبيق من متصفح حديث أو من تطبيق الأندرويد (لم يُمسح شيء)"
      : "الرقم غير صحيح";
    document.getElementById("pinInput").value = "";
    playFail();
    return;
  }
  closePopup("pinPopup");
  const cb = pinCallback; pinCallback = null;
  if (cb) setTimeout(cb, 100);
}

function cancelPin() {
  pinCallback = null;
  closePopup("pinPopup");
}

function forgotPin() {
  if (!confirm("لا يمكن استرجاع الرقم السري. الحل الوحيد هو حذف كل البيانات وإعادة ضبط التطبيق.\n\nهل تريد المتابعة؟")) return;
  if (users && users.length && confirm("هل تريد تنزيل نسخة احتياطية لتقدّم الأطفال أولاً؟\n(موافق = تنزيل ثم متابعة المسح)")) {
    exportBackup();
  }
  if (!confirm("تأكيد أخير: سيتم مسح كل شيء نهائياً من هذا الجهاز.")) return;
  setTimeout(() => {
    try {
      [STORAGE_CONTENT, STORAGE_USERS, STORAGE_ACTIVE, STORAGE_PIN,
       OLD_V12_CONTENT, OLD_V12_USERS, OLD_V12_ACTIVE, OLD_V12_PIN].forEach(k => localStorage.removeItem(k));
    } catch(e) {}
    location.reload();
  }, 1500);
}

function managePin() {
  updatePinStatus();
  document.getElementById("managePinPopup").classList.add("active");
}

function updatePinStatus() {
  const t = document.getElementById("pinStatusText");
  if (hasPin()) {
    t.textContent = "✅ الرقم السري مُفعَّل. المحرر والتصفير وإدارة المستخدمين محمية.";
    document.getElementById("removePinBtn").style.display = "inline-block";
  } else {
    t.textContent = "⚠️ لا يوجد رقم سري حالياً. المناطق الحساسة غير محمية.";
    document.getElementById("removePinBtn").style.display = "none";
  }
}

function changePin() {
  closePopup("managePinPopup");
  if (!hasPin()) {
    pinMode = "set"; pinCallback = null;
    showPinModal("🔐 ضبط الرقم السري", "أدخل رقماً من 4 إلى 6 أرقام");
    return;
  }
  requirePin(() => {
    setTimeout(() => {
      pinMode = "set"; pinCallback = null;
      showPinModal("🔐 الرقم الجديد", "أدخل الرقم الجديد");
    }, 250);
  }, "أدخل الرقم الحالي أولاً");
}

function removePin() {
  closePopup("managePinPopup");
  if (!hasPin()) { showToast("لا يوجد رقم سري", "error"); return; }
  requirePin(() => {
    if (!confirm("إزالة الرقم السري؟ سيتمكن أي شخص من الوصول للمحرر والتصفير.")) return;
    parentPinHash = null;
    try { localStorage.removeItem(STORAGE_PIN); } catch(e) {}
    showToast("تمت إزالة الرقم السري", "success");
    updatePinStatus();
  }, "أدخل الرقم الحالي");
}
