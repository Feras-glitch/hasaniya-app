/* اختبار v88: فقاعة ناجي لا تحجب «التالي»، تنبيه فشل الحفظ، حدّ دفعة حزم الصوت، قفل الرقم السري، تكرار المعرّفات */
const { chromium } = require('playwright');
const URL = 'file:///home/claude/hasaniya-desktop/standalone/hasaniya.html';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const bad = []; const need = (m, ok) => { if (!ok) bad.push(m); };
  const errs = [];
  for (const [w, h] of [[320, 568], [360, 640], [412, 915]]) {
    const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.goto(URL); await p.waitForTimeout(800);
    await p.evaluate(() => { closePopup('userEditorPopup'); startStation(0); });
    await p.waitForTimeout(600);
    const pre = await p.evaluate(() => ({ float: !!document.querySelector('#guideFloat.show'), open: document.body.classList.contains('guide-open'),
      xw: (document.querySelector('#guideFloat .guide-x') || { getBoundingClientRect: () => ({ width: 0, height: 0 }) }).getBoundingClientRect().width }));
    await p.evaluate(() => { const v = getCurrentVerse().verse; const bank = document.getElementById('wordsBank');
      if (bank) v.correctOrder.forEach(wd => { const bt = [...document.querySelectorAll('#wordsBank .word-btn:not(.selected)')].find(x => x.textContent === wd && !x.disabled); bt && bt.click(); });
      else [...document.querySelectorAll('#optionsBank .word-btn')].find(x => x.textContent === v.correctWord).click(); });
    await p.waitForTimeout(700);
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(250);
    const post = await p.evaluate(() => { const nb = document.getElementById('nextBtn'); const r = nb.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { hit: nb === top || nb.contains(top), floatShown: !!document.querySelector('#guideFloat.show'), bodyOpen: document.body.classList.contains('guide-open') }; });
    console.log(w + 'x' + h, JSON.stringify({ pre, post }));
    need(`${w}x${h}: الفقاعة لم تظهر قبل الإجابة (اختبار لا يغطي الحالة)`, pre.float && pre.open);
    need(`${w}x${h}: زر ✕ صغير: ${pre.xw}`, pre.xw >= 36);
    need(`${w}x${h}: «التالي» ما زال محجوباً`, post.hit && !post.floatShown && !post.bodyOpen);
    await p.close();
  }
  const ctx = await b.newContext({ viewport: { width: 390, height: 780 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL); await p.waitForTimeout(800);
  const R = await p.evaluate(async () => {
    const o = {}; closePopup('userEditorPopup');
    // فشل الحفظ: تنبيه واحد فقط خلال دقيقة
    const real = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new DOMException('quota', 'QuotaExceededError'); };
    const r1 = saveState(); const t1 = document.getElementById('toast').textContent;
    document.getElementById('toast').textContent = '';
    const r2 = saveState(); const t2 = document.getElementById('toast').textContent;
    Storage.prototype.setItem = real;
    o.save = { r1, r2, warned: /تعذّر حفظ التقدم/.test(t1), throttled: t2 === '' };
    // معرّفات مكررة
    const dup = restoreUsersFromList([{ id: 'a', name: 'أ', state: { stationStatus: { s1: 'current' } } }, { id: 'a', name: 'ب', state: { stationStatus: { s1: 'current' } } }, { id: 'b', name: 'ج', state: { stationStatus: { s1: 'current' } } }]);
    o.dup = dup.ok && dup.users.map(u => u.id + ':' + u.name).join(',');
    // دفعة حزم صوت كبيرة: الملف الثالث يتجاوز 64MB
    const mk = async name => { const audio = new Uint8Array(22 * 1024 * 1024); const mf = new TextEncoder().encode(JSON.stringify({ app: 'hasaniya', type: 'voicepack', version: 1, author: 'م', items: [{ kind: 'verse', id: 's1v1', file: 'audio/a.webm', mime: 'audio/webm', at: Date.now() + Math.random() }] }));
      return new File([zipStore([{ name: 'manifest.json', data: mf }, { name: 'audio/a.webm', data: audio }])], name); };
    const files = [await mk('a.zip'), await mk('b.zip'), await mk('c.zip')];
    await importVoicePacks(files);
    o.vp = { items: vpStaged.items.length, errors: vpStaged.errors };
    return o;
  });
  console.log(JSON.stringify(R));
  need('فشل الحفظ لم يُنبَّه أو تكرر التنبيه: ' + JSON.stringify(R.save), R.save.r1 === false && R.save.r2 === false && R.save.warned && R.save.throttled);
  need('المعرّفات المكررة لم تُزل: ' + R.dup, R.dup === 'a:أ,b:ج');
  need('حدّ دفعة الصوت لم يعمل: ' + JSON.stringify(R.vp), R.vp.errors.some(e => /تجاوزت الدفعة/.test(e)));
  // قفل PIN
  const q = await (await b.newContext({ viewport: { width: 390, height: 780 } })).newPage(); q.on('pageerror', e => errs.push(e.message)); q.on('dialog', d => d.accept());
  await q.goto(URL); await q.waitForTimeout(800);
  const L = await q.evaluate(async () => {
    closePopup('userEditorPopup');
    parentPinHash = await hashPin('1234'); localStorage.setItem(STORAGE_PIN, parentPinHash);
    const o = { msgs: [] };
    for (let i = 0; i < 6; i++) { pinMode = 'verify'; showPinModal('t', 'm'); document.getElementById('pinInput').value = '9999'; await submitPin(); o.msgs.push(document.getElementById('pinError').textContent); }
    const st = pinLockState(); o.locked = st.until > Date.now(); o.fails = st.fails;
    // الرقم الصحيح أثناء القفل يُرفض
    let called = false; pinCallback = () => { called = true; }; pinMode = 'verify'; document.getElementById('pinInput').value = '1234'; await submitPin();
    o.correctWhileLocked = called; o.lockMsg = document.getElementById('pinError').textContent;
    // انتهاء القفل ثم الرقم الصحيح يعيد العدّاد
    pinLockSave({ fails: 5, until: Date.now() - 1 }); called = false; pinCallback = () => { called = true; }; document.getElementById('pinInput').value = '1234'; await submitPin(); await new Promise(r => setTimeout(r, 200));
    o.afterExpiry = called; o.reset = pinLockState().fails === 0;
    return o;
  });
  console.log(JSON.stringify(L));
  need('القفل لم يُفعَّل بعد 5 محاولات: ' + JSON.stringify(L.msgs.slice(-2)), L.locked && L.fails === 5 && /محاولات كثيرة/.test(L.msgs[5]));
  need('الرقم الصحيح قُبل أثناء القفل', L.correctWhileLocked === false && /محاولات كثيرة/.test(L.lockMsg));
  need('الرقم الصحيح بعد انتهاء القفل لم يُقبل أو لم يُصفَّر العدّاد', L.afterExpiry && L.reset);
  need('أخطاء صفحة: ' + errs.join('|'), errs.length === 0);
  console.log(bad.length ? 'FAIL:\n - ' + bad.join('\n - ') : 'v88 e2e: كل الفحوص نجحت');
  await b.close(); process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
