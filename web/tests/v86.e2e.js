/* اختبار v86: تخطّي الاختبار أثناء مؤقّته لا يرمي خطأ، والجواب الخاطئ ثم الخروج للخريطة لا يعيد تحميل البيت */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 780 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file:///home/claude/hasaniya-desktop/standalone/hasaniya.html'); await p.waitForTimeout(900);
  const R = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    const u = getCurrentUser(); if (u && !u.gender) { u.gender = 'girl'; saveState(); } closePopup('userEditorPopup');
    // 1) تخطّي الاختبار خلال مؤقّت الجواب
    let done = 0; startStationQuiz(content.journeyData[0], () => done++);
    document.querySelector('#quizBody .word-btn').click(); skipQuiz(); await w(2200);
    o.skipDone = done;
    // 2) جواب خاطئ ثم الخريطة
    startStation(0); await w(200);
    const before = verseLoadToken;
    const cur = getCurrentVerse(); const bank = document.getElementById('wordsBank');
    if (bank) { const bs = [...bank.querySelectorAll('.word-btn')]; bs.reverse().forEach(x => x.click()); }
    else { const bad = [...document.querySelectorAll('#optionsBank .word-btn')].find(x => x.textContent !== cur.verse.correctWord); bad.click(); }
    showMap(); await w(2200);
    o.tokenSame = verseLoadToken === before;
    o.mapVisible = getComputedStyle(document.getElementById('mapScreen')).display !== 'none';
    return o;
  });
  const bad = [];
  if (R.skipDone !== 1) bad.push('onDone لم يُنفَّذ مرة واحدة: ' + R.skipDone);
  if (!R.tokenSame) bad.push('أُعيد تحميل البيت بعد الخروج للخريطة');
  if (!R.mapVisible) bad.push('الخريطة ليست ظاهرة');
  if (errs.length) bad.push('أخطاء: ' + errs.join(' | '));
  console.log(JSON.stringify(R));
  console.log(bad.length ? 'FAIL: ' + bad.join(' | ') : 'v86 e2e: كل الفحوص نجحت');
  await b.close(); process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
