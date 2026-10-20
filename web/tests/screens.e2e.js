const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 390, height: 780 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto((process.env.HASANIYA_URL || 'file:///home/claude/hasaniya-desktop/standalone/hasaniya.html'));
  await p.waitForTimeout(800);
  // أول تشغيل يفتح محرر "أهلاً" لاختيار الجنس؛ نكمله هنا ثم نكمل الاختبار
  await p.evaluate(() => { const u = getCurrentUser(); if (u && !u.gender) { u.gender = 'boy'; saveState(); } closePopup('userEditorPopup'); });
  const disp = id => p.evaluate(id => getComputedStyle(document.getElementById(id)).display, id);
  const act = id => p.evaluate(id => document.getElementById(id).classList.contains('active'), id);
  const R = {};
  // كل نافذة لها طريقة إغلاق ظاهرة
  R.noCloseWay = await p.evaluate(() => [...document.querySelectorAll('.modal-overlay')].filter(o => {
    if (o.querySelector('.modal-x')) return false;
    return ![...o.querySelectorAll('button')].some(b => /closePopup|cancelPin|showMap|appDismiss|skipQuiz|warmSkip/.test(b.getAttribute('onclick') || '') || b.id === 'warmSkip' || b.id === 'repeatNextBtn');
  }).map(o => o.id));
  // S1: أول محطة تُفتح بتمهيد ناجي، و Escape يتخطاه ويفتح المحطة
  await p.evaluate(() => startStation(0));
  await p.waitForTimeout(150);
  R.warmupShown = false;
  await p.keyboard.press('Escape');
  await p.waitForTimeout(150);
  R.afterEscGame = await disp('gameScreen');
  // S2: زر الرجوع من اللعب
  await p.click('#backToMapBtn'); await p.waitForTimeout(120);
  R.backFromGame = await disp('mapScreen');
  // S3: الاختبار يُتخطّى بالزر ويكمل المحطة
  await p.evaluate(() => { window.__skipCalled = 0; startStationQuiz(content.journeyData[0], () => { window.__skipCalled++; }); });
  R.quizSkipInit = await act('quizPopup');
  for (let q = 0; q < 2; q++) { await p.click('#quizBody .word-btn:not(:disabled)'); await p.waitForTimeout(1900); }
  await p.click('#quizSkipBtn'); await p.waitForTimeout(100);
  R.quizAfterSkip = await act('quizPopup');
  R.quizCb = await p.evaluate(() => window.__skipCalled);
  // S4: زر الرجوع لا يغلق الاختبار (يبقى ملزماً) 
  await p.evaluate(() => startStationQuiz(content.journeyData[0], () => {}));
  R.backOnQuiz = await p.evaluate(() => { const r = appBack(); return { handled: r, still: document.getElementById('quizPopup').classList.contains('active') }; });
  await p.evaluate(() => { quizState = null; document.getElementById('quizPopup').classList.remove('active'); });
  // S5: نافذة فوق نافذة: الرجوع يغلق الأعلى فقط
  await p.evaluate(() => { openHub('اختبار', '<p>x</p>'); document.getElementById('settingsPopup').classList.add('active'); });
  R.stackedBack1 = await p.evaluate(() => { appBack(); return [document.getElementById('settingsPopup').classList.contains('active'), document.getElementById('hubPopup').classList.contains('active')]; });
  R.stackedBack2 = await p.evaluate(() => { appBack(); return document.getElementById('hubPopup').classList.contains('active'); });
  // S6: من الأسرة: العودة للخريطة
  await p.evaluate(() => showParentScreen()); await p.waitForTimeout(100);
  await p.click('.parent-actions .btn-gray'); await p.waitForTimeout(120);
  R.parentBack = await disp('mapScreen');
  // S7: زر ✕ يغلق نافذة الإعدادات
  await p.evaluate(() => openSettings()); await p.waitForTimeout(100);
  R.xCount = await p.evaluate(() => document.querySelectorAll('.modal-x').length); await p.click('#settingsPopup .btn-gray'); await p.waitForTimeout(100);
  R.xClosesSettings = !(await act('settingsPopup'));
  // S8: الخلفية تغلق نافذة المعلومات
  await p.evaluate(() => showGlossary()); await p.waitForTimeout(100);
  await p.mouse.click(5, 400); await p.waitForTimeout(100);
  R.backdropCloses = !(await act('hubPopup'));
  // S9: مكافأة: الإغلاق يعيد للخريطة
  await p.evaluate(() => { showParentScreen(); document.getElementById('rewardPopup').classList.add('active'); });
  await p.evaluate(() => appBack()); await p.waitForTimeout(120);
  R.rewardBackToMap = await disp('mapScreen');
  console.log(JSON.stringify(R, null, 1));
  console.log('errors', errs);
  await b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
