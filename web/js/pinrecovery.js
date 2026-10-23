/* ============================================================
   استرجاع الرقم السري (v103) — يعمل بلا إنترنت:
   - عند ضبط الرقم يُطلب بريد ولي الأمر، ويُصنع «شفرة استرجاع» من 8 خانات.
   - يُفتح تطبيق البريد برسالة جاهزة تحوي الشفرة، فيرسلها الوالد إلى نفسه فتبقى في بريده.
   - التطبيق لا يحتفظ بالشفرة، بل ببصمتها المشفّرة فقط (مثل الرقم السري).
   - عند النسيان: تُكتب الشفرة فيُضبط رقم جديد، ولا يُمسح شيء.
   - إن ضاعت الشفرة: يُلغى الرقم بعد 48 ساعة، مع لافتة ظاهرة طوال المدة يلغيها الوالد بالرقم.
     وتُحسب المدة على أندرويد بساعة الجهاز الداخلية (منذ التشغيل) فلا يختصرها تغيير التاريخ،
     وأي إدخال صحيح للرقم يُلغي الطلب. وفي المتصفح تُحسب بالتاريخ، وكل فجوة لا تُحسب بأكثر من يوم.
   - الشفرة تُستعمل مرة واحدة، ثم تُصنع غيرها.
   ============================================================ */
const PINREC_KEY = "hasaniya_pin_recovery";
const PINREC_RESET_KEY = "hasaniya_pin_reset";
const PINREC_SNOOZE_KEY = "hasaniya_pin_rec_snooze";
const PINREC_LOCK_KEY = "hasaniya_pinrec_lock";
const PINREC_WAIT_MS = 48 * 3600 * 1000;
const PINREC_MAX_GAP = 24 * 3600 * 1000;
const PINREC_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // بلا 0 وO و1 وI حتى لا تلتبس
const PINREC_SUBJECT = "شفرة استرجاع الرقم السري — المنظومة الحسنية";

/* الرقم المحفوظ على الجهاز نفسه (لا يعتمد على ترتيب تحميل الملفات) */
function pinRecPinStored() { try { return !!localStorage.getItem(STORAGE_PIN); } catch (e) { return false; } }
function pinRecLoad(key) { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; } }
function pinRecSave(key, o) { try { if (o == null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(o)); } catch (e) {} }
function pinRecInfo() { const o = pinRecLoad(PINREC_KEY); return o && typeof o.hash === "string" && o.hash.startsWith("p1:") && o.confirmed !== false ? o : null; }
function hasPinRecovery() { return !!pinRecInfo(); }

function pinRecValidEmail(e) { return /^[A-Za-z0-9._+-]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(String(e || "").trim()); }
function pinRecMaskEmail(e) {
  const [u, d] = String(e || "").split("@");
  if (!d) return "";
  return (u.length <= 2 ? u[0] + "*" : u.slice(0, 2) + "*".repeat(Math.min(6, u.length - 2))) + "@" + d;
}
/* الشفرة: 8 خانات عشوائية تُعرض «ABCD-EFGH» */
function pinRecNewCode() {
  const b = new Uint8Array(8); crypto.getRandomValues(b);
  const s = Array.from(b, x => PINREC_ALPHABET[x % PINREC_ALPHABET.length]).join("");
  return s.slice(0, 4) + "-" + s.slice(4);
}
/* ما يكتبه الوالد: حروف صغيرة أو أرقام عربية أو مسافات وشرطات كلها مقبولة */
function pinRecNormalize(s) {
  return String(s || "").replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x660)).toUpperCase().replace(/[^A-Z0-9]/g, "");
}
async function pinRecVerifyCode(code) {
  const info = pinRecInfo();
  if (!info || !pinHasWebCrypto()) return false;
  const [, it, salt, want] = info.hash.split(":");
  return pinB64(await pinDerive(pinRecNormalize(code), pinUnb64(salt), +it)) === want;
}

/* ---------- فتح تطبيق البريد برسالة جاهزة ---------- */
function pinRecMailBody(code) {
  return [
    "السلام عليكم،",
    "",
    "هذه شفرة استرجاع الرقم السري لتطبيق «المنظومة الحسنية»:",
    "",
    "    " + code,
    "",
    "احفظ هذه الرسالة. إذا نسيت الرقم السري:",
    "1) افتح منطقة الوالدين في التطبيق.",
    "2) اضغط «نسيت الرقم؟».",
    "3) اكتب هذه الشفرة، ثم اختر رقماً سرياً جديداً.",
    "",
    "لا يُمسح شيء من تقدّم الأطفال عند الاسترجاع.",
    "تاريخ الإنشاء: " + new Date().toLocaleDateString("ar-EG")
  ].join("\n");
}
function pinRecOpenMail(email, code) {
  const body = pinRecMailBody(code);
  try {
    if (window.AndroidBridge && typeof AndroidBridge.sendEmail === "function") { AndroidBridge.sendEmail(email, PINREC_SUBJECT, body); return true; }
  } catch (e) {}
  const url = "mailto:" + email + "?subject=" + encodeURIComponent(PINREC_SUBJECT) + "&body=" + encodeURIComponent(body);
  try { location.href = url; return true; } catch (e) { return false; }
}

