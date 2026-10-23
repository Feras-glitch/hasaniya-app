/* اختبار v101: الصوت الموحّد واستوديو التسجيل
   1) سجل الأصوات: كل الأقسام بأعدادها، والرسائل بصيغتي الولد والبنت
   2) الأولوية: تسجيل الوالد للنص يُسمع، والقارئ الآلي للنداء أو لما لم يُسجَّل
   3) الاختبار: السؤال ثم كل خيار بتسجيله، وزر 🔊 لكل خيار
   4) الاستوديو: الأقسام والعدّادات، الرفع لسطر، التسجيل المتتابع بميكروفون مزيّف
   5) حزمة الصوت الإصدار 2: تصدير السطور واستيرادها بنصها
   6) تصحيح معرّفات التسجيلات القديمة ("pv:…") */
const { chromium } = require('playwright');
const fs = require('fs'); const os = require('os'); const path = require('path');
const URL = (process.env.HASANIYA_URL || 'file:///home/claude/hasaniya-desktop/standalone/hasaniya.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const bad = []; const need = (m, ok) => { if (!ok) bad.push(m); };
  const ctx = await b.newContext({ viewport: { width: 380, height: 760 }, acceptDownloads: true });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(() => {
    window.__said = []; window.__played = [];
    const fake = { speaking: false, pending: false, paused: false, speak(u) { window.__said.push(u.text); setTimeout(() => { if (u.onend) u.onend({}); }, 5); }, cancel() {}, getVoices() { return [{ name: 'ar', lang: 'ar-SA' }]; }, pause() {}, resume() {}, onvoiceschanged: null, addEventListener() {} };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, get: () => fake });
  });
  await p.goto(URL); await p.waitForTimeout(900);
  const R = await p.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    const u = getCurrentUser(); u.gender = 'boy'; u.name = 'عمر'; saveState();
    try { vpPref('onboarded', true); } catch (e) {}
    /* التشغيل الفعلي للتسجيلات لا يُسمع في الاختبار: نسجّل ما شُغِّل */
    /* v103: الصوت المعطوب يرجع إلى القراءة الآلية؛ التسجيلات الوهمية هنا ليست صوتاً حقيقياً فلا مصدر لها */
    window.blobAudio = () => new Audio();
    window.audioPlayEl = a => { window.__played.push(a.__key || 'rec'); liveAudios.add(a); setTimeout(() => { liveAudios.delete(a); a.dispatchEvent(new Event('ended')); if (a.onended) a.onended(); }, 30); return Promise.resolve(); };
    const blob = () => new Blob([new Uint8Array(4000).fill(7)], { type: 'audio/webm' });
    const putLine = async text => { const t = voicePretty(cleanSpeech(text)); await recPut({ key: lineKey(t), verseId: lineId(t), kind: 'line', uid: 'author', mime: 'audio/webm', blob: blob(), fp: lineId(t), text: t, at: Date.now() }); };
    // 1) السجل
    const reg = voiceRegistry();
    const count = s => reg.items.filter(i => i.section === s).length;
    o.counts = { verse: count('verse'), quiz: count('quiz'), opt: count('opt'), quizex: count('quizex'), expl: count('expl'), story: count('story'), disc: count('disc'), riddle: count('riddle'), event: count('event'), guide: count('guide') };
    const g = reg.items.filter(i => i.section === 'guide').map(i => i.text);
    o.bothForms = g.includes('حاول مرة أخرى') && g.includes('حاولي مرة أخرى') && g.some(t => /^ممتاز! أتقنتَ البيت/.test(t)) && g.some(t => /^ممتاز! أتقنتِ البيت/.test(t));
    o.noVocInGuide = !g.some(t => t.includes('٭') || t.includes('{N}'));
    o.unique = new Set(reg.items.map(i => i.key)).size;
    // 2) الأولوية: رسالة مسجّلة ← النداء آلياً ثم التسجيل
    await putLine(kidLine('needOneVerse'));
    audioStopAll(); window.__said = []; window.__played = [];
    kidToast(kidLine('needOneVerse'), 'error'); await w(250);
    o.recPlayed = window.__played.length === 1 && window.__said.length === 1 && window.__said[0] === 'يا عمر';
    // رسالة غير مسجّلة ← الجملة كاملة آلياً
    audioStopAll(); window.__said = []; window.__played = [];
    kidToast(kidLine('noRecs'), 'error'); await w(250);
    o.ttsWhole = window.__played.length === 0 && window.__said.length === 1 && /يا عمر/.test(window.__said[0]) && /لا توجد تسجيلات بعد/.test(window.__said[0]);
    // فقاعة ناجي المسجّلة (بالنداء في وسطها)
    audioStopAll(); window.__said = []; window.__played = [];
    const mastery = GUIDE_LINES.mastery()[0];
    await putLine(voiceBody(mastery.replace(/\{N\}/g, VOICE_VOC), VOICE_VOC));
    Math.__r = Math.random; Math.random = () => 0; guideSay('mastery'); Math.random = Math.__r; await w(250);
    o.guideRec = window.__played.length === 1;
    // الصيغة المؤنثة
    u.gender = 'girl'; o.girl = kidLine('tryAgain') === 'حاولي مرة أخرى'; u.gender = 'boy';
    // 3) الاختبار: خيار مسجّل
    const st = content.journeyData[0]; const q0 = QUIZZES[st.id][0];
    await putLine(q0.correct);
    audioStopAll(); window.__said = []; window.__played = [];
    startStationQuiz(st, () => {}); await w(300);
    const opts = [...document.querySelectorAll('#quizBody .opt-wrap')];
    o.optBtns = opts.length === 1 + q0.wrong.length && opts.every(x => x.querySelector('.say-btn') && x.querySelector('.word-btn'));
    o.quizQ = window.__said.some(t => t.startsWith(q0.q));   // v103: الأجزاء الآلية المتتالية نطق واحد
    o.quizOptRec = window.__played.length >= 1;
    o.quizNoCorrectTTS = !window.__said.some(t => t === q0.correct);
    document.getElementById('quizPopup').classList.remove('active'); quizState = null; audioStopAll();
    // 4) الاستوديو
    openParentVoice(); await w(500);
    o.kinds = document.querySelectorAll('#pvKind option').length;
    o.counter = /\(\d+\/161\)/.test(document.querySelector('#pvKind option[value="verse"]').textContent);
    document.getElementById('pvKind').value = 'opt'; document.getElementById('pvStation').value = 'all'; await renderParentVoice(); await w(200);
    o.optRows = document.querySelectorAll('#pvBody .rec-row').length;
    o.optCounter = /\(2\/123\)|\(1\/123\)/.test(document.querySelector('#pvKind option[value="opt"]').textContent);
    const it = voiceRegistry().items.find(i => i.section === 'opt' && i.text !== q0.correct);
    await pvUpload('line', it.id, new File([new Uint8Array(3000)], 'o.mp3', { type: 'audio/mpeg' })); await w(300);
    const up = await recGet(lineKey(it.text));
    o.uploadLine = !!up && up.text === it.text && up.kind === 'line' && up.verseId === it.id;
    document.getElementById('pvKind').value = 'guide'; await renderParentVoice();
    o.stationHidden = document.getElementById('pvStation').style.display === 'none';
    // التسجيل المتتابع
    document.getElementById('pvKind').value = 'quiz'; document.getElementById('pvStation').value = '0';
    await pvSeqStart(); await w(300);
    const seq = document.getElementById('pvSeq');
    o.seqShown = seq.style.display !== 'none' && document.getElementById('pvBody').style.display === 'none';
    const first = pvSeqItem();
    o.seqText = seq.querySelector('.seq-text').textContent === first.text;
    pvSeqRecord(); await w(900);
    o.seqRecording = /أوقف/.test(document.getElementById('pvSeqRec').textContent);
    o.navLocked = document.getElementById('pvSeqNext').disabled;
    pvSeqRecord(); await w(1500);
    const rec = await recGet(first.key);
    o.seqSaved = !!rec && rec.text === first.text && rec.verseId === first.id && rec.kind === 'line';
    o.seqAfter = /أعد التسجيل/.test(document.getElementById('pvSeqRec').textContent) && !document.getElementById('pvSeqPlay').disabled;
    const i0 = pvSeq.i; await pvSeqNextLeft(); await w(200);
    o.seqNext = pvSeq.i !== i0 && pvSeqItem().key !== first.key;
    pvSeqEnd(); await w(200);
    o.seqEnded = document.getElementById('pvSeq').style.display === 'none';
    closePopup('pvPopup');
    // 6) المعرّف القديم
    await recPut({ key: authorKey('verse', 's1v2'), verseId: 'pv:s1v2', kind: 'verse', uid: 'author', mime: 'audio/webm', blob: blob(), fp: textFingerprint(vpFindVerse('s1v2').fullVerse), at: 5 });
    await vpFixRecIds();
    o.fixedId = (await recGet(authorKey('verse', 's1v2'))).verseId === 's1v2';
    return o;
  });
  // 5) التصدير والاستيراد
  await p.evaluate(() => { vpSetAuthor('الأستاذة مريم'); document.getElementById('vpOnlyReviewed').checked = false; document.getElementById('vpDeltaOnly').checked = false; });
  const plan = await p.evaluate(async () => { const pl = await vpPlanExport({ onlyReviewed: false, deltaOnly: false }); return { n: pl.selected.length, lines: pl.selected.filter(r => r.kind === 'line').length, sections: pl.sections.length }; });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.evaluate(() => vpDoExport())]);
  const zipPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vp101-')), 'pack.zip'); await dl.saveAs(zipPath);
  const before = await p.evaluate(async () => (await vpAllAuthorRecs()).map(r => r.key + '|' + (r.text || '')).sort());
  await p.evaluate(async () => { for (const r of await vpAllAuthorRecs()) await recDelete(r.key); openVoiceImport(); });
  await p.setInputFiles('#vpImportFile', zipPath); await p.waitForTimeout(800);
  await p.evaluate(() => vpCommitVoicePacks()); await p.waitForTimeout(500);
  const after = await p.evaluate(async () => (await vpAllAuthorRecs()).map(r => r.key + '|' + (r.text || '')).sort());
  const manifestV = await p.evaluate(async (bytes) => { const m = await zipRead(new Uint8Array(bytes).buffer); return JSON.parse(new TextDecoder().decode(m.get('manifest.json'))).version; }, [...fs.readFileSync(zipPath)]);
  console.log(JSON.stringify({ R, plan, manifestV, before: before.length, after: after.length }));
  const c = R.counts;
  need('أعداد السجل: ' + JSON.stringify(c), c.verse === 161 && c.quiz === 48 && c.opt === 123 && c.quizex === 48 && c.expl === 161 && c.story === 150 && c.disc === 32 && c.riddle >= 30 && c.event >= 100 && c.guide >= 60);
  need('الرسائل بصيغتي الولد والبنت', R.bothForms && R.noVocInGuide && R.girl);
  need('الرسالة المسجّلة لم تُسمع بالتسجيل بعد النداء', R.recPlayed);
  need('الرسالة غير المسجّلة لم تُقرأ آلياً كاملة', R.ttsWhole);
  need('فقاعة ناجي المسجّلة لم تُسمع', R.guideRec);
  need('خيارات الاختبار بلا زر 🔊 لكل خيار', R.optBtns);
  need('السؤال لم يُقرأ أو الخيار المسجّل قُرئ آلياً', R.quizQ && R.quizOptRec && R.quizNoCorrectTTS);
  need('أقسام الاستوديو أو عدّاداته', R.kinds === 12 && R.counter && R.optRows === 123 && R.optCounter && R.stationHidden);
  need('رفع ملف لسطر', R.uploadLine);
  need('التسجيل المتتابع: ' + JSON.stringify({ s: R.seqShown, t: R.seqText, r: R.seqRecording, l: R.navLocked, v: R.seqSaved, a: R.seqAfter, n: R.seqNext, e: R.seqEnded }), R.seqShown && R.seqText && R.seqRecording && R.navLocked && R.seqSaved && R.seqAfter && R.seqNext && R.seqEnded);
  need('المعرّف القديم لم يُصحَّح', R.fixedId);
  need('التصدير لا يحمل السطور: ' + JSON.stringify(plan), plan.lines >= 4 && plan.sections === 12);
  need('إصدار الحزمة ' + manifestV, manifestV === 2);
  need('الاستيراد لم يُعِد كل التسجيلات بنصوصها', before.length === after.length && JSON.stringify(before) === JSON.stringify(after));
  need('أخطاء: ' + errs.join(' | '), errs.length === 0);
  await b.close();
  if (bad.length) { console.log('FAIL v101:\n - ' + bad.join('\n - ')); process.exit(1); }
  console.log('OK v101');
})();
