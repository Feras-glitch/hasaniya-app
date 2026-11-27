const __env = require("../_env");
/* اختبار v110: «📝 وضع المراجعة» للوالدين والمعلمين
   1) اسم المراجع وصفته أولاً، ثم قائمة كل النصوص بعدّاد ومرشّحات
   2) التعديل يُطبَّق فوراً، ويبقى بعد إعادة فتح التطبيق، ويُرجَع؛ والقصة المشتركة تتغيّر في أبياتها كلها
   3) البيت لا يُعدَّل: التشكيل اقتراح فقط، وتغيير الحروف مرفوض؛ و{N} في رسائل الطفل لا يُحذف
   4) الأسئلة والألغاز تُعدَّل، ومفتاح اللغز لا يتغيّر بتعديل جوابه
   5) التصدير يحمل اسم المراجع وصفته، والاستيراد يعرضهما قبل التطبيق، ويرفض الملف غير الصالح
   6) أزرار «📝 راجع» داخل التطبيق تظهر عند تشغيلها فقط */
const { chromium } = require('playwright');
const URL = __env.URL;
(async () => {
  const b = await chromium.launch({ executablePath: __env.CHROMIUM, args: ['--no-sandbox'] });
  const bad = []; const need = (m, ok) => { if (!ok) bad.push(m); };
  const ctx = await b.newContext({ viewport: { width: 380, height: 760 } });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL); await p.waitForTimeout(900);
  const prep = () => {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    const u = getCurrentUser(); u.gender = 'boy'; u.name = 'عمر'; saveState();
    try { vpPref('onboarded', true); } catch (e) {}
    window.requirePin = (fn) => fn();   // الرقم السري مختبَر في مكانه
  };
  const R1 = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    const T = async (name, fn) => { try { Object.assign(o, await fn()); } catch (e) { o[name + 'Exception'] = String(e && e.stack || e).slice(0, 300); } };
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    const u = getCurrentUser(); u.gender = 'boy'; u.name = 'عمر'; saveState();
    try { vpPref('onboarded', true); } catch (e) {}
    window.requirePin = (fn) => fn();
    const live = id => content.journeyData.flatMap(s => s.verses).find(v => v.id === id);

    await T('who', async () => {
      const r = {};
      localStorage.removeItem(REVIEW_KEY); reviewStore = reviewLoad();
      r.parentButton = !!document.querySelector('button[onclick*="openReviewMode"]');
      openReviewMode('home'); await w(30);
      r.asksWho = !!document.getElementById('rvName');
      document.getElementById('rvName').value = 'الأستاذ أحمد';
      document.querySelector('input[name="rvRole"][value="teacher"]').checked = true;
      document.getElementById('rvWhoOk').click(); await w(30);
      r.listShown = document.querySelectorAll('#reviewList .review-row').length === 30;
      const c = reviewCounts();
      r.manyTexts = c.total > 1000 || ('المجموع ' + c.total);
      const secs = new Set(reviewRegistry().items.map(it => it.sec));
      r.allSections = REVIEW_SECTIONS.every(s => secs.has(s.id)) || ('ناقص: ' + REVIEW_SECTIONS.filter(s => !secs.has(s.id)).map(s => s.id));
      r.noVerseEdit = !reviewRegistry().items.some(it => it.sec !== 'tashkeel' && /^verse\|/.test(it.key));
      r.priorityFirst = reviewFiltered()[0].tags.length > 0;
      return r;
    });
    await T('edit', async () => {
      const r = {};
      const v = live('s2v1'), orig = v.story;
      r.saved = reviewSetText('story|s2v1', orig + ' (تعديل)');
      r.appliedLive = live('s2v1').story === orig + ' (تعديل)';
      r.statusEdited = reviewStatusOf('story|s2v1') === 'edited';
      // قصة مشتركة بين بيتين: تتغيّر في الاثنين
      const sharer = Object.keys(STORIES).find(k => STORIES[k] && STORIES[k].share && live(k) && live(STORIES[k].share) && live(STORIES[k].share).story);
      if (sharer) {
        const owner = STORIES[sharer].share;
        reviewSetText('story|' + owner, 'قصة مشتركة معدّلة.');
        r.sharedEdit = live(sharer).story === 'قصة مشتركة معدّلة.' && live(owner).story === 'قصة مشتركة معدّلة.';
        reviewRevert('story|' + owner);
        r.sharedRevert = live(sharer).story === DEFAULT_JOURNEY.flatMap(s => s.verses).find(x => x.id === owner).story;
      } else r.sharedEdit = 'لا قصة مشتركة';
      // المصادر سطراً سطراً
      reviewSetText('sources|s2v1', 'المصدر الأول\nالمصدر الثاني');
      r.sourcesSplit = live('s2v1').sources.length === 2 && live('s2v1').source === 'المصدر الأول ؛ المصدر الثاني';
      // التشكيل اقتراح فقط
      const fv = live('s2v1').fullVerse;
      r.letterChangeRejected = reviewSetText('tashkeel|s2v1', fv.replace('ل', 'ر')) === false;
      const noHaraka = fv.replace(/[ً-ْ]/, '');
      r.tashkeelSuggestion = reviewSetText('tashkeel|s2v1', noHaraka) === true && live('s2v1').fullVerse === fv && reviewStore.edits['tashkeel|s2v1'].text === noHaraka;
      // {N}
      const nk = reviewRegistry().items.find(it => it.keepN);
      r.keepN = reviewSetText(nk.key, nk.orig.replace('{N}', 'فلان')) === false;
      // الأسئلة
      reviewSetText('quiz|s1|0|q', 'سؤال معدّل للاختبار؟');
      r.quizApplied = QUIZZES.s1[0].q === 'سؤال معدّل للاختبار؟';
      voiceCacheReset();
      r.quizInVoice = voiceRegistry().items.some(it => it.text === 'سؤال معدّل للاختبار؟');
      // الألغاز: مفتاحها ثابت
      const r0 = RIDDLES[0], k0 = riddleKey(r0);
      reviewSetText('riddle|' + k0 + '|answer', 'المعبود');
      r.riddleKeyStable = riddleKey(r0) === k0 && r0.answer === 'المعبود';
      reviewRevert('riddle|' + k0 + '|answer');
      // الحكم
      reviewSetVerdict('meaning|s2v1', 'ok');
      reviewSetVerdict('event|s2v1', 'check', 'يُنظر في التسمية');
      r.verdicts = reviewStatusOf('meaning|s2v1') === 'ok' && reviewStatusOf('event|s2v1') === 'check' && reviewStore.verdicts['event|s2v1'].note === 'يُنظر في التسمية';
      return r;
    });
    await T('inline', async () => {
      const r = {};
      reviewSetInline(false);
      r.inlineOffNone = reviewInlineBtn('v:s2v1') === '';
      reviewSetInline(true);
      renderStoryContent(live('s2v1'));
      r.inlineInStory = !!document.querySelector('#storySource .review-inline-btn');
      document.querySelector('#storySource .review-inline-btn').click(); await w(30);
      r.inlineOpensGroup = reviewView.group === 'v:s2v1' && [...document.querySelectorAll('#reviewList .review-row')].length >= 4;
      reviewSetInline(false);
      return r;
    });
    await T('export', async () => {
      const r = {};
      const doc = reviewExportDoc();
      window.__doc = doc;
      r.exportReviewer = doc.reviewer.name === 'الأستاذ أحمد' && doc.reviewer.role === 'teacher';
      r.exportItems = doc.items.some(x => x.key === 'story|s2v1' && x.text.endsWith('(تعديل)')) && doc.items.some(x => x.key === 'event|s2v1' && x.verdict === 'check');
      r.exportTashkeel = doc.items.some(x => x.key === 'tashkeel|s2v1');
      return r;
    });
    return o;
  });
  // إعادة فتح التطبيق: التعديل باقٍ ومطبَّق
  await p.reload(); await p.waitForTimeout(900);
  const R2 = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    window.requirePin = (fn) => fn();
    const live = id => content.journeyData.flatMap(s => s.verses).find(v => v.id === id);
    o.persistsAfterReload = live('s2v1').story.endsWith('(تعديل)') && QUIZZES.s1[0].q === 'سؤال معدّل للاختبار؟';
    const doc = reviewExportDoc();
    // صار التعديل جزءاً من التطبيق (النص الأصلي يساوي المعدَّل): يُحذف من المراجعة
    reviewStore.edits['meaning|s2v1'] = { orig: 'قديم', text: DEFAULT_JOURNEY[1].verses[0].meaning, at: 1 };
    reviewApplyAll();
    o.mergedDropped = !reviewStore.edits['meaning|s2v1'];
    // الاستيراد على جهاز آخر (مخزن فارغ): يعرض المراجع قبل التطبيق
    for (const k of Object.keys(reviewStore.edits)) reviewRevert(k);
    o.revertAll = live('s2v1').story === DEFAULT_JOURNEY[1].verses[0].story && QUIZZES.s1[0].q !== 'سؤال معدّل للاختبار؟';
    reviewStore = { reviewer: { name: 'أم عمر', role: 'parent' }, edits: {}, verdicts: {} }; reviewSave();
    reviewImportDoc(doc); await w(30);
    const head = document.querySelector('.review-import-head');
    o.importShowsWho = !!head && head.textContent.includes('الأستاذ أحمد') && head.textContent.includes('معلم');
    o.notAppliedBeforeConfirm = !live('s2v1').story.endsWith('(تعديل)');
    reviewCommitImport(true); await w(30);
    o.importApplied = live('s2v1').story.endsWith('(تعديل)') && reviewStore.edits['story|s2v1'].by.includes('الأستاذ أحمد');
    o.importVerdictNote = reviewStore.verdicts['event|s2v1'] && reviewStore.verdicts['event|s2v1'].v === 'check' && reviewStore.verdicts['event|s2v1'].note.includes('الأستاذ أحمد');
    // ملفات غير صالحة
    o.rejectNoReviewer = reviewValidateDoc(Object.assign({}, doc, { reviewer: { name: '', role: 'teacher' } })).ok === false;
    o.rejectBadRole = reviewValidateDoc(Object.assign({}, doc, { reviewer: { name: 'x', role: 'admin' } })).ok === false;
    const v2 = reviewValidateDoc(Object.assign({}, doc, { items: doc.items.concat([{ key: 'story|zzz', text: 'x' }, { key: 'tashkeel|s2v1', text: 'نص آخر تماماً' }]) }));
    o.unknownSkipped = v2.ok && v2.unknown === 2;
    o.rejectHtmlSafe = (() => { reviewImportDoc(Object.assign({}, doc, { reviewer: { name: '<img src=x onerror=alert(1)>', role: 'parent' } })); return !document.querySelector('#rvBody img'); })();
    // تنظيف
    for (const k of Object.keys(reviewStore.edits)) reviewRevert(k);
    localStorage.removeItem(REVIEW_KEY); reviewStore = reviewLoad();
    return o;
  });
  const R = Object.assign({}, R1, R2);
  for (const [k, v] of Object.entries(R)) need(k + (v === true ? '' : ': ' + v), v === true);
  need('pageErrors: ' + errs.join(' | '), errs.length === 0);
  await b.close();
  if (bad.length) { console.log('v110 e2e: فشل:\n  ' + bad.join('\n  ')); process.exit(1); }
  console.log(`v110 e2e: نجح (${Object.keys(R).length} فحصاً)`);
})().catch(e => { console.error(e); process.exit(1); });
