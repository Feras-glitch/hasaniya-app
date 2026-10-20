/* اختبار التطبيق على هاتف أندرويد افتراضي (يعمل في GitHub Actions، انظر .github/workflows/device-test.yml)
   يحتاج: adb متصلاً بهاتف افتراضي، وplaywright، ونسختين من التطبيق القابل للفحص (debug) موقّعتين بالمفتاح نفسه:
     APK_V1  النسخة الحالية
     APK_V2  النسخة نفسها برقم أعلى (لاختبار التحديث فوق نسخة مثبّتة)
     OUT_DIR مجلد الصور والتقرير
   كل بند: ✔ نجح، ✘ فشل، ⚠ تعذّر قياسه على الهاتف الافتراضي (لا يُفشل البناء، ويُجرَّب يدوياً). */
const { _android: android } = require('playwright');
const fs = require('fs'), path = require('path');
const PKG = 'com.hasaniya.app';
const OUT = process.env.OUT_DIR || 'device-results';
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const rec = (n, name, ok, detail, soft) => { results.push({ n, name, ok, detail: String(detail || ''), soft: !!soft }); console.log(`${ok ? '✔' : soft ? '⚠' : '✘'} [${n}] ${name} ${detail || ''}`); if (!ok) console.log(`::${soft ? 'warning' : 'error'}::[${n}] ${name} ${String(detail || '').slice(0, 200)}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
/* كل خطوة لها مهلة: لا يعلق الاختبار كله إن تعطّلت خطوة واحدة */
const within = (ms, p, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('انتهت المهلة (' + (ms / 1000) + ' ث): ' + (what || ''))), ms))]);
const note = m => console.log('::notice::' + m);
/* حارس عام: إن علق الاختبار نكتب موضع العلوق وما نجح قبله ثم نخرج، بدل أن يقطعه GitHub بلا معلومة */
let current = 'البدء';
const at = s => { current = s; console.log('… ' + s); };
setTimeout(() => {
  console.log('::error::علق الاختبار عند: ' + current);
  console.log('::notice::' + results.map(r => `${r.ok ? '✔' : r.soft ? '⚠' : '✘'}${r.n}`).join(' '));
  process.exit(1);
}, 14 * 60 * 1000).unref();

(async () => {
  const [device] = await android.devices();
  if (!device) { console.log('لا يوجد هاتف متصل'); process.exit(1); }
  const sh = async c => (await within(30000, device.shell(c), c)).toString();
  const shot = async name => { try { await device.screenshot({ path: path.join(OUT, name + '.png') }); } catch (e) {} };
  const resumed = async () => (await sh('dumpsys activity activities')).split('\n').filter(l => /ResumedActivity/.test(l)).join(' ');
  const appOnTop = async () => (await resumed()).includes(PKG + '/');
  const launch = async () => {
    // ننتظر زوال أي صفحة قديمة للتطبيق (بعد إغلاق قسري أو تحديث) حتى لا نتصل بصفحة ميتة
    for (let i = 0; i < 20 && device.webViews().some(w => w.pkg() === PKG); i++) await sleep(500);
    await sh(`am start -n ${PKG}/.MainActivity`);
    const wv = await within(90000, device.webView({ pkg: PKG }, { timeout: 80000 }), 'الاتصال بصفحة التطبيق');
    const page = await wv.page();
    await within(40000, page.waitForFunction(() => typeof content !== 'undefined' && content.journeyData && content.journeyData.length > 0, null, { timeout: 30000 }), 'تحميل التطبيق');
    await sleep(800);
    // كل تقييم داخل الصفحة بمهلة دقيقة
    const ev = page.evaluate.bind(page);
    page.evaluate = (fn, arg) => within(60000, ev(fn, arg), 'تقييم داخل الصفحة: ' + current);
    return page;
  };
  const back = async () => { await sh('input keyevent 4'); await sleep(1500); };
  const errors = [];

  /* 1) التثبيت والفتح */
  at('التثبيت والفتح');
  await sh(`pm uninstall ${PKG}`).catch(() => {});
  await device.installApk(fs.readFileSync(process.env.APK_V1));
  await sh(`pm grant ${PKG} android.permission.RECORD_AUDIO`).catch(() => {});
  let page = await launch();
  page.on('pageerror', e => errors.push(e.message));
  const first = await page.evaluate(() => ({ stations: content.journeyData.length, onboarding: document.getElementById('userEditorPopup').classList.contains('active'), bridge: !!window.AndroidBridge }));
  await shot('01_first_launch');
  rec(1, 'التثبيت والفتح', first.stations === 16 && first.bridge, JSON.stringify(first));

  /* تجهيز طفل بتقدّم */
  at('تجهيز الطفل');
  await page.evaluate(() => {
    const u = getCurrentUser(); u.name = 'تجربة'; u.gender = 'boy';
    // إنهاء الإعداد الأول كما يفعل الوالد، حتى لا تُفتح نافذة الإعداد من جديد
    try { vpPref('onboarded', true); } catch (e) {}
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    markStationCompleted(content.journeyData[0]); state.points = 777;
    content.journeyData[0].verses.forEach(v => { state.seenVerses[v.id] = true; });
    saveState(); showMap();
  });
  await sleep(600); await shot('02_map');

  /* 2) زر الرجوع: يغلق النافذة أولاً */
  at('زر الرجوع');
  try {
    const pre = await page.evaluate(() => [...document.querySelectorAll('.modal-overlay.active')].map(m => m.id));
    if (pre.length) note('نوافذ مفتوحة قبل اختبار الرجوع: ' + pre.join(','));
    await page.evaluate(() => { document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active')); openReviewHub(); }); await sleep(500);
    await back();
    const st = await page.evaluate(() => ({ hub: document.getElementById('hubPopup').classList.contains('active'), open: [...document.querySelectorAll('.modal-overlay.active')].map(m => m.id).join(',') }));
    rec(40, 'زر الرجوع يغلق النافذة ولا يخرج', !st.hub && await appOnTop(), JSON.stringify(st));
    await page.evaluate(() => startStation(0)); await sleep(800);
    await back();
    const onMap = await page.evaluate(() => getComputedStyle(document.getElementById('mapScreen')).display !== 'none');
    rec(41, 'زر الرجوع من الدرس يعود إلى الخريطة', onMap && await appOnTop());
  } catch (e) { rec(40, 'زر الرجوع', false, e.message); }

  /* 3) تدوير الشاشة */
  at('التدوير');
  try {
    await sh('settings put system accelerometer_rotation 0'); await sh('settings put system user_rotation 1'); await sleep(2500);
    await shot('03_landscape');
    const s = await page.evaluate(() => ({ pts: state.points, s1: state.stationStatus.s1, overflow: document.documentElement.scrollWidth > innerWidth + 2 }));
    rec(42, 'تدوير الشاشة دون فقد التقدّم', s.pts === 777 && s.s1 === 'completed', JSON.stringify(s));
    await sh('settings put system user_rotation 0'); await sleep(1500);
  } catch (e) { rec(42, 'تدوير الشاشة', false, e.message); }

  /* 4) الميكروفون (الهاتف الافتراضي قد لا يملك صوتاً فعلياً) */
  at('الميكروفون');
  try {
    const m = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      const toasts = []; const o = window.showToast; window.showToast = (t, k) => { toasts.push(t); return o(t, k); };
      const vid = content.journeyData[0].verses[0].id;
      await recToggle(vid, null); await w(1800); if (recState.recorder) recStop(); await w(1200);
      const r = await recGet(recKey(vid));
      return { saved: !!r && r.blob && r.blob.size > 0, size: r && r.blob ? r.blob.size : 0, toasts: toasts.join(' | ') };
    });
    if (m.saved) rec(9, 'إذن الميكروفون والتسجيل', true, 'حجم ' + m.size);
    else rec(9, 'إذن الميكروفون والتسجيل', false, 'الهاتف الافتراضي لم يسجّل: ' + m.toasts, true);
  } catch (e) { rec(9, 'الميكروفون', false, e.message, true); }

  /* 5) نافذة المشاركة: النسخة الاحتياطية وتقرير الأسبوع */
  const chooserCheck = async (n, name, fn) => {
    try {
      at('المشاركة ' + n);
      await page.evaluate(fn); await sleep(3000);
      const r = await resumed();
      const ok = /Chooser|Resolver|IntentForwarder|sharesheet/i.test(r);
      await shot(`share_${n}`);
      rec(n, name, ok, ok ? '' : r.slice(0, 200));
      if (!(await appOnTop())) await back();
      if (!(await appOnTop())) await sh(`am start -n ${PKG}/.MainActivity`), await sleep(1500);
    } catch (e) { rec(n, name, false, e.message); }
  };
  await chooserCheck(31, 'النسخة الاحتياطية تفتح نافذة المشاركة/الحفظ', () => exportBackup());
  await chooserCheck(33, 'تقرير التقدم يفتح نافذة المشاركة/الحفظ', () => exportProgress());
  await chooserCheck(50, 'تقرير الأسبوع يفتح نافذة المشاركة (كان معطّلاً قبل v94)', () => shareWeeklyText());

  /* 6) الطباعة */
  at('الطباعة');
  try {
    await page.evaluate(() => { const w = window.open('', '_blank'); w.document.open(); w.document.write('<html dir=rtl><body><h1>شهادة تجربة</h1></body></html>'); w.document.close(); });
    await sleep(4000);
    const r = await resumed();
    const ok = /printspooler|Print/i.test(r);
    await shot('print');
    rec(39, 'الطباعة تفتح نافذة الطباعة', ok, ok ? '' : r.slice(0, 200), !ok);
    if (!(await appOnTop())) { await back(); await back(); }
  } catch (e) { rec(39, 'الطباعة', false, e.message, true); }

  /* 7) نافذة اختيار الملفات (استعادة النسخة الاحتياطية) */
  at('اختيار الملفات');
  try {
    if (!(await appOnTop())) { await sh(`am start -n ${PKG}/.MainActivity`); await sleep(1500); }
    await page.evaluate(() => {
      const b = document.createElement('button'); b.id = 'tPick'; b.textContent = 'اختبار';
      b.style.cssText = 'position:fixed;top:40%;left:30%;width:40%;height:80px;z-index:99999';
      b.onclick = () => importBackupFile(); document.body.appendChild(b);
    });
    await page.click('#tPick'); await sleep(3500);
    const r = await resumed();
    const ok = /documentsui|DocumentsActivity|FilesActivity|PickActivity|Chooser/i.test(r);
    await shot('file_picker');
    rec(32, 'استعادة النسخة تفتح نافذة اختيار الملفات', ok, ok ? '' : r.slice(0, 200));
    while (!(await appOnTop())) await back();
    await page.evaluate(() => { const b = document.getElementById('tPick'); if (b) b.remove(); });
  } catch (e) { rec(32, 'اختيار الملفات', false, e.message); }

  /* 8) الوضع الليلي والخط الكبير */
  at('الليلي');
  try {
    await page.evaluate(() => { localStorage.setItem('hasaniya_prefs', JSON.stringify(Object.assign(getPrefs(), { night: true, big: true }))); applyPrefs(); showMap(); });
    await sleep(800); await shot('04_night_big_map');
    await page.evaluate(() => startStation(0)); await sleep(1000); await shot('05_night_big_lesson');
    const o = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 2, night: document.body.classList.contains('night') }));
    rec(45, 'الوضع الليلي والخط الكبير دون تمرير أفقي', o.night && !o.overflow, JSON.stringify(o));
    await page.evaluate(() => { localStorage.setItem('hasaniya_prefs', JSON.stringify(Object.assign(getPrefs(), { night: false, big: false }))); applyPrefs(); showMap(); });
  } catch (e) { rec(45, 'الليلي والخط الكبير', false, e.message); }

  /* 9) الإغلاق القسري وإعادة الفتح دون إنترنت */
  at('دون إنترنت بعد إغلاق قسري');
  try {
    note('دون إنترنت: وضع الطيران ثم إغلاق قسري');
    await sh('cmd connectivity airplane-mode enable').catch(e => note(e.message));
    await sh(`am force-stop ${PKG}`); await sleep(1500);
    page = await launch();
    const s = await page.evaluate(() => ({ pts: state.points, s1: state.stationStatus.s1, name: getCurrentUser().name, scenes: Object.keys(SCENES).length }));
    const img = await page.evaluate(async () => { const r = await fetch(Object.values(SCENES)[0]); return r.ok; });
    await shot('06_offline_relaunch');
    rec(3, 'يعمل دون إنترنت بعد إغلاقه قسراً', s.s1 === 'completed' && img, JSON.stringify(s));
    rec(43, 'الإغلاق القسري لا يفقد التقدّم', s.pts === 777 && s.name === 'تجربة', JSON.stringify(s));
    await sh('cmd connectivity airplane-mode disable').catch(() => {});
  } catch (e) { rec(43, 'الإغلاق وإعادة الفتح', false, e.message); }

  /* 10) تثبيت تحديث فوق النسخة الحالية */
  at('التحديث');
  try {
    const v1 = (await sh(`dumpsys package ${PKG}`)).match(/versionCode=(\d+)/);
    note('تثبيت التحديث');
    await sh(`am force-stop ${PKG}`);
    await within(120000, device.installApk(fs.readFileSync(process.env.APK_V2), { args: ['-r'] }), 'تثبيت التحديث');
    const v2 = (await sh(`dumpsys package ${PKG}`)).match(/versionCode=(\d+)/);
    page = await launch();
    const s = await page.evaluate(() => ({ pts: state.points, s1: state.stationStatus.s1, name: getCurrentUser().name }));
    await shot('07_after_update');
    rec(51, 'تحديث التطبيق فوق نسخة مثبّتة يحفظ تقدّم الطفل',
      v1 && v2 && +v2[1] === +v1[1] + 1 && s.pts === 777 && s.s1 === 'completed' && s.name === 'تجربة',
      `من ${v1 && v1[1]} إلى ${v2 && v2[1]} — ${JSON.stringify(s)}`);
  } catch (e) { rec(51, 'التحديث فوق نسخة مثبّتة', false, e.message); }

  rec(0, 'لا أخطاء برمجية في الصفحة', errors.length === 0, errors.slice(0, 3).join(' | '));
  await within(10000, device.close(), 'إغلاق الاتصال').catch(() => {});

  /* التقرير */
  const hard = results.filter(r => !r.ok && !r.soft), soft = results.filter(r => !r.ok && r.soft);
  // ملاحظة واحدة تجمع كل البنود (GitHub يعرض 10 ملاحظات فقط لكل خطوة)
  console.log('::notice::' + results.map(r => `${r.ok ? '✔' : r.soft ? '⚠' : '✘'}${r.n}`).join(' '));
  const md = ['## اختبار الهاتف الافتراضي', '',
    hard.length ? `**فشل ${hard.length} بنداً**` : '**نجحت كل البنود الأساسية**', '',
    '| البند في قائمة الفحص | الاختبار | النتيجة | تفاصيل |', '|---|---|---|---|',
    ...results.map(r => `| ${r.n || '—'} | ${r.name} | ${r.ok ? '✔' : r.soft ? '⚠ يُجرَّب يدوياً' : '✘'} | ${r.detail.replace(/\|/g, '/').slice(0, 160)} |`),
    '', 'الصور في Artifacts باسم device-screens.'].join('\n');
  fs.writeFileSync(path.join(OUT, 'report.md'), md);
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 1));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  process.exit(hard.length ? 1 : 0);
})().catch(e => { console.log('خطأ في الاختبار: ' + e.stack); process.exit(1); });
