/* اختبار v81 في المتصفح: صورة المشهد تظهر قبل السؤال حيث توجد، وكل كلمة في «ردّد معي» قابلة للنقر */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 780 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file:///home/claude/hasaniya-desktop/standalone/hasaniya.html');
  await p.waitForTimeout(800);
  await p.evaluate(() => { const u = getCurrentUser(); if (u && !u.gender) { u.gender = 'boy'; saveState(); } closePopup('userEditorPopup'); });
  const bad = [];
  const need = (n, c) => { if (!c) bad.push(n); };
  const R = await p.evaluate(() => {
    const out = {};
    // بيت له صورة (s2v1) وبيت بلا صورة (s2v2)
    state.warmups = {}; state.versePositions = {};
    state.stationStatus[content.journeyData[1].id] = 'current';
    startStation(1);
    state.selectedVerse = 0; loadVerse();
    out.withScene = !!document.querySelector('#gameArea img.scene-img');
    state.selectedVerse = 1; loadVerse();
    out.withoutScene = !!document.querySelector('#gameArea img.scene-img');
    // ردّد معي: عدد الكلمات القابلة للنقر يساوي عدد كلمات البيت
    state.selectedVerse = 0; loadVerse();
    startShadow();
    out.speakWords = document.querySelectorAll('#shadowResult .speak-word').length;
    out.verseWords = getCurrentVerse().verse.words.length;
    return out;
  });
  // 4) درس اليوم: ثلاثة أبيات ثم يتوقف عند الموضع المحفوظ، والشاشة الرئيسية لا تعرض قائمة المحطات
  R.daily = await p.evaluate(() => {
    const out = {};
    showMap();
    out.stationsHiddenOnHome = document.getElementById('stationsArea').style.display === 'none';
    out.infoShown = document.getElementById('dailyInfo').textContent.includes('المحطة 1');
    state.stationStatus = {}; state.versePositions = {}; state.warmups = {};
    state.stationStatus[content.journeyData[0].id] = 'current';
    startDailyLesson();
    out.inLesson = document.getElementById('gameScreen').style.display === 'block';
    for (let k = 0; k < 3; k++) nextVerse();
    out.backToMap = document.getElementById('mapScreen').style.display === 'block';
    out.position = state.versePositions[content.journeyData[0].id];
    out.dailyCleared = state.dailyLeft == null;
    toggleStationList();
    out.stationsShownFromTools = document.getElementById('stationsArea').style.display === 'block';
    toggleStationList();
    return out;
  });
  need('الشاشة الرئيسية لا تعرض قائمة المحطات', R.daily.stationsHiddenOnHome);
  need('بطاقة درس اليوم تعرض المحطة الحالية', R.daily.infoShown);
  need('درس اليوم يبدأ داخل المحطة', R.daily.inLesson);
  need('بعد ثلاثة أبيات يعود الطفل للشاشة الرئيسية', R.daily.backToMap);
  need('الموضع المحفوظ بعد الدرس هو البيت الرابع', R.daily.position === 3);
  need('قائمة المحطات تُفتح من الأدوات', R.daily.stationsShownFromTools);
  // 5) سؤال المكان بعد درس فيه بيت مرتبط بموضع (s3v8 مع الشام)، ومراجعة اليوم تُظهر عدداً
  R.place = await p.evaluate(async () => {
    const out = {};
    state.stationStatus = {}; state.versePositions = {}; state.seenVerses = {};
    content.journeyData.slice(0, 2).forEach(s => state.stationStatus[s.id] = 'completed');
    state.stationStatus[content.journeyData[2].id] = 'current';
    state.versePositions[content.journeyData[2].id] = 5;
    startDailyLesson();
    for (let k = 0; k < 3; k++) nextVerse();
    out.hubOpen = document.getElementById('hubPopup').classList.contains('active');
    out.hubTitle = document.getElementById('hubTitle').textContent;
    out.options = document.querySelectorAll('#placeOpts button').length;
    const correct = [...document.querySelectorAll('#placeOpts button')].find(b => b.textContent === 'الشام');
    out.hasCorrect = !!correct;
    if (correct) correct.click();
    await new Promise(r => setTimeout(r, 1600));
    out.hubClosed = !document.getElementById('hubPopup').classList.contains('active');
    out.backToMap = document.getElementById('mapScreen').style.display === 'block';
    out.dailyLabel = document.getElementById('reviewHubBtn').textContent;
    return out;
  });
  need('سؤال المكان يظهر بعد الدرس', R.place.hubOpen && /أين وقع/.test(R.place.hubTitle));
  need('سؤال المكان فيه ثلاثة خيارات والصحيح بينها', R.place.options === 3 && R.place.hasCorrect);
  need('بعد الجواب يعود الطفل للشاشة الرئيسية', R.place.hubClosed && R.place.backToMap);
  need('زر مراجعة اليوم يعرض عدداً', /\d/.test(R.place.dailyLabel));
  // 6) متابعة الوالد: العلامات تُحفظ مع بيانات الطفل، وملخص لوحة الصف يظهر
  R.follow = await p.evaluate(() => {
    openParentFollow();
    const first = content.journeyData[0].verses[0].id;
    setFollow(first, 'h', true);
    renderFollow();
    const rows = document.querySelectorAll('#fwBody .rec-row').length;
    const kept = !!(state.follow && state.follow[first] && state.follow[first].h === true);
    closePopup('followPopup');
    return { rows, kept, expected: content.journeyData[+document.getElementById('fwStation').value].verses.length };
  });
  need('متابعة الوالد تعرض أبيات المحطة', R.follow.rows === R.follow.expected);
  need('علامة المتابعة تُحفظ', R.follow.kept);
  R.weekly = await p.evaluate(() => {
    dashRows = [{ name: 'تجربة', avatar: '🙂', percent: 30, completed: 1, total: 13, points: 0, streak: 0, minutes: 0, mistakes: 0, achievements: 0, exportedAt: '', days: 0, weak: [{ id: 's1v1', n: 2, text: 'الْحَمْدُ لِلْمَحْمُودِ' }], source: 'نسخة', calcFailed: false }];
    openClassDashboard();
    return document.getElementById('dashBody').innerText;
  });
  need('ملخص لوحة الصف يظهر ويذكر الأبيات المتعثرة', /ملخص مختصر/.test(R.weekly) && /يحتاج متابعة/.test(R.weekly));
  if (!R.withScene) bad.push('الصورة لا تظهر قبل السؤال حيث توجد');
  if (R.withoutScene) bad.push('تظهر صورة في بيت بلا صورة');
  if (R.speakWords !== R.verseWords || !R.speakWords) bad.push('عدد الكلمات القابلة للنقر لا يطابق البيت');
  if (errs.length) bad.push('أخطاء في الصفحة: ' + errs.join(' | '));
  console.log(JSON.stringify(R));
  console.log(bad.length ? 'FAIL: ' + bad.join(' | ') : 'v81 e2e: كل الفحوص نجحت');
  await b.close();
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
