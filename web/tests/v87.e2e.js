/* اختبار v87: ملفات هجومية فعلية: تسميع خبيث، ZIP كاذب الحجم، تقدّم ناقص، تقييم ملوَّث، تخزين تالف، ومؤشر الإتقان */
const { chromium } = require('playwright');
const zlib = require('zlib');
const URL = (process.env.HASANIYA_URL || 'file:///home/claude/hasaniya-desktop/standalone/hasaniya.html');
function crc32(buf) { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let r = 0xFFFFFFFF; for (const b of buf) r = t[(r ^ b) & 255] ^ (r >>> 8); return (r ^ 0xFFFFFFFF) >>> 0; }
/* يبني zip من ملف واحد مضغوط deflate، مع إمكانية تزوير الحجم المعلن */
function makeZip(name, data, declared) {
  const comp = zlib.deflateRawSync(data), nm = Buffer.from(name), crc = crc32(data.length > 1e6 ? Buffer.alloc(0) : data);
  const lh = Buffer.alloc(30 + nm.length); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(8, 8);
  lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(declared, 22); lh.writeUInt16LE(nm.length, 26); nm.copy(lh, 30);
  const ch = Buffer.alloc(46 + nm.length); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(8, 10);
  ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(declared, 24); ch.writeUInt16LE(nm.length, 28); ch.writeUInt32LE(0, 42); nm.copy(ch, 46);
  const eo = Buffer.alloc(22); eo.writeUInt32LE(0x06054b50, 0); eo.writeUInt16LE(1, 8); eo.writeUInt16LE(1, 10); eo.writeUInt32LE(ch.length, 12); eo.writeUInt32LE(lh.length + comp.length, 16);
  return Buffer.concat([lh, comp, ch, eo]);
}
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const bad = [];
  const need = (m, ok) => { if (!ok) bad.push(m); };
  const bomb = makeZip('bomb.bin', Buffer.alloc(120 * 1024 * 1024), 100).toString('base64');
  const small = Buffer.from('hello'.repeat(1000));
  const good = makeZip('a.txt', small, small.length).toString('base64');

  const ctx = await b.newContext({ viewport: { width: 390, height: 780 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL); await p.waitForTimeout(900);
  const R = await p.evaluate(async ({ bomb, good }) => {
    const o = {}; const w = ms => new Promise(r => setTimeout(r, ms));
    const u = getCurrentUser(); if (u && !u.gender) { u.gender = 'girl'; saveState(); } closePopup('userEditorPopup');
    const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0)).buffer;
    // ---- 1) تسميع خبيث ----
    const evil = { app: 'hasaniya', type: 'recitation', child: { name: '<img src=x onerror=window.__x=1>' },
      items: [{ verseId: 's1v1', text: '<b>t</b>', mime: 'audio/webm"><img src=x onerror=window.__xss=1>', data: 'AAAA' }] };
    openEvalFromDoc(evil); await w(300);
    o.evilRejected = document.querySelectorAll('#evalBody .rec-row').length === 0 && !document.getElementById('evalPopup').classList.contains('active');
    o.evilNoImg = !document.querySelector('#evalBody img') && !window.__xss;
    const evilData = JSON.parse(JSON.stringify(evil)); evilData.items[0].mime = 'audio/webm'; evilData.items[0].data = 'AA" onerror="window.__xss2=1';
    openEvalFromDoc(evilData); await w(200);
    o.evilDataRejected = document.querySelectorAll('#evalBody .rec-row').length === 0;
    const okDoc = { app: 'hasaniya', type: 'recitation', child: { name: '<i>س</i>' }, part: 1, parts: 1,
      items: [{ verseId: 's1v1', text: '<b>نص</b>', mime: 'audio/webm;codecs=opus', data: 'AAAA' }] };
    openEvalFromDoc(okDoc); await w(200);
    const row = document.querySelector('#evalBody .rec-row');
    o.okBuilt = !!row && row.querySelector('audio').src.startsWith('data:audio/webm;codecs=opus;base64,') && row.querySelectorAll('select').length === 3;
    o.textEscaped = !!row && !row.querySelector('b') && /<b>نص<\/b>/.test(row.querySelector('.rec-text').textContent);
    o.titleEscaped = !document.querySelector('#evalTitle i') && /<i>/.test(document.getElementById('evalTitle').textContent);
    document.getElementById('evalPopup').classList.remove('active');
    // ---- 2) تقييم ملوَّث ----
    state.recEval = {};
    importEvaluation(JSON.parse('{"app":"hasaniya","type":"evaluation","evaluator":"م","ratings":{"__proto__":{"memory":9},"zzz":{"memory":5},"s1v1":{"memory":99,"pronunciation":"x","order":2,"note":"<b>n</b>"}}}'));
    o.evalKeys = Object.keys(state.recEval).join(',');
    o.evalClamp = state.recEval.s1v1 && state.recEval.s1v1.memory === 5 && state.recEval.s1v1.pronunciation === 3 && state.recEval.s1v1.order === 2;
    o.protoClean = ({}).memory === undefined && Object.getPrototypeOf(state.recEval) === Object.prototype;
    // ---- 3) استيراد تقدم ----
    state.points = 777; saveState();
    const before = JSON.stringify(state);
    o.partialRejected = importProgressSafely({ app: 'hasaniya', state: { foo: 1 } }) === false && JSON.stringify(state) === before;
    o.arrayRejected = importProgressSafely({ app: 'hasaniya', state: [1, 2] }) === false && JSON.stringify(state) === before;
    o.foreignRejected = importProgressSafely({ app: 'hasaniya', state: { stationStatus: { zz: 'completed' } } }) === false && JSON.stringify(state) === before;
    const hostile = JSON.parse('{"__proto__":{"polluted":1},"constructor":{"prototype":{"p2":1}},"points":"abc","streak":-5,"versePositions":{"s1":"zz","s99":4},"selectedStation":99,"seenVerses":{"s1v1":1,"bogus":1},"stationStatus":{"s1":"completed","sX":"completed","s2":"hax"},"mistakes":{"k":{"verseId":"nope"}},"verseStats":{"s1v1":{"correct":"7"}},"achievements":{"evil":true}}');
    o.hostileAccepted = importProgressSafely({ app: 'hasaniya', state: hostile }) === true;
    o.cleaned = JSON.stringify({ pts: state.points, streak: state.streak, vp: state.versePositions, sel: state.selectedStation, seen: Object.keys(state.seenVerses), st: state.stationStatus, mis: Object.keys(state.mistakes).length, vs: state.verseStats.s1v1, ach: Object.keys(state.achievements).length });
    o.noPollution = ({}).polluted === undefined && ({}).p2 === undefined && Object.getPrototypeOf(state) === Object.prototype;
    o.hasPreBackup = safetyBackupList().some(e => e.kind === 'قبل الاستيراد');
    // التراجع الذري: فشل الحفظ يُبقي الحالة القديمة
    state.points = 321; saveState();
    const snap = JSON.stringify(state);
    const realSave = window.saveState; window.saveState = () => false;
    const okClean = sanitizeImportedState({ stationStatus: { s1: 'completed' }, points: 5 });
    const applied = applyImportedState(okClean.state);
    window.saveState = realSave;
    o.atomicRollback = applied === false && state.points === 321;
    // استعادة من النسخة التلقائية «قبل الاستيراد»
    const idx = safetyBackupList().findIndex(e => e.kind === 'قبل الاستيراد');
    o.hasIdx = idx >= 0;
    // ---- 4) ZIP ----
    let t0 = performance.now(), bombErr = null;
    try { await zipRead(b64(bomb)); } catch (e) { bombErr = e.message; }
    o.bombErr = bombErr; o.bombMs = Math.round(performance.now() - t0);
    const g = await zipRead(b64(good)); o.goodOk = g.size === 1 && g.get('a.txt').length === 5000;
    // ---- 5) مؤشر الإتقان ----
    const fresh = calculateMastery(normalizeUserState({}));
    o.freshMastery = JSON.stringify([fresh.percent, fresh.stars, fresh.level]);
    const ids = content.journeyData.flatMap(s => s.verses.map(v => v.id));
    const st = normalizeUserState({});
    ids.forEach(id => { st.seenVerses[id] = true; st.verseStats[id] = { correct: 1, wrong: 0, lastCorrect: 5, lastWrong: 0 }; });
    const onePass = calculateMastery(st);
    ids.slice(0, 80).forEach(id => { st.verseStats[id].correct = 2; });
    const half = calculateMastery(st);
    const before2 = half.percent;
    st.achievements = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, true])); st.streak = 50; st.stats.reviewSessions = 99; st.points = 99999;
    const boosted = calculateMastery(st);
    o.mastery = JSON.stringify({ onePass: onePass.percent, onePassProgress: onePass.progress, half: half.percent, boosted: boosted.percent, commitment: boosted.commitment, mastered: half.mastered });
    o.rewardsDontMove = before2 === boosted.percent;
    return o;
  }, { bomb, good });
  console.log(JSON.stringify(R));
  need('تسميع خبيث (mime) لم يُرفض', R.evilRejected && R.evilNoImg);
  need('تسميع خبيث (data) لم يُرفض', R.evilDataRejected);
  need('تسميع سليم لم يُبنَ بالـDOM', R.okBuilt);
  need('نص الأبيات لم يُهرَّب', R.textEscaped && R.titleEscaped);
  need('تقييم ملوَّث: المفاتيح ' + R.evalKeys, R.evalKeys === 's1v1' && R.evalClamp && R.protoClean);
  need('تقدم ناقص/مصفوفة/غريب لم يُرفض أو غيّر الحالة', R.partialRejected && R.arrayRejected && R.foreignRejected);
  need('التقدم العدائي لم يُقبل منقّىً', R.hostileAccepted);
  const c = JSON.parse(R.cleaned);
  need('تنقية الأنواع: ' + R.cleaned, c.pts === 0 && c.streak === 0 && c.sel === 0 && c.vp.s1 === 0 && !('s99' in c.vp) && c.seen.join() === 's1v1' && c.st.s1 === 'completed' && !('sX' in c.st) && c.st.s2 === 'current' /* v94: القيمة العدائية حُذفت، ثم أُعطيت المحطة التالية حالة «حالية» */ && c.mis === 0 && c.vs.correct === 0 && c.ach === 0);
  need('تلوث النموذج الأولي', R.noPollution);
  need('لا نسخة «قبل الاستيراد»', R.hasPreBackup && R.hasIdx);
  need('التراجع الذري فشل', R.atomicRollback);
  need('ZIP كاذب الحجم لم يُرفض بالرسالة المتوقعة: ' + R.bombErr, /يتجاوز المعلن/.test(R.bombErr || ''));
  need('رفض ZIP أبطأ من اللازم: ' + R.bombMs + 'ms', R.bombMs < 8000);
  need('ZIP سليم لم يُقرأ', R.goodOk);
  need('طفل جديد يجب أن يبدأ من صفر: ' + R.freshMastery, R.freshMastery === JSON.stringify([0, 0, 'مبتدئ']));
  const m = JSON.parse(R.mastery);
  need('إتقان مرور واحد: ' + R.mastery, m.onePass === 40 && m.onePassProgress === 100 && m.mastered === 80 && m.half > m.onePass);
  need('المكافآت والسلسلة والإنجازات حرّكت الإتقان', R.rewardsDontMove && m.commitment === 100);
  need('أخطاء صفحة: ' + errs.join('|'), errs.length === 0);

  // ---- 6) تلف المحتوى وحده: لا يضيع تقدّم الطفل ----
  const ctx2 = await b.newContext(); const p2 = await ctx2.newPage(); p2.on('dialog', d => d.accept());
  await p2.goto(URL); await p2.waitForTimeout(800);
  await p2.evaluate(() => { closePopup('userEditorPopup'); state.points = 777; saveState(); });
  const users = await p2.evaluate(() => localStorage.getItem('hasaniya_v13_users'));
  await p2.close();
  const p3 = await ctx2.newPage(); p3.on('dialog', d => d.accept());
  await p3.addInitScript(u => { if (!sessionStorage.getItem('d')) { sessionStorage.setItem('d', '1'); localStorage.setItem('hasaniya_v13_users', u); localStorage.setItem('hasaniya_v13_content', '{bad'); } }, users);
  await p3.goto(URL); await p3.waitForTimeout(1000);
  const C = await p3.evaluate(() => ({ points: state.points, contentBackup: !!localStorage.getItem('hasaniya_content_corrupt_backup'), usersBackup: !!localStorage.getItem('hasaniya_users_corrupt_backup') }));
  console.log('content-corrupt', JSON.stringify(C));
  need('تلف المحتوى أضاع تقدّم الطفل: ' + JSON.stringify(C), C.points === 777 && C.contentBackup && !C.usersBackup);
  // ---- 7) تلف المستخدمين: نسخة خام + استعادة من آخر نسخة سليمة ----
  const ctx3 = await b.newContext(); const q0 = await ctx3.newPage(); q0.on('dialog', d => d.accept());
  await q0.goto(URL); await q0.waitForTimeout(800);
  await q0.evaluate(() => { closePopup('userEditorPopup'); state.points = 555; saveState(); safetyBackupPush('آخر نسخة سليمة'); safetyBackupPush('قبل الاستيراد'); });
  const sb = await q0.evaluate(() => localStorage.getItem('hasaniya_safety_backups'));
  await q0.close();
  const q = await ctx3.newPage(); q.on('dialog', d => d.accept());
  await q.addInitScript(sbk => { if (!sessionStorage.getItem('d')) { sessionStorage.setItem('d', '1'); localStorage.setItem('hasaniya_v13_users', '[{bad'); localStorage.setItem('hasaniya_safety_backups', sbk); } }, sb);
  await q.goto(URL); await q.waitForTimeout(900);
  const D = await q.evaluate(async () => {
    closePopup('userEditorPopup');
    const o = { pointsAfter: state.points, raw: localStorage.getItem('hasaniya_users_corrupt_backup'), lists: safetyBackupList().map(e => e.kind) };
    const btn = [...document.querySelectorAll('#parentScreen .parent-actions button')].find(x => /showRecoveryHub/.test(x.getAttribute('onclick') || ''));
    o.btn = !!btn;
    showRecoveryHub();
    o.hubRows = document.querySelectorAll('#hubBody .board-row').length; o.hubText = document.getElementById('hubBody').innerText.includes('آخر نسخة سليمة');
    return o;
  });
  console.log('users-corrupt', JSON.stringify(D));
  need('بيانات الأطفال التالفة لم تُحفظ خاماً', D.raw === '[{bad');
  need('زر الاستعادة غير موجود في وضع الوالد أو الواجهة فارغة', D.btn && D.hubRows >= 2 && D.hubText);
  await q.evaluate(() => { const i = safetyBackupList().findIndex(e => e.kind === 'آخر نسخة سليمة'); window.__reloaded = false; safetyRestore(i); });
  // ننتظر إعادة التحميل بعد الاستعادة بدل مهلة ثابتة (كانت تفشل أحياناً على جهاز بطيء)
  await q.waitForTimeout(1500); await q.waitForLoadState('load').catch(() => {}); await q.waitForFunction(() => typeof state !== 'undefined' && state && state.points === 555, null, { timeout: 8000 }).catch(() => {});
  const E = await q.evaluate(() => ({ points: state.points }));
  console.log('after restore', JSON.stringify(E));
  need('الاستعادة من النسخة التلقائية لم ترجّع النقاط: ' + JSON.stringify(E), E.points === 555);

  console.log(bad.length ? 'FAIL:\n - ' + bad.join('\n - ') : 'v87 e2e: كل الفحوص نجحت');
  await b.close(); process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
