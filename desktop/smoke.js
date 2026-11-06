/* يتحقق أن نسخة سطح المكتب تفتح التطبيق فعلاً (عبر منفذ أدوات المطوّر): المحطات، وسياق آمن للميكروفون،
   وساعة الجهاز الداخلية (preload.js) في النافذة الرئيسية لمدة انتظار إلغاء الرقم السري */
const { chromium } = require('playwright');
(async () => {
  let b;
  for (let i = 0; i < 20 && !b; i++) { try { b = await chromium.connectOverCDP('http://127.0.0.1:9333'); } catch (e) { await new Promise(r => setTimeout(r, 1000)); } }
  if (!b) { console.log('::error::نسخة سطح المكتب لم تفتح'); process.exit(1); }
  const p = b.contexts().flatMap(c => c.pages())[0];
  await p.waitForFunction(() => typeof content !== 'undefined' && content.journeyData.length > 0, null, { timeout: 20000 }).catch(() => {});
  const r = await p.evaluate(() => {
    const o = { url: location.protocol, stations: typeof content !== 'undefined' ? content.journeyData.length : 0, secure: isSecureContext, scenes: typeof SCENES !== 'undefined' ? Object.keys(SCENES).length : 0 };
    o.clockFn = window.HasaniyaDesktop ? typeof window.HasaniyaDesktop.clockInfo : 'missing';
    try { const c = JSON.parse(window.HasaniyaDesktop.clockInfo()); o.mono = c.mono; o.boot = c.boot; } catch (e) { o.clockErr = e.message; }
    o.node = typeof window.require + '/' + typeof window.process;   // لا يُكشف شيء من Node للصفحة
    return o;
  }).catch(e => ({ err: e.message }));
  console.log(JSON.stringify(r));
  const clockOk = r.clockFn === 'function' && typeof r.mono === 'number' && Number.isFinite(r.mono) && r.mono > 0 && r.boot === -1;
  const ok = r.stations === 16 && r.secure && r.scenes > 0 && clockOk && r.node === 'undefined/undefined';
  console.log(ok ? '::notice::نسخة لينكس تعمل: 16 محطة، وساعة الجهاز الداخلية متاحة'
    : '::error::نسخة لينكس لا تعمل' + (r.stations === 16 && !clockOk ? ' (ساعة الجهاز الداخلية HasaniyaDesktop.clockInfo غير متاحة: preload.js)' : '') + ': ' + JSON.stringify(r));
  process.exit(ok ? 0 : 1);
})();
