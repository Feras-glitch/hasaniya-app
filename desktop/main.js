/* تشغيل مستقل: نافذة واحدة تفتح ملفات التطبيق من القرص مباشرة، بلا خادم ولا متصفح خارجي */
const { app, BrowserWindow, session, Menu, shell } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");

const APP_DIR = path.join(__dirname, "app");
const APP_URL = pathToFileURL(APP_DIR + path.sep).href;
// يُسمح فقط بملفات التطبيق نفسه
const isAppUrl = u => typeof u === "string" && u.startsWith(APP_URL);

function createWindow() {
  Menu.setApplicationMenu(null);
  const win = new BrowserWindow({
    width: 430,
    height: 920,
    minWidth: 320,
    minHeight: 560,
    title: "المنظومة الحسنية",
    backgroundColor: "#fdf6e3",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  // الميكروفون ونسخ النص (شفرة الاسترجاع) فقط، ولصفحات التطبيق فقط؛ وكل طلب آخر (موقع، إشعارات...) مرفوض
  const ALLOWED = ["media", "clipboard-sanitized-write"];
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => {
    const from = (details && details.requestingUrl) || (wc && wc.getURL()) || "";
    callback(ALLOWED.includes(permission) && isAppUrl(from));
  });
  session.defaultSession.setPermissionCheckHandler((wc, permission, origin, details) => {
    const from = (details && details.requestingUrl) || (wc && wc.getURL()) || "";
    return ALLOWED.includes(permission) && isAppUrl(from);
  });
  win.loadFile(path.join(APP_DIR, "index.html"));
}

// رسالة البريد الجاهزة (شفرة استرجاع الرقم السري) تُفتح في تطبيق البريد، ولا شيء غيرها
const MAILTO_RE = /^mailto:[A-Za-z0-9._+-]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\?subject=[^\s&]*&body=[^\s&]*$/;
function openMail(url) { if (typeof url === "string" && url.length < 4000 && MAILTO_RE.test(url)) shell.openExternal(url).catch(() => {}); }

// لا يُفتح أي رابط خارجي: التطبيق يعمل بلا اتصال.
// النافذة الفارغة وحدها مسموحة (نافذة الطباعة: البطاقات والتقرير والشهادة)
app.on("web-contents-created", (e, wc) => {
  wc.on("will-navigate", (ev, url) => { if (!isAppUrl(url)) { ev.preventDefault(); if (url.startsWith("mailto:")) openMail(url); } });
  wc.on("will-redirect", (ev, url) => { if (!isAppUrl(url)) ev.preventDefault(); });
  wc.on("will-attach-webview", ev => ev.preventDefault());
  wc.setWindowOpenHandler(({ url }) => {
    if (!url || url === "about:blank")
      return { action: "allow", overrideBrowserWindowOptions: { autoHideMenuBar: true, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } } };
    if (url.startsWith("mailto:")) openMail(url);
    return { action: "deny" };
  });
});
// نسخة واحدة فقط: نسختان معاً لا تتشاركان الحفظ فيضيع تقدّم إحداهما؛ فتح الثانية يُظهر الأولى
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
  });
  app.whenReady().then(createWindow);
}
app.on("window-all-closed", () => app.quit());
