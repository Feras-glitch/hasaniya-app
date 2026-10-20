/* اختبار v99: بنود قائمة الفحص على الجهاز التي يمكن تجربتها في المتصفح
   3   العمل دون إنترنت بعد أول فتح (عبر عامل الخدمة على خادم محلي)، ومع اختصار ?action=
   4-6 أول تشغيل «لنبدأ»، رفض الحفظ بلا جنس، ثم الحفظ وظهور الاسم
   9-11 تسجيل الطفل بميكروفون مزيّف، ثم التشغيل والحذف
   12-13 تسجيل الوالد بميكروفون صامت وقصير: تنبيه «صامت» و«قصير»
   18  اسم المعلم يبقى بعد إعادة الفتح
   27  «الجديد فقط» بعد تصدير الحزمة يعطي صفراً
   31-33 النسخة الاحتياطية تُنزَّل، والاستعادة تطلب التأكيد، وتقرير التقدم يُنزَّل
   45  الوضع الليلي والخط الكبير بلا تمرير أفقي */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..');
const URL_FILE = (process.env.HASANIYA_URL || 'file:///home/claude/hasaniya-desktop/standalone/hasaniya.html');
const EXE = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';

/* ملف WAV صامت (نصف ثانية) للميكروفون المزيّف */
function silentWav(file, secs) {
  const rate = 16000, n = Math.floor(rate * secs), b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  fs.writeFileSync(file, b);
}
/* خادم محلي بسيط لملفات التطبيق (العامل يحتاج http لا file) */
function serve() {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp' };
  const srv = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\.\.+/g, ''));
    const f = p.endsWith('/') ? p + 'index.html' : p;
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

