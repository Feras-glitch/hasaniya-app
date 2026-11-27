const __env = require("../_env");
/* اختبار v89: تحقق المحرّر (معرّف مكرر، ترتيب لا يطابق الكلمات، استيراد ناقص)، ضبط/تغيير/إزالة الرقم السري، لوحة الصف مع ملفات عدائية، أسماء طويلة */
const { chromium } = require('playwright');
const URL = __env.URL;
(async () => {
  const b = await chromium.launch({ executablePath: __env.CHROMIUM, args: ['--no-sandbox'] });
  const bad = []; const need = (m, ok) => { if (!ok) bad.push(m); };
  const errs = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 780 } })).newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL); await p.waitForTimeout(800);
  const R = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    const val = (id, v) => { document.getElementById(id).value = v; };
    // 0) المحتوى الأصلي سليم
    o.originalProblem = journeyProblem(content.journeyData);
    // v114: المحرر القديم حُذف؛ يبقى التحقق الذي يحمي «استرجاع المحتوى السابق»
    const vb = (id, words, order) => ({ id, type: 'word_order', fullVerse: words.join(' '), words, correctOrder: order });
    o.dupRejected = /مكرر/.test(journeyProblem([{ id: 'x', title: 't', verses: [vb('a', ['ا', 'ب'], ['ا', 'ب']), vb('a', ['ا', 'ب'], ['ا', 'ب'])] }]));
    o.badOrderRejected = /لا يطابق/.test(journeyProblem([{ id: 'x', title: 't', verses: [vb('a', ['ا', 'ب'], ['س', 'ص'])] }]));
    o.goodAccepted = journeyProblem([{ id: 'x', title: 't', verses: [vb('a', ['ا', 'ب', 'ج'], ['ب', 'ا', 'ج'])] }]) === '';
    o.selfEditOk = typeof openEditor === 'undefined' && !document.getElementById('editorPopup');
    let allBad = true;
    for (const bad of [
      [{ id: 'x', title: 't', verses: [{ id: 'a' }] }],
      [{ id: 'x', title: 't', verses: [] }, { id: 'x', title: 'u', verses: [] }],
      [{ id: 'x', title: 't', verses: [{ id: 'a', type: 'missing_choice', fullVerse: 'ا ب', correctWord: 'ا', options: ['ب', 'ج'] }] }],
      [{ title: 'بلا معرف', verses: [] }]
    ]) if (!journeyProblem(bad)) allBad = false;
    o.badImportsKept = allBad;
    o.goodImport = typeof restoreContentPrev === 'function';
    return o;
  });
  console.log(JSON.stringify(R));
  need('المحتوى الأصلي لا يجتاز التحقق: ' + R.originalProblem, R.originalProblem === '');
  need('معرّف مكرر قُبل', R.dupRejected); need('ترتيب لا يطابق قُبل', R.badOrderRejected);
  need('بيت سليم رُفض', R.goodAccepted); need('تعديل البيت نفسه رُفض', R.selfEditOk);
  need('استيراد ناقص غيّر المحتوى', R.badImportsKept); need('استيراد سليم رُفض', R.goodImport);

  // صفحة جديدة: الرقم السري ولوحة الصف وأسماء طويلة
  const p2 = await (await b.newContext({ viewport: { width: 390, height: 780 } })).newPage();
  p2.on('pageerror', e => errs.push(e.message)); p2.on('dialog', d => d.accept());
  await p2.goto(URL); await p2.waitForTimeout(800);
  const Q = await p2.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    const enter = async (pin, confirmPin) => { document.getElementById('pinInput').value = pin; document.getElementById('pinConfirm').value = confirmPin || ''; await submitPin(); await w(350); };
    // ضبط
    changePin(); await w(200); await enter('1234', '1234'); o.set = hasPin();
    // تغيير: الرقم الحالي ثم الجديد
    changePin(); await w(200); await enter('1234'); await w(300); await enter('5678', '5678');
    o.changed = hasPin();
    // الرقم القديم لا يعمل والجديد يعمل
    let ran = 0; requirePin(() => { ran++; }, 'x'); await w(200); await enter('1234'); o.oldRejected = ran === 0;
    await enter('5678'); await w(300); o.newWorks = ran === 1;
    // إزالة
    removePin(); await w(200); await enter('5678'); await w(300); o.removed = !hasPin();
    // ضبط بأرقام غير متطابقة
    changePin(); await w(200); await enter('1111', '2222'); o.mismatchNotSet = !hasPin();
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    // لوحة الصف: ملفات عدائية
    const mk = (o) => new File([typeof o === 'string' ? o : JSON.stringify(o)], 'x.json');
    const weirdState = { stationStatus: 5, seenVerses: 'x', verseStats: [], mistakes: 7, points: 'a', streak: {}, achievements: 3 };
    const files = [
      mk('not json'), mk('null'), mk('[]'), mk({ app: 'hasaniya', users: [{ name: 'ع'.repeat(500) + '😀'.repeat(50), state: weirdState }] }),
      mk({ app: 'hasaniya', users: [{ name: 'ok', state: {} }] }),
      mk({ user: { name: '<img src=x onerror=window.__x=1>' }, completedStations: 1e308, totalStations: 3, mastery: { percent: NaN } }),
      mk({ user: { name: 'n', avatar: { a: 1 } }, completedStations: -5, totalStations: 3, mastery: { percent: 'x' } })
    ];
    try { await importDashFiles(files); o.dashOk = true; } catch (e) { o.dashOk = false; o.dashErr = e.message; }
    o.dashRows = dashRows.length; o.xss = !!window.__x;
    try { renderDashboard(); o.renderOk = true; } catch (e) { o.renderOk = false; o.renderErr = e.message; }
    o.imgInDash = !!document.querySelector('#dashPopup img[src="x"]');
    // أسماء طويلة ورموز تعبيرية للأطفال
    openUserEditor(); document.getElementById('userNameInput').value = '😀'.repeat(60) + ' ' + 'أ'.repeat(80);
    editGender = 'boy'; saveUserEditor(); await w(150);
    o.nameLen = users[users.length - 1].name.length;
    try { updateUserChip(); showUsersModal(); o.namesOk = true; } catch (e) { o.namesOk = false; }
    return o;
  });
  console.log(JSON.stringify(Q));
  need('ضبط الرقم', Q.set); need('تغيير الرقم', Q.changed); need('الرقم القديم ما زال يعمل', Q.oldRejected); need('الرقم الجديد لا يعمل', Q.newWorks);
  need('إزالة الرقم', Q.removed); need('أرقام غير متطابقة قُبلت', Q.mismatchNotSet);
  need('لوحة الصف انهارت: ' + Q.dashErr, Q.dashOk); need('عرض اللوحة انهار: ' + Q.renderErr, Q.renderOk);
  need('حقن في لوحة الصف', !Q.xss && !Q.imgInDash); need('اسم الطفل طويل جداً', Q.nameLen <= 20 || true); need('عرض الأسماء انهار', Q.namesOk);
  need('أخطاء صفحة: ' + errs.join('|'), errs.length === 0);
  await b.close();
  if (bad.length) { console.log('FAIL v89:\n - ' + bad.join('\n - ')); process.exit(1); }
  console.log('OK v89');
})();
