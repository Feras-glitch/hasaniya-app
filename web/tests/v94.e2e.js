/* اختبار v94: حماية البيانات والثغرات
   1) ترحيل تقدّم طفل من قبل تقسيم المحطتين 11 و12، ووجود محطة حالية دائماً
   2) ترحيل التسجيلات بالأرقام القديمة
   3) نسخة احتياطية قديمة تُستورد وتُحوَّل
   4) صناديق المراجعة لا تأخذ بيتاً لم يره الطفل، ولا يصعد البيت إلا مرة في اليوم
   5) وسام الأسبوع لا يُمنح قبل الأبيات الخمسة
   6) وضع التصفّح لا يُتمّ محطة ولا يمنح نقاطاً ولا يغيّر موضع الطفل
   7) سقوف النقاط في التذكّر والإخفاء واختبار المحطة
   8) مشاركة تقرير الأسبوع على أندرويد
   9) «رتّب بالنقر» في بيت فيه كلمة مكررة */
const { chromium } = require('playwright');
const URL = (process.env.HASANIYA_URL || 'file:///home/claude/hasaniya-desktop/standalone/hasaniya.html');
const OLD_STATE = {
  version: 13,
  stationStatus: { s1: 'completed', s2: 'completed', s3: 'completed', s4: 'completed', s5: 'completed', s6: 'completed', s7: 'completed', s8: 'completed', s9: 'completed', s10: 'completed', s11: 'completed', s12: 'current' },
  rewardUnlocked: { s10: true, s11: true }, stampDates: { s11: 1700000000000 }, charms: { s11: true },
  versePositions: { s12: 14 }, selectedStation: 11, selectedVerse: 14,
  seenVerses: { s11v5: true, s11v16: true, s12v20: true }, verseStats: { s11v13: { correct: 2, wrong: 1, lastCorrect: 1, lastWrong: 1 } },
  leitner: { s12v20: { box: 3, due: 1 } }, storyUnlocked: { s11v16: true },
  mistakes: { 's12v20::قَيْنُقَاعُ': { word: 'قَيْنُقَاعُ', verseId: 's12v20', stationId: 's12', context: '', level: 0, addedAt: 1, lastAttempt: 1 } },
  dailyCredits: { 'lesson|s12v13': 'x' }, points: 500, streak: 2, totalTimeSeconds: 100, achievements: {},
  stats: { perfectSessions: 0, reviewSessions: 0, shared: 0, challengeSessions: 0 }
};
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const bad = []; const need = (m, ok) => { if (!ok) bad.push(m); };
  const errs = [];

  /* ---------- 1) ترحيل التقدّم ---------- */
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 780 } });
    await ctx.addInitScript(old => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.clear();
      const u = { id: 'u_old', name: 'قديم', avatar: '🦁', gender: 'boy', createdAt: 1, state: old };
      const u2 = { id: 'u_stuck', name: 'عالق', avatar: '🐯', gender: 'girl', createdAt: 1,
        state: { stationStatus: { s1: 'completed', s2: 'completed' }, rewardUnlocked: {}, versePositions: {} } };
      localStorage.setItem('hasaniya_v13_users', JSON.stringify([u, u2]));
      localStorage.setItem('hasaniya_v13_activeUserId', 'u_old');
      localStorage.setItem('hasaniya_prefs', JSON.stringify({ onboarded: true }));
    }, OLD_STATE);
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('mig:' + e.message)); p.on('dialog', d => d.accept());
    await p.goto(URL); await p.waitForTimeout(900);
    const R = await p.evaluate(() => {
      const s = getCurrentUser().state, ss = s.stationStatus;
      const st = content.journeyData[s.selectedStation];
      const stuck = getUserById('u_stuck').state.stationStatus;
      return {
        ss: ['s11a', 's11b', 's12a', 's12b', 's12c', 's13'].map(k => ss[k] || '-').join(','),
        oldKeys: 's11' in ss || 's12' in ss,
        pos: s.versePositions.s12b, sel: st && st.id, selV: s.selectedVerse,
        seen: Object.keys(s.seenVerses).sort().join(','),
        stat: !!s.verseStats.s11bv1, leit: s.leitner.s12cv2 && s.leitner.s12cv2.box,
        story: !!s.storyUnlocked.s11bv4,
        mist: Object.values(s.mistakes).map(m => m.verseId + '@' + m.stationId).join(','),
        rew: !!s.rewardUnlocked.s11a && !!s.rewardUnlocked.s11b && !s.rewardUnlocked.s12a,
        charms: !!s.charms.s11a && !!s.charms.s11b, stamp: s.stampDates.s11b === 1700000000000,
        credit: s.dailyCredits['lesson|s12bv2'] === 'x',
        stuck: Object.keys(stuck).filter(k => stuck[k] === 'current').join(','),
        anyCurrent: content.journeyData.some(x => getStationStatus(x) === 'current')
      };
    });
    console.log('migrate', JSON.stringify(R));
    need('حالات المحطات بعد الترحيل: ' + R.ss, R.ss === 'completed,completed,completed,current,-,-');
    need('بقيت مفاتيح قديمة', !R.oldKeys);
    need('موضع الطفل في s12b: ' + R.pos + ' / ' + R.sel + ':' + R.selV, R.pos === 3 && R.sel === 's12b' && R.selV === 3);
    need('الأبيات المرئية: ' + R.seen, R.seen === 's11av5,s11bv4,s12cv2');
    need('إحصاءات البيت لم تُرحَّل', R.stat); need('صندوق المراجعة لم يُرحَّل: ' + R.leit, R.leit === 3);
    need('القصة المفتوحة لم تُرحَّل', R.story); need('الأخطاء: ' + R.mist, R.mist === 's12cv2@s12c');
    need('المكافآت', R.rew); need('الشارات', R.charms); need('تاريخ الختم', R.stamp); need('مفاتيح مركّبة', R.credit);
    need('طفل بلا محطة حالية لم يُصلَح: ' + R.stuck, R.stuck === 's3');
    need('لا محطة حالية', R.anyCurrent);
    // يستطيع أن يبدأ المحطة الحالية فعلاً
    const can = await p.evaluate(() => { const i = content.journeyData.findIndex(x => x.id === 's12b'); startStation(i); const c = getCurrentVerse(); showMap(); return c && c.verse.id; });
    need('لا يبدأ المحطة الحالية: ' + can, can === 's12bv4');

    /* ---------- 2) التسجيلات بالأرقام القديمة ---------- */
    await p.evaluate(async () => {
      await recPut({ key: 'author|verse|s11v16', verseId: 's11v16', kind: 'verse', uid: 'author', mime: 'audio/webm', blob: new Blob([new Uint8Array(50)], { type: 'audio/webm' }), at: 5 });
      await recPut({ key: 'u_old|s12v29', verseId: 's12v29', kind: 'verse', uid: 'u_old', mime: 'audio/webm', blob: new Blob([new Uint8Array(50)], { type: 'audio/webm' }), at: 5 });
      vpPref('recIdsV94', false);
    });
    await p.reload(); await p.waitForTimeout(1200);
    const RR = await p.evaluate(async () => ({
      a: !!(await recGet('author|verse|s11bv4')), aOld: !!(await recGet('author|verse|s11v16')),
      c: (await recGet('u_old|s12cv11') || {}).verseId, cOld: !!(await recGet('u_old|s12v29')),
      found: !!vpFindVerse('s11v16') && vpFindVerse('s11v16').id === 's11bv4'
    }));
    console.log('recs', JSON.stringify(RR));
    need('تسجيل الوالد لم يُنقل', RR.a && !RR.aOld); need('تسجيل الطفل لم يُنقل: ' + RR.c, RR.c === 's12cv11' && !RR.cOld);
    need('البحث برقم قديم', RR.found);

    /* ---------- 3) نسخة احتياطية قديمة ---------- */
    const IMP = await p.evaluate(old => { const r = sanitizeImportedState(JSON.parse(JSON.stringify(old))); return r.ok ? { ok: true, s12b: r.state.stationStatus.s12b, seen: Object.keys(r.state.seenVerses).length } : { ok: false, e: r.error }; }, OLD_STATE);
    need('استيراد نسخة قديمة: ' + JSON.stringify(IMP), IMP.ok && IMP.s12b === 'current' && IMP.seen === 3);
    const EV = await p.evaluate(() => { const r = validateEvaluationDoc({ app: 'hasaniya', type: 'evaluation', ratings: { s11v13: { memory: 5, pronunciation: 4, order: 3 } } }); return r.ok && !!r.ratings.s11bv1; });
    need('تقييم بأرقام قديمة', EV);
    await ctx.close();
  }

  /* ---------- 4–9) طفل جديد ---------- */
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 780 } });
    const shared = [];
    await ctx.addInitScript(() => {
      window.__shared = [];
      window.AndroidBridge = { shareFile: (n, m, b64) => window.__shared.push(n + '|' + m), printHtml() {}, speak() {}, cancel() {}, isSpeaking: () => false };
    });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('kid:' + e.message)); p.on('dialog', d => d.accept());
    await p.goto(URL); await p.waitForTimeout(900);
    const R = await p.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
      document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      const u = getCurrentUser(); u.gender = 'boy'; saveState();
      // 4) تمرين خاطئ لطفل لم يرَ شيئاً
      leitnerRecord('s13v2', false);
      o.leitUnseen = Object.keys(state.leitner || {}).length;
      state.seenVerses.s1v1 = true;
      leitnerRecord('s1v1', true); leitnerRecord('s1v1', true); leitnerRecord('s1v1', true);
      o.box = state.leitner.s1v1.box;
      leitnerRecord('s1v1', false); o.boxAfterWrong = state.leitner.s1v1.box;
      // الأسئلة من المرئي فقط
      o.exSeenOnly = seenJourney().flatMap(s => s.verses).every(v => state.seenVerses[v.id]);
      // 5) وسام الأسبوع
      const wk = ensureWeekly(state); const ids = weeklyVerseIds(wk.week);
      state.customBadges = {}; markWeekly(ids[0]);
      o.badgeEarly = !!(state.customBadges || {}).weekly;
      ids.slice(1).forEach(markWeekly); o.badgeDone = !!(state.customBadges || {}).weekly;
      // 7) سقوف النقاط
      const p0 = state.points;
      recallQ = { items: Array.from({ length: 10 }, () => ({ v: content.journeyData[0].verses[0] })), i: 0, score: 0 };
      for (let k = 0; k < 10; k++) { try { rateRecall(true); } catch (e) {} }
      o.recallPts = state.points - p0;
      const p1 = state.points;
      const st0 = content.journeyData[0];
      for (let k = 0; k < 3; k++) { quizState = { station: st0, items: [], i: 0, score: 3, answered: 3, onDone() {} }; finishQuiz(); }
      o.quizPts = state.points - p1;
      // 6) وضع التصفّح
      sessionStorage.setItem('browseOn', '1'); refreshBrowseUI();
      const p2 = state.points;
      const si = content.journeyData.findIndex(s => s.id === 's6');
      document.getElementById('jumpStation').value = String(si); fillJumpVerses();
      const last = content.journeyData[si].verses.length - 1;
      document.getElementById('jumpVerse').value = String(last);
      goBrowseJump(); await w(300);
      const v = getCurrentVerse().verse;
      for (const word of v.correctOrder) { const bt = [...document.querySelectorAll('#wordsBank .word-btn:not(.selected)')].find(x => x.textContent === word); if (bt) bt.click(); }
      await w(200);
      o.browseStory = document.getElementById('storyBox').style.display === 'block' || !v.story;
      nextVerse(); await w(200);
      o.s6 = getStationStatus(content.journeyData[si]); o.s7 = getStationStatus(content.journeyData[si + 1]);
      o.browsePts = state.points - p2; o.browseSeen = !!state.seenVerses[v.id];
      o.browsePos = state.versePositions.s6;
      sessionStorage.removeItem('browseOn'); refreshBrowseUI(); showMap();
      // 9) كلمة مكررة في «رتّب بالنقر»
      state.stationStatus.s2 = 'current';
      startStation(1); state.selectedVerse = 5; loadVerse(); await w(100);
      startTapOrder();
      const words = TAP_STATE.verse.words; const dup = words.findIndex((x, i) => words.indexOf(x) !== i); const first = words.indexOf(words[dup]);
      const order = words.map((_, pos) => pos === first ? dup : pos === dup ? first : pos);
      order.forEach(orig => pickTapWord(TAP_STATE.shuffled.findIndex((x, k) => x.i === orig && !TAP_STATE.picked.includes(k))));
      o.tapOk = !document.getElementById('shadowResult').querySelector('.miss');
      showMap();
      // 8) مشاركة تقرير الأسبوع على أندرويد
      shareWeeklyText(); await w(400);
      o.shared = window.__shared.join(';');
      return o;
    });
    console.log('kid', JSON.stringify(R));
    need('صندوق لبيت لم يُرَ', R.leitUnseen === 0);
    need('صعد البيت أكثر من مرة في اليوم: ' + R.box, R.box === 2);
    need('الخطأ لا يعيده للصندوق الأول', R.boxAfterWrong === 1);
    need('التمارين من غير المرئي', R.exSeenOnly);
    need('وسام الأسبوع مبكراً', !R.badgeEarly); need('وسام الأسبوع لم يُمنح بعد الخمسة', R.badgeDone);
    need('نقاط التذكّر بلا سقف: ' + R.recallPts, R.recallPts === 3);
    need('نقاط اختبار المحطة تتكرر: ' + R.quizPts, R.quizPts === 15);
    need('التصفّح لا يعرض القصة', R.browseStory);
    need('التصفّح أتمّ محطة: ' + R.s6 + '/' + R.s7, R.s6 === 'locked' && R.s7 === 'locked');
    need('التصفّح منح نقاطاً: ' + R.browsePts, R.browsePts === 0);
    need('التصفّح سجّل بيتاً مرئياً', !R.browseSeen); need('التصفّح غيّر موضع الطفل', R.browsePos === undefined);
    need('كلمة مكررة تُحسب خطأً', R.tapOk);
    need('مشاركة التقرير على أندرويد: ' + R.shared, /\.txt\|text\/plain/.test(R.shared));
    await ctx.close();
  }

  need('أخطاء: ' + errs.join(' | '), errs.length === 0);
  await b.close();
  if (bad.length) { console.log('FAIL v94:\n - ' + bad.join('\n - ')); process.exit(1); }
  console.log('OK v94');
})();
