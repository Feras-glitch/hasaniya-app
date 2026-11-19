/* اختبار v111 (المراجعة المستقلة وقرارات فراس):
   1) تصحيح الأبيات على الكتاب (الْتَقَى الأَمِينَا، بَعْدُ عَمُّهُ) مع بقاء البيتين المزيدين
   2) البيت الجديد يُردَّد ثلاثاً قبل الترتيب، ثم «🔗» يربطه بما قبله
   3) الدرس يعدّ الجديد عند ظهوره: البيت المعاد بعد الإغلاق لا يُنهي الدرس قبل أوانه
   4) تسميع المقطع: المحطة المكتملة في الدروس تُسمَّع كاملة قبل التالية (الوالد، أو تسجيل الطفل)
   5) الرقم السري مرة في الجلسة داخل منطقة الوالدين، ويسقط بالخروج
   6) شاشة إعداد الصوت، والمراجعة بترتيب القصيدة، وإصلاحات صغيرة */
const { chromium } = require('playwright');
const URL = (process.env.HASANIYA_URL || 'file:///home/claude/hasaniya-desktop/standalone/hasaniya.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const bad = []; const need = (m, ok) => { if (!ok) bad.push(m); };
  const p = await (await b.newContext({ viewport: { width: 380, height: 760 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(() => { window.__voices = []; Object.defineProperty(window, 'speechSynthesis', { configurable: true, get: () => ({ speaking: false, pending: false, speak() {}, cancel() {}, getVoices: () => window.__voices, pause() {}, resume() {}, addEventListener() {} }) }); });
  await p.goto(URL); await p.waitForTimeout(900);
  const R = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    const T = async (name, fn) => { try { Object.assign(o, await fn()); } catch (e) { o[name + 'Exception'] = String(e && e.stack || e).slice(0, 300); } };
    const closeAll = () => document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    closeAll();
    const u = getCurrentUser(); u.gender = 'boy'; u.name = 'عمر'; u.small = false; saveState();
    try { vpPref('onboarded', true); } catch (e) {}
    const J = content.journeyData, V = id => J.flatMap(s => s.verses).find(v => v.id === id);

    await T('verses', async () => ({
      s5v1: V('s5v1').fullVerse.includes('الْتَقَى الأَمِينَا'),
      s8v4: V('s8v4').fullVerse.includes('بَعْدُ عَمُّهُ'),
      addedKept: V('s2v6').fullVerse.startsWith('أَشْهَرُ') && V('s2v4').fullVerse.startsWith('حَضَنَتْهُ'),
      count161: J.reduce((n, s) => n + s.verses.length, 0) === 161
    }));

    await T('intro', async () => {
      const r = {}; resetAll(); closeAll();
      startDailyLesson(); await w(60);
      const go = () => document.getElementById('introGo');
      r.introShown = !!go() && /0 من 3/.test(go().textContent);
      go().click(); go().click(); await w(20);
      r.after2 = !!go() && /2 من 3/.test(go().textContent);
      go().click(); await w(20);
      r.readyAfter3 = !!go() && /أرتّبه/.test(go().textContent) && getComputedStyle(document.getElementById('orderPart')).display === 'none';
      go().click(); await w(30);
      r.orderAfter = !go() && getComputedStyle(document.getElementById('orderPart')).display !== 'none';
      return r;
    });

    await T('link', async () => {
      const r = {}; resetAll(); closeAll();
      state.seenVerses[J[0].verses[0].id] = true; state.versePositions[J[0].id] = 1; saveState();
      startDailyLesson(); await w(60);
      for (let k = 0; k < 6 && document.getElementById('introGo'); k++) document.getElementById('introGo').click();
      const v = getCurrentVerse().verse;
      v.correctOrder.forEach(word => { const b = [...document.querySelectorAll('#wordsBank .word-btn')].find(x => !x.classList.contains('selected') && x.dataset.word === word); if (b) b.click(); });
      await w(100);
      const box = document.getElementById('linkBox');
      r.linkShown = box && box.style.display !== 'none' && /قبله/.test(box.textContent);
      const p0 = state.points || 0;
      linkDone(v.id); linkDone(v.id);
      r.linkPointsOnce = (state.points || 0) - p0 === 2;
      return r;
    });

    await T('resume', async () => {
      const r = {}; resetAll(); closeAll();
      startDailyLesson(); await w(50);
      r.left3 = state.dailyLeft === 2;             // البيت الأول ظهر جديداً فنقص واحد
      // «إغلاق التطبيق» في البيت الأول ثم العودة
      state.dailyLeft = null; showMap(); startDailyLesson(); await w(50);
      r.resumeLeft = state.dailyLeft === 2 && state.selectedVerse === 0;
      nextVerse(); await w(30);               // البيت الأول (مُعاد) يكتمل: لا ينتهي الدرس
      r.notEndedAfterRepeat = document.getElementById('gameScreen').style.display !== 'none' && state.selectedVerse === 1;
      nextVerse(); await w(30); nextVerse(); await w(300);
      r.endedAfterThreeNew = state.dailyLeft === null && dayPlanToday().newCount === 3;
      return r;
    });

    await T('segment', async () => {
      const r = {}; resetAll(); closeAll();
      const s0 = J[0];
      s0.verses.forEach(v => { state.seenVerses[v.id] = true; });
      markStationCompleted(s0);
      r.noGateWithoutDue = newVerseBlockReason() !== 'segmentFirst';
      state.segmentDue = { [s0.id]: Date.now() }; saveState();
      r.gate = newVerseBlockReason() === 'segmentFirst' && segmentBlocking() === 0;
      showMap(); startDailyLesson(); await w(60);
      r.milestoneHub = document.getElementById('hubPopup').classList.contains('active') && /تسميع المحطة كاملة/.test(document.getElementById('hubTitle').textContent);
      r.planLine = /تسميع/.test(document.getElementById('dailyInfo').textContent);
      // تسجيل الطفل يفتح ما بعدها وينتظر حكم الوالد
      segmentRecorded(0);
      r.pending = state.segmentChecks[s0.id].r === 'pending' && newVerseBlockReason() !== 'segmentFirst';
      // الوالد يحكم بيتاً بيتاً
      pcStartSegment(0); await w(20);
      r.pcSegmentText = /متصلاً/.test(document.getElementById('hubBody').textContent);
      for (let k = 0; k < s0.verses.length; k++) { pcState.i < pcState.list.length && pcRate('ok'); }
      r.segmentOk = state.segmentChecks[s0.id].r === 'ok';
      // فشل بيت: يعود الحجز
      pcStartSegment(0); for (let k = 0; k < s0.verses.length; k++) pcRate(k === 0 ? 'fail' : 'ok');
      r.failBlocks = state.segmentChecks[s0.id].r === 'fail' && newVerseBlockReason() === 'segmentFirst';
      closeAll();
      return r;
    });

    await T('pin', async () => {
      const r = {}; closeAll();
      parentPinHash = null; try { localStorage.removeItem(STORAGE_PIN2); } catch (e) {}
      let n = 0;
      requirePin(() => { n++; }); await w(150);
      document.getElementById('pinInput').value = '4321'; document.getElementById('pinConfirm').value = '4321'; await submitPin(); await w(400);
      for (const id of ['pinRecPopup']) document.getElementById(id) && document.getElementById(id).classList.remove('active');
      showParentScreen(); await w(50);
      requirePin(() => { n++; }); await w(150);
      document.getElementById('pinInput').value = '4321'; await submitPin(); await w(300);
      const asked = () => document.getElementById('pinPopup').classList.contains('active');
      const before = n; requirePin(() => { n++; }); await w(50);
      r.graceInParent = !asked() && n === before + 1;
      showMap(); await w(20);
      requirePin(() => { n++; }); await w(50);
      r.askedAfterLeaving = asked();
      cancelPin(); closeAll();
      return r;
    });

    await T('voiceSetup', async () => {
      const r = {}; closeAll();
      await w(2600);
      await voiceSetupCheck(true); await w(50);
      r.voiceSetupShown = /لا يوجد صوت عربي/.test(document.getElementById('hubTitle').textContent) && /تحويل النص إلى كلام/.test(document.getElementById('hubBody').textContent);
      closeAll();
      return r;
    });

    await T('misc', async () => {
      const r = {}; resetAll(); closeAll();
      // المراجعة بترتيب القصيدة
      const now = Date.now();
      state.seenVerses = {}; ['s2v3', 's1v2', 's2v1'].forEach((id, i) => { state.seenVerses[id] = true; state.leitner[id] = { box: 1, due: now - (i + 1) * 1000 }; });
      state.dayPlan = null; saveState(); startDailyLesson(); await w(50);
      const order = playQueue.map(q => J[q.stationIndex].verses[q.verseIndex].id);
      r.reviewInOrder = JSON.stringify(order) === JSON.stringify(['s1v2', 's2v1', 's2v3']) || order.join(',');
      showMap(); closeAll();
      // زر القصص لمحطة بلا قصص
      state.recentDone = J[0].id; saveState(); guideShowActions(); await w(30);
      r.noStoriesBtn = ![...document.querySelectorAll('.guide-actions button')].some(x => /استمع للقصص/.test(x.textContent));
      // زر الرئيسية
      r.homeLabel = [...document.querySelectorAll('#gameScreen button')].some(x => x.textContent.includes('🏠 الرئيسية'));
      // تسجيلاتي: لا أبيات لم تُتعلَّم
      state.seenVerses = { [J[0].verses[0].id]: true }; saveState();
      await openRecPopup({ mode: 'child' }); document.getElementById('recStation').value = '0'; await renderRecList();
      r.recListOnlySeen = document.querySelectorAll('#recBody .rec-row').length === 1;
      closeAll();
      // اختيار الجنس ظاهر
      editGender = 'boy'; renderEditorExtras();
      r.genderOn = !!document.querySelector('#genderRow .gender-pick.on') && document.querySelector('#genderRow .gender-pick.on').textContent.includes('✓');
      // البراق والغار
      r.icons = J.find(s => s.id === 's9').reward.icon === '✨' && J.find(s => s.id === 's11a').reward.icon === '🌙';
      return r;
    });
    return o;
  });
  for (const [k, v] of Object.entries(R)) need(k + (v === true ? '' : ': ' + v), v === true);
  need('pageErrors: ' + errs.join(' | '), errs.length === 0);
  await b.close();
  if (bad.length) { console.log('v111 e2e: فشل:\n  ' + bad.join('\n  ')); process.exit(1); }
  console.log(`v111 e2e: نجح (${Object.keys(R).length} فحصاً)`);
})().catch(e => { console.error(e); process.exit(1); });
