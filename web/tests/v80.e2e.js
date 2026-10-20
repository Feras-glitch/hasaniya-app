/* اختبار v80 في المتصفح: الخريطة تعرض المحطة الأولى، لا سؤال قبل المحطة، «ردّد معي» يعرض البيت دون تعرّف صوتي،
   تنبيه الوالد عند عدم تطابق التسجيل، وتنبيه عند تعذّر مخزن التسجيلات */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 780 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file:///home/claude/hasaniya-desktop/standalone/hasaniya.html');
  await p.waitForTimeout(800);
  await p.evaluate(() => { const u = getCurrentUser(); if (u && !u.gender) { u.gender = 'boy'; saveState(); } closePopup('userEditorPopup'); });
  const R = {};
  // 1) الخريطة: المحطة الأولى مرسومة وتظهر في القائمة
  R.map = await p.evaluate(() => { showJourneyMap(); return { legend: [...document.querySelectorAll('.board-row strong')].some(x => /^1(\s|$)/.test(x.textContent.trim())) }; });
  await p.evaluate(() => { const h = document.querySelector('#hubPopup'); if (h) h.classList.remove('active'); });
  // 2) لا سؤال قبل المحطة: بدء المحطة الأولى يفتح شاشة اللعب مباشرة
  await p.evaluate(() => showMap());
  await p.evaluate(() => { state.warmups = {}; state.versePositions = {}; startStation(0); });
  await p.waitForTimeout(300);
  R.warmHidden = await p.evaluate(() => !document.getElementById('warmPopup'));
  R.gameShown = await p.evaluate(() => document.getElementById('gameScreen').style.display === 'block');
  // 3) «ردّد معي» يعرض البيت كاملاً ولا يستخدم التعرّف الصوتي
  R.shadowShowsVerse = await p.evaluate(() => {
    window.SpeechRecognition = function () { throw new Error('SR must not be used'); };
    startShadow();
    const v = getCurrentVerse().verse.fullVerse;
    return document.getElementById('shadowResult').innerText.replace(/\s+/g, ' ').includes(v.split(' ').slice(0, 3).join(' '));
  });
  // 4) تنبيه الوالد: تسجيل لا يطابق النص يُعلَن بوضوح ولا يُقرأ بصمت
  R.staleNotice = await p.evaluate(async () => {
    const v = content.journeyData[0].verses[0];
    await recPut({ key: authorKey('verse', v.id), verseId: v.id, kind: 'verse', uid: 'author', mime: 'audio/mpeg',
      blob: new Blob([new Uint8Array(100)]), fp: 'deadbeef', source: 'rec', at: Date.now() });
    const r = await authorRecFor('verse', v, true);
    return { returnedNull: r === null, toast: document.getElementById('toast').textContent };
  });
  // 5) تعذّر مخزن التسجيلات: رسالة واضحة ولا انهيار
  R.storageNotice = await p.evaluate(async () => {
    recDbPromise = null; const orig = indexedDB.open;
    indexedDB.open = () => { throw new Error('blocked'); };
    const got = await recGet('x');
    indexedDB.open = orig; recDbPromise = null;
    return { got, toast: document.getElementById('toast').textContent };
  });
  // 6) النقاط مرة واحدة لكل بيت في اليوم
  R.daily = await p.evaluate(() => [firstCreditToday('lesson|t1'), firstCreditToday('lesson|t1')]);
  const bad = [];
  const need = (n, c) => { if (!c) bad.push(n); };
  need('الخريطة تعرض المحطة الأولى', R.map.legend);
  need('لا سؤال قبل المحطة', R.warmHidden);
  need('شاشة اللعب تفتح مباشرة', R.gameShown);
  need('ردّد معي يعرض البيت', R.shadowShowsVerse);
  need('تنبيه الوالد عند عدم التطابق', R.staleNotice.returnedNull && /لم يعد مطابقاً/.test(R.staleNotice.toast));
  need('تنبيه عند تعذّر المخزن', R.storageNotice.got === null && /لا تُحفظ/.test(R.storageNotice.toast));
  need('النقاط مرة واحدة يومياً', R.daily[0] === true && R.daily[1] === false);
  need('لا أخطاء في الصفحة', errs.length === 0);
  console.log(JSON.stringify(R, null, 1));
  if (errs.length) console.log('errors:', errs);
  console.log(bad.length ? 'FAIL: ' + bad.join(' | ') : 'v80 e2e: كل الفحوص نجحت');
  await b.close();
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
