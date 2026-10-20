/* اختبار v69: صورة الطفل وإعداد الوالد، الشهادة القابلة للطباعة، الرقم السري، وصيغ الجنس */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 390, height: 780 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file:///home/claude/hasaniya-desktop/standalone/hasaniya.html');
  await p.waitForTimeout(800);
  const R = {};
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
  // 1) الصورة مفعّلة افتراضياً، ويعطّلها الوالد
  await p.evaluate((png) => { const u = getCurrentUser(); u.photo = png; delete u.showPhoto; }, PNG);
  R.photoDefaultOn = await p.evaluate(() => !!rewardPhoto());
  await p.evaluate(() => { getCurrentUser().showPhoto = false; });
  R.photoOffWhenParentDisables = await p.evaluate(() => rewardPhoto() === null);
  await p.evaluate(() => { getCurrentUser().showPhoto = true; });
  // 2) الشهادة بدقة الطباعة وبألوان حسب الجنس
  R.certSizeGirl = await p.evaluate(async () => { getCurrentUser().gender = 'girl'; const c = await drawCertificate({ title: 'الأبواء' }, { code: 'AAAA-BBBB', at: Date.now() }); return [c.width, c.height]; });
  R.certSizeBoy = await p.evaluate(async () => { getCurrentUser().gender = 'boy'; const c = await drawCertificate({ title: 'الأبواء' }, { code: 'AAAA-BBBB', at: Date.now() }); return [c.width, c.height]; });
  R.genderForm = await p.evaluate(() => gForm('أتممتَ', 'أتممتِ'));
  await p.evaluate(() => { getCurrentUser().gender = 'girl'; });
  R.genderFormGirl = await p.evaluate(() => gForm('أتممتَ', 'أتممتِ'));
  // 3) الحفظ والطباعة يطلبان الرقم السري قبل التنفيذ
  R.saveAsksPin = await p.evaluate(() => {
    let asked = null, ran = false;
    const oldPin = window.requirePin, oldSave = window.saveCertificate;
    window.requirePin = (cb, msg) => { asked = msg; };
    window.saveCertificate = () => { ran = true; };
    certSave({ title: 'x' });
    window.requirePin = oldPin; window.saveCertificate = oldSave;
    return { asked: !!asked, ran };
  });
  R.printAsksPin = await p.evaluate(() => {
    let asked = null, ran = false;
    const oldPin = window.requirePin, oldPrint = window.printCertificate;
    window.requirePin = (cb, msg) => { asked = msg; };
    window.printCertificate = () => { ran = true; };
    certPrint({ title: 'x' });
    window.requirePin = oldPin; window.printCertificate = oldPrint;
    return { asked: !!asked, ran };
  });
  // 4) بعد الموافقة تُنفَّذ العملية فعلاً
  R.runsAfterPin = await p.evaluate(() => {
    let ran = false; const oldPin = window.requirePin, oldPrint = window.printCertificate;
    window.requirePin = (cb) => cb();
    window.printCertificate = () => { ran = true; };
    certPrint({ title: 'x' });
    window.requirePin = oldPin; window.printCertificate = oldPrint;
    return ran;
  });
  R.pageErrors = errs;
  await b.close();
  console.log(JSON.stringify(R, null, 2));
  const ok = R.photoDefaultOn && R.photoOffWhenParentDisables && R.certSizeGirl[0] === 1800 && R.certSizeBoy[0] === 1800
    && R.saveAsksPin.asked && !R.saveAsksPin.ran && R.printAsksPin.asked && !R.printAsksPin.ran && R.runsAfterPin
    && R.genderFormGirl === 'أتممتِ' && R.genderForm === 'أتممتَ' && errs.length === 0;
  if (!ok) { console.error('FAIL'); process.exit(1); }
})().catch(e => { console.error('FAIL', e); process.exit(1); });
