/* ============================================================
   v114: التسميع في صلب الحصة (قرارات صاحب المشروع بعد المراجعة الثلاثية v113)
   1) قل ثم اكشف: البيت الجديد لا يُرتَّب حتى يقوله الطفل من حفظه ثلاث مرات متتالية بلا حاجة.
   2) الوِرد اليومي (إلزامي): محطة مكتملة تُسرد من الحفظ كل يوم بالتناوب، قبل الجديد.
   3) السَّبْق آخر الدرس: أبيات اليوم وما تعلّمه في الأيام الأربعة قبله، متصلة، على السامع.
   4) «يحفظه غيباً»: تسميعتان بلا فتح بينهما أسبوع على الأقل، وآخرهما خلال 60 يوماً.
   5) الختمة: بعد إتمام الدروس كلها تُسمَّع القصيدة كاملة محطةً محطة، ثم تظهر تهنئة حفظ القصيدة.
   السامع (الوالد أو المعلم) يحكم بيتاً بيتاً بطريقة الفتح؛ وإن غاب سجّل الطفل، وبقي التسجيل ينتظر حكمه.
   ============================================================ */
const SABQ_DAYS = 4, SABQ_MAX = 15;
const CONFIRM_GAP_DAYS = 7, CONFIRM_FRESH_DAYS = 60;
const TASMEE_PENDING_MAX_DAYS = 2;            // يُقبل تسجيلا يومين لم يسمعهما أحد؛ في الثالث لا جديد حتى يسمع السامع
const REC_MIN_PER_VERSE_MS = 3000;            // أقل مدة مقبولة للتسجيل: ثلاث ثوانٍ لكل بيت
const SAY_REVEAL_STREAK = 3;

function tsToday() { return new Date().toDateString(); }
function tsVerse(vid) {
  for (const [si, st] of content.journeyData.entries()) { const vi = st.verses.findIndex(v => v.id === vid); if (vi >= 0) return { si, vi, v: st.verses[vi] }; }
  return null;
}
function tsMinMs(n) { return Math.max(5000, n * REC_MIN_PER_VERSE_MS); }

/* ---------- «يحفظه غيباً»: تسميعتان بلا فتح في يومين بينهما أسبوع، وآخرهما حديثة ---------- */
function pcOksOf(st, vid) {
  const pc = ((st || state).parentChecks || {})[vid];
  if (!pc) return [];
  if (Array.isArray(pc.oks)) return pc.oks.filter(t => typeof t === "number");
  return pc.r === "ok" && pc.at ? [+pc.at] : [];     // ما حُفظ قبل v114: تسميعة واحدة
}
function verseConfirmedAt(vid, st, now) {
  st = st || state; now = now || Date.now();
  const oks = pcOksOf(st, vid).slice().sort((a, b) => a - b);
  if (oks.length < 2) return false;
  const last = oks[oks.length - 1];
  if (now - last > CONFIRM_FRESH_DAYS * 86400000) return false;
  // أي خطأ بعد آخر تسميعة (في المراجعة أو التسميع) يُسقطه
  const lastWrong = Math.max(((st.verseStats || {})[vid] || {}).lastWrong || 0, ((st.leitner || {})[vid] || {}).lastWrong || 0);
  if (lastWrong && lastWrong >= last) return false;
  return oks.some(t => (typeof leitnerDayStart === "function" ? leitnerDayStart(last) - leitnerDayStart(t) : last - t) >= CONFIRM_GAP_DAYS * 86400000);
}
/* سُمّع غيباً من قبل لكن مضت مدته أو بقيت تسميعته الثانية: «يحتاج تسميعاً» */
function verseNeedsTasmee(vid, st) {
  st = st || state;
  return pcOksOf(st, vid).length > 0 && !verseConfirmedAt(vid, st);
}

