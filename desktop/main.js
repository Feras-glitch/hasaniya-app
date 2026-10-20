/* تشغيل مستقل: نافذة واحدة تفتح ملفات التطبيق من القرص مباشرة، بلا خادم ولا متصفح خارجي */
const { app, BrowserWindow, session, Menu } = require("electron");
const path = require("path");

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
  // التسجيل الصوتي فقط مسموح، وكل طلب آخر (موقع، إشعارات...) مرفوض
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => {
    callback(permission === "media");
  });
  win.loadFile(path.join(__dirname, "app", "index.html"));
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