(async () => {
  const bad = []; const need = (m, ok) => { if (!ok) bad.push(m); };
  const errs = [];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hs99-'));
  const silent = path.join(tmp, 'silent.wav'); silentWav(silent, 0.5);

  /* ---------- 3) دون إنترنت ---------- */
  {
    const srv = await serve(); const port = srv.address().port;
    const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
    const ctx = await b.newContext({ viewport: { width: 390, height: 780 } });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push('offline:' + e.message));
    await p.goto(`http://127.0.0.1:${port}/index.html`);
    await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 20000 }).catch(() => {});
    if (!(await p.evaluate(() => !!navigator.serviceWorker.controller))) { await p.reload(); await p.waitForTimeout(1500); }
    const controlled = await p.evaluate(() => !!navigator.serviceWorker.controller);
    srv.close();
    await ctx.setOffline(true);
    await p.reload(); await p.waitForTimeout(1200);
    const off = await p.evaluate(() => ({ stations: typeof content !== 'undefined' ? content.journeyData.length : 0, scenes: typeof SCENES !== 'undefined' ? Object.keys(SCENES).length : 0 }));
    const p2 = await ctx.newPage(); let short = 0;
    try { await p2.goto(`http://127.0.0.1:${port}/index.html?action=review`); await p2.waitForTimeout(1200); short = await p2.evaluate(() => content.journeyData.length); } catch (e) { short = -1; }
    // صورة مشهد تُعرض من الذاكرة دون اتصال
    const img = await p.evaluate(async () => { const r = await fetch(Object.values(SCENES)[0]); return r.ok && (await r.blob()).size > 1000; }).catch(() => false);
    console.log('offline', JSON.stringify({ controlled, off, short, img }));
    need('عامل الخدمة لم يتحكم بالصفحة', controlled);
    need('التطبيق لا يعمل دون إنترنت: ' + JSON.stringify(off), off.stations === 16 && off.scenes > 0);
    need('اختصار ?action= لا يعمل دون إنترنت', short === 16);
    need('صور المشاهد غير محفوظة للعمل دون إنترنت', img);
    await b.close();
  }

  /* ---------- بقية البنود ---------- */
  const b = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 780 }, acceptDownloads: true });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  const dialogs = []; p.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
  await p.goto(URL_FILE); await p.waitForTimeout(1000);

  // 4-6) أول تشغيل
  const O = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    o.title = document.getElementById('userEditorTitle').textContent;
    o.open = document.getElementById('userEditorPopup').classList.contains('active');
    const nameInp = document.querySelector('#userEditorPopup input[type=text], #userEditorPopup input:not([type])');
    if (nameInp) nameInp.value = 'سارة';
    const before = getCurrentUser().gender || null;
    const saveBtn = [...document.querySelectorAll('#userEditorPopup button')].find(x => /حفظ|ابدأ/.test(x.textContent));
    saveBtn && saveBtn.click(); await w(200);
    o.blocked = document.getElementById('userEditorPopup').classList.contains('active') && !getCurrentUser().gender && before === null;
    o.toast = [...document.querySelectorAll('.toast, #toast')].map(x => x.textContent).join(' ');
    const girl = [...document.querySelectorAll('#userEditorPopup button, #userEditorPopup [onclick]')].find(x => /بنت/.test(x.textContent));
    girl && girl.click(); await w(50);
    saveBtn && saveBtn.click(); await w(300);
    o.saved = getCurrentUser().gender === 'girl' && getCurrentUser().name === 'سارة';
    o.chip = document.getElementById('userName').textContent;
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    return o;
  });
  console.log('onboard', JSON.stringify(O));
  need('أول تشغيل لا يعرض «لنبدأ»: ' + O.title, O.open && /لنبدأ/.test(O.title));
  need('الحفظ بلا جنس لم يُمنع', O.blocked && /ولداً أو بنتاً/.test(O.toast));
  need('الحفظ بالاسم والجنس لم ينجح: ' + O.chip, O.saved && /سارة/.test(O.chip));

  // 9-11) تسجيل الطفل
  const R = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    const vid = content.journeyData[0].verses[0].id;
    await recToggle(vid, null); await w(1500); recStop(); await w(800);
    const rec = await recGet(recKey(vid));
    o.saved = !!rec && rec.blob && rec.blob.size > 0; o.mime = rec && rec.mime;
    let played = false; const orig = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { played = true; return Promise.resolve(); };
    await recPlay(vid); await w(200); HTMLMediaElement.prototype.play = orig; o.played = played;
    await recRemove(vid); await w(200); o.removed = !(await recGet(recKey(vid)));
    return o;
  });
  console.log('childRec', JSON.stringify(R));
  need('تسجيل الطفل لم يُحفظ', R.saved); need('تسجيل الطفل لم يُشغَّل', R.played); need('تسجيل الطفل لم يُحذف بعد التأكيد', R.removed && dialogs.some(d => /حذف/.test(d)));
  await b.close();

  // 12-13) تسجيل الوالد بميكروفون صامت قصير (متصفح منفصل بملف الصمت)
  {
    const b2 = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=' + silent + '%noloop'] });
    const p2 = await (await b2.newContext()).newPage(); p2.on('pageerror', e => errs.push('silent:' + e.message)); p2.on('dialog', d => d.accept());
    await p2.goto(URL_FILE); await p2.waitForTimeout(900);
    const Q = await p2.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      const toasts = []; const orig = window.showToast; window.showToast = (m, t) => { toasts.push(m); return orig(m, t); };
      const vid = content.journeyData[0].verses[0].id;
      pvRecord('verse', vid); await w(500); recStop(); await w(2500);
      const rec = await recGet(authorKey('verse', vid));
      return { saved: !!rec, warnings: rec && rec.q ? rec.q.warnings : null, toasts: toasts.join(' | ') };
    });
    console.log('silent', JSON.stringify(Q));
    need('تسجيل الوالد الصامت لم يُحفظ', Q.saved);
    need('لا تنبيه «صامت» أو «قصير»: ' + JSON.stringify(Q), Q.warnings && Q.warnings.some(x => /صامت/.test(x)) && Q.warnings.some(x => /قصير/.test(x)) && /تنبيه في الصوت/.test(Q.toasts));
    await b2.close();
  }

  // 18، 27، 31-33، 45 — متصفح جديد بملف واحد
  {
    const b3 = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
    const ctx3 = await b3.newContext({ viewport: { width: 360, height: 740 }, acceptDownloads: true });
    const p3 = await ctx3.newPage(); p3.on('pageerror', e => errs.push('misc:' + e.message));
    const dl = []; p3.on('download', d => dl.push(d.suggestedFilename()));
    const dlg = []; p3.on('dialog', d => { dlg.push(d.message()); d.accept(); });
    await p3.goto(URL_FILE); await p3.waitForTimeout(900);
    await p3.evaluate(() => { const u = getCurrentUser(); u.gender = 'boy'; u.name = 'عمر'; saveState(); document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active')); });
    // 18) اسم المعلم
    await p3.evaluate(() => { const i = document.getElementById('vpAuthor'); i.value = 'الأستاذ أحمد'; i.dispatchEvent(new Event('change')); });
    await p3.reload(); await p3.waitForTimeout(900);
    const author = await p3.evaluate(() => vpAuthorName());
    need('اسم المعلم لم يبقَ بعد إعادة الفتح: ' + author, author === 'الأستاذ أحمد');
    // 27) الجديد فقط
    const D = await p3.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      const v = content.journeyData[0].verses[0];
      await recPut({ key: authorKey('verse', v.id), verseId: v.id, kind: 'verse', uid: 'author', mime: 'audio/webm', blob: new Blob([new Uint8Array(2000)], { type: 'audio/webm' }), fp: textFingerprint(v.fullVerse), at: Date.now(), reviewed: true });
      await exportVoicePack(); await w(300);
      document.getElementById('vpOnlyReviewed').checked = false; document.getElementById('vpDeltaOnly').checked = false;
      const all = (await vpPlanExport({ onlyReviewed: false, deltaOnly: false })).selected.length;
      await vpDoExport(); await w(800);
      const delta = (await vpPlanExport({ onlyReviewed: false, deltaOnly: true })).selected.length;
      document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      return { all, delta };
    });
    console.log('delta', JSON.stringify(D));
    need('«الجديد فقط» بعد التصدير ليس صفراً: ' + JSON.stringify(D), D.all === 1 && D.delta === 0);
    // 31) النسخة الاحتياطية، 33) تقرير التقدم
    await p3.evaluate(() => { exportBackup(); exportProgress(); }); await p3.waitForTimeout(800);
    need('ملف النسخة الاحتياطية لم يُنزَّل: ' + dl.join(','), dl.some(n => /^hasaniya_backup_.*\.json$/.test(n)));
    need('تقرير التقدم لم يُنزَّل', dl.some(n => n === 'hasaniya-progress.json'));
    need('حزمة الصوت لم تُنزَّل', dl.some(n => /\.zip$/.test(n)));
    // 32) الاستعادة تطلب التأكيد
    const backup = await p3.evaluate(() => JSON.stringify({ app: 'hasaniya', format: 1, users: users.map(u => ({ id: u.id, name: u.name, avatar: u.avatar, gender: u.gender, createdAt: u.createdAt, state: u.state })) }));
    const bf = path.join(tmp, 'backup.json'); fs.writeFileSync(bf, backup);
    const [chooser] = await Promise.all([p3.waitForEvent('filechooser'), p3.evaluate(() => importBackupFile())]);
    await chooser.setFiles(bf); await p3.waitForTimeout(1500); await p3.waitForLoadState('load'); await p3.waitForTimeout(800);
    need('الاستعادة لم تطلب التأكيد: ' + dlg.join(' | '), dlg.some(m => /استعادة/.test(m)));
    // 45) الليلي والخط الكبير
    const N = await p3.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      try { localStorage.setItem('hasaniya_prefs', JSON.stringify(Object.assign(getPrefs(), { night: true, big: true }))); } catch (e) {}
      applyPrefs(); showMap(); await w(200);
      const o = { night: document.body.classList.contains('night'), big: document.body.classList.contains('text-big'), mapOverflow: document.documentElement.scrollWidth > innerWidth + 2 };
      startStation(0); await w(400);
      o.gameOverflow = document.documentElement.scrollWidth > innerWidth + 2;
      const bg = getComputedStyle(document.body).backgroundColor; o.bg = bg;
      return o;
    });
    console.log('night', JSON.stringify(N));
    await p3.screenshot({ path: path.join(tmp, 'night_big.png') });
    need('الوضع الليلي أو الخط الكبير لم يُطبّق', N.night && N.big);
    need('تمرير أفقي في الوضع الليلي/الخط الكبير', !N.mapOverflow && !N.gameOverflow);
    await b3.close();
  }

  need('أخطاء: ' + errs.join(' | '), errs.length === 0);
  if (bad.length) { console.log('FAIL v99:\n - ' + bad.join('\n - ')); process.exit(1); }
  console.log('OK v99');
})();
