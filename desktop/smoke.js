/* يتحقق أن نسخة سطح المكتب تفتح التطبيق فعلاً (عبر منفذ أدوات المطوّر): المحطات، وسياق آمن للميكروفون */
const { chromium } = require('playwright');
(async () => {
  let b;
  for (let i = 0; i < 20 && !b; i++) { try { b = await chromium.connectOverCDP('http://127.0.0.1:9333'); } catch (e) { await new Promise(r => setTimeout(r, 1000)); } }
  if (!b) { console.log('::error::نسخة سطح المكتب لم تفتح'); process.exit(1); }
  const p = b.contexts().flatMap(c => c.pages())[0];
  await p.waitForFunction(() => typeof content !== 'undefined' && content.journeyData.length > 0, null, { timeout: 20000 }).catch(() => {});
  const r = await p.evaluate(() => ({ url: location.protocol, stations: typeof content !== 'undefined' ? content.journeyData.length : 0, secure: isSecureContext, scenes: typeof SCENES !== 'undefined' ? Object.keys(SCENES).length : 0 })).catch(e => ({ err: e.message }));
  console.log(JSON.stringify(r));
  const ok = r.stations === 16 && r.secure && r.scenes > 0;
  console.log(ok ? '::notice::نسخة لينكس تعمل: 16 محطة' : '::error::نسخة لينكس لا تعمل: ' + JSON.stringify(r));
  process.exit(ok ? 0 : 1);
})();