/* ---------- النافذة ---------- */
let pinRecAfter = null;      // ما يُنفَّذ بعد إغلاق نافذة الإعداد
let pinRecShownCode = null;  // الشفرة الظاهرة الآن فقط (لا تُحفظ)
let pinRecPending = null;    // بصمة الشفرة الجديدة: لا تحلّ محل القديمة إلا بعد «تم»
let pinRecGen = 0;           // يتغيّر مع كل فتح وإغلاق، فلا يُكمل تحقّقٌ بدأ في نافذة أُغلقت
function pinRecOpen(html) {
  pinRecGen++;
  document.getElementById("pinRecBody").innerHTML = html;
  document.getElementById("pinRecPopup").classList.add("active");
}
function pinRecClose() {
  pinRecGen++;
  pinRecShownCode = null; pinRecPending = null;
  closePopup("pinRecPopup");
  const cb = pinRecAfter; pinRecAfter = null;
  if (cb) setTimeout(cb, 100);
}

/* ١) إعداد الشفرة: بعد ضبط الرقم، أو من «إدارة الرقم السري»، أو عرضاً لمن عنده رقم قديم */
function pinRecSetup(after) {
  if (!hasPin()) { if (after) after(); return; }
  pinRecAfter = after || null;
  const old = pinRecLoad(PINREC_KEY);
  pinRecOpen(`
    <h2 style="color:var(--parent-border);margin-top:0">🔑 شفرة استرجاع الرقم السري</h2>
    <p class="pinrec-p">إذا نسيت الرقم السري يوماً، تفتحه بهذه الشفرة دون أن يضيع شيء من تقدّم الأطفال.</p>
    <p class="pinrec-p">نصنع الشفرة هنا، ثم نفتح تطبيق البريد برسالة جاهزة، فتضغط «إرسال» لتبقى الشفرة محفوظة في بريدك.</p>
    <p class="pinrec-note">إن كان الطفل يستعمل هذا الجهاز: أرسلها إلى بريد غير مفتوح عليه، أو احذف الرسالة من «المرسَل» بعد إرسالها، أو اكتبها في ورقة.</p>
    <input id="pinRecEmail" class="ask-input" type="email" inputmode="email" dir="ltr" autocomplete="email" placeholder="بريد ولي الأمر" value="${escapeHtml(old && old.email ? old.email : "")}">
    <div id="pinRecErr" class="pinrec-err"></div>
    <div class="pinrec-btns">
      <button class="action-btn btn-success" onclick="pinRecCreate()">إنشاء الشفرة</button>
      <button class="action-btn btn-gray" onclick="pinRecLater()">لاحقاً</button>
    </div>`);
}
function pinRecLater() {
  pinRecSave(PINREC_SNOOZE_KEY, { until: Date.now() + 7 * 86400000 });
  pinRecClose();
}
async function pinRecCreate() {
  const email = (document.getElementById("pinRecEmail").value || "").trim();
  const err = document.getElementById("pinRecErr");
  if (!pinRecValidEmail(email)) { err.textContent = "اكتب بريداً صحيحاً، مثل: name@gmail.com"; return; }
  if (!pinHasWebCrypto()) { err.textContent = "هذا المتصفح لا يدعم الحفظ الآمن. افتح التطبيق من تطبيق الأندرويد أو متصفح حديث"; return; }
  const code = pinRecNewCode();
  const hash = await hashPin(pinRecNormalize(code));
  if (!hash) { err.textContent = "تعذّر إنشاء الشفرة"; return; }
  // الشفرة القديمة تبقى صالحة حتى يضغط الوالد «تم»؛ ويُحفظ البريد وحده إن لم تكن شفرة قبلها
  if (!pinRecInfo()) pinRecSave(PINREC_KEY, { email });
  pinRecOpen(`
    <h2 style="color:var(--parent-border);margin-top:0">🔑 هذه شفرتك</h2>
    <div class="pinrec-code" dir="ltr">${escapeHtml(code)}</div>
    <p class="pinrec-p">اضغط «فتح البريد» ثم «إرسال»، لتصلك الشفرة على:</p>
    <p class="pinrec-p" dir="ltr" style="text-align:center;font-weight:bold">${escapeHtml(email)}</p>
    <div class="pinrec-btns">
      <button class="action-btn btn-info" onclick="pinRecMailNow()">📧 فتح البريد</button>
      <button class="action-btn btn-gray" onclick="pinRecCopy()">📋 نسخ الشفرة</button>
    </div>
    <p class="pinrec-note">لا يحتفظ التطبيق بالشفرة نفسها، ولن تظهر مرة أخرى. إن لم يفتح البريد فاكتبها في ورقة واحفظها بعيداً عن الطفل.</p>
    <label class="pinrec-check"><input type="checkbox" id="pinRecSaved" onchange="document.getElementById('pinRecDone').disabled=!this.checked"> أرسلتُها إلى بريدي أو حفظتُها</label>
    <button class="action-btn btn-success" id="pinRecDone" disabled style="width:100%;margin-top:8px" onclick="pinRecConfirm()">تم</button>`);
  pinRecShownCode = code;
  pinRecPending = { email, hash };
}
function pinRecMailNow() {
  if (!pinRecPending || !pinRecShownCode) return;
  if (!pinRecOpenMail(pinRecPending.email, pinRecShownCode)) showToast("تعذّر فتح البريد. انسخ الشفرة واحفظها بنفسك", "error");
}
function pinRecCopy() {
  if (!pinRecShownCode) return;
  const ok = () => showToast("نُسخت الشفرة", "success");
  try { navigator.clipboard.writeText(pinRecShownCode).then(ok, () => showToast("انسخها يدوياً من الشاشة", "error")); }
  catch (e) { showToast("انسخها يدوياً من الشاشة", "error"); }
}
function pinRecConfirm() {
  if (!pinRecPending) return;
  pinRecSave(PINREC_KEY, { v: 1, email: pinRecPending.email, hash: pinRecPending.hash, at: Date.now(), confirmed: true });
  pinRecSave(PINREC_SNOOZE_KEY, null);
  showToast("حُفظت شفرة الاسترجاع", "success");
  pinRecClose();
  if (typeof updatePinStatus === "function") updatePinStatus();
}

