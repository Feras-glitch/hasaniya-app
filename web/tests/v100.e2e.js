/* اختبار v100: شريط البيت (استمع / سجّل / صوتي)، ومنع تداخل الأصوات أثناء التسجيل،
   و«رتّب بالنقر» في صندوق التدريب، والقراءة التلقائية وإعدادها عند الوالد، وأزرار 🔊 */
const { chromium } = require('playwright');
const URL = (process.env.HASANIYA_URL || 'file:///home/claude/hasaniya-desktop/standalone/hasaniya.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const bad = []; const need = (m, ok) => { if (!ok) bad.push(m); };
  const p = await (await b.newContext({ viewport: { width: 360, height: 740 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(() => {
    // نعدّ ما يُرسل إلى القارئ الآلي دون أن ننطقه فعلاً
    window.__said = [];
    const fake = { speaking: false, pending: false, paused: false, speak(u) { window.__said.push(u.text); }, cancel() {}, getVoices() { return []; }, pause() {}, resume() {}, onvoiceschanged: null, addEventListener() {} };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, get: () => fake });
  });
  await p.goto(URL); await p.waitForTimeout(900);
  const R = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    const u = getCurrentUser(); u.gender = 'boy'; u.name = 'عمر'; saveState();
    try { vpPref('onboarded', true); } catch (e) {}
    // الشريط
    startStation(0); await w(400);
    const go = document.getElementById('introGo'); if (go) go.click(); await w(100);
    o.bar = ['listenBtn', 'recordBtn', 'mineBtn'].map(id => !!document.getElementById(id)).join(',');
    o.noMore = !document.querySelector('.tool-more');
    o.mineHidden = getComputedStyle(document.getElementById('mineBtn')).display === 'none';
    // التسجيل
    await recordVerse(); await w(300);
    o.recOn = recIsActive();
    o.recLabel = document.getElementById('recordBtn').textContent;
    o.listenDisabled = document.getElementById('listenBtn').disabled;
    const said0 = window.__said.length;
    guideSay('wrong'); kidToast('اختبار'); listenVerse(); await w(200);
    o.silentDuring = window.__said.length === said0;
    const gb = () => document.getElementById('guideFloat') || document.getElementById('guideBubble');
    o.bubbleHidden = !(gb() && gb().classList.contains('show'));
    await w(900); await recordVerse(); await w(1200);
    o.heldShownAfter = !!(gb() && gb().classList.contains('show'));
    o.recOff = !recIsActive();
    o.mineShown = getComputedStyle(document.getElementById('mineBtn')).display !== 'none';
    o.listenEnabled = !document.getElementById('listenBtn').disabled;
    const v = getCurrentVerse().verse;
    const r1 = await recGet(recKey(v.id));
    o.saved = !!r1;
    // إعادة التسجيل تستبدل السابق
    await recordVerse(); await w(800); await recordVerse(); await w(1000);
    const r2 = await recGet(recKey(v.id)); o.replaced = !!r2 && r2.at > r1.at;
    showMap();
    // رتّب بالنقر في صندوق التدريب
    state.seenVerses[content.journeyData[0].verses[0].id] = true;
    startTapOrderHub(); await w(200);
    const hub = document.getElementById('tapHub');
    o.tapHub = !!hub && hub.querySelectorAll('.word-btn').length > 2;
    const tv = TAP_STATE.verse;
    tv.words.forEach((wd, pos) => { const k = TAP_STATE.shuffled.findIndex((x, i) => x.w === wd && !TAP_STATE.picked.includes(i)); pickTapWord(k); });
    o.tapDone = !!hub.querySelector('.hit') && !hub.querySelector('.miss');
    closePopup('hubPopup');
    // القراءة التلقائية
    const s1 = window.__said.length; kidToast('رسالة للطفل'); await w(50);
    o.autoOn = window.__said.length > s1 && /رسالة للطفل/.test(window.__said[window.__said.length - 1]);
    showParentScreen(); await w(200);
    o.parentRow = !!document.getElementById('autoReadRow') && document.getElementById('autoReadOn').classList.contains('selected-pref');
    setAutoRead(false);
    o.parentOff = document.getElementById('autoReadOff').classList.contains('selected-pref');
    showMap();
    const s2 = window.__said.length; kidToast('لا تُقرأ'); guideSay('welcome'); await w(50);
    o.autoOffSilent = window.__said.length === s2;
    o.childSettingRemoved = !/صوت ناجي المرشد/.test(document.body.innerHTML);
    setAutoRead(true); showMap();
    // أسئلة الاختبار تُقرأ ومعها زر 🔊
    const s3 = window.__said.length;
    startStationQuiz(content.journeyData[0], () => {}); await w(100);
    o.quizSay = !!document.querySelector('#quizBody .say-btn') && window.__said.length > s3;
    document.getElementById('quizPopup').classList.remove('active'); quizState = null;
    // زر 🔊 في الشرح
    startStation(0); await w(300);
    const v0 = getCurrentVerse().verse; showFullVerse(v0); await w(100);
    o.meaningSay = !!document.querySelector('#meaningBox .say-btn');
    return o;
  });
  console.log(JSON.stringify(R));
  need('الشريط ناقص: ' + R.bar, R.bar === 'true,true,true' && R.noMore && R.mineHidden);
  need('التسجيل لم يبدأ أو الزر لم يتحول إلى «أوقف»: ' + R.recLabel, R.recOn && /أوقف/.test(R.recLabel) && R.listenDisabled);
  need('صوت أو فقاعة أثناء التسجيل', R.silentDuring && R.bubbleHidden);
  need('إيقاف التسجيل لم يُظهر «صوتي»', R.recOff && R.mineShown && R.listenEnabled && R.saved);
  need('إعادة التسجيل لم تستبدل السابق', R.replaced);
  need('الفقاعة المحجوزة لم تظهر بعد التسجيل', R.heldShownAfter);
  need('«رتّب بالنقر» لا يعمل في صندوق التدريب', R.tapHub && R.tapDone);
  need('القراءة التلقائية لا تعمل', R.autoOn);
  need('إعداد القراءة التلقائية غير موجود عند الوالد', R.parentRow && R.parentOff);
  need('إيقاف القراءة التلقائية لم يُسكت الرسائل', R.autoOffSilent);
  need('إعداد الصوت ما زال في إعدادات الطفل', R.childSettingRemoved);
  need('سؤال الاختبار لا يُقرأ أو بلا زر 🔊', R.quizSay);
  need('الشرح بلا زر 🔊', R.meaningSay);
  need('أخطاء: ' + errs.join(' | '), errs.length === 0);
  await b.close();
  if (bad.length) { console.log('FAIL v100:\n - ' + bad.join('\n - ')); process.exit(1); }
  console.log('OK v100');
})();
