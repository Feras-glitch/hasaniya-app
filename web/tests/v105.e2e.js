/* اختبار v105 (المراجعة الشاملة بعين جديدة، والتوصيات المعتمدة كلها):
   1) «بطل الأسبوع» لا يبدأ قبل خمسة أبيات، واستعادة نسخة بمعرّف غريب لا تتوقف، وتنقية الحقول الجديدة
   2) خطة اليوم: جلستا مراجعة حتى 10 أبيات، وسقف الجديد لكل طفل، ولا جديد مع تراكم المراجعة (من أي باب)
   3) العون يقلّ بالصندوق: ترتيب، ثم كلمتان ناقصتان، ثم أول الحروف؛ والنقاط نفسها للمراجعة
   4) الصندوقان 6 و7 بتسميع الوالد وحده، و«تذكّرتُه» لا يرفع، و«يحفظه غيباً» في التقارير
   5) مشتّتات «ماذا حدث هنا؟»، وطيّ القصة المكررة، والقصة القصيرة للصغير
   6) الشاشة المبسطة و«العب»، ومنطقة الوالدين، وتذكير النسخة الاحتياطية، وتنبيه الآيفون
   7) سياسة أمان المحتوى، والخط المضمّن، ولا إنجليزية، والصوت البشري المضمّن */
