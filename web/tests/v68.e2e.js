const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 390, height: 780 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file:///home/claude/hasaniya-desktop/standalone/hasaniya.html');
  await p.waitForTimeout(800);
  const R = {};
  // 1) دليل الوالد يظهر مرة واحدة
  await p.evaluate(() => showParentScreen());
  await p.waitForTimeout(200);
  R.introShown = await p.evaluate(() => getComputedStyle(document.getElementById('parentIntro')).display);
  await p.evaluate(() => dismissParentIntro());
  R.introAfter = await p.evaluate(() => getComputedStyle(document.getElementById('parentIntro')).display);
  R.introSaved = await p.evaluate(() => JSON.parse(localStorage.getItem('hasaniya_prefs') || '{}').parentIntroSeen === true);
  await p.evaluate(() => showParentScreen());
  R.introHiddenOnReturn = await p.evaluate(() => getComputedStyle(document.getElementById('parentIntro')).display);
  // 2) عينة للمراجعة: 10 بنود، والعلامة تُحفظ
  await p.evaluate(() => showReviewSample(false));
  R.sampleItems = await p.evaluate(() => document.querySelectorAll('#hubBody .review-item').length);
  await p.evaluate(() => { const cb = document.querySelector('#hubBody input[data-vid]'); cb.click(); });
  R.sampleCount = await p.evaluate(() => document.getElementById('reviewCount').textContent);
  const firstSample = await p.evaluate(() => state.docSample.slice());
  await p.evaluate(() => showReviewSample(false));
  R.sampleStable = await p.evaluate((s) => JSON.stringify(state.docSample) === JSON.stringify(s), firstSample);
  R.sampleKeptCheck = await p.evaluate(() => document.querySelectorAll('#hubBody input[data-vid]:checked').length);
  await p.evaluate(() => showReviewSample(true));
  R.regenItems = await p.evaluate(() => document.querySelectorAll('#hubBody .review-item').length);
  // 3) مساحة التسجيلات وحذفها
  await p.evaluate(() => openRecPopup({ mode: 'child' }));
  await p.waitForTimeout(300);
  R.storageEmpty = await p.evaluate(() => document.getElementById('recStorage').textContent);
  R.wipeHiddenWhenEmpty = await p.evaluate(() => getComputedStyle(document.getElementById('recWipeBtn')).display);
  await p.evaluate(async () => {
    await recPut({ key: recKey('s1v1'), verseId: 's1v1', kind: 'verse', uid: activeUserId, mime: 'audio/webm', blob: new Blob([new Uint8Array(200000)]), at: Date.now() });
    await renderStorageInfo();
  });
  R.storageOne = await p.evaluate(() => document.getElementById('recStorage').textContent);
  R.wipeShown = await p.evaluate(() => getComputedStyle(document.getElementById('recWipeBtn')).display);
  await p.evaluate(() => wipeRecordings());
  await p.waitForTimeout(300);
  R.storageAfterWipe = await p.evaluate(() => document.getElementById('recStorage').textContent);
  // 4) الطريقة الإغلاق والمساحة الصغيرة: لا أخطاء
  await p.evaluate(() => closePopup('recPopup'));
  R.pageErrors = errs;
  await b.close();
  console.log(JSON.stringify(R, null, 2));
})().catch(e => { console.error('FAIL', e); process.exit(1); });
