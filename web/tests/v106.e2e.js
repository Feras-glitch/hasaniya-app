/* اختبار v106:
   أ) قرارات فراس: اختيار الطفل بلا رقم سري مع تأكيد، وتذكير «سمّعه الآن»، ووسام «مواظب»، ونقطة زر الوالدين
   ب) حدّ اللعب يشمل كل نشاط، وسطر «غداً»، والعودة بعد الغياب، والتسميع شطراً شطراً، وشهادة الإتقان،
      وسُلّم الإخفاء بالضغط، وما بعد الختام، ونقل الجهاز، ورقم البيت في الكتاب
   ج) سيناريوهات كاملة بساعة وهمية: طفل جديد أسبوعاً (عبر الواجهة)، وأسرة بثلاثة أطفال، وشهران من المراجعة */
const { chromium } = require('playwright');
const URL = (process.env.HASANIYA_URL || 'file:///home/claude/hasaniya-desktop/standalone/hasaniya.html');
/* انتظار بـ evaluate (waitForFunction في Playwright 1.49 يتعطّل مع CSP) */
const waitTrue = async (pg, fn, ms) => { const end = Date.now() + ms;
  while (Date.now() < end) { try { if (await pg.evaluate(fn)) return true; } catch (e) {} await pg.waitForTimeout(150); }
  return false; };