/* ---------- قل ثم اكشف ---------- */
let sayReveal = null;
function sayRevealStart() {
  const cur = getCurrentVerse(); if (!cur) return;
  const w = String(cur.verse.fullVerse || "").split(/\s+/).filter(Boolean);
  const k = cur.verse.half > 0 && cur.verse.half < w.length ? cur.verse.half : Math.ceil(w.length / 2);
  sayReveal = { vid: cur.verse.id, parts: [w.slice(0, k).join(" "), w.slice(k).join(" "), cur.verse.fullVerse], step: 0, streak: 0, shown: false, misses: 0 };
  const intro = document.getElementById("verseIntro"); if (!intro) return;
  intro.innerHTML = `<div class="intro-label">🙈 ${escapeHtml(kidLine("sayReveal"))}</div>
    <div class="say-reveal" id="sayRevealBox"></div>`;
  sayRevealRender();
  if (typeof autoSay === "function") autoSay(kidLine("sayReveal"));
}
function sayRevealRender() {
  const box = document.getElementById("sayRevealBox"); if (!box || !sayReveal) return;
  const r = sayReveal, whole = r.step >= 2;
  const what = r.step === 0 ? kidLine("sayFirstHalf") : r.step === 1 ? kidLine("saySecondHalf") : kidLine("sayWhole");
  box.innerHTML = `<div class="sr-what">${escapeHtml(what)}</div>
    <div class="sr-text${r.shown ? "" : " sr-hidden"}">${r.shown ? escapeHtml(r.parts[Math.min(r.step, 2)]) : "…"}</div>
    ${whole ? `<div class="rec-count">${escapeHtml(gForm("متتالية بلا حاجة", "متتالية بلا حاجة"))}: ${r.streak} من ${SAY_REVEAL_STREAK}</div>` : ""}
    ${r.shown ? `<div class="pc-btns">
        <button class="action-btn btn-success" onclick="sayRevealMark(true)">✅ ${escapeHtml(gForm("قلتُه كما هو", "قلتُه كما هو"))}</button>
        <button class="action-btn btn-warn" onclick="sayRevealMark(false)">🔁 ${escapeHtml(gForm("أخطأتُ أو نسيت", "أخطأتُ أو نسيت"))}</button></div>`
      : `<button class="action-btn btn-primary-soft intro-go" id="sayRevealBtn" onclick="sayRevealShow()">👁️ ${escapeHtml(gForm("قلتُه، اكشفه", "قلتُه، اكشفيه"))}</button>`}`;
}
function sayRevealShow() { if (!sayReveal) return; sayReveal.shown = true; sayRevealRender(); }
function sayRevealMark(ok) {
  const r = sayReveal; if (!r) return;
  r.shown = false;
  if (!ok) {
    r.misses++; r.streak = 0;
    if (r.step < 2) r.step = 0;               // يعود إلى أول البيت
    introListen();                             // يسمعه مرة أخرى قبل أن يحاول
    sayRevealRender(); return;
  }
  if (r.step < 2) { r.step++; sayRevealRender(); return; }
  r.streak++;
  if (r.streak >= SAY_REVEAL_STREAK) { sayRevealDone(); return; }
  sayRevealRender();
}
function sayRevealDone() {
  const r = sayReveal; sayReveal = null;
  state.sayRevealed = state.sayRevealed || {};
  if (r && !noCredit()) { state.sayRevealed[r.vid] = { at: Date.now(), misses: r.misses }; saveState(); }
  if (typeof audioStopAll === "function") audioStopAll();
  const i = document.getElementById("verseIntro"); if (i) i.remove();
  const o = document.getElementById("orderPart"); if (o) o.style.display = "";
  if (typeof autoSay === "function") autoSay(kidLine("orderFromMemory"));
}

/* ---------- تسجيل الطفل لتسميع متصل (للوِرد والسبق وتسميع المحطة) ----------
   شاشة واحدة بزر كبير وعدّاد وقت، والنص مخفي؛ «💡 الشطر التالي» يكشف شطراً ويُعدّ فتحاً */
