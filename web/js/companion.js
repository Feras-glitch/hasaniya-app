/* ناجي: دفتر الرحلة، الأختام، الأوسمة، المزاج، المشي على الطريق، لون ناجي، رسالة الوالدين، نار القصة */

/* ---------- الأيام المتتالية والأوسمة ---------- */
function guideDayKey(d = new Date()) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function guideTouchToday() {
  if (!state) return;
  state.activeDays = state.activeDays || [];
  const k = guideDayKey();
  if (!state.activeDays.includes(k)) {
    state.activeDays = [...state.activeDays, k].slice(-60);
    saveState();
  }
}
function guideStreak() {
  const days = new Set(state.activeDays || []);
  let n = 0; const d = new Date();
  while (days.has(guideDayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
const GUIDE_BADGES = {
  streak3: { icon: "🏅", name: "ثلاثة أيام متتالية", desc: "ثلاثة أيام متتالية من الحضور" },
  firstRec: { icon: "🎙️", name: "أول تسجيل", desc: "أول بيت مسجّل بالصوت" }
};
/* يُرجع true إن مُنح الوسام الآن لأول مرة */
function guideAwardBadge(id) {
  state.guideBadges = state.guideBadges || {};
  if (state.guideBadges[id]) return false;
  state.guideBadges[id] = Date.now();
  saveState();
  return true;
}
function guideCheckStreak() {
  return guideStreak() >= 3 && guideAwardBadge("streak3");
}

/* ---------- عدد المحطات المكتملة ---------- */
function completedCount() {
  return content.journeyData.filter(s => getStationStatus(s) === "completed").length;
}

/* ---------- التحية حسب الوقت ---------- */
function guideGreeting() {
  const now = new Date();
  if (now.getDay() === 5) return kidLine("greetFriday") + " ";
  const h = now.getHours();
  return kidLine(h < 12 ? "greetMorning" : h < 18 ? "greetEvening" : "greetNight") + " ";
}

/* ---------- المزاج: يعكس ما يحدث فعلاً ---------- */
const GUIDE_MOOD_CLASSES = ["mood-proud", "mood-eager", "mood-think"];
let guideMoodTimer = null;
function guideSetMood(name, ms = 6000) {
  const g = document.getElementById("guide"); if (!g) return;
  GUIDE_MOOD_CLASSES.forEach(c => g.classList.remove(c));
  g.classList.add("mood-" + name);
  clearTimeout(guideMoodTimer);
  guideMoodTimer = setTimeout(() => g.classList.remove("mood-" + name), ms);
}
/* بعد إتمام محطة: فخر ناجي، وتذكّر المحطة لعرض قصص الوالد */
function guideOnStationDone(station) {
  guideSetMood("proud", 9000);
  state.recentDone = station ? station.id : null;
  saveState();
}

/* الخطأ المتكرر: بعد ثلاث أخطاء في البيت نفسه يقترح ناجي خطوة محددة */
const guideWrongCount = {};
function guideOnWrong() {
  const cur = getCurrentVerse();
  if (!cur) { guideSay("wrong"); return; }
  const id = cur.verse.id;
  guideWrongCount[id] = (guideWrongCount[id] || 0) + 1;
  if (guideWrongCount[id] === 3) {
    guideSetMood("think", 8000);
    guidePanel(kidLine("hardVerse"), [
      { label: "🔊 استمع للبيت", run: () => playVerseAndStory(cur.verse, false) },
      { label: "🎙️ سجّل صوتك", run: () => recordVerse() }
    ], document.getElementById("recordBtn") || document.getElementById("speakFullBtn"));
    return;
  }
  guideSay("wrong");
}

/* ---------- ناجي يمشي بجانب المحطة التالية على الخريطة ---------- */
function guideWalkerPlace(stationEl) {
  document.querySelectorAll(".guide-walker").forEach(w => w.remove());
  if (!stationEl || !stationEl.parentElement) return;
  const w = document.createElement("span");
  w.className = "guide-walker"; w.textContent = "🐪"; w.setAttribute("aria-hidden", "true");
  stationEl.parentElement.appendChild(w);
}

/* ---------- لون ناجي: يُفتح مع كل محطتين مكتملتين ---------- */
const GUIDE_HUES = [
  { hue: 0, name: "ذهبي", sw: "#d4a017" },
  { hue: 120, name: "أخضر", sw: "#4caf50" },
  { hue: 200, name: "أزرق", sw: "#2196f3" },
  { hue: 280, name: "بنفسجي", sw: "#9c27b0" },
  { hue: 320, name: "وردي", sw: "#e91e63" },
  { hue: 170, name: "فيروزي", sw: "#00bfa5" }
];
function applyGuideHue() {
  const b = document.getElementById("guideBody"); if (!b) return;
  b.style.filter = state.guideHue ? `hue-rotate(${state.guideHue}deg)` : "";
}
function setGuideHue(h) {
  state.guideHue = h; saveState();
  applyGuideHue();
  openGuideJournal();
}

/* ---------- دفتر الرحلة: الأختام والأوسمة ولون ناجي ورسالة الوالدين ---------- */
function openGuideJournal() {
  if (!content.journeyData || !content.journeyData.length) return;
  const stamps = content.journeyData.map(st => {
    if (state.charms && state.charms[st.id]) {
      const when = state.stampDates && state.stampDates[st.id] ? new Date(state.stampDates[st.id]).toLocaleDateString("ar-EG") : "";
      const first = st.verses[0] ? st.verses[0].fullVerse : "";
      return `<div class="stamp"><span class="stamp-icon">${escapeHtml(st.icon)}</span><div>
        <strong>${escapeHtml(st.title)}</strong><small>ختم ناجي ${when}</small><p>${escapeHtml(first)}</p></div></div>`;
    }
    return `<div class="stamp locked"><span class="stamp-icon">🔒</span><div><strong>${escapeHtml(st.title)}</strong><small>لم تُختم بعد</small></div></div>`;
  }).join("");
  const badges = Object.keys(GUIDE_BADGES).map(id => {
    const b = GUIDE_BADGES[id]; const got = state.guideBadges && state.guideBadges[id];
    return `<div class="badge-row ${got ? "" : "locked"}"><span class="stamp-icon">${got ? b.icon : "🔒"}</span>
      <div><strong>${b.name}</strong><small>${b.desc}</small></div></div>`;
  }).join("");
  const unlocked = Math.min(GUIDE_HUES.length, 1 + Math.floor(completedCount() / 2));
  const swatches = GUIDE_HUES.map((c, i) => i < unlocked
    ? `<button class="hue-sw ${(state.guideHue || 0) === c.hue ? "on" : ""}" style="background:${c.sw}" title="${c.name}" onclick="setGuideHue(${c.hue})"></button>`
    : `<span class="hue-sw locked" title="يُفتح بعد ${i * 2} محطات">🔒</span>`).join("");
  const hideRow = `<div class="badge-row ${state.najiCount ? "" : "locked"}"><span class="stamp-icon">${state.najiCount ? "🐪" : "🔒"}</span>
      <div><strong>اكتشاف ناجي المختبئ</strong><small>${state.najiCount || 0} مرة</small></div></div>`;
  openHub("📖 دفتر الرحلة", `
    <h4>الأختام</h4>${stamps}
    <h4>الأوسمة</h4>${badges}${hideRow}
    <h4>لون ناجي</h4><div class="hue-row">${swatches}</div>
    <div class="hub-row"><button class="tool-btn" onclick="guideParentNote()">📝 رسالة ناجي للوالدين</button></div>`);
}

/* رسالة للوالدين تُكتب على الجهاز، ولا تُرسل إلا إذا نسخها الوالد بنفسه */
async function guideParentNote() {
  const name = getUserName();
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const recs = typeof recAllForUser === "function" ? await recAllForUser(activeUserId) : [];
  const thisWeek = recs.filter(r => r.kind === "verse" && r.at >= weekAgo).length;
  const learned = learnedVerses("all").length;
  const stations = completedCount();
  const days = guideStreak();
  const text = [
    `السلام عليكم، أنا ناجي، رفيق ${name} في رحلة السيرة النبوية.`,
    `هذا الأسبوع سجّل ${name} ${thisWeek} ${thisWeek === 1 ? "بيتاً" : "أبيات"} بصوته.`,
    `إجمالي ما حفظه: ${learned} ${learned === 1 ? "بيت" : "أبيات"}، وأكمل ${stations} ${stations === 1 ? "محطة" : "محطات"} من الرحلة.`,
    `عدد الأيام المتتالية التي فتح فيها التطبيق: ${days}.`,
    "شجّعوه على التسميع المتصل في نهاية الأسبوع ليثبت ما حفظه 🐪"
  ].join("\n");
  openHub("📝 رسالة ناجي للوالدين", `
    <p class="note-hint">🔒 هذه الرسالة تبقى على هذا الجهاز، ولا تُرسل إلا إذا نسختها بنفسك.</p>
    <textarea id="parentNoteText" class="note-text" readonly rows="8">${escapeHtml(text)}</textarea>
    <div class="hub-row">
      <button class="tool-btn" onclick="selectParentNote()">📋 حدّد النص لتنسخه</button>
      <button class="tool-btn" onclick="openGuideJournal()">← الدفتر</button>
    </div>`);
}
function selectParentNote() {
  const t = document.getElementById("parentNoteText"); if (!t) return;
  t.focus(); t.select();
  try { document.execCommand("copy"); showToast("تم نسخ النص", "success"); } catch(e) { showToast("حدّد النص وانسخه", ""); }
}

/* ---------- نار القصة: ناجي يجلس بجانبها أثناء السرد ---------- */
function guideCampfire() {
  const box = document.getElementById("storyBox");
  if (!box || box.querySelector(".campfire")) return;
  const f = document.createElement("div");
  f.className = "campfire"; f.setAttribute("aria-hidden", "true");
  f.innerHTML = `<span class="camp-guide">🐪</span><span class="fire">🔥</span>`;
  box.insertBefore(f, box.firstChild);
}

/* ---------- قصص المحطة بصوت الوالد (إن وُجد) وإلا بالقراءة الآلية ---------- */
async function guidePlayStationStories(si) {
  const st = content.journeyData[si]; if (!st) return;
  if (!audioBegin()) return;
  const token = seqToken;
  const items = [];
  for (const v of st.verses) {
    if (!v.story) continue;
    const rec = await authorRecFor("story", v);
    if (token !== seqToken) return;
    items.push({ rec, text: v.story });
  }
  if (!items.length) { kidToast(kidLine("noStories"), ""); return; }
  guideDance(true);
  for (const it of items) { if (token !== seqToken) break; await playPart(token, it.rec, it.text); }
  if (token === seqToken) guideDance(false);
}

/* ---------- تحدي الخمس دقائق: كم بيتاً ينجز الطفل؟ ---------- */
let guideChallenge = null, guideChallengeTimer = null;
function guideStartChallenge() {
  if (guideChallenge) return;
  const open = guideOpenStation(); if (!open) return;
  guideChallenge = { end: Date.now() + 5 * 60 * 1000, count: 0 };
  guideChallengeTick();
  guideChallengeTimer = setInterval(guideChallengeTick, 1000);
  startStation(content.journeyData.indexOf(open));
}
function guideChallengeTick() {
  if (!guideChallenge) return;
  let box = document.getElementById("challengeBox");
  if (!box) { box = document.createElement("div"); box.id = "challengeBox"; box.className = "challenge-box"; document.body.appendChild(box); }
  const left = guideChallenge.end - Date.now();
  if (left <= 0) {
    clearInterval(guideChallengeTimer);
    const n = guideChallenge.count;
    guideChallenge = null; box.remove();
    playSuccess(); guideSetMood("proud", 8000);
    guidePanel(`انتهى التحدي {N}! ${gForm("أنجزتَ", "أنجزتِ")} ${n} ${n === 1 ? "بيتاً" : "أبيات"} في خمس دقائق 🎉`, [{ label: "📖 دفتر الرحلة", run: () => openGuideJournal() }], null, { say: [guideFill(kidLine("challengeDone"))] });
    return;
  }
  const m = Math.floor(left / 60000), sec = Math.floor((left % 60000) / 1000);
  box.textContent = `⏱ ${m}:${String(sec).padStart(2, "0")} · ${gForm("أنجزتَ", "أنجزتِ")} ${guideChallenge.count}`;
}
function guideOnNextVerse() { if (guideChallenge) guideChallenge.count++; }

/* ---------- عند ظهور بيت جديد: معناه أولاً، أو سؤال «ساعدني» ---------- */
const guideHelpedVerses = {};
function guideOnVerseShown(station, verse, verseIndex) {
  if (!verse || !verse.words || !verse.words.length) return;
  if (verseIndex % 3 === 2 && !guideHelpedVerses[verse.id]) {
    guideHelpedVerses[verse.id] = true;
    guideHelperTurn(verse);
    return;
  }
  state.meaningSeen = state.meaningSeen || {};
  if (!state.meaningSeen[verse.id] && EXPLANATIONS[verse.id]) {
    state.meaningSeen[verse.id] = true; saveState();
    const meaning = verse.meaning || EXPLANATIONS[verse.id];
    guidePanel(kidLine("newVerseMeaning"), [
      { label: "📖 أعرف المعنى", run: () => guidePanel(meaning, [{ label: "🔊 استمع للمعنى", run: () => sayText(meaning) }]) }
    ]);
  }
}
/* ناجي ينسى أول كلمة ويطلب من الطفل مساعدته (بعد تمهّل: لا عقوبة على الخطأ هنا) */
function guideHelperTurn(verse) {
  const correct = verse.words[0];
  const pool = [...new Set(content.journeyData.flatMap(s => s.verses)
    .filter(v => v.id !== verse.id && v.words && v.words.length)
    .map(v => v.words[0]).filter(w => w !== correct))];
  const opts = [correct, ...pool.sort(() => Math.random() - .5).slice(0, 2)].sort(() => Math.random() - .5);
  const ask = (msg) => guidePanel(msg, opts.map(w => ({
    label: w,
    run: () => {
      if (w === correct) {
        playSuccess(); guideSetMood("proud", 5000);
        guideSay("mastery", kidLine("helperThanks"));
      } else {
        playClick(); ask(kidLine("helperNotThis"));
      }
    }
  })), null, opts);
  ask(kidLine("helperForgot"));
}

/* ---------- أين ناجي؟ كل يوم يختبئ في محطة مفتوحة ---------- */
function guideHiddenIndex() {
  const open = content.journeyData.map((s, i) => i).filter(i => getStationStatus(content.journeyData[i]) !== "locked");
  if (!open.length) return -1;
  let h = 0; for (const ch of guideDayKey()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return open[h % open.length];
}
function guidePlaceHidden() {
  document.querySelectorAll(".naji-hide").forEach(e => e.remove());
  const today = guideDayKey();
  if (state.najiFound === today) return;
  const idx = guideHiddenIndex(); if (idx < 0) return;
  const wrap = document.querySelectorAll(".station-wrapper")[idx]; if (!wrap) return;
  const h = document.createElement("span");
  h.className = "naji-hide"; h.textContent = "🐪"; h.title = "أين ناجي؟";
  h.onclick = ev => {
    ev.stopPropagation();
    state.najiFound = guideDayKey(); state.najiCount = (state.najiCount || 0) + 1; saveState();
    h.remove(); playSuccess(); guideSetMood("proud", 6000);
    guidePanel(kidLine("foundMe"), [{ label: "📖 الدفتر", run: () => openGuideJournal() }]);
  };
  wrap.appendChild(h);
}

/* ---------- تذكير لطيف بعد الغياب يوماً أو أكثر (يمكن إيقافه) ---------- */
let guideLastGapMs = 0;
function guideNudgeDue() {
  if (getPrefs().absenceNudge === false || guideLastGapMs < 24 * 3600 * 1000) return false;
  try {
    if (sessionStorage.getItem("guideNudged")) return false;
    sessionStorage.setItem("guideNudged", "1");
  } catch(e) {}
  return true;
}
