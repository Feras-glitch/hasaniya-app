/* اختبار v70: توقيع الوالد، رمز التحقق وسجل الشهادات، وبطل الأسبوع */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 390, height: 780 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file:///home/claude/hasaniya-desktop/standalone/hasaniya.html');
  await p.waitForTimeout(800);
  const R = {};
  // 1) رمز التحقق ثابت لنفس الطفل والمحطة واليوم، ومكوّن من 8 خانات بشرطة
  R.codeShape = await p.evaluate(() => /^[0-9A-F]{4}-[0-9A-F]{4}$/.test(certCode('a', 'b', 'c')));
  R.codeStable = await p.evaluate(() => certCode('سارة', 'الأبواء', '2026-10-13', '1') === certCode('سارة', 'الأبواء', '2026-10-13', '1'));
  R.codeDiffers = await p.evaluate(() => certCode('سارة', 'الأبواء', '2026-10-13', '1') !== certCode('سارة', 'بدر', '2026-10-13', '1'));
  // 2) إصدار الشهادة يسجّلها مرة واحدة في اليوم نفسه، ويظهر السجل والتحقق
  R.issuedTwice = await p.evaluate(() => {
    const st = { title: 'الأبواء' };
    const a = issueCert(st), b2 = issueCert(st);
    return { same: a.code === b2.code, count: state.certs.length };
  });
  await p.evaluate(() => showCertLog());
  R.logRows = await p.evaluate(() => document.querySelectorAll('#hubBody .hub-row').length);
  await p.evaluate(() => { document.getElementById('certVerifyInput').value = state.certs[0].code.toLowerCase(); verifyCertCode(); });
  R.verifyHit = await p.evaluate(() => document.getElementById('certVerifyResult').textContent.startsWith('✅'));
  await p.evaluate(() => { document.getElementById('certVerifyInput').value = 'FFFF-0000'; verifyCertCode(); });
  R.verifyMiss = await p.evaluate(() => document.getElementById('certVerifyResult').textContent.startsWith('❌'));
  // 3) توقيع الوالد: يُحفظ على المستخدم ويظهر في الشهادة
  await p.evaluate(() => openSignature());
  R.sigBlankRefused = await p.evaluate(() => { saveSignature(); return !getCurrentUser().parentSig; });
  await p.evaluate(() => {
    const cv = document.getElementById('sigCanvas');
    const ctx = cv.getContext('2d'); ctx.strokeStyle = '#1a237e'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(40, 150); ctx.bezierCurveTo(150, 40, 250, 220, 380, 90); ctx.stroke();
    sigTouched = true;
    saveSignature();
  });
  R.sigSaved = await p.evaluate(() => (getCurrentUser().parentSig || '').startsWith('data:image/png'));
  R.certWithSig = await p.evaluate(async () => { const c = await drawCertificate({ title: 'x' }, { code: 'AAAA-BBBB', at: Date.now() }); return [c.width, c.height]; });
  // 4) بطل الأسبوع: يُمنح عند إتمام كل أبيات التحدي
  R.weeklyBadgeDefined = await p.evaluate(() => !!CUSTOM_BADGES.weekly);
  R.safeImgRejects = await p.evaluate(() => safeImg('x" onerror="alert(1)') === null && safeImg('javascript:alert(1)') === null);
  R.safeImgAccepts = await p.evaluate(() => safeImg('data:image/png;base64,AAAA') !== null);
  R.pageErrors = errs;
  await b.close();
  console.log(JSON.stringify(R, null, 2));
  const ok = R.codeShape && R.codeStable && R.codeDiffers && R.issuedTwice.same && R.issuedTwice.count === 1
    && R.logRows === 1 && R.verifyHit && R.verifyMiss && R.sigBlankRefused === true && R.sigSaved
    && R.certWithSig[0] === 1800 && R.weeklyBadgeDefined && R.safeImgRejects && R.safeImgAccepts && errs.length === 0;
  if (!ok) { console.error('FAIL'); process.exit(1); }
})().catch(e => { console.error('FAIL', e); process.exit(1); });
