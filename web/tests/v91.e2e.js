/* اختبار v91: «فائدة علمية للوالد» تظهر تحت المصادر، وخريطة الرحلة والملصقات تعمل بعد تقسيم المحطات */
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
    o.stations = content.journeyData.length;
    const v = content.journeyData.flatMap(s => s.verses).find(x => x.id === 's2v3');
    renderStoryContent(v);
    const box = document.getElementById('storySource');
    o.noteShown = !!box.querySelector('.parent-note') && /ابن القيم/.test(box.textContent);
    o.title = (box.querySelector('.parent-note-title') || {}).textContent || '';
    const v2 = content.journeyData.flatMap(s => s.verses).find(x => x.id === 's11av1');
    renderStoryContent(v2); o.noNoteWhenEmpty = !document.getElementById('storySource').querySelector('.parent-note') || !!v2.note;
    o.noRaw = !/<script|onerror/.test(document.getElementById('storySource').innerHTML);
    try { showJourneyMap(); await w(150); o.map = true; } catch (e) { o.map = false; o.mapErr = e.message; }
    try { showInventory(); await w(100); o.inv = document.querySelectorAll('#inventoryGrid .inv-item').length; } catch (e) { o.inv = -1; }
    return o;
  });
  console.log(JSON.stringify(R));
  need('عدد المحطات ' + R.stations, R.stations === 16); need('الفائدة العلمية لم تظهر', R.noteShown);
  need('عنوان الفائدة', /فائدة علمية للوالد/.test(R.title)); need('خريطة الرحلة انهارت: ' + R.mapErr, R.map);
  need('الألبوم لا يعرض 16 ملصقاً: ' + R.inv, R.inv === 16);
  need('أخطاء: ' + errs.join('|'), errs.length === 0);
  await b.close();
  if (bad.length) { console.log('FAIL v91:\n - ' + bad.join('\n - ')); process.exit(1); }
  console.log('OK v91');
})();