/* يُعرض على من عنده رقم سري ولا شفرة له (مثلاً بعد التحديث)، مرة كل أسبوع إن اختار «لاحقاً» */
function pinRecMaybeOffer(after) {
  if (!hasPin() || hasPinRecovery()) return false;
  const sn = pinRecLoad(PINREC_SNOOZE_KEY);
  if (sn && +sn.until > Date.now()) return false;
  pinRecSetup(after);
  return true;
}

/* ٢) نسيت الرقم؟ */
let pinRecPendingCb = null;
function forgotPin() {
  pinRecPendingCb = pinCallback;
  closePopup("pinPopup");
  const info = pinRecInfo();
  if (!info) return pinRecWaitScreen(true);
  pinRecOpen(`
    <h2 style="color:var(--parent-border);margin-top:0">🔑 نسيت الرقم السري؟</h2>
    <p class="pinrec-p">اكتب شفرة الاسترجاع التي أرسلتها إلى بريدك:</p>
    <p class="pinrec-p" dir="ltr" style="text-align:center;font-weight:bold">${escapeHtml(pinRecMaskEmail(info.email))}</p>
    <input id="pinRecCode" class="ask-input pinrec-input" dir="ltr" autocapitalize="characters" autocomplete="off" placeholder="XXXX-XXXX" maxlength="12" onkeydown="if(event.key==='Enter')pinRecCheck()">
    <div id="pinRecErr" class="pinrec-err"></div>
    <div class="pinrec-btns">
      <button class="action-btn btn-success" onclick="pinRecCheck()">تحقّق</button>
      <button class="action-btn btn-gray" onclick="pinRecCancel()">إلغاء</button>
    </div>
    <button class="pinrec-link" onclick="pinRecWaitScreen(false)">لا أجد الشفرة</button>`);
  setTimeout(() => { const i = document.getElementById("pinRecCode"); if (i) i.focus(); }, 100);
}
function pinRecCancel() { pinRecPendingCb = null; pinRecClose(); }

