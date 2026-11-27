/* المسارات المشتركة لكل الاختبارات (من توصيات مراجعة المطوّر في v113):
   - WEB: مجلد التطبيق، وREPO: جذر المستودع.
   - URL: ما تفتحه اختبارات المتصفح. الافتراضي web/index.html مباشرة، ويُغيَّر بـ HASANIYA_URL
     (البناء الآلي يبني ملفاً واحداً ويمرّر مساره).
   - CHROMIUM: متصفح بعينه إن مُرّر CHROMIUM_PATH، وإلا متصفح Playwright الافتراضي. */
const path = require("path"), url = require("url");
const REPO = path.join(__dirname, "..");
const WEB = path.join(REPO, "web");
const URL = process.env.HASANIYA_URL || url.pathToFileURL(path.join(WEB, "index.html")).href;
const CHROMIUM = process.env.CHROMIUM_PATH || undefined;
module.exports = { REPO, WEB, URL, CHROMIUM, DATA: path.join(__dirname, "data") };
