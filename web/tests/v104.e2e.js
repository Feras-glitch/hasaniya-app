/* اختبار v104 (إصلاحات فحص v103 وتوصيات v102 المعتمدة):
   1) الرقم السري في مفتاح جديد لا تمحوه النسخ القديمة، وسجلّ ما جرى عليه، وتنبيه الوالد
   2) نسخة المحتوى السابقة، وحارس الكتابة من نافذة قديمة، وتهريب الأيقونات، وحفظ تقييمات التسميع العامة
   3) صناديق المراجعة بالقواعد الجديدة، والتلميح لا يُحسب إتقاناً، والحصة اليومية تبدأ بالمراجعة، و«سمّعه الآن»
   4) الاختبار يُضيء الجواب الصحيح ويحفظ النتيجة، وتقرير المعلم، ولوحة المتابعة
   5) وضع الصغير (الترتيب شطراً شطراً وسماع الكلمة)، وربط البيت بما قبله، والسؤال قبل الشرح، وحدّ اللعب، وطابور الإنجازات
   6) العدد والمعدود، وعناوين اختيار الملفات بالعربية، وساعة نسخة الحاسوب، وتنبيه «لا صوت» أعلى الشاشة */
const { chromium } = require('playwright');
const URL = (process.env.HASANIYA_URL || 'file:///home/claude/hasaniya-desktop/standalone/hasaniya.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const bad = []; const need = (m, ok) => { if (!ok) bad.push(m); };
  const p = await (await b.newContext({ viewport: { width: 380, height: 760 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(() => {
    window.__said = []; window.__voices = [{ name: 'ar', lang: 'ar-SA' }];
    const q = []; let busy = false;
    const next = () => {
      if (busy || !q.length) return; busy = true;
      const u = q[0];
      setTimeout(() => { if (q[0] !== u) return; if (u.onstart) u.onstart({}); setTimeout(() => {
        if (q[0] !== u) return; q.shift(); busy = false; if (u.onend) u.onend({}); next(); }, 20); }, 5);
    };
    const fake = {
      get speaking() { return q.length > 0; }, pending: false, paused: false,
      speak(u) { window.__said.push(u.text); q.push(u); next(); },
      cancel() { const old = q.splice(0); busy = false; old.forEach(u => { if (u.onerror) u.onerror({ error: 'interrupted' }); }); },
      getVoices() { return window.__voices; }, pause() {}, resume() {}, onvoiceschanged: null, addEventListener() {}
    };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, get: () => fake });
  });
  await p.goto(URL); await p.waitForTimeout(900);
  const R = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    const closeAll = () => document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    closeAll();
    const u = getCurrentUser(); u.gender = 'boy'; u.name = 'عمر'; saveState();
    try { vpPref('onboarded', true); } catch (e) {}
    const today = new Date().toDateString();

    /* ---------- 1) الرقم السري ---------- */
    localStorage.removeItem(STORAGE_PIN2); localStorage.removeItem(STORAGE_PIN_MIG);
    localStorage.setItem(STORAGE_PIN, 'HASH-OLD');
    o.pinMigrated = pinStoreLoad() === 'HASH-OLD' && localStorage.getItem(STORAGE_PIN2) === 'HASH-OLD' && localStorage.getItem(STORAGE_PIN_MIG) === '1';
    localStorage.removeItem(STORAGE_PIN);   // نسخة قديمة تمحو مفتاحها
    o.pinSurvivesOldRemove = pinStoreLoad() === 'HASH-OLD' && localStorage.getItem(STORAGE_PIN) === 'HASH-OLD';
    pinStoreRemove();
    o.pinRemoved = pinStoreLoad() === null && !pinStoreHas();
    localStorage.setItem(STORAGE_PIN, 'HASH-STALE');   // بعد الترحيل لا يُقرأ القديم وحده
    o.pinNoReimport = pinStoreLoad() === null;
    localStorage.removeItem(STORAGE_PIN);
    localStorage.removeItem(PIN_LOG_KEY);
    pinLog('set'); pinLog('remove');
    o.pinLog = pinLogGet().length === 2 && pinLogHTML(5).includes(PIN_LOG_LABELS.remove);
    renderParentAlerts();
    o.alertPin = /🔐/.test(document.getElementById('parentAlerts').innerHTML);

    /* ---------- 2) المحتوى والحفظ ---------- */
    contentSnapshotSave(content.journeyData, 'اختبار', true, 38);
    o.prevInfo = /تغيّر محتوى التطبيق/.test(contentPrevInfo());
    renderParentAlerts();
    o.alertContent = /المحتوى السابق/.test(document.getElementById('parentAlerts').innerHTML);
    contentPrevDismiss();
    o.prevDismissed = contentPrevInfo() === '' && !!contentSnapshotGet();
    const t0 = content.journeyData[0].title;
    contentSnapshotSave(JSON.parse(JSON.stringify(content.journeyData)).map((s, i) => i === 0 ? Object.assign(s, { title: 'عنوان قديم' }) : s), 'اختبار', true, 38);
    restoreContentPrev(); await w(50);
    o.restored = content.journeyData[0].title === 'عنوان قديم' && contentSnapshotGet().journeyData[0].title === t0;
    restoreContentPrev(); await w(50);   // ويُعاد كما كان
    o.restoredBack = content.journeyData[0].title === t0;
    closeAll();
    /* الأيقونة لا تُحقن في الخريطة */
    const ic = content.journeyData[0].icon;
    content.journeyData[0].icon = '<img src=x onerror="window.__xss=1">';
    renderMap(); await w(80);
    o.iconEscaped = !document.querySelector('#stationsArea img[src="x"]') && !window.__xss;
    content.journeyData[0].icon = ic; renderMap();
    /* تقييم التسميع العام (sec:*) يبقى بعد التنظيف */
    state.recEval = { 'sec:all': { fluency: 3, evaluator: 'x', date: 1 }, 'sec:station-3': { fluency: 2 }, 'bogus': { fluency: 1 } };
    cleanupOrphanedState();
    o.secKept = !!state.recEval['sec:all'] && !!state.recEval['sec:station-3'] && !state.recEval.bogus;
    state.recEval = {}; saveState();
    /* إخفاء التطبيق يوقف الصوت ويحفظ */
    const realStop = audioStopAll; let stopped = 0;
    audioStopAll = function () { stopped++; return realStop.apply(this, arguments); };
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange')); await w(30);
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    audioStopAll = realStop;
    o.stopOnHidden = stopped > 0;

    /* ---------- 3) صناديق المراجعة ---------- */
    state.leitner = {}; state.dailyCredits = {}; state.verseStats = {};
    state.seenVerses = Object.assign(state.seenVerses || {}, { s1v1: true, s1v2: true, s1v3: true });
    const dayStart = leitnerDayStart(), D = 86400000;
    leitnerRecord('s1v1', true);
    o.newBox1 = state.leitner.s1v1.box === 1 && state.leitner.s1v1.due === dayStart + D;
    leitnerRecord('s1v1', true);
    o.noEarlyPromote = state.leitner.s1v1.box === 1;
    state.leitner.s1v1.due = Date.now() - 1000;
    leitnerRecord('s1v1', true);
    o.promoteWhenDue = state.leitner.s1v1.box === 2 && state.leitner.s1v1.due === dayStart + 2 * D;
    leitnerRecord('s1v2', true); leitnerRecord('s1v2', true, { parent: true });
    o.parentOverrides = state.leitner.s1v2.box === 2;
    leitnerRecord('s1v3', true); leitnerRecord('s1v3', false); state.leitner.s1v3.due = Date.now() - 1000;
    leitnerRecord('s1v3', true);
    o.sameDayWrongBlocks = state.leitner.s1v3.box === 1;
    leitnerRecord('s5v9', true);
    o.unseenIgnored = !state.leitner.s5v9;
    o.reviewCountDueOnly = dailyReviewCount() === leitnerDueVerses().length;

    /* الحصة اليومية: المستحق أولاً، مرة في اليوم */
    state.leitner.s1v1.due = Date.now() - 1000; state.dailyReviewDay = null;
    startDailyLesson(); await w(200);
    o.dailyReviewFirst = playMode === MODE_REVIEW && playQueue.length >= 1 && state.dailyReviewDay === today && dailyFlow === true;
    showMap(); await w(100); closeAll();
    startDailyLesson({ afterReview: true }); await w(200);   // v105: بعد جلسة المراجعة يأتي الجديد
    o.dailyThenLesson = playMode === MODE_NORMAL && state.dailyLeft === 3;
    showMap(); await w(100); closeAll();

    /* سمّعه الآن */
    state.leitner = { s1v2: { box: 1, due: Date.now() - 1000, lastWrong: 0 }, s1v1: { box: 3, due: Date.now() - 2000, lastWrong: 0 } };
    state.dailyCredits = {}; state.verseStats = {}; state.parentChecks = {};
    renderParentCheckCard();
    o.pcCard = /سمّعه الآن/.test(document.getElementById('parentCheckCard').innerHTML);
    pcStart(); await w(50);
    const first = pcState.list[0].v.id, second = pcState.list[1].v.id;
    o.pcHidden = document.getElementById('pcVerse') && document.getElementById('pcVerse').hidden === true;
    const b0 = state.leitner[first].box;
    pcRate('ok');
    o.pcOk = state.leitner[first].box === b0 + 1 && state.verseStats[first].correct === 1 && state.parentChecks[first].r === 'ok';
    pcRate('fail');
    o.pcFail = state.leitner[second].box === 1 && state.verseStats[second].wrong === 1 && state.parentChecks[second].r === 'fail';
    while (pcState) pcRate('fath');
    o.pcDoneText = /فتح/.test(document.getElementById('hubBody') ? document.getElementById('hubBody').textContent : document.body.textContent);
    closeAll();

    /* التلميح لا يُحسب إتقاناً، والسؤال قبل الشرح */
    state.leitner = {}; state.dailyCredits = {}; state.verseStats = {}; state.storyUnlocked = {};
    const si = 0, st0 = content.journeyData[si];
    /* محطة فيها قصص تُفتح للاختبار */
    const ssi = content.journeyData.findIndex(s => s.verses.some((v, i) => i > 0 && v.type === 'word_order' && v.story && v.meaning));
    const sst = content.journeyData[ssi];
    const vi = sst.verses.findIndex((v, i) => i > 0 && v.type === 'word_order' && v.story && v.meaning);
    o.foundVerse = vi > 0;
    if (vi > 0) {
      const v = sst.verses[vi];
      state.stationStatus[sst.id] = 'current';
      delete state.seenVerses[v.id];
      state.versePositions[sst.id] = vi;
      startStation(ssi); await w(400); closeAll();
      if (!getCurrentVerse() || getCurrentVerse().verse.id !== v.id) { state.selectedVerse = vi; loadVerse(); await w(300); }
      o.chainShown = !!document.querySelector('#verseIntro .intro-prev') && /مع ما قبله/.test(document.getElementById('verseIntro').textContent);
      giveHint();
      const order = v.correctOrder;
      for (const word of order) {
        const btn = [...document.querySelectorAll('#wordsBank .word-btn')].find(x => !x.classList.contains('selected') && x.textContent === word);
        if (btn) btn.click();
        await w(5);
      }
      await w(300);
      const vs = state.verseStats[v.id];
      o.hintNotMastery = (!vs || vs.correct === 0) && !!state.leitner[v.id] && state.leitner[v.id].box === 1;
      o.meaningAfterQuestion = document.getElementById('meaningBox').style.display === 'none' && !!document.querySelector('#storyText .word-btn');
      const opt = document.querySelector('#storyText .word-btn');
      if (opt) { opt.click(); await w(100); }
      o.meaningShownAfter = document.getElementById('meaningBox').style.display !== 'none'
        && [...document.querySelectorAll('#storyText .word-btn')].some(x => x.classList.contains('success'));
    }
    delete state.stationStatus[sst.id];
    showMap(); await w(100); closeAll();

    /* ---------- 4) الاختبار والتقارير ---------- */
    const qst = content.journeyData.find(s => (QUIZZES[s.id] || []).length);
    let qDone = false;
    startStationQuiz(qst, () => { qDone = true; }); await w(50);
    const it0 = QUIZZES[qst.id][0];
    const wrongBtn = [...document.querySelectorAll('#quizBody .word-btn')].find(x => x.textContent !== it0.correct);
    wrongBtn.click(); await w(30);
    o.quizHighlight = [...document.querySelectorAll('#quizBody .word-btn')].some(x => x.textContent === it0.correct && x.classList.contains('success'));
    for (let k = 0; k < 20 && !qDone; k++) {
      const nb = document.querySelector('#quizBody .quiz-next'); if (nb && !nb.disabled) nb.click();
      await w(60);
      const c = QUIZZES[qst.id][quizState ? quizState.i : 0];
      const good = quizState && [...document.querySelectorAll('#quizBody .word-btn')].find(x => !x.disabled && x.textContent === c.correct);
      if (good) good.click();
      await w(30);
    }
    const qr = (state.quizResults || {})[qst.id];
    o.quizSaved = qDone && !!qr && qr.total === QUIZZES[qst.id].length && qr.score === qr.total - 1;
    state.stampDates = state.stampDates || {}; state.stampDates[qst.id] = Date.now();
    const rep = buildTeacherReportHtml();
    o.reportQuiz = rep.includes('اختبار الفهم') && rep.includes(`${qr ? qr.score : '?'} / ${qr ? qr.total : '?'}`);
    o.reportDate = !rep.includes(String(state.stampDates[qst.id]));
    o.dashDefault = document.getElementById('dashSort').value === 'mastered';
    o.masteredRule = (() => {
      const s = { seenVerses: { a: true }, verseStats: { a: { correct: 2, wrong: 1, lastCorrect: 5, lastWrong: 3 }, b: { correct: 5, wrong: 0, lastCorrect: 5, lastWrong: 0 } } };
      return verseMastered('a', s) && !verseMastered('b', s);   // b لم يُرَ في درس
    })();

    /* ---------- 5) وضع الصغير، وحدّ اللعب، وطابور الإنجازات ---------- */
    u.small = true; applyKidMode(); saveState();
    const sv = st0.verses.find(v => v.type === 'word_order' && v.half > 0 && v.half < v.words.length);
    const svi = st0.verses.indexOf(sv);
    state.seenVerses[sv.id] = true;   // بلا مقدمة الاستماع
    state.versePositions[st0.id] = svi; startStation(si); await w(400); closeAll();
    if (!getCurrentVerse() || getCurrentVerse().verse.id !== sv.id) { state.selectedVerse = svi; loadVerse(); await w(300); }
    const later = () => [...document.querySelectorAll('#wordsBank .word-btn.later')];
    o.halvesHidden = later().length === sv.words.length - sv.half && later().every(x => x.hidden);
    window.__said = [];
    const pick = async word => {
      const btn = [...document.querySelectorAll('#wordsBank .word-btn')].find(x => !x.hidden && !x.classList.contains('selected') && x.textContent === word);
      if (btn) btn.click(); await w(5); return !!btn;
    };
    for (let k = 0; k < sv.half; k++) await pick(sv.correctOrder[k]);
    o.halvesRevealed = later().every(x => !x.hidden);
    await w(150);
    o.wordSpoken = window.__said.some(t => normalizeArabic(t).includes(normalizeArabic(sv.correctOrder[0])));
    undoWord();
    o.halvesRehidden = later().every(x => x.hidden || x.classList.contains('selected'));
    o.smallButton = !document.querySelector('#gameScreen .tool-btn[onclick*="showMistakes"]') || getComputedStyle(document.querySelector('#gameScreen .tool-btn[onclick*="showMistakes"]')).display === 'none';
    /* طابور الإنجازات: لا تنبثق في وسط الدرس */
    showNewAchievement({ id: 'tst', icon: '⭐', name: 'تجربة', desc: 'وصف' });
    o.achQueued = !document.getElementById('newAchievementPopup').classList.contains('active') && achQueue.length >= 1;
    showMap(); await w(100); flushAchievements(); await w(50);
    o.achFlushed = document.getElementById('newAchievementPopup').classList.contains('active');
    closeAll(); achQueue.length = 0;
    u.small = false; applyKidMode();
    /* حدّ اللعب اليومي */
    setDailyLimit(20);
    state.dayTime = { day: today, s: 20 * 60 };
    o.limitReached = dailyLimitReached();
    startStation(si); await w(400);
    o.limitBlocks = document.getElementById('gameScreen').style.display !== 'block' || getComputedStyle(document.getElementById('gameScreen')).display === 'none';
    setDailyLimit(0); state.dayTime = { day: today, s: 0 };
    o.limitOff = !dailyLimitReached();
    showMap(); await w(100); closeAll();

    /* ---------- 6) أمور صغيرة ---------- */
    o.arCount = arCount(1, 'بيت واحد', 'بيتان', 'أبيات', 'بيتاً') === 'بيت واحد' && arCount(2, 'بيت واحد', 'بيتان', 'أبيات', 'بيتاً') === 'بيتان'
      && arCount(7, 'بيت واحد', 'بيتان', 'أبيات', 'بيتاً') === '7 أبيات' && arCount(14, 'بيت واحد', 'بيتان', 'أبيات', 'بيتاً') === '14 بيتاً';
    o.fileInputsHidden = [...document.querySelectorAll('input[type=file]')].every(x => x.classList.contains('file-hidden') || getComputedStyle(x).display === 'none');
    window.HasaniyaDesktop = { clockInfo: () => JSON.stringify({ mono: 5000, boot: -1 }) };
    const ck = pinRecClock(); delete window.HasaniyaDesktop;
    o.desktopClock = ck.kind === 'mono' && ck.mono === 5000 && ck.boot === -1;
    voiceMutedShownAt = 0; voiceMutedNotice(); await w(30);
    const note = document.getElementById('voiceMutedNote');
    o.mutedAtTop = !!note && note.classList.contains('show') && note.getBoundingClientRect().top < 60;
    note.classList.remove('show');
    o.mutedNoBlock = getComputedStyle(note).pointerEvents === 'none';
    voiceMutedNotice(); o.mutedOncePerOpen = !note.classList.contains('show');

    /* ---------- 7) إصلاحات المراجعة الثانية ---------- */
    /* تبويبان مفتوحان معاً لا يختصران الانتظار: لا يُحسب أكثر من الوقت الحقيقي منذ آخر حساب */
    const rq = pinRecAccrue({ credit: 0, wallCredit: 0, last: { kind: 'web', mono: 5e8, boot: 'tab-other', wall: Date.now() - 30000 } });
    o.twoTabsNoBoost = rq.credit <= 31000 && rq.credit >= 1000;
    const rq2 = pinRecAccrue({ credit: 0, wallCredit: 0, last: { kind: 'web', mono: 1, boot: 'old-open', wall: Date.now() - 50 * 3600000 } });
    o.gapStillCapped = rq2.credit <= 36 * 3600000 + performance.now() + 1000 && rq2.wallCredit <= 36 * 3600000;
    /* أول فتح بعد التحديث من v103: الرقم ما زال في المفتاح القديم، والطلب القائم لا يسقط */
    localStorage.removeItem(STORAGE_PIN2); localStorage.removeItem(STORAGE_PIN_MIG); localStorage.setItem(STORAGE_PIN, 'HASH-V103');
    o.upgradeKeepsWait = pinRecPinStored() === true;
    localStorage.removeItem(STORAGE_PIN); localStorage.setItem(STORAGE_PIN_MIG, '1');
    o.noPinNoWait = pinRecPinStored() === false;
    /* الخروج إلى الخريطة يُنهي الحصة اليومية */
    dailyFlow = true; showMap(); await w(50); closeAll();
    o.dailyFlowReset = dailyFlow === false;
    /* البيت المقطوع لا يُبنى عليه سؤال: playVerseAndStory يعيد false إن قُطع */
    const anyV = content.journeyData[0].verses[0];
    const pp = playVerseAndStory(anyV, false); await w(5); audioStopAll();
    o.playInterrupted = (await pp) === false;
    o.playComplete = (await playVerseAndStory(anyV, false)) === true;
    /* العدد والمعدود بعد المئة */
    o.arCount100 = arCount(100, 'بيت واحد', 'بيتان', 'أبيات', 'بيتاً') === '100 بيت' && arCount(103, 'بيت واحد', 'بيتان', 'أبيات', 'بيتاً') === '103 أبيات'
      && arCount(161, 'بيت واحد', 'بيتان', 'أبيات', 'بيتاً') === '161 بيتاً';
    /* المحتوى من إصدار قبل v104 لا يُعرف إن عُدّل: تنبيه مخفف؛ والنسخة نفسها لا تُكتب مرتين */
    const alt = JSON.parse(JSON.stringify(content.journeyData)); alt[0].title = 'محتوى قديم';
    contentSnapshotSave(alt, 'قبل تحديث محتوى التطبيق', 'unknown', 38);
    o.unknownEditAlert = /إن كنت عدّلت/.test(contentPrevInfo());
    contentPrevDismiss(); contentSnapshotSave(alt, 'قبل تحديث محتوى التطبيق', 'unknown', 38);
    o.snapshotNoRepeat = contentPrevInfo() === '';
    const nb0 = safetyBackupList().length; safetyBackupPush('اختبار التكرار'); safetyBackupPush('اختبار التكرار');
    o.backupDedupe = safetyBackupList().length <= nb0 + 1;
    /* تسميع الوالد يُحسب ولو كان وضع التصفّح مفعّلاً */
    state.seenVerses.s1v4 = true; state.leitner.s1v4 = { box: 3, due: Date.now() + 9e7, lastWrong: 0 };
    sessionStorage.setItem('browseOn', '1');
    const browsing = typeof isBrowse === 'function' && isBrowse();
    leitnerRecord('s1v4', false, { parent: true });
    sessionStorage.removeItem('browseOn');
    o.parentInBrowse = !browsing || state.leitner.s1v4.box === 1;
    /* الاستيراد: حدّ اللعب من القيم المسموحة، والنتيجة لا تتجاوز عدد الأسئلة */
    const imp = JSON.parse(JSON.stringify(state)); imp.dailyLimitMin = 999; imp.quizResults = { [qst.id]: { score: 9, total: 3, at: 1 } };
    const san = sanitizeImportedState(imp);
    o.importSanitized = san.ok && san.state.dailyLimitMin === 0 && san.state.quizResults[qst.id].score === 3;
    /* التصفير يمسح نتائج الاختبار وتسميع الوالد */
    resetAll(); await w(50); closeAll();
    o.resetClearsNew = Object.keys(state.quizResults || {}).length === 0 && Object.keys(state.parentChecks || {}).length === 0;

    /* حارس الكتابة: نافذة أقدم لا تكتب فوق الأحدث (آخر فحص لأنه يوقف الحفظ) */
    o.saveOk = saveState() === true;
    localStorage.setItem(STORAGE_SEQ, 'from-another-tab');
    o.staleBlocked = saveState() === false && staleTab === true;
    return o;
  });
  for (const [k, v] of Object.entries(R)) need(k, v === true);
  need('pageErrors: ' + errs.join(' | '), errs.length === 0);
  await b.close();
  if (bad.length) { console.log(JSON.stringify(R, null, 1)); console.log('v104 e2e: فشل:', bad.join(', ')); process.exit(1); }
  console.log('v104 e2e: كل الفحوص نجحت (' + Object.keys(R).length + ')');
})().catch(e => { console.error(e); process.exit(1); });