let tsRec = null;
function tsRecordOpen(o) {
  // o: { kind: wird|sabq|segment, ids: [معرّفات الأبيات], title, storeKey, onSaved(info) }
  tsRec = Object.assign({ opened: 0, startedAt: 0, tick: null }, o);
  const verses = o.ids.map(id => (tsVerse(id) || {}).v).filter(Boolean);
  tsRec.halves = typeof secHalves === "function" ? secHalves(verses) : [];
  openHub("🎤 " + gForm("سمّع من حفظك", "سمّعي من حفظكِ"), `
    <p style="font-size:1.05rem;line-height:1.8"><strong>«${escapeHtml(o.title)}»</strong>: ${arCount(verses.length, "بيت واحد", "بيتان", "أبيات", "بيتاً")}</p>
    <p class="rec-count">${escapeHtml(kidLine("tsRecHow"))}</p>
    <button class="action-btn btn-success ts-rec-btn" id="tsRecBtn" onclick="tsRecToggle()">⏺ ${escapeHtml(gForm("ابدأ التسجيل", "ابدئي التسجيل"))}</button>
    <div class="ts-timer" id="tsTimer" aria-live="polite"></div>
    <div class="sec-text" id="tsText" hidden></div>
    <button class="tool-btn" id="tsHintBtn" style="width:100%;margin-top:6px;display:none" onclick="tsRecHint()">💡 الشطر التالي</button>`);
  if (typeof autoSay === "function") autoSay(kidLine("tsRecHow"));
}
function tsRecRenderText() {
  const t = document.getElementById("tsText"); if (!t || !tsRec) return;
  const lines = [];
  for (let i = 0; i < tsRec.halves.length; i += 2) lines.push([0, 1].map(j => i + j < tsRec.opened ? tsRec.halves[i + j] : "…").join("   ·   "));
  t.innerText = lines.join("\n"); t.hidden = !tsRec.opened;
  const hb = document.getElementById("tsHintBtn");
  if (hb) hb.textContent = tsRec.opened ? `💡 الشطر التالي (فتحات: ${tsRec.opened})` : "💡 الشطر التالي";
}
function tsRecHint() { if (!tsRec) return; tsRec.opened = Math.min(tsRec.halves.length, tsRec.opened + 1); tsRecRenderText(); }
async function tsRecToggle() {
  if (!tsRec || typeof recToggle !== "function") return;
  const r = tsRec;
  const btn = document.getElementById("tsRecBtn");
  if (r.startedAt && recIsRecording(r.storeKey)) { recStop(); return; }
  r.startedAt = Date.now(); r.opened = 0; tsRecRenderText();
  await recToggle(r.storeKey, (vid, saved) => {
    clearInterval(r.tick); r.tick = null;
    if (tsRec !== r) return;
    const b = document.getElementById("tsRecBtn"); if (b) b.textContent = "⏺ " + gForm("أعد التسجيل", "أعيدي التسجيل");
    const hb = document.getElementById("tsHintBtn"); if (hb) hb.style.display = "none";
    if (saved === false) return;               // قصير جداً: لم يُحفظ، ورسالة السبب ظهرت
    const info = { opened: r.opened, ms: Date.now() - r.startedAt };
    tsRec = null;
    closePopup("hubPopup");
    if (r.onSaved) r.onSaved(info);
  }, { storeKey: r.storeKey, kind: r.kind === "segment" || r.kind === "wird" ? "section" : "sabq", maxMs: 15 * 60 * 1000, minMs: tsMinMs(r.ids.length) });
  if (!recIsRecording(r.storeKey)) { r.startedAt = 0; return; }
  if (btn) btn.textContent = "⏹ " + gForm("انتهيت", "انتهيت");
  const hb = document.getElementById("tsHintBtn"); if (hb) hb.style.display = "";
  const tm = document.getElementById("tsTimer");
  r.tick = setInterval(() => {
    if (!tm || !document.body.contains(tm)) { clearInterval(r.tick); return; }
    const s = Math.floor((Date.now() - r.startedAt) / 1000);
    tm.textContent = `🔴 ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }, 500);
}
/* تسجيل ينتظر حكم السامع */
function tsPendingAdd(kind, ids, title, key, opened) {
  state.tasmeePending = (state.tasmeePending || []).filter(p => p.key !== key);
  state.tasmeePending.push({ id: "p" + Date.now(), kind, ids: ids.slice(0, 200), title: String(title).slice(0, 80), key, at: Date.now(), opened: opened || 0 });
  saveState();
}
function tsPendingDays() {
  return new Set((state.tasmeePending || []).map(p => new Date(p.at).toDateString())).size;
}
async function tsPendingJudge(id) {
  const p = (state.tasmeePending || []).find(x => x.id === id); if (!p) return;
  try {
    const rec = await recGet(p.key);
    if (rec && rec.blob && typeof audioBegin === "function" && audioBegin()) {
      showToast("🎧 يُشغَّل تسميع الطفل… احكم بعده", "success");
      await playPart(seqToken, rec, "");
    }
  } catch (e) {}
  const list = p.ids.map(tsVerse).filter(Boolean);
  pcStartList(list, { kind: p.kind, title: p.title, opened: p.opened, recKey: p.key, onDone: res => {
    state.tasmeePending = (state.tasmeePending || []).filter(x => x.id !== id);
    if (p.kind === "sabq") { try { recDelete(p.key); } catch (e) {} }
    if (p.kind === "wird") wirdJudged(p.ids, res);
    saveState();
  } });
}

/* ---------- الوِرد اليومي ---------- */
/* المحطات التي تدخل الوِرد: المكتملة التي سُمّعت (أو سُجّل تسميعها) */
function wirdStations() {
  return content.journeyData.map((st, si) => ({ st, si })).filter(x => getStationStatus(x.st) === "completed"
    && (!(state.segmentDue || {})[x.st.id] || (typeof segmentPassed === "function" && segmentPassed(x.st.id))));
}
function wirdPick() {
  const list = wirdStations(); if (!list.length) return null;
  const log = state.wirdLog || {}, kh = state.khatma || {};
  const allDone = content.journeyData.every(s => getStationStatus(s) === "completed");
  // بعد إتمام الدروس: ما لم يُختَم بعد أولاً؛ ثم الأقدم وِرداً
  return list.slice().sort((a, b) => (allDone ? (kh[a.st.id] ? 1 : 0) - (kh[b.st.id] ? 1 : 0) : 0) || ((log[a.st.id] || 0) - (log[b.st.id] || 0)) || a.si - b.si)[0];
}
function wirdNeededToday() {
  if (typeof noCredit === "function" && noCredit()) return false;
  if (state.wirdDay === tsToday()) return false;
  if (typeof segmentBlocking === "function" && segmentBlocking() >= 0) return false;   // تسميع المحطة المكتملة أولاً
  const p = wirdPick(); if (!p) return false;
  // المحطة التي سُمّعت كاملة اليوم (تسميع المقطع) تكفي ورداً لهذا اليوم
  const c = (state.segmentChecks || {})[p.st.id];
  if (c && c.at && new Date(c.at).toDateString() === tsToday()) return false;
  return true;
}
function wirdDone(stId) {
  state.wirdDay = tsToday();
  state.wirdLog = state.wirdLog || {}; state.wirdLog[stId] = Date.now();
  saveState();
}
function wirdJudged(ids, res) {
  // الوِرد بعد إتمام الدروس كلها يُحسب في الختمة إن لم يحتج بيت فيه فتحين
  const p = ids.length ? tsVerse(ids[0]) : null; if (!p) return;
  const st = content.journeyData[p.si];
  if (res && !res.fail && content.journeyData.every(s => getStationStatus(s) === "completed")) {
    state.khatma = state.khatma || {}; state.khatma[st.id] = Date.now();
    if (khatmaComplete() && !state.khatmaDoneAt) { state.khatmaDoneAt = Date.now(); saveState(); setTimeout(() => { if (typeof showFinale === "function") showFinale(); }, 900); }
  }
}
function showWirdStep(after) {
  const p = wirdPick(); if (!p) { after && after(); return; }
  const { st, si } = p;
  const ids = st.verses.map(v => v.id);
  const listener = () => requirePin(() => pcStartList(st.verses.map((v, vi) => ({ si, vi, v })), { kind: "wird", title: st.title, onDone: res => {
    wirdDone(st.id); wirdJudged(ids, res); saveState(); after && after();
  } }), "وِرد اليوم على السامع");
  const record = () => tsRecordOpen({ kind: "wird", ids, title: st.title, storeKey: sectionKey("station-" + si), onSaved: info => {
    tsPendingAdd("wird", ids, st.title, sectionKey("station-" + si), info.opened);
    wirdDone(st.id); kidToast(kidLine("tsSaved"), "success"); after && after();
  } });
  window.__wirdActions = { listener, record };
  openHub("📿 " + kidLine("wirdTitle"), `
    <p style="font-size:1.1rem;line-height:1.9">${escapeHtml(kidLine("wirdWhat"))} <strong>«${escapeHtml(st.title)}»</strong> (${arCount(st.verses.length, "بيت واحد", "بيتان", "أبيات", "بيتاً")}).</p>
    <div class="hub-actions" style="flex-direction:column">
      <button class="action-btn btn-success big-choice" onclick="__wirdActions.listener()">👨‍👩‍👧 ${escapeHtml(kidLine("listenerNow"))}</button>
      <button class="action-btn btn-info big-choice" onclick="__wirdActions.record()">🎤 ${escapeHtml(gForm("أسجّل تسميعي", "أسجّل تسميعي"))}</button>
      <button class="tool-btn" onclick="playStationListen(${si})">🎧 ${escapeHtml(gForm("اسمعها أولاً", "اسمعيها أولاً"))}</button>
    </div>`);
  if (typeof autoSay === "function") autoSay([kidLine("wirdTitle"), kidLine("wirdWhat"), st.title]);
}

/* ---------- السبق: آخر الدرس ---------- */
function sabqList() {
  const now = Date.now(), since = (typeof leitnerDayStart === "function" ? leitnerDayStart() : now) - SABQ_DAYS * 86400000;
  const at = state.seenAt || {};
  const ids = new Set(Object.keys(at).filter(id => at[id] >= since));
  const out = [];
  content.journeyData.forEach((st, si) => st.verses.forEach((v, vi) => { if (ids.has(v.id) && state.seenVerses[v.id]) out.push({ si, vi, v }); }));
  return out.slice(-SABQ_MAX);
}
function sabqNeededToday() {
  if (typeof noCredit === "function" && noCredit()) return false;
  if (state.sabqDay === tsToday()) return false;
  const plan = dayPlanToday();
  return plan.newCount > 0 && plan.newCount >= newPerDayOf() && state.dailyLeft == null && sabqList().length > 0;
}
function sabqDone() { state.sabqDay = tsToday(); saveState(); }
function showSabqStep(after) {
  const list = sabqList();
  if (!list.length) { sabqDone(); after && after(); return; }
  const ids = list.map(x => x.v.id), key = (activeUserId || "x") + "|sabq|" + tsToday();
  const title = gForm("درس اليوم وما قبله", "درس اليوم وما قبله");
  const listener = () => requirePin(() => pcStartList(list, { kind: "sabq", title, onDone: () => { sabqDone(); after && after(); } }), "تسميع الدرس على السامع");
  const record = () => tsRecordOpen({ kind: "sabq", ids, title, storeKey: key, onSaved: info => {
    tsPendingAdd("sabq", ids, title, key, info.opened); sabqDone(); kidToast(kidLine("tsSaved"), "success"); after && after();
  } });
  window.__sabqActions = { listener, record };
  openHub("🎙️ " + kidLine("sabqTitle"), `
    <p style="font-size:1.1rem;line-height:1.9">${escapeHtml(kidLine("sabqWhat"))} (${arCount(list.length, "بيت واحد", "بيتان", "أبيات", "بيتاً")}).</p>
    <div class="hub-actions" style="flex-direction:column">
      <button class="action-btn btn-success big-choice" onclick="__sabqActions.listener()">👨‍👩‍👧 ${escapeHtml(kidLine("listenerNow"))}</button>
      <button class="action-btn btn-info big-choice" onclick="__sabqActions.record()">🎤 ${escapeHtml(gForm("أسجّل تسميعي", "أسجّل تسميعي"))}</button>
    </div>`);
  if (typeof autoSay === "function") autoSay([kidLine("sabqTitle"), kidLine("sabqWhat")]);
}

/* ---------- الختمة ---------- */
function khatmaComplete(st) {
  st = st || state;
  const kh = st.khatma || {};
  return content.journeyData.length > 0 && content.journeyData.every(s => kh[s.id]);
}
function khatmaProgress() {
  const kh = state.khatma || {};
  return { done: content.journeyData.filter(s => kh[s.id]).length, total: content.journeyData.length };
}
