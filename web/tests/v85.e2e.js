/* اختبار v85: إغلاق سؤال المكان يعيد للخريطة، والإتقان يُحتسب من المراجعة، وعدّاد الدرس يُصفَّر */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 780 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto((process.env.HASANIYA_URL || 'file:///home/claude/hasaniya-desktop/standalone/hasaniya.html')); await p.waitForTimeout(900);
  const R = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    const u = getCurrentUser(); if (u && !u.gender) { u.gender = 'girl'; saveState(); } closePopup('userEditorPopup');
    for (let i = 0; i < 4; i++) { const st = content.journeyData[i]; st.verses.forEach(v => state.seenVerses[v.id] = true); markStationCompleted(st); }
    const vis = c => getComputedStyle(document.getElementById(c) || document.body).display !== 'none';
    // 1) الإغلاق بـ ✕ و appDismiss
    for (const how of ['close', 'dismiss']) {
      state.versePositions[content.journeyData[4].id] = 0; saveState(); showMap(); startDailyLesson();
      for (let k = 0; k < 3; k++) { await w(40); nextVerse(); }
      await w(100);
      const shown = document.getElementById('hubPopup').classList.contains('active');
      how === 'close' ? closePopup('hubPopup') : appDismiss('hubPopup');
      await w(100);
      o[how] = { shown, mapVisible: vis('mapScreen'), gameHidden: !vis('gameScreen') };
    }
    // 2) الجواب ثم الإغلاق الآلي يعيد للخريطة مرة واحدة
    let calls = 0; const orig = window.showMap; window.showMap = () => { calls++; return orig(); };
    askPlaceAfterLesson({ place: 'حراء', ref: 's5v2' }, window.showMap);
    document.querySelector('#placeOpts button').click(); await w(1700);
    o.autoCalls = calls; window.showMap = orig;
    // 3) الإتقان من التحدي والمراجعة
    state.dailyCredits = state.dailyCredits || {}; const v = content.journeyData[0].verses[1]; delete state.dailyCredits['mastery|' + v.id];
    state.verseStats[v.id] = { correct: 1, wrong: 0, lastCorrect: 1, lastWrong: 0 };
    playMode = MODE_CHALLENGE; recordVerseStat(v.id, true);
    o.mastery = state.verseStats[v.id].correct;
    playMode = MODE_PREVIEW; delete state.dailyCredits['mastery|' + v.id]; recordVerseStat(v.id, true);
    o.previewNoCount = state.verseStats[v.id].correct;
    // 4) نهاية المحطة في منتصف الدرس تُصفّر العدّاد
    markStationCompleted(content.journeyData[4]); const st = content.journeyData[5];
    state.stationStatus[st.id] = 'current'; state.versePositions[st.id] = st.verses.length - 2; saveState();
    showMap(); startDailyLesson(); await w(50); nextVerse(); await w(100); nextVerse(); await w(300);
    o.dailyLeftAfterEnd = state.dailyLeft;
    return o;
  });
  const bad = [];
  for (const k of ['close', 'dismiss']) if (!R[k].shown || !R[k].mapVisible || !R[k].gameHidden) bad.push('إغلاق سؤال المكان (' + k + '): ' + JSON.stringify(R[k]));
  if (R.autoCalls !== 1) bad.push('عدد العودة للخريطة بعد الجواب: ' + R.autoCalls);
  if (R.mastery !== 2) bad.push('الإتقان من التحدي لم يُحتسب: ' + R.mastery);
  if (R.previewNoCount !== 2) bad.push('المعاينة احتُسبت');
  if (R.dailyLeftAfterEnd !== null) bad.push('عدّاد الدرس لم يُصفَّر: ' + R.dailyLeftAfterEnd);
  if (errs.length) bad.push('أخطاء: ' + errs.join(' | '));
  console.log(JSON.stringify(R));
  console.log(bad.length ? 'FAIL: ' + bad.join(' | ') : 'v85 e2e: كل الفحوص نجحت');
  await b.close(); process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