function pinRecLockState() { const o = pinRecLoad(PINREC_LOCK_KEY) || {}; return { fails: +o.fails || 0, until: +o.until || 0 }; }
let pinRecBusy = false;
async function pinRecCheck() {
  if (pinRecBusy) return;
  pinRecBusy = true;
  try {
    const err = document.getElementById("pinRecErr");
    const input = document.getElementById("pinRecCode");
    const lock = pinRecLockState();
    if (lock.until > Date.now()) { err.textContent = pinLockMessage(lock.until - Date.now()); return; }
    if (pinRecNormalize(input.value).length !== 8) { err.textContent = "الشفرة 8 خانات (حروف إنجليزية وأرقام)"; return; }
    const gen = pinRecGen;
    const ok = await pinRecVerifyCode(input.value);
    // أُغلقت النافذة أثناء التحقق: لا شيء
    if (gen !== pinRecGen || !document.getElementById("pinRecPopup").classList.contains("active")) return;
    if (!ok) {
      const fails = pinRecLockState().fails + 1;
      const next = { fails, until: 0 };
      if (fails % 5 === 0) next.until = Date.now() + Math.min(60 * 60000, 60000 * Math.pow(2, fails / 5 - 1));
      pinRecSave(PINREC_LOCK_KEY, next);
      err.textContent = "الشفرة غير صحيحة";
      input.value = "";
      return;
    }
    pinRecSave(PINREC_LOCK_KEY, null);
    pinLockSave({ fails: 0, until: 0 });
    pinRecClearReset();
    // الشفرة تُستعمل مرة واحدة: بعد ضبط الرقم الجديد تُعرض شفرة جديدة
    const info = pinRecLoad(PINREC_KEY);
    pinRecSave(PINREC_KEY, info && info.email ? { email: info.email } : null);
    pinRecSave(PINREC_SNOOZE_KEY, null);
    pinRecGen++;
    closePopup("pinRecPopup");
    const cb = pinRecPendingCb; pinRecPendingCb = null;
    pinMode = "set"; pinCallback = cb;
    setTimeout(() => showPinModal("🔐 رقم سري جديد", "الشفرة صحيحة ✅ اختر الآن رقماً سرياً جديداً من 4 إلى 6 أرقام. لم يُمسح شيء، وبعدها نصنع لك شفرة جديدة لأن هذه استُعملت."), 150);
  } finally { pinRecBusy = false; }
}

/* ٣) لا شفرة: الانتظار 48 ساعة مع لافتة ظاهرة.
   الطلب يحفظ «الوقت المحسوب» لا تاريخ الانتهاء: على أندرويد من ساعة الجهاز الداخلية (منذ التشغيل)،
   فلا يختصره تغيير التاريخ؛ وفي المتصفح من التاريخ مع حد أقصى لكل فجوة، ورجوع التاريخ لا يُحسب */
