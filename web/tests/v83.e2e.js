/* اختبار v83: روابط تشغيل التسجيلات تُحرَّر عند الانتهاء والتعذّر والإيقاف، ولا تتراكم */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext()).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/hasaniya-desktop/standalone/hasaniya.html');
  await p.waitForTimeout(800);
  const R = await p.evaluate(async () => {
    const created = [], revoked = [];
    const c = URL.createObjectURL.bind(URL), r = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = b => { const u = c(b); created.push(u); return u; };
    URL.revokeObjectURL = u => { revoked.push(u); return r(u); };
    // 1) تسجيل تالف: يتعذّر تشغيله فيُحرَّر الرابط
    const a1 = blobAudio(new Blob([new Uint8Array(20)], { type: 'audio/mpeg' }));
    a1.play().catch(() => {});
    // 2) تشغيل ثم إيقاف قبل الانتهاء
    const a2 = blobAudio(new Blob([new Uint8Array(20)], { type: 'audio/mpeg' }));
    liveAudios.add(a2); a2.play().catch(() => {});
    await new Promise(res => setTimeout(res, 800));
    audioStopAll();
    await new Promise(res => setTimeout(res, 300));
    URL.createObjectURL = c; URL.revokeObjectURL = r;
    return { created: created.length, revoked: revoked.length, allReleased: created.every(u => revoked.includes(u)) };
  });
  const bad = [];
  if (R.created < 2) bad.push('لم تُنشأ روابط كافية للاختبار');
  if (!R.allReleased) bad.push('بعض روابط التشغيل لم تُحرَّر: ' + JSON.stringify(R));
  if (errs.length) bad.push('أخطاء: ' + errs.join(' | '));
  console.log(JSON.stringify(R));
  console.log(bad.length ? 'FAIL: ' + bad.join(' | ') : 'v83 e2e: كل الفحوص نجحت');
  await b.close(); process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
