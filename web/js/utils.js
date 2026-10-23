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
function isSafeId(s) { return typeof s === "string" && /^[A-Za-z0-9_-]{1,60}$/.test(s); }
