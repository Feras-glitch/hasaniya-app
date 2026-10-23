/* اختبار v102 (الدفعة ج):
   1) اسم الطفل يُسجَّل مرة («يا عمر») في قسم «أسماء الأطفال»، ويُسمع قبل كل رسالة
   2) الرسائل التي فيها أرقام تُسمع جملاً ثابتة، والرقم يبقى مكتوباً
   3) أسماء المحطات والأوسمة قابلة للتسجيل
   4) وضع الطفل الصغير: أزرار أقل، والألغاز بالاختيار، وتفعيله بالرقم السري */
const { chromium } = require('playwright');
const URL = (process.env.HASANIYA_URL || 'file:///home/claude/hasaniya-desktop/standalone/hasaniya.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const bad = []; const need = (m, ok) => { if (!ok) bad.push(m); };
  const p = await (await b.newContext({ viewport: { width: 380, height: 760 } })).newPage(); const errs = [];
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
    /* v103: الصوت المعطوب يرجع إلى القراءة الآلية؛ التسجيلات الوهمية هنا ليست صوتاً حقيقياً فلا مصدر لها */
    window.blobAudio = () => new Audio();
    window.audioPlayEl = a => { window.__played.push(1); liveAudios.add(a); setTimeout(() => { liveAudios.delete(a); if (a.onended) a.onended(); }, 20); return Promise.resolve(); };
    const blob = () => new Blob([new Uint8Array(3000).fill(5)], { type: 'audio/webm' });
    const putLine = async text => { const t = voicePretty(cleanSpeech(text)); await recPut({ key: lineKey(t), verseId: lineId(t), kind: 'line', uid: 'author', mime: 'audio/webm', blob: blob(), fp: lineId(t), text: t, at: Date.now() }); };
    const reset = () => { audioStopAll(); window.__said = []; window.__played = []; };
    const digits = /[0-9٠-٩]/;
    // 1) الأسماء
    const names = voiceRegistry().items.filter(i => i.section === 'names').map(i => i.text);
    o.names = names.includes('يا عمر') && names.includes('يا صديقي') && names.includes('يا صديقتي');
    await putLine('يا عمر');
    reset(); kidToast(kidLine('noRecs'), 'error'); await w(250);
    o.nameOnly = window.__played.length === 1 && window.__said.length === 1 && window.__said[0] === 'لا توجد تسجيلات بعد';
    await putLine(kidLine('needOneVerse'));
    reset(); kidToast(kidLine('needOneVerse'), 'error'); await w(250);
    o.allVoice = window.__played.length === 2 && window.__said.length === 0;
    // 2) الأرقام
    reset(); quizState = { score: 1, items: [1, 2, 3], onDone() {}, station: null }; finishQuiz(); await w(250);
    const toast = document.getElementById('toast').textContent;
    o.quizToast = /1 \/ 3/.test(toast);
    o.quizSaid = window.__said.some(t => /أجبتَ عن بعض/.test(t)) && !window.__said.some(t => digits.test(t));
    reset(); showMap(); guideHidePanel(); guideShowActions(true); await w(300);
    const panel = (document.getElementById('guideBubble').textContent || '');
    o.panelDigits = digits.test(panel);
    o.panelSaid = window.__said.join(' | ');
    // v103: الأجزاء الآلية المتتالية تُقرأ جملة واحدة
    const saidAll = normalizeArabic(voiceNorm(window.__said.join(' ')));
    o.panelOk = !window.__said.some(t => digits.test(t)) && /المحطه الحالي/.test(saidAll) && saidAll.includes(normalizeArabic(voiceNorm(content.journeyData[0].title))) && /صباح|مساء|جمعه/.test(saidAll);
    guideHidePanel();
    // 3) الأسماء والأوسمة
    const titles = voiceRegistry().items.filter(i => i.section === 'titles').map(i => i.text);
    o.titles = titles.includes(voicePretty(content.journeyData[5].title)) && titles.includes(CUSTOM_BADGES.places5.name) && titles.length >= 20;
    o.noDigitLines = !voiceRegistry().items.filter(i => i.section === 'guide').some(i => digits.test(i.text));
    // 4) وضع الطفل الصغير
    o.offDefault = !document.body.classList.contains('small-kid');
    openUserEditor(u.id); await w(100);
    const sb = document.getElementById('smallKidBtn');
    o.toggleRow = !!sb;
    sb.click(); await w(100);
    o.pinAsked = document.getElementById('pinPopup').classList.contains('active');
    document.getElementById('pinPopup').classList.remove('active'); closePopup('userEditorPopup');
    u.small = true; saveState(); updateUserChip();
    o.bodyClass = document.body.classList.contains('small-kid');
    o.toolsHidden = getComputedStyle(document.getElementById('toolsBtn')).display === 'none';
    state.seenVerses = Object.assign(state.seenVerses || {}, { s1v1: true });   // v103: ألغاز الأبيات المرئية فقط
    reset(); startRecall('riddle'); await w(200);
    const r = recallQ.items[0];
    const ow = [...document.querySelectorAll('#hubBody .opt-wrap')];
    o.riddleChoices = ow.length === 3 && ow.some(x => x.textContent.includes(r.answer)) && !document.querySelector('#hubBody input:not([type=hidden])');
    o.riddleSaid = window.__said.some(t => t.startsWith(r.riddle));
    const wrong = ow.map(x => x.querySelector('.word-btn')).find(x => stripAl(x.textContent) !== stripAl(r.answer));
    wrong.click(); await w(50);
    o.wrongDisabled = wrong.disabled && /حاول/.test(document.getElementById('riddleMsg').textContent);
    ow.map(x => x.querySelector('.word-btn')).find(x => stripAl(x.textContent) === stripAl(r.answer)).click(); await w(50);
    o.rightOk = /✅/.test(document.getElementById('riddleMsg').textContent) && !!document.querySelector('#riddleBtns button');
    closePopup('hubPopup'); u.small = false; saveState(); updateUserChip();
    o.offAgain = !document.body.classList.contains('small-kid');
    // الاستوديو يفتح على الأبيات، وقسم الأسماء بلا اختيار محطة
    openParentVoice(); await w(300);
    o.studioDefault = document.getElementById('pvKind').value === 'verse' && document.querySelectorAll('#pvKind option').length === 12;
    document.getElementById('pvKind').value = 'names'; await renderParentVoice();
    o.namesRows = document.querySelectorAll('#pvBody .rec-row').length >= 3 && document.getElementById('pvStation').style.display === 'none';
    closePopup('pvPopup');
    return o;
  });
  console.log(JSON.stringify(R));
  need('قسم الأسماء ناقص', R.names);
  need('الاسم المسجّل لم يُسمع قبل الرسالة الآلية', R.nameOnly);
  need('الاسم والرسالة المسجّلان لم يُسمعا معاً', R.allVoice);
  need('نتيجة الاختبار: الرقم مكتوب والمسموع جملة', R.quizToast && R.quizSaid);
  need('لوحة ناجي تُسمع أرقاماً أو بلا اسم المحطة: ' + R.panelSaid, R.panelOk && R.panelDigits);
  need('أسماء المحطات والأوسمة', R.titles && R.noDigitLines);
  need('وضع الطفل الصغير: التفعيل بالرقم السري', R.offDefault && R.toggleRow && R.pinAsked);
  need('وضع الطفل الصغير: الواجهة', R.bodyClass && R.toolsHidden && R.offAgain);
  need('الألغاز بالاختيار', R.riddleChoices && R.riddleSaid && R.wrongDisabled && R.rightOk);
  need('الاستوديو: الأقسام والأسماء', R.studioDefault && R.namesRows);
  need('أخطاء: ' + errs.join(' | '), errs.length === 0);
  await b.close();
  if (bad.length) { console.log('FAIL v102:\n - ' + bad.join('\n - ')); process.exit(1); }
  console.log('OK v102');
})();