const fakeSpeech = () => {
  window.__said = []; window.__voices = [{ name: 'ar', lang: 'ar-SA' }];
  const q = []; let busy = false;
  const next = () => {
    if (busy || !q.length) return; busy = true;
    const u = q[0];
    setTimeout(() => { if (q[0] !== u) return; if (u.onstart) u.onstart({}); setTimeout(() => {
      if (q[0] !== u) return; q.shift(); busy = false; if (u.onend) u.onend({}); next(); }, 5); }, 2);
  };
  const fake = {
    get speaking() { return q.length > 0; }, pending: false, paused: false,
    speak(u) { window.__said.push(u.text); q.push(u); next(); },
    cancel() { const old = q.splice(0); busy = false; old.forEach(u => { if (u.onerror) u.onerror({ error: 'interrupted' }); }); },
    getVoices() { return window.__voices; }, pause() {}, resume() {}, onvoiceschanged: null, addEventListener() {}
  };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, get: () => fake });
};
/* ساعة وهمية: يوم ثابت في الساعة العاشرة صباحاً، والوقت يجري داخل اليوم */
const fakeClock = () => {
  const RealDate = Date; let off = 0;
  window.__setDay = (d) => { off = new RealDate(2026, 10, 16 + d, 10, 0, 0).getTime() - RealDate.now(); };
  class FakeDate extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(RealDate.now() + off); }
    static now() { return RealDate.now() + off; }
  }
  window.Date = FakeDate;
};

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const bad = []; const need = (m, ok) => { if (!ok) bad.push(m); };
  const errs = [];
  const results = {};

  /* ================= أ وب: الميزات ================= */
  {
    const p = await (await b.newContext({ viewport: { width: 380, height: 760 } })).newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.addInitScript(fakeSpeech);
    await p.goto(URL); await p.waitForTimeout(900);
    Object.assign(results, await p.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
      const T = async (name, fn) => { try { Object.assign(o, await fn()); } catch (e) { o[name + 'Exception'] = String(e && e.stack || e).slice(0, 300); } };
      const closeAll = () => document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      closeAll();
      const u = getCurrentUser(); u.gender = 'boy'; u.name = 'عمر'; saveState(); vpPref('onboarded', true);
      window.showNewAchievement = () => {};   // نوافذ الأوسمة المؤجّلة لا تتداخل مع الفحوص التالية
      const all = content.journeyData.flatMap(s => s.verses);

      await T('ids', () => ({
        bookNumbers: all.every((v, i) => v.n === i + 1),
        poemShowsBookNo: (showPoem(), document.getElementById('poemBody').textContent.includes('(161)')),
        placeLookup: (() => { closeAll(); const pv = PLACE_VISITS[0]; return placeVisitOpen(pv) === (getStationStatus(content.journeyData.find(s => s.verses.some(x => x.id === pv.ref))) !== 'locked'); })()
      }));
      await T('picker2', async () => {
        const r = {};
        // طفلة ثانية، ورقم سري مضبوط: الاختيار بلا رقم، والإدارة بالرقم
        const id2 = 'u_test_girl';
        if (!getUserById(id2)) { users.push({ id: id2, name: 'مريم', avatar: '🦊', gender: 'girl', createdAt: Date.now(), state: normalizeUserState({}) }); saveState(); }
        localStorage.setItem(STORAGE_PIN2, 'p1:1:aa:bb');
        closeAll(); document.getElementById('userChip').click(); await w(50);
        r.pickerNoPin = document.getElementById('hubPopup').classList.contains('active') && !document.getElementById('pinPopup').classList.contains('active')
          && document.querySelectorAll('#hubBody .kid-pick').length === users.length;
        kidPickConfirm(id2); await w(30);
        r.pickerConfirm = /هل أنتِ مريم/.test(document.getElementById('hubBody').textContent);
        [...document.querySelectorAll('#hubBody button')].find(x => /نعم، أنا مريم/.test(x.textContent)).click(); await w(50);
        r.pickerSwitched = activeUserId === id2 && !document.getElementById('hubPopup').classList.contains('active');
        document.getElementById('userChip').click(); await w(30);
        [...document.querySelectorAll('#hubBody button')].find(x => /إضافة طفل أو تعديله/.test(x.textContent)).click(); await w(50);
        r.manageNeedsPin = document.getElementById('pinPopup').classList.contains('active');
        closeAll(); localStorage.removeItem(STORAGE_PIN2);
        switchUser(u.id); closeAll();
        return r;
      });
      await T('badge', () => {
        resetAll(); closeAll();
        state.totalTimeSeconds = 5000; state.lessonDays = 6; checkAchievements();
        const r = { timeBadgeRetired: !state.achievements.time30, steadyNotYet: !state.achievements.steady7 };
        state.lessonDays = 7; checkAchievements();
        r.steadyAt7 = !!state.achievements.steady7;
        state.achievements.time30 = { unlockedAt: 1 };
        showAchievements();
        const txt = document.getElementById('achievementsGrid').textContent;
        r.oldBadgeKept = txt.includes('مثابر الوقت') && txt.includes('مواظب') && achievementsShown(state).length === ACHIEVEMENTS.length;
        delete state.achievements.time30;
        r.retiredHiddenIfNotEarned = !achievementsShown(state).some(a => a.id === 'time30');
        closeAll();
        return r;
      });
      await T('remind', () => {
        resetAll(); closeAll();
        for (let i = 0; i < 6; i++) { state.seenVerses[all[i].id] = true; state.leitner[all[i].id] = { box: 5, due: Date.now() + 86400000 * 9, lastWrong: 0 }; }
        localStorage.setItem(STORAGE_LAST_BACKUP, String(Date.now()));
        renderParentAlerts(); renderDailyCard();
        const r = { pcReminder: !!document.getElementById('pcRemind') && /6 أبيات جاهزة/.test(document.getElementById('pcRemind').textContent),
          parentDot: document.getElementById('parentEntryBtn').classList.contains('has-alert') };
        state.leitner[all[0].id].box = 4; state.leitner[all[1].id].box = 4;
        renderParentAlerts(); renderDailyCard();
        r.noReminderUnder5 = !document.getElementById('pcRemind') && !document.getElementById('parentEntryBtn').classList.contains('has-alert');
        renderParentCheckCard();
        r.tomorrowLine = /غداً/.test(document.getElementById('parentCheckCard').textContent);
        return r;
      });
      await T('limit', async () => {
        resetAll(); closeAll(); showMap();
        const day = new Date().toDateString();
        state.dailyLimitMin = 20; state.dayTime = { day, s: 1250 };
        openPlayHub(); await w(20);
        const r = { limitBlocksPlay: !document.getElementById('hubPopup').classList.contains('active') };
        openRecPopup({ mode: 'child' }); await w(20);
        r.limitBlocksRecite = !document.getElementById('recPopup').classList.contains('active');
        openReviewHub(); await w(20);
        r.limitBlocksReview = !document.getElementById('hubPopup').classList.contains('active');
        state.dailyLimitMin = 0; state.dayTime = { day, s: 0 };
        // كل نشاط يُحسب: لمسة على الخريطة تبدأ العدّ، ومنطقة الوالدين توقفه
        stopTimeTracking();
        document.getElementById('mapScreen').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        r.mapTouchCounts = sessionStartTime !== null;
        showParentScreen(); kidActivityTick();
        r.parentAreaNotCounted = sessionStartTime === null;
        showMap();
        return r;
      });
      await T('return', () => {
        resetAll(); closeAll();
        const d = new Date(Date.now() - 6 * 86400000);
        state.lastPracticeDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        state.dayPlan = null;
        const plan = dayPlanToday();
        const r = { returnPlan: plan.back === true && newPerDayOf() === 1 };
        state.seenVerses[all[0].id] = true; state.leitner[all[0].id] = { box: 1, due: Date.now() - 1000, lastWrong: 0 };
        window.__said = []; startDailyLesson();
        r.welcomeBack = playMode === MODE_REVIEW && /اشتقنا/.test(document.getElementById('toast').textContent);
        showMap(); state.dayPlan = null; state.lastPracticeDate = null;
        r.normalPlan = dayPlanToday().back === false && newPerDayOf() === 3;
        return r;
      });
      await T('small', () => {
        u.small = true; const r = { smallPlayNoMistakes: JSON.stringify(playSetOf()) === '["riddles","recordings"]' }; u.small = false; return r;
      });
      await T('section', async () => {
        resetAll(); closeAll();
        for (let i = 0; i < 3; i++) state.seenVerses[all[i].id] = true;
        state.versePositions[content.journeyData[0].id] = 3;
        await openRecPopup({ mode: 'child', range: 'all' }); await w(50);
        const txt = () => document.getElementById('secText');
        const r = { sectionHidden: txt().hidden === true };
        document.getElementById('secNextBtn').click(); await w(30);
        const half1 = all[0].words.slice(0, all[0].half).join(' ');
        r.sectionOneHalf = !txt().hidden && txt().innerText.includes(half1) && !txt().innerText.includes(all[0].words.slice(all[0].half).join(' '))
          && /فتحات: 1/.test(document.getElementById('secNextBtn').textContent);
        closePopup('recPopup');
        return r;
      });
      await T('cert', () => {
        resetAll(); closeAll();
        const st = content.journeyData[0];
        st.verses.forEach(v => { state.seenVerses[v.id] = true; state.leitner[v.id] = { box: 6, due: Date.now() + 1e9, lastWrong: 0 }; });
        const a = certConfirmed(st);
        state.leitner[st.verses[0].id].box = 2;
        const bb = certConfirmed(st);
        return { certMastery: a.all && /كلها غيباً/.test(a.text), certPartial: !bb.all && /6 أبيات من 7/.test(bb.text) };
      });
      await T('tapLadder', async () => {
        resetAll(); closeAll();
        state.seenVerses[all[0].id] = true; state.leitner[all[0].id] = { box: 2, due: Date.now() + 1e9, lastWrong: 0 };
        u.small = true; hideTap = null; startHideLevels(); await w(30);
        const taps = [...document.querySelectorAll('#hubBody .hide-tap')];
        const r = { tapMode: taps.length > 0 && !document.querySelector('#hubBody .hide-in') };
        taps[0].click();
        r.tapReveals = taps[0].classList.contains('shown') && all[0].words.includes(taps[0].textContent);
        const pts = state.points || 0;
        checkHideLevel(); await w(20);
        r.tapNoBox = state.leitner[all[0].id].box === 2 && (state.points || 0) === pts + 1;
        hideSetMode(false); await w(20);
        r.typeModeAvailable = !!document.querySelector('#hubBody .hide-in');
        u.small = false; hideTap = null; closeAll();
        return r;
      });
      await T('finale', async () => {
        resetAll(); closeAll();
        content.journeyData.forEach(s => { state.stationStatus[s.id] = 'completed'; });
        guideHidePanel(); startDailyLesson();
        const f = guideBubbleEl();   // في اللحظة نفسها: guidePanel متزامن، ولا يقطعه مؤقّت من خطوة سابقة
        const ok = !!f && f.classList.contains('show') && /سمّع المحطة/.test(f.textContent) && /نسمّع من حفظنا محطة/.test(f.textContent);
        // عند الفشل: تفاصيل تكفي لمعرفة السبب من سجل GitHub
        const r = { finaleOffer: ok || ('تفاصيل: ' + JSON.stringify({ bubble: f && f.id, show: f && f.classList.contains('show'), text: f && f.textContent.slice(0, 80),
          modals: [...document.querySelectorAll('.modal-overlay.active')].map(m => m.id), rec: typeof recIsActive === 'function' && recIsActive(),
          map: document.getElementById('mapScreen').style.display, done: content.journeyData.every(st => getStationStatus(st) === 'completed'), due: leitnerDueVerses().length, limit: dailyLimitReached() })) };
        guideHidePanel(); resetAll(); closeAll();
        return r;
      });
      await T('move', async () => {
        await openDeviceMove(); await w(30);
        const t = document.getElementById('hubBody').textContent;
        const r = { deviceMove: /على هذا الجهاز/.test(t) && /على الجهاز الجديد/.test(t) && /الرقم السري/.test(t) };
        closeAll();
        return r;
      });
      // في الآخر: dailyLessonDone يترك مؤقّتاً (رسالة «انتهى الدرس» بعد 3.2 ثانية) يغيّر الخريطة وفقاعة ناجي
      await T('lessonDays', async () => {
        resetAll(); closeAll(); state.dayPlan = null;
        const st = content.journeyData[0]; state.selectedStation = 0; state.selectedVerse = 0; state.dailyIds = []; state.dailyLeft = 1;
        dailyLessonDone(st); await w(20); const a = state.lessonDays;
        state.selectedVerse = 0; dailyLessonDone(st); await w(20);
        closeAll(); showMap();
        return { lessonDaysOncePerDay: a === 1 && state.lessonDays === 1 };
      });
      return o;
    }));
    await p.close();
  }

  /* ================= ج: السيناريوهات ================= */
  const DRIVER = () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const act = id => { const e = document.getElementById(id); return !!e && e.classList.contains('active'); };
    const gameShown = () => document.getElementById('gameScreen').style.display === 'block';
    async function popups() {
      if (act('newAchievementPopup')) { document.getElementById('newAchievementPopup').classList.remove('active'); return true; }
      if (act('repeatPopup')) { document.getElementById('repeatNextBtn').click(); return true; }
      if (act('quizPopup')) { skipQuiz(); return true; }
      if (act('rewardPopup')) { closePopup('rewardPopup'); return true; }
      if (act('summaryPopup')) { closeSummary(); return true; }
      if (act('hubPopup')) { closePopup('hubPopup'); return true; }
      const other = [...document.querySelectorAll('.modal-overlay.active')];
      if (other.length) { other.forEach(m => m.classList.remove('active')); return true; }
      return false;
    }
    async function solve() {
      const go = document.getElementById('introGo'); if (go) go.click();
      if (activeVariant && document.getElementById('optionsBank')) {
        for (let k = 0; k < 4; k++) {
          const want = activeVariant && activeVariant.correctWord;
          const btn = [...document.querySelectorAll('#optionsBank .word-btn')].find(x => x.textContent === want && !x.disabled);
          if (!btn) break; btn.click(); await w(420);
          if (document.getElementById('nextBtn').style.display !== 'none') break;
        }
        return;
      }
      const cur = getCurrentVerse(); if (!cur) return;
      for (const word of cur.verse.correctOrder) {
        const btn = [...document.querySelectorAll('#wordsBank .word-btn')].find(x => !x.classList.contains('selected') && !x.hidden && x.dataset.word === word);
        if (btn) btn.click();
      }
    }
    /* يوم كامل: «درس اليوم» حتى ينتهي ما فيه، كما يفعل الطفل */
    window.__playDay = async function (maxSteps) {
      const log = { verses: 0, newSeen: 0, steps: 0, end: '' };
      const seen0 = Object.keys(state.seenVerses || {}).length;
      document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      showMap(); startDailyLesson();
      for (let s = 0; s < (maxSteps || 300); s++) {
        log.steps = s;
        await w(12);
        if (await popups()) continue;
        if (gameShown()) {
          const nb = document.getElementById('nextBtn');
          if (nb.style.display === 'none') { await solve(); await w(15); }
          if (nb.style.display !== 'none') { log.verses++; nb.click(); continue; }
          log.end = 'stuck:' + (getCurrentVerse() ? getCurrentVerse().verse.id : '-'); break;
        }
        renderDailyCard();
        const btn = document.getElementById('dailyMainBtn');
        if (btn && !btn.disabled) { startDailyLesson(); continue; }
        log.end = 'done'; break;
      }
      log.newSeen = Object.keys(state.seenVerses || {}).length - seen0;
      return log;
    };
  };

  // ---- ج1: طفل جديد أسبوعاً كاملاً عبر الواجهة ----
  {
    const p = await (await b.newContext({ viewport: { width: 380, height: 760 } })).newPage();
    p.on('pageerror', e => errs.push('week: ' + e.message)); p.on('dialog', d => d.accept());
    await p.addInitScript(fakeSpeech); await p.addInitScript(fakeClock); await p.addInitScript(DRIVER);
    await p.addInitScript(() => { try { window.__setDay(0); } catch (e) {} });
    await p.goto(URL); await p.waitForTimeout(900);
    const W = await p.evaluate(async () => {
      document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      const u = getCurrentUser(); u.gender = 'boy'; u.name = 'عمر'; saveState(); vpPref('onboarded', true);
      window.showNewAchievement = () => {};
      const days = [];
      for (let d = 0; d < 7; d++) {
        window.__setDay(d);
        const log = await window.__playDay(400);
        const boxes = Object.values(state.leitner || {}).map(e => e.box);
        const dueLeft = leitnerDueVerses().length;
        days.push({ d, ...log, seen: Object.keys(state.seenVerses).length, maxBox: Math.max(0, ...boxes), dueLeft, weeklyOff: !!(state.weekly && state.weekly.off), hero: !!(state.achievements && state.achievements.weekly) });
      }
      return { days, points: state.points, lessonDays: state.lessonDays, achievements: Object.keys(state.achievements || {}) };
    });
    results.week = W;
    const days = W.days;
    need('أسبوع: كل يوم ينتهي «درس اليوم» بلا تعليق: ' + days.map(x => x.end).join(','), days.every(x => x.end === 'done'));
    need('أسبوع: 3 أبيات جديدة كل يوم: ' + days.map(x => x.newSeen).join(','), days.every(x => x.newSeen === 3));
    need('أسبوع: لا مراجعة متأخرة في آخر كل يوم: ' + days.map(x => x.dueLeft).join(','), days.every(x => x.dueLeft === 0));
    need('أسبوع: 21 بيتاً بعد سبعة أيام', days[6].seen === 21);
    need('أسبوع: لا صندوق فوق الثالث في الأسبوع الأول: ' + days.map(x => x.maxBox).join(','), days.every(x => x.maxBox <= 3));
    need('أسبوع: تحدّي الأسبوع لا يبدأ في أول يوم', days[0].weeklyOff === true);
    need('أسبوع: «مواظب» بعد سبعة أيام: ' + W.lessonDays, W.lessonDays === 7 && W.achievements.includes('steady7'));
    await p.close();
  }

  // ---- ج2: أسرة بثلاثة أطفال، ثلاثة أيام، كل طفل بإعداداته ----
  {
    const p = await (await b.newContext({ viewport: { width: 380, height: 760 } })).newPage();
    p.on('pageerror', e => errs.push('family: ' + e.message)); p.on('dialog', d => d.accept());
    await p.addInitScript(fakeSpeech); await p.addInitScript(fakeClock); await p.addInitScript(DRIVER);
    await p.addInitScript(() => { try { window.__setDay(0); } catch (e) {} });
    await p.goto(URL); await p.waitForTimeout(900);
    const F = await p.evaluate(async () => {
      document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      window.showNewAchievement = () => {};
      const a = getCurrentUser(); a.name = 'دلال'; a.gender = 'girl'; saveState(); vpPref('onboarded', true);
      const mk = (id, name, gender, small) => { users.push({ id, name, avatar: small ? '🐼' : '🦊', gender, small, createdAt: Date.now(), state: normalizeUserState({}) }); };
      mk('u_farah', 'فرح', 'boy', false); mk('u_karim', 'كريم', 'boy', true); saveState();
      getUserById('u_farah').state.newPerDay = 2;
      const kids = [a.id, 'u_farah', 'u_karim'], out = {};
      for (let d = 0; d < 3; d++) {
        window.__setDay(d);
        for (const id of kids) {
          if (activeUserId !== id) { kidPickConfirm(id); kidPickDo(id); }
          const log = await window.__playDay(300);
          (out[id] = out[id] || []).push({ newSeen: log.newSeen, end: log.end });
        }
      }
      const seen = id => Object.keys(getUserById(id).state.seenVerses || {}).length;
      return { out, seen: kids.map(seen), plans: kids.map(id => (getUserById(id).state.dayPlan || {}).newCount), pts: kids.map(id => getUserById(id).state.points || 0) };
    });
    results.family = F;
    const ends = Object.values(F.out).flat().map(x => x.end);
    need('أسرة: كل الدروس انتهت بلا تعليق: ' + ends.join(','), ends.every(e => e === 'done'));
    need('أسرة: كل طفل بسقفه (3 ثم 2 بالإعداد ثم 2 للصغير) ثلاثة أيام: ' + JSON.stringify(F.seen), F.seen[0] === 9 && F.seen[1] === 6 && F.seen[2] === 6);
    need('أسرة: خطة اليوم لكل طفل وحده: ' + JSON.stringify(F.plans), F.plans[0] === 3 && F.plans[1] === 2 && F.plans[2] === 2);
    await p.close();
  }

  // ---- ج3: شهران من المراجعة (على مستوى منطق الجدولة، بالدوال الحقيقية) ----
  {
    const p = await (await b.newContext()).newPage();
    p.on('pageerror', e => errs.push('months: ' + e.message)); p.on('dialog', d => d.accept());
    await p.addInitScript(fakeSpeech); await p.addInitScript(fakeClock);
    await p.addInitScript(() => { try { window.__setDay(0); } catch (e) {} });
    await p.goto(URL); await p.waitForTimeout(900);
    const M = await p.evaluate(async () => {
      document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      window.showNewAchievement = () => {};
      const u = getCurrentUser(); u.gender = 'boy'; saveState(); vpPref('onboarded', true);
      let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
      const order = content.journeyData.flatMap(s => s.verses.map(v => v.id));
      const run = (withParent) => {
        resetAll(); document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        const stats = { peakDue: 0, noNewDays: 0, maxBox: 0 };
        for (let d = 0; d < 60; d++) {
          window.__setDay(d); state.dayPlan = null;
          const due0 = leitnerDueVerses().length; stats.peakDue = Math.max(stats.peakDue, due0);
          for (let s = 0; s < REVIEW_SESSIONS_PER_DAY; s++) {
            const due = leitnerDueVerses(); const plan = dayPlanToday();
            if (!due.length || plan.reviews >= REVIEW_SESSIONS_PER_DAY) break;
            plan.reviews++;
            due.slice(0, REVIEW_PER_SESSION).forEach(x => leitnerRecord(content.journeyData[x.stationIndex].verses[x.verseIndex].id, rnd() > 0.1));
          }
          let added = 0;
          while (!newVerseBlockReason()) {
            const vid = order.find(id => !state.seenVerses[id]); if (!vid) break;
            dayPlanToday().newCount++; state.seenVerses[vid] = true; leitnerRecord(vid, true); added++;
          }
          if (!added && order.some(id => !state.seenVerses[id])) stats.noNewDays++;
          stats.peakLeft = Math.max(stats.peakLeft || 0, leitnerDueVerses().length);
          if (withParent && d % 7 === 6) pcReadyList().forEach(([si, vi]) => { const vid = content.journeyData[si].verses[vi].id; leitnerRecord(vid, true, { parent: true }); state.parentChecks[vid] = { at: Date.now(), r: 'ok' }; });
          stats.maxBox = Math.max(stats.maxBox, ...Object.values(state.leitner).map(e => e.box));
        }
        stats.seen = Object.keys(state.seenVerses).length;
        stats.dueEnd = leitnerDueVerses().length;
        stats.confirmed = confirmedCount(state);
        return stats;
      };
      return { solo: run(false), parent: run(true) };
    });
    results.months = M;
    // المستحق صباحاً قد يقفز يوماً (أبيات أُخطئ فيها معاً تعود معاً)، لكن ما يبقى بعد جلستي اليوم قليل، ولا يتراكم
    need('شهران: ما يبقى بعد مراجعة اليوم قليل (' + M.solo.peakLeft + ') ولا يتراكم (' + M.solo.dueEnd + ')', M.solo.peakLeft <= 20 && M.solo.dueEnd <= 10 && M.solo.peakDue <= 45);
    need('شهران: يستمر الجديد (' + M.solo.seen + ' بيتاً)', M.solo.seen >= 120);
    need('شهران: بلا تسميع الوالد لا صندوق فوق الخامس (' + M.solo.maxBox + ')', M.solo.maxBox <= 5 && M.solo.confirmed === 0);
    need('شهران: مع تسميع الوالد أسبوعياً يصل إلى الصندوقين 6 و7 ويُؤكَّد الحفظ (' + M.parent.maxBox + '، ' + M.parent.confirmed + ')', M.parent.maxBox >= 6 && M.parent.confirmed > 0);
    await p.close();
  }

  for (const [k, v] of Object.entries(results)) if (typeof v === 'boolean' || typeof v === 'string') need(k + (v === true ? '' : ': ' + v), v === true);
  need('أخطاء صفحة: ' + errs.join(' | '), errs.length === 0);
  await b.close();
  console.log(JSON.stringify({ week: results.week && results.week.days.map(x => [x.newSeen, x.verses, x.maxBox, x.dueLeft]), family: results.family && results.family.seen, months: results.months }));
  if (bad.length) { console.log('v106 e2e: فشل:\n  ' + bad.join('\n  ')); process.exit(1); }
  console.log('v106 e2e: نجح');
})().catch(e => { console.error(e); process.exit(1); });
