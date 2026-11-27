const __env = require("../_env");
/* اختبار v114 (المراجعة الثلاثية وقرارات صاحب المشروع):
   1) الوِرد اليومي إلزامي قبل الجديد، والسبق آخر الدرس، ثم تُعرض جلسة المراجعة الثانية صراحة
   2) «يحفظه غيباً»: تسميعتان بلا فتح بينهما أسبوع، وآخرهما خلال 60 يوماً
   3) الصغير يصعد بحكم السامع فقط، والزلّة في المراجعة أخفّ؛ وما أُخطئ فيه يعود آخر الجلسة
   4) الاستماع في المراجعة تلميح، ولا نقاط على «قلتُهما»
   5) تقييم المعلم يذهب إلى الطفل الصحيح، ويدخل الجدول، ويُعرض تقييم التسميع المتصل باسم المقيّم
   6) قفل المحطة: تسجيل قصير أو مكشوف لا يفتح، ومحطتان معلّقتان توقفان الجديد
   7) الختمة قبل «حفظتَ القصيدة»، والألقاب «يرتّب كلماته»، ولوحة الصف تبقى، ووضع المسودة للمراجِع */
const { chromium } = require('playwright');
const URL = __env.URL;
(async () => {
  const b = await chromium.launch({ executablePath: __env.CHROMIUM, args: ['--no-sandbox'] });
  const bad = []; const need = (m, ok) => { if (!ok) bad.push(m); };
  const p = await (await b.newContext({ viewport: { width: 390, height: 800 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(() => { Object.defineProperty(window, 'speechSynthesis', { configurable: true, get: () => ({ speaking: false, pending: false, speak() {}, cancel() {}, getVoices: () => [], pause() {}, resume() {}, addEventListener() {} }) }); });
  await p.goto(URL); await p.waitForTimeout(900);
  const R = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    const T = async (name, fn) => { try { Object.assign(o, await fn()); } catch (e) { o[name + 'Exception'] = String(e && e.stack || e).slice(0, 400); } };
    const closeAll = () => document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    closeAll();
    const u = getCurrentUser(); u.gender = 'girl'; u.name = 'دلال'; u.small = false; saveState();
    try { vpPref('onboarded', true); } catch (e) {}
    window.requirePin = fn => fn();
    const J = content.journeyData, DAY = 86400000;
    const completeStation = (si, passed) => { J[si].verses.forEach(v => { state.seenVerses[v.id] = true; state.leitner[v.id] = { box: 3, due: Date.now() + 5 * DAY, lastWrong: 0 }; }); markStationCompleted(J[si]); if (passed) { state.segmentDue = state.segmentDue || {}; state.segmentDue[J[si].id] = Date.now() - DAY; state.segmentChecks = state.segmentChecks || {}; state.segmentChecks[J[si].id] = { r: 'ok', at: Date.now() - DAY }; } saveState(); };

    await T('wird', async () => {
      const r = {}; resetAll(); closeAll();
      completeStation(0, true);
      r.wirdNeeded = wirdNeededToday() && newVerseBlockReason() === 'wirdFirst';
      r.planShowsWird = todayPlan().parts.some(x => /وِرد/.test(x));
      startDailyLesson(); await w(60);
      r.wirdHub = /وِرد اليوم/.test(document.getElementById('hubTitle').textContent);
      __wirdActions.listener(); await w(20);
      r.wirdIsConnected = /متصلاً/.test(document.getElementById('hubBody').textContent);
      pcRateRest(); await w(20); pcFinish(); await w(80);
      r.wirdDone = state.wirdDay === new Date().toDateString() && !!state.wirdLog[J[0].id];
      r.newAfterWird = document.getElementById('gameScreen').style.display !== 'none' && state.selectedStation === 1;
      r.promotedByListener = state.leitner[J[0].verses[0].id].box === 4;
      return r;
    });

    await T('sabq', async () => {
      const r = {}; showMap(); closeAll();
      // درس اليوم: ثلاثة أبيات جديدة ثم السبق
      for (let k = 0; k < 3; k++) { if (document.getElementById('introGo')) { for (let i = 0; i < 6 && document.getElementById('introGo'); i++) document.getElementById('introGo').click(); if (document.getElementById('sayRevealBox')) sayRevealDone(); } nextVerse(); await w(60); }
      await w(200);
      r.sabqHub = /سمّعي درس اليوم/.test(document.getElementById('hubTitle').textContent);
      r.sabqListHasToday = sabqList().length >= 3;
      // في الجلسة نفسها: مراجعة مستحقة تُعرض صراحة بعد السبق
      state.leitner[J[0].verses[1].id].due = Date.now() - 1000; saveState();
      __sabqActions.listener(); await w(20); pcRateRest(); pcFinish(); await w(120);
      r.sabqDone = state.sabqDay === new Date().toDateString();
      r.secondOffered = /جلسة مراجعة ثانية/.test(document.getElementById('guideFloat') ? document.getElementById('guideFloat').textContent : '') || /جلسة مراجعة ثانية/.test(document.body.textContent);
      r.lessonCredited = (state.lessonDays || 0) >= 1;
      closeAll();
      return r;
    });

    await T('confirm', async () => {
      const r = {}; const vid = J[0].verses[2].id, now = Date.now();
      state.parentChecks[vid] = { at: now, r: 'ok', oks: [now] }; state.verseStats[vid] = { correct: 1, wrong: 0, lastCorrect: now, lastWrong: 0 };
      r.oneNotEnough = !verseConfirmed(vid) && verseNeedsTasmee(vid);
      state.parentChecks[vid].oks = [now - 3 * DAY, now]; r.threeDaysNotEnough = !verseConfirmed(vid);
      state.parentChecks[vid].oks = [now - 8 * DAY, now]; r.weekApartConfirms = verseConfirmed(vid);
      state.parentChecks[vid].oks = [now - 80 * DAY, now - 70 * DAY]; r.staleExpires = !verseConfirmed(vid) && verseNeedsTasmee(vid);
      state.parentChecks[vid].oks = [now - 8 * DAY, now]; state.verseStats[vid].lastWrong = now + 1; r.wrongAfterDrops = !verseConfirmed(vid);
      // الطريقة القديمة (تسميعة واحدة قبل v114) تُقرأ تسميعةً واحدة
      state.parentChecks[vid] = { at: now, r: 'ok' }; r.legacyOne = pcOksOf(state, vid).length === 1;
      pcApply(vid, 'fail'); r.failClears = pcOksOf(state, vid).length === 0;
      saveState(); return r;
    });

    await T('retry', async () => {
      const r = {}; resetAll(); closeAll();
      completeStation(0, true);
      const vid = J[0].verses[0].id;
      state.leitner[vid] = { box: 4, due: Date.now() - 1000, lastWrong: 0 }; saveState();
      state.wirdDay = new Date().toDateString();
      startDailyLesson(); await w(60);
      r.reviewMode = playMode === MODE_REVIEW && playQueue.length === 1;
      // استماع قبل الترتيب = تلميح
      listenVerse(); r.listenIsHint = hintUsedThisVerse === true;
      hintUsedThisVerse = false;
      const v = getCurrentVerse().verse;
      const btns = () => [...document.querySelectorAll('#wordsBank .word-btn')];
      const wrongBtn = btns().find(x => x.dataset.word !== v.correctOrder[0]); wrongBtn && wrongBtn.click();
      v.correctOrder.forEach(word => { const bb = btns().find(x => !x.classList.contains('selected') && x.dataset.word === word); bb && bb.click(); });
      await w(50); nextVerse(); await w(60);
      r.requeued = playQueue.length === 2 && playQueue[1].retry === true && playIndex === 1;
      const v2 = getCurrentVerse().verse;
      v2.correctOrder.forEach(word => { const bb = btns().find(x => !x.classList.contains('selected') && x.dataset.word === word); bb && bb.click(); });
      await w(50);
      r.retryDropsTwo = state.leitner[vid].box === 2;
      nextVerse(); await w(60); closeAll(); showMap();
      // الصغير: البطاقة الصحيحة لا ترفعه؛ السامع يرفعه
      u.small = true; saveState();
      const vid2 = J[0].verses[1].id; state.leitner[vid2] = { box: 2, due: Date.now() - 1000, lastWrong: 0 };
      leitnerRecord(vid2, true); r.smallCardNoPromote = state.leitner[vid2].box === 2 && state.leitner[vid2].due > Date.now();
      leitnerRecord(vid2, true, { parent: true }); r.smallListenerPromotes = state.leitner[vid2].box === 3;
      reviewRetry[vid2] = { box: 5 }; reviewRetryApply(vid2, true); r.smallSlipLight = state.leitner[vid2].box === 4;
      u.small = false; saveState();
      // لا نقاط على «قلتُهما»
      const p0 = state.points; state.linked = {}; linkDone(J[0].verses[3].id); r.linkNoPoints = state.points === p0;
      return r;
    });

    await T('teacher', async () => {
      const r = {}; resetAll(); closeAll();
      // طفلان؛ الظاهر «فرح»، والتقييم لـ«دلال»
      const dalal = getCurrentUser();
      completeStation(0, false);
      const farah = createNewUser('فرح', '🦁'); farah.gender = 'boy'; users.push(farah); saveState();
      activeUserId = farah.id; state = farah.state; saveState();
      const vid = J[0].verses[0].id;
      importEvaluation({ app: 'hasaniya', type: 'evaluation', evaluatedAt: new Date().toISOString(), evaluator: 'الأستاذ أحمد', child: 'دلال', childId: dalal.id,
        ratings: { [vid]: { memory: 5, pronunciation: 4, order: 5, note: 'أحسنت' }, 'sec:station-0': { memory: 2, pronunciation: 3, order: 3, note: 'راجعي البيت الخامس' } } });
      await w(50);
      r.notOnFarah = !(state.recEval || {})[vid];
      r.onDalal = !!(dalal.state.recEval || {})[vid] && dalal.state.recEval['sec:station-0'].evaluator === 'الأستاذ أحمد';
      r.scheduled = pcOksOf(dalal.state, vid).length === 1 && dalal.state.segmentChecks[J[0].id].r === 'fail';
      // يُعرض تقييم التسميع المتصل واسم المقيّم
      activeUserId = dalal.id; state = dalal.state; saveState();
      await openRecPopup({ mode: 'child', range: 'station-0' }); await w(80);
      r.sectionEvalShown = /راجعي البيت الخامس/.test(document.getElementById('secStatus').innerHTML) && /الأستاذ أحمد/.test(document.getElementById('secStatus').innerHTML);
      document.getElementById('recStation').value = '0'; await renderRecList();
      r.verseEvalName = /الأستاذ أحمد/.test(document.getElementById('recBody').innerHTML);
      r.stationsFiltered = document.querySelectorAll('#recStation option').length === 2;
      closeAll();
      // نافذة التقييم فوق الإعدادات
      document.getElementById('settingsPopup').classList.add('active');
      openEvalFromDoc({ app: 'hasaniya', type: 'recitation', child: { name: 'دلال', id: dalal.id }, items: [{ verseId: vid, text: 'x', mime: 'audio/webm', data: 'AAAA' }] });
      r.evalOnTop = document.getElementById('evalPopup').classList.contains('active') && !document.getElementById('settingsPopup').classList.contains('active');
      closeAll();
      users = users.filter(x => x.id !== farah.id); saveState();
      return r;
    });

    await T('gate', async () => {
      const r = {}; resetAll(); closeAll();
      completeStation(0, false); state.segmentDue = { [J[0].id]: Date.now() }; saveState();
      r.blocked = segmentBlocking() === 0;
      segmentRecorded(0, { opened: 999 }); r.openedTooMuch = segmentBlocking() === 0;
      segmentRecorded(0, { opened: 2 }); r.pendingOpens = segmentBlocking() === -1;
      completeStation(1, false); state.segmentDue[J[1].id] = Date.now(); saveState();
      segmentRecorded(1, { opened: 0 });
      r.twoPendingWait = newVerseBlockReason() === 'waitJudge';
      r.minMs = tsMinMs(10) === 30000 && tsMinMs(1) === 5000;
      return r;
    });

    await T('khatma', async () => {
      const r = {}; resetAll(); closeAll();
      J.forEach((s, i) => completeStation(i, true));
      showFinale(); await w(30);
      r.finaleNotYet = /بقيت الختمة/.test(document.getElementById('finaleText').textContent) && !/حفظتِ القصيدة/.test(document.getElementById('finaleText').textContent);
      r.noGraduate = !ACHIEVEMENTS.find(a => a.id === 'graduate').check(state);
      J.forEach(s => { state.khatma = state.khatma || {}; state.khatma[s.id] = Date.now(); });
      r.khatmaDone = khatmaComplete() && ACHIEVEMENTS.find(a => a.id === 'graduate').check(state);
      showFinale(); await w(30);
      r.finaleDone = /حفظتِ القصيدة/.test(document.getElementById('finaleText').textContent);
      closeAll();
      return r;
    });

    await T('labels', async () => {
      const r = {};
      const m = calculateMastery(state);
      r.noMastererTitle = !/حافظ متقن|متقدم/.test(m.level);
      showParentScreen(); await w(50);
      r.headlineGirl = /تحفظ غيباً/.test(document.getElementById('parentHeadline').textContent);
      r.noItqan = !/إتقان الحفظ/.test(document.getElementById('masteryBreakdown').textContent);
      r.weekly = /يحفظه غيباً/.test(buildWeeklyText());
      showMap();
      return r;
    });

    await T('dash', async () => {
      const r = {};
      dashRows = [{ name: 'س', avatar: '👤', percent: 0, mastered: 0, seen: 0, confirmed: 0, completed: 0, total: 16, points: 0, streak: 0, minutes: 0, mistakes: 0, achievements: 0, exportedAt: '', days: null, weak: [], source: 'نسخة' }];
      dashSave(); dashRows = []; openClassDashboard(); await w(30);
      r.dashPersists = dashRows.length === 1 && /لم يبدأ بعد/.test(document.getElementById('dashBody').textContent);
      dashRows = []; dashSave(); closeAll();
      return r;
    });

    await T('draft', async () => {
      const r = {};
      localStorage.removeItem(REVIEW_KEY); reviewStore = reviewLoad(); reviewStore.reviewer = { name: 'الشيخ', role: 'teacher' };
      const live = id => J.flatMap(s => s.verses).find(v => v.id === id);
      const orig = live('s2v1').meaning;
      reviewSetDraft(true); closeAll();
      reviewSetText('meaning|s2v1', orig + ' (مسودة)');
      r.draftHidden = live('s2v1').meaning === orig;
      reviewSetDraft(false); closeAll();
      r.approvedShown = live('s2v1').meaning === orig + ' (مسودة)';
      reviewRevert('meaning|s2v1'); localStorage.removeItem(REVIEW_KEY); reviewStore = reviewLoad();
      return r;
    });

    await T('misc', async () => {
      const r = {}; resetAll(); closeAll();
      // الزر لا يُعطَّل بعد انتهاء الدرس
      state.seenVerses[J[0].verses[0].id] = true; state.dayPlan = { day: new Date().toDateString(), reviews: 2, newCount: 3, back: false }; state.sabqDay = new Date().toDateString(); saveState();
      renderDailyCard();
      r.buttonTappable = !document.getElementById('dailyMainBtn').disabled && document.getElementById('dailyMainBtn').classList.contains('done-today');
      // بطاقة الوالد تقرأ خطة اليوم نفسها
      showParentScreen(); await w(30);
      r.parentSamePlan = /أنهت درس اليوم/.test(document.getElementById('parentCheckCard').textContent);
      showMap();
      // الإعدادات: المختار ممتلئ بعلامة
      openSettings && openSettings(); await w(30);
      r.settingSelected = !!document.querySelector('#settingsBody .selected-pref') && /✓/.test(document.querySelector('#settingsBody .selected-pref').textContent);
      closeAll();
      // الاستيراد يصحّح الأنواع ويُسقط المجهول (كان «certs» كائناً يعطّل شاشة الشهادات)
      const imp = sanitizeImportedState(Object.assign(JSON.parse(JSON.stringify(state)), { certs: { a: 1 }, evil: 1, reflections: 'x' }));
      r.importTypes = imp.ok && Array.isArray(imp.state.certs) && !('evil' in imp.state) && typeof imp.state.reflections === 'object';
      // رقم النسخة وسجلّ الأخطاء في منطقة الوالدين
      errorLogAdd('اختبار', 'test'); showParentScreen(); await w(30);
      r.versionShown = /v\d+/.test(document.getElementById('appInfo').textContent) && /أخطاء مسجّلة/.test(document.getElementById('appInfo').textContent);
      errorLogClear(); showMap();
      // أسماء الملفات تحمل اسم الطفل
      r.fileName = safeFileName('دلال الصغيرة') === 'دلال-الصغيرة';
      // الأزرار بحسب الوظيفة: الأخضر ليس وردياً
      const t = document.createElement('button'); t.className = 'action-btn btn-success'; document.body.appendChild(t);
      r.greenButtons = getComputedStyle(t).backgroundColor !== 'rgb(216, 27, 96)'; t.remove();
      // المحرر القديم حُذف
      r.noOldEditor = typeof openEditor === 'undefined' && !document.getElementById('editorPopup');
      // الخريطتان لا تتراكب نقاطهما
      showPlacesMap(); await w(30);
      const cs = [...document.querySelectorAll('#hubBody svg circle[r="11"]')].map(c => [+c.getAttribute('cx'), +c.getAttribute('cy')]);
      r.placesSpread = cs.length > 3 && cs.every((a, i) => cs.every((c, j) => i === j || Math.hypot(a[0] - c[0], a[1] - c[1]) >= 20));
      closeAll();
      return r;
    });
    return o;
  });
  for (const [k, v] of Object.entries(R)) need(k + (v === true ? '' : ': ' + v), v === true);
  need('pageErrors: ' + errs.join(' | '), errs.length === 0);
  await b.close();
  if (bad.length) { console.log('v114 e2e: فشل:\n  ' + bad.join('\n  ')); process.exit(1); }
  console.log(`v114 e2e: نجح (${Object.keys(R).length} فحصاً)`);
})().catch(e => { console.error(e); process.exit(1); });
