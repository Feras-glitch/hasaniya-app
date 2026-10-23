/* اختبار v103 (إصلاحات الفحص الشامل):
   1) نسيت الرقم: شفرة استرجاع عبر البريد، والانتظار 48 ساعة مع لافتة، ولا يُمسح شيء ولا يُتجاوز الرقم
   2) قراءة آلية تشبه أندرويد (صفّ النطق): السؤال وكل الخيارات تُسمع كاملة، وتنبيه الجهاز بلا صوت عربي
   3) الأمان والبيانات: محاولات الرقم المتوازية، وحقن النص في الأزرار، والنافذة القديمة، وحذف تسجيلات الطفل المحذوف
   4) السلوك: هدف الأسرة، وأبيات الأسبوع والألغاز من المحطات المفتوحة، ومشتّتات الأحداث والأماكن، وتقرير الطفل الجديد */
const { chromium } = require('playwright');
const URL = (process.env.HASANIYA_URL || 'file:///home/claude/hasaniya-desktop/standalone/hasaniya.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const bad = []; const need = (m, ok) => { if (!ok) bad.push(m); };
  const p = await (await b.newContext({ viewport: { width: 380, height: 760 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(() => {
    /* محرك نطق يشبه أندرويد: يُصفّ النطق (QUEUE_ADD) ويُنهي كل جملة بعد لحظة، والإيقاف يُفرغ الصف */
    window.__said = []; window.__heard = []; window.__voices = [{ name: 'ar', lang: 'ar-SA' }];
    const q = []; let busy = false;
    const next = () => {
      if (busy || !q.length) return; busy = true;
      const u = q[0];
      setTimeout(() => { if (q[0] !== u) return; if (u.onstart) u.onstart({}); setTimeout(() => {
        if (q[0] !== u) return; q.shift(); busy = false; window.__heard.push(u.text); if (u.onend) u.onend({}); next(); }, 25); }, 5);
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
    const active = id => document.getElementById(id).classList.contains('active');
    const enter = async (pin, confirm) => {
      document.getElementById('pinInput').value = pin;
      document.getElementById('pinConfirm').value = confirm === undefined ? '' : confirm;
      await submitPin(); await w(60);
    };
    window.AndroidBridge = { sendEmail: (to, subject, body) => { window.__mail = { to, subject, body }; } };

    /* ---------- 1) استرجاع الرقم السري ---------- */
    parentEntry(); await w(100);
    await enter('1234', '1234');
    o.recOffered = active('pinRecPopup') && !!document.getElementById('pinRecEmail');
    o.parentNotYet = document.getElementById('parentScreen').style.display !== 'block';
    document.getElementById('pinRecEmail').value = 'bad-email';
    await pinRecCreate(); o.emailChecked = /بريداً صحيحاً/.test(document.getElementById('pinRecErr').textContent);
    document.getElementById('pinRecEmail').value = 'parent@example.com';
    await pinRecCreate(); await w(50);
    const code = (document.querySelector('.pinrec-code') || {}).textContent || '';
    o.codeShape = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(code);
    pinRecMailNow();
    o.mail = !!window.__mail && window.__mail.to === 'parent@example.com' && window.__mail.body.includes(code) && /استرجاع/.test(window.__mail.subject);
    const ls = JSON.stringify(Object.assign({}, localStorage));
    o.codeNotStored = !ls.includes(code) && !ls.includes(code.replace('-', ''));
    appDismiss('pinRecPopup'); o.guardWhileShown = active('pinRecPopup');
    o.doneLocked = document.getElementById('pinRecDone').disabled;
    const cb = document.getElementById('pinRecSaved'); cb.checked = true; cb.dispatchEvent(new Event('change'));
    document.getElementById('pinRecDone').click(); await w(300);
    o.parentShownAfter = document.getElementById('parentScreen').style.display === 'block' && !active('pinRecPopup');
    state.points = 777; saveState();
    showMap(); await w(100);
    // نسيت الرقم: شفرة خاطئة ثم صحيحة بحروف صغيرة ومسافة
    window.__cbRan = 0;
    requirePin(() => { window.__cbRan = 1; }, 'اختبار'); await w(50);
    o.forgotVisible = getComputedStyle(document.getElementById('pinForgotBtn')).display !== 'none';
    forgotPin(); await w(50);
    o.forgotScreen = active('pinRecPopup') && !!document.getElementById('pinRecCode') && /pa\*+@example\.com/.test(document.getElementById('pinRecBody').textContent);
    document.getElementById('pinRecCode').value = 'AAAA-AAAA'; await pinRecCheck();
    o.wrongCode = /غير صحيحة/.test(document.getElementById('pinRecErr').textContent) && hasPin();
    document.getElementById('pinRecCode').value = code.toLowerCase().replace('-', ' '); await pinRecCheck(); await w(250);
    o.setNewAsked = active('pinPopup') && document.getElementById('pinConfirmWrap').style.display === 'block'
      && getComputedStyle(document.getElementById('pinForgotBtn')).display === 'none';
    await enter('5678', '5678'); await w(300);
    // الشفرة تُستعمل مرة: بعد الرقم الجديد تُعرض شفرة جديدة، والقديمة لا تعمل
    o.offerAfterUse = active('pinRecPopup') && window.__cbRan === 0;
    o.codeSingleUse = !(await pinRecVerifyCode(code)) && !hasPinRecovery();
    pinRecLater(); await w(250);
    o.cbAfterReset = window.__cbRan === 1 && !active('pinRecPopup');
    o.newPinWorks = await verifyPin('5678') && !(await verifyPin('1234'));
    o.dataKept = getCurrentUser().state.points === 777;
    // شفرة جديدة لا تحلّ محل القديمة إلا بعد «تم»
    pinRecSetup(); await w(30);
    document.getElementById('pinRecEmail').value = 'parent@example.com'; await pinRecCreate(); await w(30);
    const code2 = document.querySelector('.pinrec-code').textContent;
    let c2 = document.getElementById('pinRecSaved'); c2.checked = true; c2.dispatchEvent(new Event('change'));
    document.getElementById('pinRecDone').click(); await w(150);
    pinRecSetup(); await w(30);
    document.getElementById('pinRecEmail').value = 'parent@example.com'; await pinRecCreate(); await w(30);
    pinRecShownCode = null; pinRecClose(); await w(100);   // تُرك دون «تم» (أُغلق التطبيق مثلاً)
    o.pendingNotSaved = hasPinRecovery() && await pinRecVerifyCode(code2);
    // إغلاق النافذة أثناء التحقق لا يفتح نافذة الرقم الجديد
    requirePin(() => {}, 'x'); await w(30); forgotPin(); await w(30);
    document.getElementById('pinRecCode').value = code2;
    const chk = pinRecCheck(); pinRecCancel(); await chk; await w(250);
    o.cancelDuringCheck = !active('pinPopup') && hasPin() && await pinRecVerifyCode(code2);
    closeAll();
    // إدخال الرقم صحيحاً يُسقط طلب الانتظار
    pinRecStartWait(); await w(30);
    requirePin(() => {}, 'x'); await w(30); await enter('5678'); await w(100);
    o.pinClearsWait = !localStorage.getItem('hasaniya_pin_reset') && !document.getElementById('pinResetBanner');
    // أندرويد: المدة بساعة الجهاز الداخلية، وتغيير التاريخ لا يختصرها
    let mono = 1000, boot = 7;
    window.AndroidBridge.clockInfo = () => JSON.stringify({ mono, boot });
    const realNow = Date.now; let skew = 0; Date.now = () => realNow() + skew;
    pinRecStartWait(); await w(30);
    skew = 5 * 86400000; pinRecTick();
    o.monoIgnoresDate = hasPin() && JSON.parse(localStorage.getItem('hasaniya_pin_reset')).credit < 60000;
    mono += 10 * 3600000; pinRecTick();
    o.monoCounts = Math.abs(JSON.parse(localStorage.getItem('hasaniya_pin_reset')).credit - 10 * 3600000) < 60000 && /38/.test(document.getElementById('pinResetBanner').textContent);
    boot = 8; mono = 5 * 3600000; pinRecTick();   // إعادة تشغيل: يُحسب ما مضى منذ التشغيل
    o.monoReboot = Math.abs(JSON.parse(localStorage.getItem('hasaniya_pin_reset')).credit - 15 * 3600000) < 60000;
    delete window.AndroidBridge.clockInfo;
    pinRecClearReset();
    // المتصفح: قفزة التاريخ لا تُحسب بأكثر من يوم
    skew = 0; pinRecStartWait(); await w(30);
    skew = 5 * 86400000; pinRecTick();
    o.webGapCapped = hasPin() && Math.abs(JSON.parse(localStorage.getItem('hasaniya_pin_reset')).credit - 86400000) < 60000;
    skew = 4 * 86400000; pinRecTick();   // رجوع التاريخ لا يُحسب
    o.webBackNoCredit = Math.abs(JSON.parse(localStorage.getItem('hasaniya_pin_reset')).credit - 86400000) < 60000;
    Date.now = realNow;
    pinRecClearReset();
    // لا أجد الشفرة: انتظار 48 ساعة مع لافتة، يلغيها الوالد بالرقم
    requirePin(() => {}, 'اختبار'); await w(50); forgotPin(); await w(50);
    pinRecWaitScreen(false); await w(30);
    pinRecStartWait(); await w(50);
    const banner = document.getElementById('pinResetBanner');
    o.banner = !!banner && /48|47/.test(banner.textContent) && hasPin();
    pinRecCancelWait(); await w(50); await enter('5678'); await w(150);
    o.cancelWait = !document.getElementById('pinResetBanner') && !localStorage.getItem('hasaniya_pin_reset');
    // بعد انتهاء المدة: يُلغى الرقم وحده، وتبقى شفرة البريد صالحة
    pinRecStartWait(); await w(50);
    const rq = JSON.parse(localStorage.getItem('hasaniya_pin_reset')); rq.credit = 48 * 3600000;
    localStorage.setItem('hasaniya_pin_reset', JSON.stringify(rq));
    pinRecTick(); await w(50);
    o.waitExpired = !hasPin() && !document.getElementById('pinResetBanner') && getCurrentUser().state.points === 777
      && hasPinRecovery() && JSON.parse(localStorage.getItem('hasaniya_pin_recovery')).email === 'parent@example.com';
    localStorage.setItem('hasaniya_pin_recovery', JSON.stringify({ email: 'parent@example.com' }));
    closeAll();
    // رقم بلا شفرة: يُعرض الإعداد، و«لاحقاً» يؤجّل أسبوعاً
    window.__cbRan = 0;
    requirePin(() => { window.__cbRan = 2; }, 'x'); await w(50); await enter('2468', '2468'); await w(100);
    o.offerOnSet = active('pinRecPopup') && document.getElementById('pinRecEmail').value === 'parent@example.com';
    pinRecLater(); await w(200);
    o.laterRunsCb = window.__cbRan === 2 && !active('pinRecPopup');
    parentEntry(); await w(50); await enter('2468'); await w(900);
    o.snoozed = !active('pinRecPopup');
    showMap(); localStorage.removeItem('hasaniya_pin_rec_snooze');
    parentEntry(); await w(50); await enter('2468'); await w(900);
    o.offerOldPin = active('pinRecPopup');
    pinRecLater(); await w(100); closeAll(); showMap();
    // المحاولات المتوازية تُحسب كلها (لا يُتجاوز القفل بالضغط السريع)
    pinLockSave({ fails: 0, until: 0 });
    requirePin(() => {}, 'x'); await w(30);
    document.getElementById('pinInput').value = '0000';
    await Promise.all([submitPin(), submitPin(), submitPin()]);
    o.parallelOne = pinLockState().fails === 1;
    for (let k = 0; k < 4; k++) await enter('0000');
    o.lockedAfter5 = pinLockState().until > Date.now();
    pinLockSave({ fails: 0, until: 0 }); closeAll();
    // الخطأ في الرقم لا يُحسب خطأً في الدرس
    o.noWrap = !playFail.guided;

    /* ---------- 2) قراءة تشبه أندرويد ---------- */
    setPref('autoRead', true); closeAll();
    window.__heard = []; window.__said = [];
    startStationQuiz(content.journeyData[0], () => {}); await w(1200);
    const it = quizState.items[0];
    const heard = normalizeArabic(voiceNorm(window.__heard.join(' ')));
    o.qHeard = heard.includes(normalizeArabic(voiceNorm(it.q).slice(0, 25)));
    o.optsHeard = [it.correct, ...it.wrong].every(x => heard.includes(normalizeArabic(voiceNorm(x))));
    o.quizSaidCount = window.__said.length;
    // زر «التالي» يتقدّم دون انتظار القراءة
    document.querySelector('#quizBody .word-btn').click(); await w(80);
    const nb = document.querySelector('#quizPopup .quiz-next');
    o.nextBtn = !!nb; nb.click(); await w(150);
    o.nextAdvanced = quizState && quizState.i === 1;
    skipQuiz(); closeAll();
    // جهاز بلا صوت عربي: لا قراءة مشوّهة، وتنبيه للوالد
    window.__voices = [{ name: 'en', lang: 'en-US' }];
    o.noArabic = voiceEngineState() === 'noarabic' && voiceEngineMuted();
    window.__voices = [];
    o.noneAfterBoot = voiceEngineState() === 'none';
    showParentScreen(); await w(100);
    o.notice = /صوت عربي/.test((document.getElementById('voiceMissing') || {}).textContent || '');
    window.__voices = [{ name: 'ar', lang: 'ar-SA' }];
    renderAutoReadRow();
    o.noticeGone = !((document.getElementById('voiceMissing') || {}).textContent || '').trim();
    showMap();

    // انتهاء الصوت الأساسي لا يمنع رسالة ناجي التالية
    await voicePlay(['بيت قصير'], {}); await w(80);
    o.mainCleared = !audioMainPending();
    // نقل تسجيل رسالة تغيّر نصها
    vpPref('lineMoves103', false);
    const oldBody = voiceBody('اشتقتُ لصوتك!', VOICE_VOC);
    await recPut({ key: lineKey(oldBody), verseId: lineId(oldBody), kind: 'line', uid: 'author', mime: 'audio/webm', blob: new Blob([new Uint8Array(900)], { type: 'audio/webm' }), fp: lineId(oldBody), text: oldBody, at: Date.now() });
    const movedN = await voiceMigrateLines103();
    const nbLine = voiceBody(KID_LINES.missedYou[1], VOICE_VOC);
    o.lineMoved = movedN >= 2 && !!(await recGet(lineKey(nbLine))) && (await recGet(lineKey(nbLine))).text === nbLine && vpPref('lineMoves103') === true;

    /* ---------- 3) الأمان والبيانات ---------- */
    window.__pwn = 0;
    const evil = "x');window.__pwn=1;('";
    const holder = document.createElement('div');
    holder.innerHTML = `<button id="evilBtn" onclick="String('${escapeForAttr(evil)}')">x</button>`;
    document.body.appendChild(holder); document.getElementById('evilBtn').click(); holder.remove();
    o.noInject = window.__pwn === 0;
    o.safeIds = isSafeId('s12cv6') && !isSafeId("a'b") && !isSafeId('');
    // حذف الطفل يحذف تسجيلاته
    const other = createNewUser('سارة', '🌸'); other.gender = 'girl'; users.push(other); saveState();
    const blob = new Blob([new Uint8Array(500)], { type: 'audio/webm' });
    await recPut({ key: other.id + '|s1v1', verseId: 's1v1', uid: other.id, mime: 'audio/webm', blob, at: Date.now() });
    o.recBefore = (await recAllForUser(other.id)).length === 1;
    deleteUser(other.id); await w(300); closeAll();
    o.recDeleted = (await recAllForUser(other.id)).length === 0;
    // نافذة «تسجيلاتي» للطفل فقط
    await openRecPopup(); await w(100);
    o.noParentMode = !document.getElementById('recMode');
    closePopup('recPopup');
    // حزمة الصوت: وقت معقول فقط
    o.clampAt = vpClampAt('x') === 0 && vpClampAt(-5) === 0 && vpClampAt(Date.now() + 9e12) <= Date.now() + 86400001 && vpClampAt(1000) === 1000;

    /* ---------- 4) السلوك ---------- */
    // طفل جديد: أبيات الأسبوع من محطته المفتوحة فقط، والألغاز كذلك
    const fresh = createNewUser('يوسف', '🦁'); fresh.gender = 'boy'; users.push(fresh); saveState();
    const ids = weeklyVerseIds(weekKey(), fresh.state);
    o.weeklyOpenOnly = ids.length === 5 && ids.every(id => id.startsWith('s1v'));
    fresh.state.seenVerses = { s1v1: true };
    const st0 = state; state = fresh.state;
    startRecall('riddle'); await w(80);
    o.riddlesOpenOnly = recallQ.items.length >= 1 && recallQ.items.every(r => r.station === 's1');
    closeAll(); state = st0; fresh.state.seenVerses = {};
    // هدف الأسرة: مجموع مشترك بلا ترتيب
    const fam = familyRows(weekKey());
    o.familyGoal = /هدف الأسرة معاً/.test(fam) && (fam.match(/class="family-chip"/g) || []).length === users.length;
    const order = [...fam.matchAll(/class="family-chip">[\s\S]*?<\/span>/g)].length;
    o.familyNoSort = order === users.length && fam.indexOf(escapeHtml(users[0].name)) < fam.indexOf(escapeHtml(users[users.length - 1].name));
    // تقرير الوالد لطفل لم يبدأ
    const keep = activeUserId; activeUserId = fresh.id; state = fresh.state;
    showParentScreen(); await w(80);
    o.freshReport = /لم يبدأ الطفل/.test(document.getElementById('parentMistakesList').textContent) && !/متقن للحفظ/.test(document.getElementById('parentMistakesList').textContent);
    activeUserId = keep; state = getCurrentUser().state; showMap();
    // الألغاز: جواب بديل مقبول، وحمزة لا يُعرض مشتّتاً للغز عمر
    const rOmar = RIDDLES.find(r => r.station === 's8');
    o.acceptAlt = riddleAccepts(rOmar, 'عمر بن الخطاب') && riddleAccepts(rOmar, 'الفاروق') && !riddleAccepts(rOmar, 'حمزة');
    let hamza = false; for (let k = 0; k < 40; k++) if (riddleChoices(rOmar).includes('حمزة')) hamza = true;
    o.avoidHamza = !hamza;
    // الألغاز في وضع الطفل الصغير من «مراجعة»
    u.small = true; saveState(); updateUserChip(); openReviewHub(); await w(50);
    o.smallRiddleTile = /الألغاز/.test(document.getElementById('hubBody').textContent);
    closeAll(); u.small = false; saveState(); updateUserChip();
    // مشتّتات الحدث: من محطات أخرى ولا تشاركه كلمة مهمة
    let evOk = true;
    content.journeyData.forEach(st => st.verses.forEach(v => {
      const opts = eventChoicesFor(v);
      if (new Set(opts).size !== 3 || !opts.includes(v.event)) evOk = false;
      const mine = eventWords(v.event);
      opts.filter(x => x !== v.event).forEach(x => { if (st.verses.some(y => y.event === x) && content.journeyData.length > 1) evOk = evOk && false; if ([...eventWords(x)].some(t => mine.has(t))) evOk = false; });
    }));
    o.eventChoices = evOk;
    // مشتّتات المكان: لا تُعرض حراء أو العقبة مشتّتاً لمكة
    let nearHit = false;
    for (let k = 0; k < 25; k++) {
      askPlaceAfterLesson({ place: 'مكة', ref: 's4v8' }, () => {}); await w(5);
      const names = [...document.querySelectorAll('#placeOpts button')].map(x => x.textContent);
      if (names.some(n => n === 'حراء' || n === 'العقبة' || n === 'غار ثور')) nearHit = true;
    }
    o.placeFar = !nearHit; closeAll();
    // اسم الأداة الجديد
    o.timelineName = /ترتيب الأحداث/.test(document.querySelector('#timelinePopup h2').textContent);

    /* ---------- النافذة القديمة: آخر شيء لأنه يوقف الحفظ ---------- */
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_USERS }));
    await w(50);
    o.staleShown = !!document.getElementById('staleTab');
    o.staleNoSave = saveState() === false;
    return o;
  });
  console.log(JSON.stringify(R));
  need('الرقم الجديد يعرض إعداد الشفرة قبل منطقة الوالدين', R.recOffered && R.parentNotYet && R.emailChecked);
  need('الشفرة ورسالة البريد', R.codeShape && R.mail && R.codeNotStored);
  need('الشفرة الظاهرة لا تُغلق بلمسة، و«تم» بعد التأكيد', R.guardWhileShown && R.doneLocked && R.parentShownAfter);
  need('نسيت الرقم: الشفرة الخاطئة تُرفض والصحيحة تفتح رقماً جديداً', R.forgotVisible && R.forgotScreen && R.wrongCode && R.setNewAsked && R.cbAfterReset && R.newPinWorks);
  need('الاسترجاع لا يمسح البيانات', R.dataKept);
  need('الشفرة لمرة واحدة، والجديدة بعد «تم» فقط، والإلغاء أثناء التحقق', R.offerAfterUse && R.codeSingleUse && R.pendingNotSaved && R.cancelDuringCheck);
  need('مدة الانتظار لا يختصرها تغيير التاريخ، والرقم الصحيح يُسقطها', R.pinClearsWait && R.monoIgnoresDate && R.monoCounts && R.monoReboot && R.webGapCapped && R.webBackNoCredit);
  need('الانتظار 48 ساعة: اللافتة والإلغاء بالرقم والانتهاء', R.banner && R.cancelWait && R.waitExpired);
  need('عرض الشفرة لمن عنده رقم قديم، والتأجيل', R.offerOnSet && R.laterRunsCb && R.snoozed && R.offerOldPin);
  need('محاولات الرقم المتوازية والقفل', R.parallelOne && R.lockedAfter5 && R.noWrap);
  need('أندرويد: السؤال وكل الخيارات تُسمع كاملة', R.qHeard && R.optsHeard);
  need('زر التالي في الاختبار', R.nextBtn && R.nextAdvanced);
  need('رسالة ناجي بعد انتهاء الصوت، ونقل تسجيلات الرسائل المصحّحة', R.mainCleared && R.lineMoved);
  need('جهاز بلا صوت عربي: إسكات وتنبيه', R.noArabic && R.noneAfterBoot && R.notice && R.noticeGone);
  need('حقن النص في الأزرار والمعرّفات', R.noInject && R.safeIds);
  need('حذف الطفل يحذف تسجيلاته', R.recBefore && R.recDeleted);
  need('تسجيلاتي بلا وضع الوالد، ووقت حزمة الصوت', R.noParentMode && R.clampAt);
  need('أبيات الأسبوع والألغاز من المحطات المفتوحة', R.weeklyOpenOnly && R.riddlesOpenOnly);
  need('هدف الأسرة المشترك', R.familyGoal && R.familyNoSort);
  need('تقرير الطفل الجديد', R.freshReport);
  need('الألغاز: accept وavoid والوضع الصغير', R.acceptAlt && R.avoidHamza && R.smallRiddleTile);
  need('مشتّتات الأحداث والأماكن', R.eventChoices && R.placeFar && R.timelineName);
  need('النافذة القديمة لا تكتب فوق الجديدة', R.staleShown && R.staleNoSave);
  need('أخطاء: ' + errs.join(' | '), errs.length === 0);
  await b.close();
  if (bad.length) { console.log('FAIL v103:\n - ' + bad.join('\n - ')); process.exit(1); }
  console.log('OK v103');
})();