const { chromium } = require('playwright');
const URL = (process.env.HASANIYA_URL || 'file:///home/claude/hasaniya-desktop/standalone/hasaniya.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const bad = []; const need = (m, ok) => { if (!ok) bad.push(m); };
  const p = await (await b.newContext({ viewport: { width: 380, height: 760 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI));
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
    const T = async (name, fn) => { try { Object.assign(o, await fn()); } catch (e) { o[name + 'Exception'] = String(e && e.stack || e).slice(0, 300); } };
    const closeAll = () => document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    const fresh = () => { resetAll(); closeAll(); showMap(); state.dayPlan = null; };
    closeAll();
    const u = getCurrentUser(); u.gender = 'boy'; u.name = 'عمر'; u.small = false; saveState();
    try { vpPref('onboarded', true); } catch (e) {}
    const all = content.journeyData.flatMap(s => s.verses);
    const pos = v => { const si = content.journeyData.findIndex(s => s.verses.includes(v)); return { si, vi: content.journeyData[si].verses.indexOf(v) }; };
    const gameShown = () => document.getElementById('gameScreen').style.display === 'block';

    /* ---------- 1) الأسبوع الأول، والاستعادة، والتنقية ---------- */
    await T('weekly', () => {
      fresh(); const r = {};
      state.seenVerses = { [all[0].id]: true }; state.weekly = null;
      const wk = ensureWeekly(state);
      r.weeklyOffBefore5 = wk.off === true && wk.ids.length === 0;
      const badges = JSON.stringify(state.achievements || {});
      markWeekly(all[0].id);
      r.weeklyNoBadgeAfterFirstVerse = JSON.stringify(state.achievements || {}) === badges && !(state.weekly.done || {})[all[0].id];
      for (let i = 0; i < 6; i++) state.seenVerses[all[i].id] = true;
      state.weekly.week = 'أسبوع مضى';
      const wk2 = ensureWeekly(state);
      r.weeklyStartsWith5 = wk2.off === false && wk2.ids.length === WEEKLY_MIN_SEEN;
      return r;
    });
    await T('restore', () => {
      const res = restoreUsersFromList([
        { id: 'x"><b>', name: 'أ', state: {} },
        { id: 'author', name: 'ب', state: {} },
        { id: 'kid_ok', name: 'ج', state: { stationStatus: { s1: 'current' }, seenVerses: { s1v1: true }, leitner: { s1v1: { box: 7, due: 5 } }, newPerDay: 9,
          playSet: ['riddles', 'x y', 'timeline', '<img>'], allActivities: 'yes', dayPlan: { day: 'd', reviews: 50, newCount: -4 } } }]);
      const st = res.ok && res.users[2].state;
      return {
        restoreOddIdsNoStop: res.ok && res.users.length === 3 && res.users[0].id !== 'x"><b>' && isSafeId(res.users[0].id) && res.users[1].id !== 'author',
        restoreKeepsBox7: !!st && st.leitner.s1v1.box === 7,
        restoreSanitizesNew: !!st && st.newPerDay === null && st.allActivities === false
          && JSON.stringify(st.playSet) === '["riddles","timeline"]' && st.dayPlan.reviews === 9 && st.dayPlan.newCount === 0
      };
    });

    /* ---------- 2) خطة اليوم ---------- */
    await T('plan', async () => {
      fresh(); const r = {};
      r.newDefault3 = newPerDayOf() === 3;
      state.newPerDay = 4; r.newParentSets = newPerDayOf() === 4; state.newPerDay = null;
      u.small = true; r.newSmall2 = newPerDayOf() === 2; u.small = false;
      // السقف يمنع البيت الجديد من أي باب (هنا: فتح المحطة مباشرة)
      dayPlanToday().newCount = newPerDayOf();
      state.selectedStation = 0; state.selectedVerse = 0; playMode = MODE_NORMAL;
      enterPlayScreen('اختبار');
      r.capBlocksNewVerse = !gameShown() && !state.seenVerses[all[0].id];
      state.dayPlan.newCount = 0; playMode = MODE_NORMAL;
      enterPlayScreen('اختبار');
      r.underCapCounts = gameShown() && !!state.seenVerses[all[0].id] && state.dayPlan.newCount === 1;
      showMap();
      // 16 بيتاً حان موعدها: جلستا مراجعة (10 ثم الباقي)، ولا جديد
      fresh();
      for (let i = 0; i < 16; i++) { state.seenVerses[all[i].id] = true; state.leitner[all[i].id] = { box: 1, due: Date.now() - 86400000, lastWrong: 0 }; }
      r.overdueNoNew = newVerseBlockReason() === 'reviewOnlyToday';
      startDailyLesson();
      r.review1Max10 = playMode === MODE_REVIEW && playQueue.length === REVIEW_PER_SESSION && state.dayPlan.reviews === 1;
      showMap(); startDailyLesson({ afterReview: true });
      r.afterReviewNoNew = !gameShown();
      startDailyLesson();
      r.review2 = playMode === MODE_REVIEW && state.dayPlan.reviews === 2;
      showMap(); startDailyLesson();
      r.noThirdReview = !gameShown() && state.dayPlan.reviews === 2;
      showMap();
      // متابعة الرحلة من ناجي = درس اليوم
      fresh();
      state.seenVerses[all[0].id] = true; state.leitner[all[0].id] = { box: 1, due: Date.now() - 1000, lastWrong: 0 };
      resumeJourney();
      r.resumeIsDailyLesson = playMode === MODE_REVIEW && state.dayPlan.reviews === 1;
      showMap();
      return r;
    });

    /* ---------- 3) العون حسب الصندوق، والنقاط ---------- */
    await T('variants', async () => {
      fresh(); const r = {};
      const v = all.find(x => x.type === 'word_order' && x.words.length >= 6 && new Set(x.words).size === x.words.length);
      const { si, vi } = pos(v);
      state.seenVerses[v.id] = true;
      const setBox = bx => { state.leitner[v.id] = { box: bx, due: Date.now() - 1000, lastWrong: 0 }; };
      const enterReview = () => { playQueue = [{ stationIndex: si, verseIndex: vi }]; playMode = MODE_REVIEW; playIndex = 0;
        sessionStats = { correct: 0, wrong: 0, total: 1 }; enterPlayScreen('🗃️ مراجعة'); };
      setBox(1); enterReview();
      r.box1PlainOrder = !!document.getElementById('wordsBank') && !document.querySelector('#wordsBank .initial-tile') && !activeVariant;
      const pts0 = state.points || 0;
      setBox(3); enterReview();
      r.box3TwoBlanks = !!activeVariant && Array.isArray(activeVariant.blanks) && activeVariant.blanks.length === 2 && !!document.getElementById('optionsBank');
      const pick = () => [...document.querySelectorAll('#optionsBank .word-btn')].find(x => x.textContent === activeVariant.correctWord).click();
      pick(); await w(500);
      r.box3SecondBlank = activeVariant && activeVariant.step === 1 && !!document.querySelector('#gameArea .filled') && sessionStats.correct === 0;
      pick(); await w(200);
      r.box3Completes = sessionStats.correct === 1 && document.getElementById('nextBtn').style.display !== 'none';
      r.reviewSamePoints = (state.points || 0) - pts0 === 10;
      setBox(4); enterReview();
      const tiles = [...document.querySelectorAll('#wordsBank .word-btn')];
      r.box4Initials = tiles.length === v.words.length && tiles.every(x => x.classList.contains('initial-tile')) && tiles.some(x => /…$/.test(x.textContent));
      const labels = initialsLabels(v.words);
      r.initialsDistinct = new Set(labels).size === new Set(v.words.map(x => x.replace(/[ً-ٰٟ]/g, ''))).size;
      for (const word of v.correctOrder) { tiles.find(x => !x.classList.contains('selected') && x.dataset.word === word).click(); await w(10); }
      r.box4Completes = sessionStats.correct === 1;
      // لا يُقرأ البيت على الطفل حين يُطلب منه تذكّر كلماته (الصندوق 3 فما فوق)
      setBox(3); window.__said = []; enterReview(); await w(150);
      r.box3NoVerseRead = !window.__said.some(t => t.includes(v.words.slice(0, 3).join(' ')));
      showMap();
      return r;
    });

    /* ---------- 4) الصناديق 6 و7، والتذكّر، والإتقان المؤكَّد ---------- */
    await T('boxes', async () => {
      fresh(); const r = {};
      const v = all[3];
      state.seenVerses[v.id] = true;
      state.leitner[v.id] = { box: 5, due: Date.now() - 1000, lastWrong: 0 };
      leitnerRecord(v.id, true);
      r.box5StaysWithoutParent = state.leitner[v.id].box === 5 && state.leitner[v.id].due > Date.now() + 15 * 86400000;
      r.readyForParent = pcReadyList().some(([si, vi]) => content.journeyData[si].verses[vi].id === v.id);
      leitnerRecord(v.id, true, { parent: true });
      r.parentSameDayPromotes = state.leitner[v.id].box === 6;   // مراجعة الطفل صباحاً لا تستهلك فرصة الوالد
      r.confirmedAt6 = verseConfirmed(v.id) && confirmedCount(state) === 1 && calculateMastery(state).confirmed === 1;
      leitnerRecord(v.id, false);
      r.wrongDropsTo1 = state.leitner[v.id].box === 1 && !verseConfirmed(v.id);
      // تذكّرتُه لا يرفع، ونسيته يعيد
      const v2 = all[4];
      state.seenVerses[v2.id] = true; state.leitner[v2.id] = { box: 2, due: Date.now() - 1000, lastWrong: 0 };
      const rr = renderRecall; renderRecall = () => {};
      try {
        recallQ = { items: [{ v: v2 }, { v: v2 }], i: 0, score: 0 };
        rateRecall(true);
        r.recallNoPromote = state.leitner[v2.id].box === 2 && recallQ.score === 1;
        rateRecall(false);
        r.recallForgotDrops = state.leitner[v2.id].box === 1;
      } finally { renderRecall = rr; }
      r.boxNames7 = LEITNER_MAX === 7 && LEITNER_DAYS[6] === 32 && LEITNER_DAYS[7] === 64;
      return r;
    });

    /* ---------- 5) الأسئلة والقصص ---------- */
    await T('events', () => {
      const r = { eventsSound: true }; const fails = [];
      for (const v of all) {
        if (!v.event) continue;
        const ch = eventChoicesFor(v);
        const mine = eventWords(v.event);
        const others = ch.filter(c => c !== v.event);
        const sameStory = others.some(c => all.some(x => x.event === c && v.story && x.story === v.story));
        if (ch.length !== 3 || new Set(ch).size !== 3 || !ch.includes(v.event) || others.some(c => eventLexShare(eventWords(c), mine)) || sameStory) fails.push(v.id);
      }
      r.eventsSound = fails.length === 0 || ('فشل: ' + fails.slice(0, 5).join(','));
      return r;
    });
    await T('stories', async () => {
      const r = {};
      const rep = all.find(v => storySameAsPrev(v));
      r.foldFound = !!rep;
      renderStoryContent(rep);
      const st = document.getElementById('storyText');
      r.foldShown = !!st.querySelector('.story-same') && /القصة كاملة/.test(st.textContent) && !st.textContent.includes(rep.story.slice(0, 30));
      window.__said = [];
      await playStoryAudio(rep); await w(80);
      r.foldNoReplay = !window.__said.some(t => t.includes(rep.story.slice(0, 20)));
      [...st.querySelectorAll('button')].find(x => /القصة كاملة/.test(x.textContent)).click(); await w(150);
      r.foldOpens = st.textContent.includes(rep.story.slice(0, 30)) && window.__said.some(t => t.includes(rep.story.slice(0, 20)));
      audioStopAll();
      const long = all.find(v => v.story && !storySameAsPrev(v) && (v.story.match(/[^.!؟]+[.!؟]*/g) || []).length > 3);
      const shortTxt = storyShortPart(long.story);
      r.shortTwoSentences = !!shortTxt && shortTxt.length < long.story.length && long.story.startsWith(shortTxt.slice(0, 15));
      u.small = true;
      renderStoryContent(long);
      r.smallSeesShort = st.textContent.includes(storyShortFor(long).slice(0, 20)) && /أكمل القصة/.test(st.textContent) && !st.textContent.includes(long.story.slice(-25));
      u.small = false;
      return r;
    });

    /* ---------- 6) الواجهة ومنطقة الوالدين ---------- */
    await T('home', async () => {
      fresh(); const r = {};
      state.allActivities = false; applyHomeMode();
      const vis = id => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== 'none'; };
      r.simpleHome = document.body.classList.contains('simple-home') && !vis('toolsBtn') && !vis('reviewHubBtn') && vis('playBtn') && vis('albumBtn') && vis('parentEntryBtn');
      const daily = document.getElementById('dailyCard'), play = document.getElementById('playBtn');
      r.dailyFirst = !!(daily.compareDocumentPosition(play) & Node.DOCUMENT_POSITION_FOLLOWING);
      openPlayHub();
      const tiles = [...document.querySelectorAll('#hubBody .hub-tile')].map(x => x.textContent);
      r.playHubDefault3 = tiles.length === 3 && tiles.some(t => t.includes('الألغاز'));
      closeAll();
      u.small = true; r.playHubSmall2 = playSetOf().length === 2; u.small = false;
      state.playSet = null; togglePlayAct('places');
      r.playSetAdd = playSetOf().includes('places');
      state.playSet = ['riddles']; togglePlayAct('riddles');
      r.playSetMin1 = playSetOf().length >= 1;
      setAllActivities(true);
      r.allActivitiesShowsTools = !document.body.classList.contains('simple-home') && vis('toolsBtn');
      setAllActivities(false);
      return r;
    });
    await T('parent', async () => {
      fresh(); const r = {};
      for (let i = 0; i < 12; i++) state.seenVerses[all[i].id] = true;
      localStorage.removeItem(STORAGE_LAST_BACKUP); localStorage.removeItem(STORAGE_BACKUP_SNOOZE); localStorage.setItem(STORAGE_RECS_SINCE, '0');
      renderParentAlerts(); renderParentHeadline();
      const alerts = () => document.getElementById('parentAlerts').textContent;
      r.backupReminder = /نسخة احتياطية/.test(alerts());
      localStorage.setItem(STORAGE_LAST_BACKUP, String(Date.now())); renderParentAlerts();
      r.backupFreshNoReminder = !/لم تحفظ نسخة/.test(alerts()) && !/آخر نسخة احتياطية قبل/.test(alerts());
      localStorage.setItem(STORAGE_LAST_BACKUP, String(Date.now() - 8 * 86400000)); renderParentAlerts();
      r.backupWeekly = /قبل 8 أيام/.test(alerts());
      backupSnooze(); renderParentAlerts();
      r.backupSnooze = !/آخر نسخة احتياطية قبل/.test(alerts());
      localStorage.removeItem(STORAGE_BACKUP_SNOOZE); localStorage.setItem(STORAGE_RECS_SINCE, '25'); localStorage.setItem(STORAGE_LAST_BACKUP, String(Date.now())); renderParentAlerts();
      r.packReminder = /لم تُصدَّر في حزمة الصوت/.test(alerts());
      localStorage.setItem(STORAGE_RECS_SINCE, '0');
      renderParentHeadline();
      r.headline = /يحفظ غيباً/.test(document.getElementById('parentHeadline').textContent) && /آخر نسخة احتياطية/.test(document.getElementById('backupInfo').textContent);
      r.parentGroups = document.querySelectorAll('#parentScreen details.parent-group').length === 5 && !!document.querySelector('#parentScreen details.danger-zone');
      r.noEnglish = !/English|EN\b/.test(document.getElementById('parentScreen').textContent) && typeof tParent === 'undefined';
      // الآيفون: لا يظهر خارج Safari (هنا ملف محلي)، ونصّه يذكر النسخة الاحتياطية حين يوجد تقدّم
      r.iosHiddenHere = iosNeedsInstall() === false && document.getElementById('iosInstallNote').hidden === true;
      r.iosText = /الشاشة الرئيسية/.test(iosInstallHTML(false)) && /نسخة احتياطية/.test(iosInstallHTML(true)) && !/نسخة احتياطية/.test(iosInstallHTML(false));
      showMap();
      return r;
    });

    /* ---------- 7) الأمان والخط والصوت المضمّن ---------- */
    await T('font', async () => {
      const r = {};
      await document.fonts.ready;
      const faces = await document.fonts.load('20px HasaniyaNaskh', 'بسم');
      r.fontLoads = faces.length >= 1 && document.fonts.check('20px HasaniyaNaskh', 'بسم');
      const probe = document.createElement('div'); probe.className = 'verse-text'; probe.textContent = 'بِسْمِ'; document.getElementById('mapScreen').appendChild(probe);
      r.fontUsed = /HasaniyaNaskh/.test(getComputedStyle(probe).fontFamily);
      setPref('systemFont', true);
      r.systemFontToggle = document.body.classList.contains('system-font') && !/^"?HasaniyaNaskh/.test(getComputedStyle(probe).fontFamily);
      setPref('systemFont', false);
      r.fontBack = !document.body.classList.contains('system-font') && /HasaniyaNaskh/.test(getComputedStyle(probe).fontFamily);
      probe.remove();
      return r;
    });
    await T('bundled', async () => {
      const r = {};
      const v1 = all[0], v2 = all[1], st = all.find(v => v.story);
      for (const k of [v1, v2].map(v => authorKey('verse', v.id)).concat([authorKey('story', st.id), 'meta|bundled'])) await recDelete(k);
      // تسجيل الأسرة للبيت الثاني يبقى
      await recPut({ key: authorKey('verse', v2.id), verseId: v2.id, kind: 'verse', uid: 'author', mime: 'audio/webm', blob: new Blob([new Uint8Array([9, 9])], { type: 'audio/webm' }),
        fp: textFingerprint(v2.fullVerse), at: Date.now(), source: 'rec', reviewed: true, author: 'الوالد' });
      const files = [
        { name: 'audio/b1.webm', data: new Uint8Array(40).fill(1) },
        { name: 'audio/b2.webm', data: new Uint8Array(40).fill(2) },
        { name: 'audio/b3.webm', data: new Uint8Array(40).fill(3) }];
      const items = [
        { kind: 'verse', id: v1.id, file: 'audio/b1.webm', mime: 'audio/webm', fp: textFingerprint(v1.fullVerse), at: 1, source: 'rec', reviewed: true },
        { kind: 'verse', id: v2.id, file: 'audio/b2.webm', mime: 'audio/webm', fp: textFingerprint(v2.fullVerse), at: 1, source: 'rec', reviewed: true },
        { kind: 'story', id: st.id, file: 'audio/b3.webm', mime: 'audio/webm', fp: textFingerprint(st.story), at: 1, source: 'rec', reviewed: true }];
      const mk = id => zipStore([{ name: 'manifest.json', data: new TextEncoder().encode(JSON.stringify({ app: 'hasaniya', type: 'voicepack', version: 2, author: 'القارئ', bundle: id, items })) }, ...files]).arrayBuffer();
      const buf = await mk('aaaa1111bbbb');
      r.bundledNoneWhenEmpty = (await vpInstallBundledVoice('', async () => buf)).skipped === 'none';
      const wrong = await vpInstallBundledVoice('cccc2222dddd', async () => buf).then(() => 'installed', e => 'rejected');
      r.bundledRejectsMismatch = wrong === 'rejected' && !(await recGet('meta|bundled'));
      const res = await vpInstallBundledVoice('aaaa1111bbbb', async () => buf);
      const a1 = await recGet(authorKey('verse', v1.id)), a2 = await recGet(authorKey('verse', v2.id));
      r.bundledInstalls = res.added === 2 && res.kept === 1 && a1 && a1.source === 'bundled' && a1.at === 1 && a1.author === 'القارئ';
      r.bundledKeepsFamily = a2 && a2.source === 'rec' && a2.author === 'الوالد';
      r.bundledPlays = !!(await authorRecFor('verse', v1)) && !!(await authorRecFor('story', st));
      r.bundledOnce = (await vpInstallBundledVoice('aaaa1111bbbb', async () => { throw new Error('لا يُقرأ مرة أخرى'); })).skipped === 'done';
      const plan = await vpPlanExport({ onlyReviewed: false, deltaOnly: false });
      r.bundledNotExported = plan.bundled === 2 && !plan.selected.some(x => x.source === 'bundled') && plan.selected.some(x => x.key === authorKey('verse', v2.id));
      await renderVoiceStatus();
      r.bundledStatus = /مضمّنة في التطبيق بصوت القارئ/.test(document.getElementById('vpStatus').textContent);
      // ملف الواحد: الحزمة داخل الصفحة نفسها
      let bin = ''; new Uint8Array(buf).forEach(x => { bin += String.fromCharCode(x); });
      window.HASANIYA_VOICE_PACK_B64 = btoa(bin);
      const back = new Uint8Array(await vpBundledBuffer());
      r.bundledStandalone = back.length === buf.byteLength && back.every((x, i) => x === new Uint8Array(buf)[i]);
      delete window.HASANIYA_VOICE_PACK_B64;
      // حزمة معلم تُستورد بعده تحلّ محله (تاريخه 1)
      const tItems = [{ kind: 'verse', id: v1.id, file: 'audio/t1.webm', mime: 'audio/webm', fp: textFingerprint(v1.fullVerse), at: Date.now() - 5000, source: 'rec', reviewed: true }];
      const tBuf = await zipStore([{ name: 'manifest.json', data: new TextEncoder().encode(JSON.stringify({ app: 'hasaniya', type: 'voicepack', version: 2, author: 'المعلم', items: tItems })) },
        { name: 'audio/t1.webm', data: new Uint8Array(30).fill(5) }]).arrayBuffer();
      openVoiceImport();
      await importVoicePacks([new File([tBuf], 'teacher.zip', { type: 'application/zip' })]);
      const staged = vpStaged && vpStaged.items.find(x => x.key === authorKey('verse', v1.id));
      await vpCommitVoicePacks(); closeAll();
      const t1 = await recGet(authorKey('verse', v1.id));
      r.teacherPackReplacesBundled = !!staged && staged.action === 'replace' && t1 && t1.source === 'rec' && t1.author === 'المعلم';
      for (const k of [v1, v2].map(v => authorKey('verse', v.id)).concat([authorKey('story', st.id), 'meta|bundled'])) await recDelete(k);
      voiceCacheReset();
      return r;
    });
    await T('csp', async () => {
      await w(200);
      return { cspMeta: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'),
        cspNoViolations: window.__csp.length === 0 || ('مخالفات: ' + window.__csp.slice(0, 3).join(' | ')) };
    });
    return o;
  });
  for (const [k, v] of Object.entries(R)) need(k + (v === true ? '' : ': ' + v), v === true);
  need('pageErrors: ' + errs.join(' | '), errs.length === 0);
  await b.close();
  if (bad.length) { console.log('v105 e2e: فشل:\n  ' + bad.join('\n  ')); process.exit(1); }
  console.log(`v105 e2e: نجح (${Object.keys(R).length} فحصاً)`);
})().catch(e => { console.error(e); process.exit(1); });
