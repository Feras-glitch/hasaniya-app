/* اختبار v109 (ملاحظات فراس بعد v108):
   1) الألغاز: ما حُلّ لا يتكرر، وبعد حلّ كل المفتوح شاشة «انتهت الألغاز» (لا اللغز نفسه)، و«أعد حلّها»،
      ويظهر البيت الذي فيه الجواب ويُقرأ، وحلّ لغز المحطة قبل v109 يُحتسب، وكل لغز يُفتح ببيته
   2) «المحطات متصلة»: 16 عنصراً في الاستوديو، وتسجيل المحطة يُسمع بدل الأبيات المفردة، ويُرفض إن تغيّر النص،
      وحزمة الصوت تقبل النوع الجديد
   3) «🎧 القصيدة كاملة» في «العب» وفي الأدوات، وتشغيل المحطات متتابعة بلا انقطاع
   4) «اسمع المعلم ثم سجّل» في التسميع المتصل */
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
        if (q[0] !== u) return; q.shift(); busy = false; if (u.onend) u.onend({}); next(); }, 5); }, 2);
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
    closeAll();
    const u = getCurrentUser(); u.gender = 'boy'; u.name = 'عمر'; u.small = false; saveState();
    try { vpPref('onboarded', true); } catch (e) {}
    const hubTitle = () => document.getElementById('hubTitle').textContent;
    const hubText = () => document.getElementById('hubBody').textContent;
    const J = content.journeyData;

    /* ---------- 1) الألغاز ---------- */
    await T('riddles', async () => {
      resetAll(); closeAll(); const r = {};
      r.riddlesCount = RIDDLES.length >= 40 || ('عدد الألغاز ' + RIDDLES.length);
      r.riddleKeysUnique = new Set(RIDDLES.map(riddleKey)).size === RIDDLES.length;
      // كل لغز يُفتح ببيته: بيتان من المحطة الأولى ← لغزان، لا المحطة كلها
      state.seenVerses = { s1v1: true, s1v4: true }; saveState();
      r.openByVerse = riddlesOpen().length === 2 && riddlesOpen().every(x => x.ref === 's1v1' || x.ref === 's1v4');
      startRiddles(); await w(50);
      r.firstRound = recallQ && recallQ.items.length === 2;
      for (let k = 0; k < 2; k++) {
        const it = recallQ.items[recallQ.i];
        document.getElementById('riddleIn').value = it.answer;
        window.__said = [];
        checkRiddle(); await w(400);
        const v = riddleVerse(it);
        if (k === 0) {
          r.verseShownAfterSolve = !!document.querySelector('#riddleMsg .riddle-verse') && document.getElementById('riddleMsg').textContent.includes(v.fullVerse);
          r.verseSpokenAfterSolve = window.__said.some(t => normalizeArabic(t).includes(normalizeArabic(v.fullVerse).split(' ')[0])) || ('قيل: ' + window.__said.join(' | ').slice(0, 120));
        }
        nextRiddle(); await w(50);
      }
      r.endScreenIsRiddles = hubTitle().includes('الألغاز') && hubText().includes(kidLine('riddlesAllDone').slice(0, 15)) || ('العنوان: ' + hubTitle());
      r.endScreenStations = document.querySelectorAll('#hubBody .riddle-status .hub-row').length === 16;
      r.endScreenScore = hubText().includes('2 / 2');
      // فتح الألغاز مرة أخرى: الشاشة نفسها، لا اللغز نفسه
      closeAll(); startRiddles(); await w(50);
      r.reopenShowsStatus = recallQ === null && hubTitle().includes('الألغاز') && !document.getElementById('riddleIn');
      r.againButton = !!document.querySelector('#hubBody button[onclick*="startRecall(\'riddle\', true)"]');
      startRecall('riddle', true); await w(50);
      r.againReplays = !!recallQ && recallQ.items.length === 2 && !!document.getElementById('riddleIn');
      // «أظهر الجواب» لا يُعدّ حلاً: يعود اللغز في المرة القادمة
      resetAll(); closeAll(); state.seenVerses = { s1v1: true }; saveState();
      startRiddles(); await w(30); revealRiddle(); await w(30);
      r.revealShowsVerse = document.getElementById('riddleMsg').textContent.includes(J[0].verses[0].fullVerse);
      nextRiddle(); await w(30);
      r.leftMessage = hubText().includes(kidLine('riddlesLeft').slice(0, 12)) && !!document.querySelector('#hubBody button[onclick="startRecall(\'riddle\')"]');
      closeAll(); startRiddles(); await w(30);
      r.unsolvedComesBack = !!recallQ && recallQ.items.length === 1;
      // حلّ لغز المحطة قبل v109 يُحتسب لأول ألغازها
      resetAll(); closeAll(); state.seenVerses = { s1v1: true }; state.riddlesSolved = { s1: true }; saveState();
      r.legacyStationSolved = riddleDone(RIDDLES.find(x => x.station === 's1')) && !riddleDone(RIDDLES.find(x => x.ref === 's1v4'));
      // النقاط مرة لكل لغز
      resetAll(); closeAll(); state.seenVerses = { s1v1: true }; saveState();
      const p0 = state.points || 0;
      startRecall('riddle', true); await w(20); document.getElementById('riddleIn').value = 'الواحد'; checkRiddle(); nextRiddle(); await w(20);
      startRecall('riddle', true); await w(20); document.getElementById('riddleIn').value = 'الواحد'; checkRiddle(); nextRiddle(); await w(20);
      r.pointsOncePerRiddle = (state.points || 0) - p0 === 5 || ('النقاط ' + ((state.points || 0) - p0));
      // الصغير: يختار من ثلاثة، ولا يظهر في الخيارات جواب ممنوع (avoid)
      u.small = true; saveState();
      const rHira = RIDDLES.find(x => x.answer === 'حرا');
      let leak = false; for (let k = 0; k < 60; k++) if (riddleChoices(rHira).includes('الغار')) leak = true;
      r.avoidRespected = !leak;
      u.small = false; saveState();
      closeAll();
      return r;
    });

    /* ---------- 2) المحطات متصلة ---------- */
    await T('stations', async () => {
      const r = {}; voiceCacheReset();
      const items = voiceRegistry().items.filter(it => it.section === 'station');
      r.studioStations = items.length === 16 && items.every(it => it.kind === 'station' && it.key === authorKey('station', J[it.station].id));
      r.studioSection = VOICE_SECTIONS.some(s => s.id === 'station' && s.title.includes('المحطات متصلة'));
      const st = J[1];
      const pv = pvItem('station', st.id);
      r.pvItemStation = !!pv && pv.section === 'station' && pv.text === vpStationText(st) && pvMaxMs(pv) >= 300000;
      // بلا تسجيل: أبيات المحطة واحداً واحداً
      let parts = await stationModelParts(st);
      r.fallbackToVerses = parts.length === st.verses.length && parts.every(x => !x.rec);
      // بتسجيل صالح: جزء واحد
      const key = authorKey('station', st.id);
      await recPut({ key, verseId: st.id, kind: 'station', uid: 'author', mime: 'audio/webm', blob: new Blob([new Uint8Array(40)], { type: 'audio/webm' }), fp: textFingerprint(vpStationText(st)), source: 'rec', at: Date.now() });
      parts = await stationModelParts(st);
      r.stationRecUsed = parts.length === 1 && !!parts[0].rec;
      // جزء من المحطة (التسميع المتصل لما حُفظ فقط): أبيات مفردة لا تسجيل المحطة كله
      parts = await stationModelParts(st, st.verses.slice(0, 2));
      r.partialUsesVerses = parts.length === 2;
      r.validInStudio = voiceRecValid(pv, await recGet(key));
      // نص تغيّر (تشكيل بيت): لا يُشغَّل، ويُعلَّم في الاستوديو
      const old = await recGet(key); old.fp = 'deadbeef'; await recPut(old);
      parts = await stationModelParts(st);
      r.staleFallsBack = parts.length === st.verses.length;
      r.staleMarked = !voiceRecValid(pv, await recGet(key));
      await recDelete(key);
      // الحزمة: النوع الجديد مقبول، وغير المعروف مرفوض
      const base = { app: 'hasaniya', type: 'voicepack', version: 2, author: 'x' };
      r.manifestAcceptsStation = vpValidateManifest({ ...base, items: [{ kind: 'station', id: st.id, file: 'audio/a1.webm', mime: 'audio/webm', fp: textFingerprint(vpStationText(st)) }] }).ok === true;
      r.manifestRejectsOther = vpValidateManifest({ ...base, items: [{ kind: 'stationx', id: st.id, file: 'audio/a1.webm', mime: 'audio/webm' }] }).ok === false;
      voiceCacheReset();
      return r;
    });

    /* ---------- 3) القصيدة كاملة ---------- */
    await T('poem', async () => {
      const r = {};
      r.inPlayDefault = playSetOf().includes('poemListen');
      r.inTools = TOOLS.some(t => t.fn === 'showPoemListen');
      showPoemListen(); await w(30);
      r.poemRows = document.querySelectorAll('#hubBody .riddle-status .hub-row').length === 16;
      // تشغيل محطتين متتابعتين بالقراءة الآلية: كل أبياتهما تُقال بالترتيب
      window.__said = [];
      await playStations(0, 1);
      const want = J[0].verses.concat(J[1].verses).map(v => normalizeArabic(v.fullVerse).split(' ')[0]);
      const got = window.__said.map(t => normalizeArabic(t).split(' ')[0]);
      r.playsInOrder = want.every((x, i) => got[i] === x) || ('قيل ' + got.length + ' من ' + want.length);
      // الإيقاف يقطع السلسلة
      window.__said = [];
      const run = playPoemFrom(0); await w(30); stopPoem(); await run;
      r.stopWorks = window.__said.length < 5 || ('بعد الإيقاف قيل ' + window.__said.length);
      closeAll();
      return r;
    });

    /* ---------- 4) اسمع المعلم ثم سجّل ---------- */
    await T('listenThenRecord', async () => {
      const r = {};
      r.secButton = !!document.querySelector('#secBox button[onclick="listenThenRecord()"]');
      r.fnExists = typeof listenThenRecord === 'function';
      return r;
    });
    return o;
  });
  for (const [k, v] of Object.entries(R)) need(k + (v === true ? '' : ': ' + v), v === true);
  need('pageErrors: ' + errs.join(' | '), errs.length === 0);
  await b.close();
  if (bad.length) { console.log('v109 e2e: فشل:\n  ' + bad.join('\n  ')); process.exit(1); }
  console.log(`v109 e2e: نجح (${Object.keys(R).length} فحصاً)`);
})().catch(e => { console.error(e); process.exit(1); });