function pinRecClock() {
  try {
    if (window.AndroidBridge && typeof AndroidBridge.clockInfo === "function") {
      const o = JSON.parse(AndroidBridge.clockInfo());
      if (o && Number.isFinite(+o.mono)) return { mono: +o.mono, boot: Number.isFinite(+o.boot) ? +o.boot : -1, wall: Date.now() };
    }
  } catch (e) {}
  return { mono: null, boot: -1, wall: Date.now() };
}
function pinRecResetState() {
  const o = pinRecLoad(PINREC_RESET_KEY);
  if (!o || typeof o !== "object") return null;
  if (!Number.isFinite(+o.credit)) { o.credit = 0; o.last = pinRecClock(); }   // صيغة أولى (at/until)
  return o;
}
/* يضيف إلى الطلب ما مضى منذ آخر مرة، ويحفظه */
function pinRecAccrue(req) {
  const now = pinRecClock(), last = req.last || now;
  let add = 0;
  if (now.mono != null && last.mono != null) {
    const sameBoot = now.boot >= 0 && last.boot >= 0 ? now.boot === last.boot : now.mono >= last.mono;
    add = sameBoot ? now.mono - last.mono : now.mono;   // بعد إعادة التشغيل: ما مضى منذ التشغيل فقط
  } else {
    const d = now.wall - (last.wall || now.wall);
    add = d > 0 ? Math.min(d, PINREC_MAX_GAP) : 0;
  }
  req.credit = Math.max(0, +req.credit || 0) + Math.max(0, add);
  req.last = now;
  pinRecSave(PINREC_RESET_KEY, req);
  return req;
}
function pinRecHoursLeft(o) { return Math.max(1, Math.ceil((PINREC_WAIT_MS - (+o.credit || 0)) / 3600000)); }
/* أي دليل على معرفة الرقم (إدخاله صحيحاً أو ضبط رقم جديد) يُلغي طلب الانتظار */
function pinRecClearReset() {
  if (!pinRecLoad(PINREC_RESET_KEY)) return;
  pinRecSave(PINREC_RESET_KEY, null);
  pinRecRenderBanner();
}
function pinRecWaitScreen(noCode) {
  const req = pinRecResetState();
  if (req) {
    pinRecOpen(`
      <h2 style="color:var(--parent-border);margin-top:0">⏳ الطلب قائم</h2>
      <p class="pinrec-p">سيُلغى الرقم السري بعد نحو ${pinRecHoursLeft(req)} ساعة. بعدها تدخل منطقة الوالدين وتضبط رقماً جديداً.</p>
      <p class="pinrec-note">لا يُمسح شيء من تقدّم الأطفال ولا تسجيلاتهم.</p>
      <button class="action-btn btn-gray" style="width:100%" onclick="pinRecCancel()">حسناً</button>`);
    return;
  }
  pinRecOpen(`
    <h2 style="color:var(--parent-border);margin-top:0">⏳ فتح بالانتظار</h2>
    ${noCode ? `<p class="pinrec-p">لم تُنشأ شفرة استرجاع على هذا الجهاز.</p>` : ""}
    <p class="pinrec-p">يمكن إلغاء الرقم السري بعد <strong>48 ساعة</strong> من الآن. طوال هذه المدة تظهر لافتة في أعلى الشاشة، فإن لم يكن الطلب منك تلغيه بالرقم السري.</p>
    <p class="pinrec-note">لا يُمسح شيء من تقدّم الأطفال ولا تسجيلاتهم.</p>
    <div class="pinrec-btns">
      <button class="action-btn btn-danger" onclick="pinRecStartWait()">ابدأ الانتظار</button>
      <button class="action-btn btn-gray" onclick="pinRecCancel()">إلغاء</button>
    </div>`);
}
function pinRecStartWait() {
  pinRecSave(PINREC_RESET_KEY, { at: Date.now(), credit: 0, last: pinRecClock() });
  pinRecPendingCb = null;
  pinRecClose();
  pinRecRenderBanner();
  showToast("بدأ الانتظار: يُلغى الرقم السري بعد 48 ساعة", "success");
}
/* إلغاء الطلب يحتاج الرقم السري: فإن كان الطفل هو من بدأه يلغيه الوالد */
function pinRecCancelWait() {
  requirePin(() => {
    pinRecClearReset();
    showToast("أُلغي طلب إلغاء الرقم السري", "success");
  }, "أدخل الرقم السري لإلغاء الطلب");
}
/* عند انتهاء المدة: يُلغى الرقم وحده، وتبقى البيانات كلها، وتبقى شفرة البريد صالحة إن وُجدت */
function pinRecTick() {
  let req = pinRecResetState();
  if (!req) return;
  if (!pinRecPinStored()) { pinRecSave(PINREC_RESET_KEY, null); pinRecRenderBanner(); return; }
  req = pinRecAccrue(req);
  if (req.credit >= PINREC_WAIT_MS) {
    parentPinHash = null;
    try { localStorage.removeItem(STORAGE_PIN); } catch (e) {}
    pinLockSave({ fails: 0, until: 0 });
    pinRecSave(PINREC_RESET_KEY, null);
    pinRecRenderBanner();
    if (typeof updatePinStatus === "function") updatePinStatus();
    showToast("انتهت مدة الانتظار وأُلغي الرقم السري. اضبط رقماً جديداً من منطقة الوالدين", "success");
    return;
  }
  pinRecRenderBanner();
}
function pinRecRenderBanner() {
  let el = document.getElementById("pinResetBanner");
  const req = pinRecPinStored() ? pinRecResetState() : null;
  if (!req) { if (el) el.remove(); document.body.classList.remove("has-pin-banner"); return; }
  if (!el) {
    el = document.createElement("div");
    el.id = "pinResetBanner"; el.className = "pin-reset-banner"; el.setAttribute("role", "status");
    (document.querySelector(".app-container") || document.body).prepend(el);
  }
  el.innerHTML = `<span>⏳ طُلب إلغاء الرقم السري، ويُلغى بعد نحو ${pinRecHoursLeft(req)} ساعة.</span>
    <button class="tool-btn" onclick="pinRecCancelWait()">إلغاء الطلب</button>`;
  document.body.classList.add("has-pin-banner");
}

/* إزالة الرقم السري تُزيل معه الشفرة وطلب الانتظار (يُحتفظ بالبريد ليُقترح لاحقاً) */
function pinRecForget() {
  const info = pinRecLoad(PINREC_KEY);
  pinRecSave(PINREC_KEY, info && info.email ? { email: info.email } : null);
  pinRecSave(PINREC_RESET_KEY, null);
  pinRecRenderBanner();
}

document.addEventListener("DOMContentLoaded", () => {
  pinRecTick();
  setInterval(pinRecTick, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) pinRecTick(); });
});
