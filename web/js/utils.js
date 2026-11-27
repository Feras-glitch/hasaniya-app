/* أدوات مساعدة */
function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])
  );
}
/* نص يوضع داخل سلسلة JavaScript في خاصية HTML، مثل onclick="fn('…')".
   v103: يُهرَّب للـJavaScript أولاً (الشرطة المائلة والفاصلة العليا والأسطر)، ثم للـHTML (& أولاً)،
   لأن المتصفح يفكّ ترميز HTML قبل تنفيذ الكود؛ فلا يكسر نصٌّ مستورد الكودَ ولا يحقن فيه */
function escapeForAttr(s) {
  return String(s == null ? "" : s)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
/* معرّف آمن (طفل، بيت، محطة): حروف وأرقام وشرطة فقط */
/* v104: العدد والمعدود بالعربية: 1 بيت واحد، 2 بيتان، 3–10 أبيات، 11–99 بيتاً، 100 بيت، 103 أبيات، 161 بيتاً.
   الحكم لآخر رقمين (n % 100)؛ والمئة وما يليها مباشرة (100، 101، 102) وكذلك الصفر بالمفرد بلا تنوين */
function arCount(n, one, two, few, many) {
  n = Math.floor(+n || 0);
  if (n === 1) return one;
  if (n === 2) return two;
  const r = n % 100;
  if (r >= 3 && r <= 10) return n + " " + few;
  if (r >= 11) return n + " " + many;
  return n + " " + String(many).replace(/اً|ً/g, "");
}
function isSafeId(s) { return typeof s === "string" && /^[A-Za-z0-9_-]{1,60}$/.test(s); }
/* v114: اسم الطفل في أسماء الملفات المصدَّرة، بلا محارف تمنعها أنظمة الملفات */
function safeFileName(s) { return String(s || "").replace(/[\\/:*?"<>|\s.]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "طفل"; }
/* v114: نقاط الخريطة المتقاربة (مكة وحراء وثور والعقبة) تُباعَد مع خط إلى موضعها الحقيقي،
   والاسم لا يُكتب إلا حيث لا يتراكب؛ والرقم في الدائرة يدلّ على السطر في القائمة تحت الخريطة */
function mapSpread(pts, minD, W, H) {
  const placed = [];
  pts.forEach(p => {
    let ax = p.x, ay = p.y, k = 0;
    while (placed.some(q => Math.hypot(q.ax - ax, q.ay - ay) < minD) && k < 60) {
      k++; const ang = k * 2.39996, r = minD * (0.7 + k * 0.16);
      ax = Math.max(14, Math.min(W - 14, p.x + Math.cos(ang) * r)); ay = Math.max(14, Math.min(H - 30, p.y + Math.sin(ang) * r));
    }
    p.ax = ax; p.ay = ay; p.moved = Math.hypot(ax - p.x, ay - p.y) > 2; placed.push(p);
  });
  const labels = [];
  pts.forEach(p => {
    const lx = p.ax, ly = p.ay + 26;
    p.showLabel = !labels.some(q => Math.abs(q.x - lx) < 48 && Math.abs(q.y - ly) < 13) && !pts.some(q => q !== p && Math.abs(q.ax - lx) < 15 && Math.abs(q.ay - ly) < 15);
    if (p.showLabel) labels.push({ x: lx, y: ly });
  });
  return pts;
}

/* v114: سجلّ آخر 20 خطأ على هذا الجهاز (بلا شبكة)، يراه الوالد في منطقة الوالدين ويرسله إن طُلب منه.
   كانت الأخطاء على جهاز الطفل لا يراها أحد */
const ERROR_LOG_KEY = "hasaniya_error_log";
function errorLogAdd(msg, where) {
  try {
    const a = JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || "[]");
    const m = String(msg || "").slice(0, 300);
    const last = a[a.length - 1];
    if (last && last.m === m) { last.n = (last.n || 1) + 1; last.at = Date.now(); }
    else a.push({ at: Date.now(), m, w: String(where || "").slice(0, 120), v: typeof APP_VERSION !== "undefined" ? APP_VERSION : "" });
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(a.slice(-20)));
  } catch (e) {}
}
function errorLogGet() { try { const a = JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function errorLogClear() { try { localStorage.removeItem(ERROR_LOG_KEY); } catch (e) {} }
if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("error", e => errorLogAdd(e && (e.message || (e.error && e.error.message)), e && e.filename ? `${String(e.filename).split("/").pop()}:${e.lineno}` : ""));
  window.addEventListener("unhandledrejection", e => errorLogAdd(e && e.reason && (e.reason.message || e.reason), "promise"));
}
