/* اختبار v90: زر التصفير غير مكرر، «تخطّي الاختبار» يظهر بعد محاولتين فقط، القصص المخفية لا تُعرض */
const { chromium } = require('playwright');
const URL = (process.env.HASANIYA_URL || 'file:///home/claude/hasaniya-desktop/standalone/hasaniya.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const bad = []; const need = (m, ok) => { if (!ok) bad.push(m); };
  const p = await (await b.newContext({ viewport: { width: 390, height: 780 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL); await p.waitForTimeout(800);
  const R = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    o.resetBtns = [...document.querySelectorAll('.parent-actions button')].filter(x => /resetAll/.test(x.getAttribute('onclick') || '')).length;
    const vs = content.journeyData.flatMap(s => s.verses);
    const hidden = ['s12cv4', 's12cv9'].map(id => vs.find(v => v.id === id)).filter(Boolean);
    o.hiddenShown = hidden.some(v => v.story);
    const s8 = vs.find(v => v.id === 's8v7'), a = vs.find(v => v.id === 's11bv9');
    o.s8 = (s8.story || '').length; o.adhan = /ناقوس|الأذان/.test((a.story || '')) || /الأذان/.test(a.story || '');
    // الاختبار: الزر مخفي، يظهر بعد إجابتين
    startStationQuiz(content.journeyData[0], () => {}); await w(150);
    const sk = () => getComputedStyle(document.getElementById('quizSkipBtn')).display;
    o.skip0 = sk();
    const answer = async () => { const btn = document.querySelector('#quizBody .word-btn:not(:disabled)'); btn.click(); await w(100); const nx = document.querySelector('#quizPopup .quiz-next'); if (nx) nx.click(); await w(200); };
    await answer(); o.skip1 = sk();
    await answer(); o.skip2 = quizState ? sk() : 'finished';
    return o;
  });
  console.log(JSON.stringify(R));
  need('زر تصفير مكرر', R.resetBtns === 1); need('قصة مخفية ظهرت', !R.hiddenShown);
  need('قصة سودة قصيرة', R.s8 >= 80); need('قصة الأذان بلا ذكر الأذان', R.adhan);
  need('زر التخطي ظاهر من البداية', R.skip0 === 'none'); need('زر التخطي ظاهر بعد محاولة', R.skip1 === 'none');
  need('زر التخطي لم يظهر بعد محاولتين', R.skip2 === 'inline-block' || R.skip2 === 'block' || R.skip2 === 'finished');
  need('أخطاء: ' + errs.join('|'), errs.length === 0);
  await b.close();
  if (bad.length) { console.log('FAIL v90:\n - ' + bad.join('\n - ')); process.exit(1); }
  console.log('OK v90');
})();
