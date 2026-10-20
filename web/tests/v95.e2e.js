/* اختبار v95: طريقة التعلّم
   1) البيت الجديد يُعرض كاملاً بشطريه ويُسمع قبل الترتيب، ولا يتكرر التقديم عند إعادة البيت
   2) التصحيح كلمة بكلمة: الخاطئة ترتد وحدها، يُسجَّل خطأ واحد، وبعد خطأين تُضاء الصحيحة،
      وإكمال البيت بعد خطأ لا يُحسب إتقاناً ويأخذ نصف النقاط
   3) البيت الكامل يُعرض شطرين
   4) القصة الطويلة تُطوى مع «أكمل القصة»
   5) تمرين «البيت التالي» من الأبيات المرئية
   6) ناجي لا ينادي «يا طفلي» ولا يغطي نموذج إنشاء الطفل
   7) كل بيت له موضع فصل صحيح بين الشطرين */
const { chromium } = require('playwright');
const URL = 'file:///home/claude/hasaniya-desktop/standalone/hasaniya.html';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const bad = []; const need = (m, ok) => { if (!ok) bad.push(m); };
  const p = await (await b.newContext({ viewport: { width: 360, height: 740 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL); await p.waitForTimeout(900);
  // 6) قبل أي شيء: الطفل الافتراضي بلا اسم، ونموذج الإنشاء مفتوح
  const G = await p.evaluate(() => {
    const ed = document.getElementById('userEditorPopup');
    ed.classList.add('active');
    guidePanel('اختبار {N}', [], null);
    const bubble = document.getElementById('guideBubble');
    const covered = /اختبار/.test(bubble.textContent || '');
    ed.classList.remove('active');
    return { covered, voc: guideVocative() };
  });
  need('الفقاعة تغطي نموذج إنشاء الطفل', !G.covered);
  need('ناجي ينادي بالاسم الافتراضي: ' + G.voc, !/طفلي/.test(G.voc));

  const R = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    const u = getCurrentUser(); u.gender = 'boy'; u.name = 'عمر'; saveState();
    window.showNewAchievement = () => {};
    // 7) الفصل بين الشطرين
    o.halves = content.journeyData.flatMap(s => s.verses).every(v => v.half >= 1 && v.half < v.words.length);
    // 1) التقديم
    startStation(0); await w(300);
    const intro = document.getElementById('verseIntro');
    o.intro = !!intro && getComputedStyle(intro).display !== 'none';
    o.introShatr = intro ? intro.querySelectorAll('.shatr').length : 0;
    o.orderHidden = getComputedStyle(document.getElementById('orderPart')).display === 'none';
    document.getElementById('introGo').click(); await w(100);
    o.orderShown = getComputedStyle(document.getElementById('orderPart')).display !== 'none' && !document.getElementById('verseIntro');
    o.toolsTucked = !!document.querySelector('.tool-more #recordBtn');
    // 2) خطأ ثم خطأ ثم إكمال
    const v = getCurrentVerse().verse;
    const bank = () => [...document.querySelectorAll('#wordsBank .word-btn')];
    const wrongBtn = bank().find(x => x.textContent !== v.correctOrder[0]);
    const p0 = state.points, m0 = Object.keys(state.mistakes || {}).length;
    wrongBtn.click(); await w(50);
    o.bounced = wrongBtn.classList.contains('bounce') && !wrongBtn.classList.contains('selected');
    o.dzEmpty = document.getElementById('dropZone').children.length === 0;
    wrongBtn.click(); await w(50);
    o.mistakesAdded = Object.keys(state.mistakes || {}).length - m0;
    o.hintLit = bank().some(x => x.classList.contains('hint') && x.textContent === v.correctOrder[0]);
    for (const word of v.correctOrder) { const bt = bank().find(x => x.textContent === word && !x.classList.contains('selected')); bt.click(); }
    await w(200);
    o.next = getComputedStyle(document.getElementById('nextBtn')).display !== 'none';
    o.flawedPts = state.points - p0;
    o.correctStat = (state.verseStats[v.id] || {}).correct || 0;
    o.box = (state.leitner[v.id] || {}).box;
    // 3) البيت الكامل بشطرين
    o.fullShatr = document.querySelectorAll('#fullVerseText .shatr').length;
    // إعادة البيت نفسه: لا تقديم
    loadVerse(); await w(150);
    o.noIntroAgain = !document.getElementById('verseIntro');
    // البيت التالي دون خطأ: إتقان ونقاط كاملة
    nextVerse(); await w(300);
    document.getElementById('introGo').click();
    const v2 = getCurrentVerse().verse; const p1 = state.points;
    for (const word of v2.correctOrder) { const bt = bank().find(x => x.textContent === word && !x.classList.contains('selected')); bt.click(); }
    await w(200);
    o.cleanPts = state.points - p1; o.cleanStat = (state.verseStats[v2.id] || {}).correct || 0;
    showMap();
    // 4) طيّ القصة الطويلة
    const longV = content.journeyData.flatMap(s => s.verses).find(x => x.id === 's8v4');
    renderStoryContent(longV);
    const st = document.getElementById('storyText');
    o.folded = !!st.querySelector('.story-more') && st.textContent.length < longV.story.length;
    st.querySelector('.story-more').click();
    o.unfolded = st.textContent === longV.story;
    const shortV = content.journeyData.flatMap(s => s.verses).find(x => x.id === 's3v2');
    renderStoryContent(shortV); o.shortWhole = st.textContent === shortV.story && !st.querySelector('.story-more');
    // 5) البيت التالي
    content.journeyData[0].verses.forEach(x => { state.seenVerses[x.id] = true; });
    const qs = buildNextQs(5, seenJourney());
    const all = content.journeyData.flatMap(s => s.verses);
    o.nextQs = qs.length;
    o.nextOk = qs.every(q => { const a = /«(.*)»/.exec(q.prompt)[1]; const i = all.findIndex(x => x.fullVerse === a); return all[i + 1].fullVerse === q.correct && q.options.includes(q.correct) && new Set(q.options).size === 3 && q.options.every(op => all.some(x => x.fullVerse === op && state.seenVerses[x.id])); });
    return o;
  });
  console.log(JSON.stringify(R));
  need('موضع الفصل بين الشطرين', R.halves);
  need('لا تقديم للبيت الجديد', R.intro && R.introShatr === 2 && R.orderHidden);
  need('زر «أرتّبه الآن» لا يُظهر الترتيب', R.orderShown);
  need('أدوات التسجيل والنقر ليست تحت «⋯»', R.toolsTucked);
  need('الكلمة الخاطئة لم ترتد وحدها', R.bounced && R.dzEmpty);
  need('عدد الأخطاء المسجلة: ' + R.mistakesAdded, R.mistakesAdded === 1);
  need('لم تُضأ الكلمة الصحيحة بعد خطأين', R.hintLit);
  need('لا يظهر «التالي» بعد إكمال البيت', R.next);
  need('نقاط البيت بعد خطأ: ' + R.flawedPts, R.flawedPts === 5);
  need('البيت بعد خطأ حُسب إتقاناً', R.correctStat === 0 && R.box === 1);
  need('البيت الكامل ليس شطرين', R.fullShatr === 2);
  need('التقديم تكرر لبيت مرئي', R.noIntroAgain);
  need('البيت السليم: نقاط ' + R.cleanPts + ' / إتقان ' + R.cleanStat, R.cleanPts === 10 && R.cleanStat === 1);
  need('القصة الطويلة لم تُطوَ', R.folded); need('«أكمل القصة» لا يعرض كاملها', R.unfolded); need('القصة القصيرة طُويت', R.shortWhole);
  need('تمرين البيت التالي: ' + R.nextQs, R.nextQs >= 3 && R.nextOk);
  need('أخطاء: ' + errs.join(' | '), errs.length === 0);
  await b.close();
  if (bad.length) { console.log('FAIL v95:\n - ' + bad.join('\n - ')); process.exit(1); }
  console.log('OK v95');
})();
