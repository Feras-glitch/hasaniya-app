/* منطق اللعب */
let playMode = MODE_NORMAL;
let playQueue = [];
let playIndex = 0;
let selectedWords = [];
let sessionStats = {correct:0, wrong:0, total:0};
let focusTarget = null;
let previewTarget = null;

/* المعاينة ووضع التصفّح للعرض فقط: لا نقاط ولا إتقان ولا أخطاء ولا إتمام محطات */
function noCredit() { return playMode === MODE_PREVIEW || (typeof isBrowse === "function" && isBrowse()); }
function getStationStatus(station) {
  return state.stationStatus[station.id] || (content.journeyData[0]?.id === station.id ? "current" : "locked");
}
function isRewardUnlocked(station) { return !!state.rewardUnlocked[station.id]; }

function markStationCompleted(station) {
  state.charms = state.charms || {};
  state.charms[station.id] = true;
  state.stationStatus[station.id] = "completed";
  state.rewardUnlocked[station.id] = true;
  state.stampDates = state.stampDates || {};
  state.stampDates[station.id] = Date.now();
  delete state.versePositions[station.id];
  const idx = content.journeyData.findIndex(s => s.id === station.id);
  if (idx >= 0 && idx < content.journeyData.length - 1) {
    const next = content.journeyData[idx + 1];
    if (getStationStatus(next) === "locked") state.stationStatus[next.id] = "current";
  }
  saveState(); checkAchievements();
  if (typeof guideOnStationDone === "function") guideOnStationDone(station);
}

function resetAll() {
  if (!confirm(`حذف كل تقدّم "${getUserName()}"؟`)) return;
  state.stationStatus = {};
  state.charms = {};
  state.warmups = {};
  state.eventMisses = {};
  state.rewardUnlocked = {};
  state.versePositions = {};
  state.mistakes = {};
  state.seenVerses = {};
  state.verseStats = {};
  state.dailyCredits = {};
  state.leitner = {}; state.weekly = null; state.storyUnlocked = {}; state.riddlesSolved = {};
  state.points = 0;
  state.streak = 0;
  state.lastPracticeDate = null;
  state.totalTimeSeconds = 0;
  state.achievements = {};
  state.stats = {perfectSessions:0, reviewSessions:0, shared:0, challengeSessions:0};
  if (content.journeyData.length > 0) state.stationStatus[content.journeyData[0].id] = "current";
  saveState();
  kidToast(kidLine("resetDone"), "success");
  showMap();
}

function getCurrentVerse() {
  if (playMode === MODE_NORMAL) {
    const s = content.journeyData[state.selectedStation];
    if (!s || !s.verses[state.selectedVerse]) return null;
    return {station:s, verse:s.verses[state.selectedVerse], stationIndex:state.selectedStation, verseIndex:state.selectedVerse};
  }
  if (playMode === MODE_FOCUS && focusTarget) {
    const s = content.journeyData[focusTarget.stationIndex];
    if (!s) return null;
    return {station:s, verse:s.verses[focusTarget.verseIndex], stationIndex:focusTarget.stationIndex, verseIndex:focusTarget.verseIndex};
  }
  if (playMode === MODE_PREVIEW && previewTarget) {
    const s = content.journeyData[previewTarget.stationIndex];
    if (!s) return null;
    return {station:s, verse:s.verses[previewTarget.verseIndex], stationIndex:previewTarget.stationIndex, verseIndex:previewTarget.verseIndex};
  }
  const it = playQueue[playIndex]; if (!it) return null;
  const s = content.journeyData[it.stationIndex];
  if (!s || !s.verses[it.verseIndex]) return null;
  return {station:s, verse:s.verses[it.verseIndex], stationIndex:it.stationIndex, verseIndex:it.verseIndex};
}

/* بطاقة درس اليوم: المحطة الحالية وموضع الطفل فيها */
function renderDailyCard() {
  const info = document.getElementById("dailyInfo");
  const btn = document.getElementById("dailyMainBtn");
  if (!info || !btn) return;
  const idx = content.journeyData.findIndex(s => { const st = getStationStatus(s); return st !== "completed" && st !== "locked"; });
  if (idx < 0) {
    info.textContent = gForm("أكملتَ", "أكملتِ") + " كل المحطات، أحسنتَ! 🎉";
    btn.disabled = true; return;
  }
  const st = content.journeyData[idx];
  const pos = Math.min(state.versePositions[st.id] || 0, st.verses.length - 1);
  info.textContent = `المحطة ${idx + 1}: ${st.title} · البيت ${pos + 1} من ${st.verses.length}`;
  btn.disabled = false;
}
function showMap() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  if (typeof audioStopAll === "function") audioStopAll();
  stopMediaStream(); stopTimeTracking();
  playMode = MODE_NORMAL; playQueue = []; playIndex = 0;
  focusTarget = null; previewTarget = null;
  document.getElementById("mapScreen").style.display = "block";
  document.getElementById("gameScreen").style.display = "none";
  document.getElementById("parentScreen").style.display = "none";
  document.getElementById("mainHeader").style.background = "var(--primary)";
  document.getElementById("backToMapBtn").style.display = "none";
  document.getElementById("eventBadge").classList.add("hidden");
  document.getElementById("progressBars").style.display = "none";
  document.getElementById("appTitle").innerText = "خريطة السيرة 🧭";
  updateUserChip();
  updatePointsDisplay();
  renderMap();
  renderDailyCard();
  document.getElementById("stationsArea").style.display = (typeof showStationList !== "undefined" && showStationList) ? "block" : "none";
  updateReviewBadge();
  if (typeof guideShowActions === "function") guideShowActions();
}

/* عدد أبيات مراجعة اليوم: المستحقّ من نظام الحفظ، أو حتى 5 من الأبيات المرّ عليها */
function dailyReviewCount() {
  const dueCount = typeof leitnerDueVerses === "function" ? leitnerDueVerses().length : 0;
  return dueCount || Math.min(5, Object.keys(state.seenVerses).length);
}
/* زر «مراجعة» في الشاشة الرئيسية يعرض مجموع ما ينتظر المراجعة: اليوم + الأخطاء */
function updateReviewBadge() {
  const btn = document.getElementById("reviewHubBtn");
  if (!btn) return;
  const total = dailyReviewCount() + Object.keys(state.mistakes || {}).length;
  btn.innerHTML = "🔁 مراجعة" + (total > 0 ? `<span class="review-count">${total}</span>` : "");
}

function renderMap() {
  const area = document.getElementById("stationsArea");
  let html = '<div class="path-line"></div>';
  content.journeyData.forEach((station, i) => {
    const status = getStationStatus(station);
    const thumb = station.verses.map(v => (typeof SCENES !== "undefined" ? SCENES[v.id] : null)).find(Boolean);
    const thumbStyle = thumb ? ` style="background-image:url('${thumb}')"` : "";
    html += `<div class="station-wrapper">
      <div class="station ${status}${thumb ? " has-img" : ""}"${thumbStyle} role="button" tabindex="0" aria-label="${escapeHtml(station.title)}" onclick="startStation(${i})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();startStation(${i})}">${thumb ? "" : escapeHtml(station.icon)}</div>
      <div class="station-label ${status==='completed'?'completed':''}">${escapeHtml(station.title)}</div>
      ${status !== "locked" && typeof stationMastery === "function" ? `<div class="station-mastery">إتقان ${stationMastery(station).done} / ${station.verses.length}</div>` : ""}
    </div>`;
  });
  area.innerHTML = html;
  updateBrowsePanel();
  renderGuideCharms();
}

function startStation(index) {
  const station = content.journeyData[index];
  if (!station) return;
  if (getStationStatus(station) === "locked") { kidToast(kidLine("finishPrev"), "error"); return; }
  state.dailyLeft = null;
  state.selectedStation = index;
  state.selectedVerse = state.versePositions[station.id] || 0;
  if (state.selectedVerse >= station.verses.length) state.selectedVerse = 0;
  playMode = MODE_NORMAL;
  if (isBrowse()) { enterPlayScreen(station.title); return; }
  maybeWarmup(station, () => enterPlayScreen(station.title));
}

function enterPlayScreen(title) {
  document.getElementById("mapScreen").style.display = "none";
  document.getElementById("gameScreen").style.display = "block";
  document.getElementById("parentScreen").style.display = "none";
  document.getElementById("backToMapBtn").style.display = "inline-block";
  document.getElementById("eventBadge").classList.remove("hidden");
  document.getElementById("progressBars").style.display = "flex";
  document.getElementById("appTitle").innerText = title;
  if (typeof guideHidePanel === "function") guideHidePanel();
  startTimeTracking();
  loadVerse();
}

/* إعادة تحميل البيت بعد جواب خاطئ، بشرط أن يبقى الطفل في الشاشة نفسها ولم يُحمَّل بيت آخر في الأثناء */
let verseLoadToken = 0;
function reloadVerseLater(ms) {
  const tok = verseLoadToken;
  setTimeout(() => {
    const g = document.getElementById("gameScreen");
    if (tok !== verseLoadToken || !g || getComputedStyle(g).display === "none") return;
    loadVerse();
  }, ms);
}
function loadVerse() {
  verseLoadToken++;
  if (recIsActive()) recStop();
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  stopMediaStream();
  const cur = getCurrentVerse();
  if (!cur) { showMap(); return; }
  const {station, verse} = cur;
  if (typeof guideOnVerseShown === "function") guideOnVerseShown(station, verse, cur.verseIndex);

  // بيت يراه الطفل أول مرة في درسه: يُعرض كاملاً ويُسمع قبل الترتيب
  const firstTime = playMode === MODE_NORMAL && !noCredit() && !state.seenVerses[verse.id];
  if (playMode === MODE_NORMAL && !noCredit()) {
    state.seenVerses[verse.id] = true;
  }

  if (playMode === MODE_NORMAL) {
    document.getElementById("progressVerse").style.width = ((state.selectedVerse)/Math.max(1,station.verses.length)*100) + "%";
  } else if (playMode === MODE_FOCUS && focusTarget) {
    document.getElementById("progressVerse").style.width = (((3 - focusTarget.remaining)/3)*100) + "%";
  } else if (playMode === MODE_PREVIEW) {
    document.getElementById("progressVerse").style.width = "50%";
  } else {
    document.getElementById("progressVerse").style.width = (playIndex/Math.max(1, playQueue.length)*100) + "%";
  }
  const totalV = content.journeyData.reduce((s, st) => s + st.verses.length, 0);
  let doneV = 0;
  content.journeyData.forEach((st, i) => {
    if (getStationStatus(st) === "completed") doneV += st.verses.length;
    else if (i === state.selectedStation && playMode === MODE_NORMAL) doneV += state.selectedVerse;
  });
  const overallPct = doneV/Math.max(1, totalV)*100;
  document.getElementById("progressOverall").style.width = overallPct + "%";
  const camel = document.getElementById("camel"); if (camel) camel.style.right = overallPct + "%";

  document.getElementById("eventBadge").innerText = station.title;
  document.getElementById("meaningBox").style.display = "none";
  document.getElementById("meaningBox").innerText = verse.meaning || "";
  document.getElementById("storyBox").style.display = "none";
  document.getElementById("fullVerseBox").style.display = "none";
  refreshBrowseUI();
  document.getElementById("nextBtn").style.display = "none";

  selectedWords = [];
  hintUsedThisVerse = false;
  verseFlawed = false; wrongAtPos = 0;
  const gameArea = document.getElementById("gameArea");
  const oldPb = document.getElementById("playbackAudio");
  if (oldPb) {
    if (oldPb.src && oldPb.src.startsWith("blob:")) {
      try { URL.revokeObjectURL(oldPb.src); } catch(e) {}
    }
    oldPb.remove();
  }

  let prefix = "";
  if (playMode === MODE_FOCUS && focusTarget) {
    prefix = `<div style="text-align:center"><div class="focus-indicator">🎯 تركيز — المتبقي: ${focusTarget.remaining} من 3</div></div>`;
  } else if (playMode === MODE_PREVIEW) {
    prefix = `<div style="text-align:center"><div class="preview-indicator">👁 معاينة (لن تُحفظ النتائج)</div></div>`;
  }

  activeVariant = null;
  let shown = verse;
  if (verse.type !== "missing_choice" && playMode === MODE_CHALLENGE && Math.random() < 0.5) {
    activeVariant = makeMissingVariant(verse); if (activeVariant) shown = activeVariant;
  }
  if (shown.type === "missing_choice") renderMissingChoice(shown, gameArea, prefix);
  else if (verse.type === "word_order") renderWordOrder(verse, gameArea, prefix, firstTime);
  else gameArea.innerHTML = "<p>نوع غير مدعوم</p>";
  updateRecBar();
}

/* شريط البيت: ثلاثة أزرار ظاهرة دائماً، والطفل يتحكم بكل خطوة
   🔊 استمع: يُسمع البيت (صوت المعلم إن وُجد، وإلا القارئ الآلي)، ويُعطَّل أثناء التسجيل
   🎤 سجّل / ⏹ أوقف: يبدأ التسجيل ويوقفه، والضغط مرة أخرى يعيد التسجيل ويستبدل السابق
   ▶ صوتي: يظهر بعد أن يسجّل الطفل البيت */
function renderToolbar(verse) {
  return `<div class="verse-toolbar rec-bar" id="recBar">
    <button class="tool-btn big-btn" id="listenBtn" onclick="listenVerse()">🔊 استمع</button>
    <button class="tool-btn big-btn rec-btn" id="recordBtn" onclick="recordVerse()">🎤 سجّل</button>
    <button class="tool-btn big-btn" id="mineBtn" onclick="playMyVerse()" style="display:none">▶ صوتي</button>
  </div>
  <div id="shadowResult" class="shadow-result"></div>`;
}
/* صورة المشهد قبل السؤال، إن وُجدت لهذا البيت. بعض الأبيات بلا صورة بعد، فلا تظهر فيها شيء */
function sceneBeforeQuestion(verse) {
  const src = (typeof SCENES !== "undefined") ? SCENES[verse.id] : null;
  return src ? `<img class="scene-img" src="${src}" alt="" style="display:block">` : "";
}
function renderMissingChoice(verse, gameArea, prefix) {
  const blankHTML = verse.textPart2 && verse.textPart2.trim() !== ""
    ? `<span class="blank" id="blankSpan">( ... )</span> ${escapeHtml(verse.textPart2)}`
    : ` <span class="blank" id="blankSpan">( ... )</span>`;
  const shuffled = [...(verse.options||[])].sort(() => Math.random() - .5);
  const opts = shuffled.map(o =>
    `<button class="word-btn" onclick="checkChoice(this,'${escapeForAttr(o)}')">${escapeHtml(o)}</button>`
  ).join("");
  gameArea.innerHTML = `${prefix}${sceneBeforeQuestion(verse)}${renderToolbar(verse)}
    <div class="verse-text">${escapeHtml(verse.textPart1)}${blankHTML}</div>
    <div class="word-bank" id="optionsBank">${opts}</div>`;
}
/* البيت مقسوماً إلى شطرين (صدر وعجز) */
function baytHTML(v) {
  const w = String((v && v.fullVerse) || "").split(/\s+/).filter(Boolean);
  const k = (v && v.half > 0 && v.half < w.length) ? v.half : Math.ceil(w.length / 2);
  return `<span class="bayt"><span class="shatr">${escapeHtml(w.slice(0, k).join(" "))}</span><span class="shatr">${escapeHtml(w.slice(k).join(" "))}</span></span>`;
}
function renderWordOrder(verse, gameArea, prefix, intro) {
  const shuffled = [...(verse.words||[])].sort(() => Math.random() - .5);
  const wh = shuffled.map((w, i) =>
    `<button class="word-btn" id="word-${i}" onclick="selectWord('${escapeForAttr(w)}',${i})">${escapeHtml(w)}</button>`
  ).join("");
  const introHTML = intro ? `<div class="verse-intro" id="verseIntro">
      <div class="intro-label">👂 ${escapeHtml(kidLine("introListen"))}</div>
      <div class="intro-verse">${baytHTML(verse)}</div>
      <div class="controls"><button class="tool-btn" onclick="introListen()">🔊 استمع مرة أخرى</button></div>
      <button class="action-btn btn-success intro-go" id="introGo" onclick="startOrderAfterIntro()">✅ قرأته، أرتّبه الآن</button>
    </div>` : "";
  gameArea.innerHTML = `${prefix}${sceneBeforeQuestion(verse)}${introHTML}
    <div id="orderPart"${intro ? ' style="display:none"' : ""}>${renderToolbar(verse)}
    <div class="verse-text" style="font-size:1.2rem;color:#666">رتّب الكلمات:</div>
    <div class="drop-zone" id="dropZone"></div>
    <div class="verse-toolbar">
      <button class="tool-btn" onclick="undoWord()">↩️ تراجع</button>
      <button class="tool-btn" onclick="giveHint()">💡 تلميح</button>
    </div>
    <div class="word-bank" id="wordsBank">${wh}</div></div>`;
  if (intro) { const tok = verseLoadToken; setTimeout(() => { if (tok === verseLoadToken && document.getElementById("verseIntro")) introListen(); }, 350); }
}
function introListen() {
  const cur = getCurrentVerse(); if (!cur) return;
  if (typeof playVerseAndStory === "function") playVerseAndStory(cur.verse, false); else speak(cur.verse.fullVerse);
}
/* بعد الاستماع والقراءة: يُخفى البيت ويبدأ الترتيب من الذاكرة */
function startOrderAfterIntro() {
  if (typeof audioStopAll === "function") audioStopAll();
  const i = document.getElementById("verseIntro"); if (i) i.remove();
  const o = document.getElementById("orderPart"); if (o) o.style.display = "";
  if (typeof autoSay === "function") autoSay(kidLine("orderFromMemory"));
}
function checkChoice(btn, selected) {
  const cur = getCurrentVerse(); if (!cur) return;
  const station = cur.station;
  const verse = activeVariant || cur.verse;
  document.querySelectorAll("#optionsBank .word-btn").forEach(b => b.disabled = true);
  if (selected === verse.correctWord) {
    btn.classList.add("success");
    const bs = document.getElementById("blankSpan");
    if (bs) { bs.textContent = verse.correctWord; bs.className = "filled"; }
    playSuccess();
    handleCorrect(verse, verse.correctWord, station);
    showFullVerse(verse);
  } else {
    btn.classList.add("fail"); playFail();
    if (!noCredit()) {
      sessionStats.wrong++;
      recordVerseStat(verse.id, false);
      addMistake(activeVariant || verse, verse.correctWord, station.id);
    }
    kidToast(kidLine("correctIs") + " " + verse.correctWord, "", [kidLine("correctIs"), verse.correctWord]);
    reloadVerseLater(1500);
  }
}
function selectWord(word, index) {
  const cur = getCurrentVerse(); if (!cur) return;
  const {station, verse} = cur;
  const btn = document.getElementById("word-" + index);
  if (!btn || btn.classList.contains("selected") || btn.disabled) return;
  const expected = verse.correctOrder[selectedWords.length];
  /* تصحيح كلمة بكلمة: الكلمة الخاطئة ترتد وحدها ولا يُعاد البيت كله.
     أول خطأ في البيت يُسجَّل مرة واحدة، وبعد خطأين في الموضع نفسه تُضاء الكلمة الصحيحة */
  if (word !== expected) {
    playFail();
    btn.classList.remove("bounce"); void btn.offsetWidth; btn.classList.add("bounce");
    if (!verseFlawed) {
      verseFlawed = true;
      if (!noCredit()) {
        sessionStats.wrong++;
        recordVerseStat(verse.id, false);
        addMistake(verse, verse.fullVerse, station.id);
      }
      if (typeof guideOnWrong === "function") guideOnWrong();
    }
    wrongAtPos++;
    if (wrongAtPos >= 2) {
      const right = [...document.querySelectorAll("#wordsBank .word-btn")].find(b => !b.classList.contains("selected") && b.textContent === expected);
      if (right) { right.classList.add("hint"); hintUsedThisVerse = true; setTimeout(() => right.classList.remove("hint"), 2500); }
    }
    // لا رسالة منفصلة: ارتداد الكلمة وصوتها، وتشجيع ناجي عند أول خطأ، يكفيان
    return;
  }
  wrongAtPos = 0;
  btn.classList.add("selected");
  selectedWords.push(word);
  const dz = document.getElementById("dropZone");
  const chip = document.createElement("button");
  chip.className = "word-btn"; chip.textContent = word; chip.disabled = true;
  dz.appendChild(chip); playClick();
  if (selectedWords.length === verse.correctOrder.length) {
    document.querySelectorAll("#wordsBank .word-btn").forEach(b => b.disabled = true);
    dz.classList.add("success"); playSuccess();
    handleCorrect(verse, verse.fullVerse, station, verseFlawed);
    showFullVerse(verse);
  }
}
/* الإتقان يُحتسب من الدرس العادي فقط، ومرة واحدة في اليوم لكل بيت، حتى لا يُكسب بتكرار البيت نفسه */
function recordVerseStat(vid, ok) {
  const s = state.verseStats[vid] || (state.verseStats[vid] = {correct: 0, wrong: 0, lastCorrect: 0, lastWrong: 0});
  leitnerRecord(vid, ok);
  if (!ok) { s.wrong++; s.lastWrong = Date.now(); return; }
  if (noCredit() || !firstCreditToday("mastery|" + vid)) return;
  s.correct++; s.lastCorrect = Date.now();
  if (s.correct >= 2 && s.lastCorrect >= (s.lastWrong || 0)) celebrateMastery(vid);
}
/* تهنئة لطيفة مرة واحدة عند إتقان البيت لأول مرة */
function celebrateMastery(vid) {
  state.masteredNotified = state.masteredNotified || {};
  if (state.masteredNotified[vid]) return;
  state.masteredNotified[vid] = true;
  guideSay("mastery");
  const v = content.journeyData.flatMap(st => st.verses).find(x => x.id === vid);
  const toast = document.createElement("div");
  toast.className = "verse-toast";
  toast.innerHTML = `🐪 ⭐ ${escapeHtml(guideVocative())}، ${gForm("أتقنتَ", "أتقنتِ")} هذا البيت!<div class="vt-words">${escapeHtml(v ? v.words.slice(0, 3).join(" ") + " …" : "")}</div>`;
  document.body.appendChild(toast);
  if (typeof playSuccess === "function") playSuccess();
  setTimeout(() => toast.remove(), 2600);
}
/* flawed: أكمل الطفل البيت بعد خطأ. يُكمل درسه ويأخذ نصف النقاط، لكن لا يُحسب إتقاناً ولا يصعد صندوقه */
function handleCorrect(verse, key, station, flawed) {
  if (noCredit()) return;
  if (!flawed) {
    recordVerseStat(verse.id, true);
    markWeekly(verse.id);
    sessionStats.correct++;
    recordCorrectAttempt(verse.id, key);
  }
  updateStreak();
  let pts = playMode === MODE_REVIEW ? 5 : playMode === MODE_CHALLENGE ? 15 : playMode === MODE_FOCUS ? 8 : 10;
  if (hintUsedThisVerse || flawed) pts = Math.ceil(pts / 2);
  // النقاط مرة واحدة فقط لكل بيت في اليوم الواحد
  if (firstCreditToday("lesson|" + verse.id)) addPoints(pts);
}
function showFullVerse(verse) {
  if (typeof guideHideOffers === "function") guideHideOffers();
  document.getElementById("fullVerseText").innerHTML = baytHTML(verse);
  document.getElementById("fullVerseBox").style.display = "block";
  document.getElementById("nextBtn").style.display = "inline-block";
  document.getElementById("speakFullBtn").onclick = () => playVerseAndStory(verse, false);
  const unlocked = verse.story && state.storyUnlocked && state.storyUnlocked[verse.id];
  playVerseAndStory(verse, !!(unlocked || noCredit()));
  const mb = document.getElementById("meaningBox");
  if (verse.meaning) {
    mb.textContent = "";
    const sp = document.createElement("button"); sp.className = "say-btn"; sp.textContent = "🔊"; sp.setAttribute("aria-label", "استمع للشرح");
    sp.onclick = () => sayText(verse.meaning);
    mb.appendChild(sp); mb.appendChild(document.createTextNode(" " + verse.meaning));
    mb.style.display = "block";
  }
  if (verse.story) {
    if (noCredit() || (state.storyUnlocked && state.storyUnlocked[verse.id])) {
      renderStoryContent(verse);
      document.getElementById("storyBox").style.display = "block";
    } else {
      askEventBeforeStory(verse);
    }
  }
}
function nextVerse() {
  if (typeof guideHideOffers === "function") guideHideOffers();
  if (typeof guideOnNextVerse === "function") guideOnNextVerse();
  if (playMode === MODE_PREVIEW) {
    previewTarget = null;
    playMode = MODE_NORMAL;
    showToast("انتهت المعاينة", "success");
    showParentScreen();
    return;
  }
  if (playMode === MODE_NORMAL) {
    const station = content.journeyData[state.selectedStation];
    if (!station) { showMap(); return; }
    if (state.selectedVerse < station.verses.length - 1) {
      const advance = () => {
        // درس اليوم: ثلاثة أبيات ثم يتوقف، ويبقى الموضع محفوظاً للغد
        if (state.dailyLeft) {
          const cur = getCurrentVerse();
          state.dailyIds = (state.dailyIds || []).concat(cur ? [cur.verse.id] : []);
          state.dailyLeft--;
          if (state.dailyLeft <= 0) { dailyLessonDone(station); return; }
        }
        state.selectedVerse++;
        if (!isBrowse()) state.versePositions[station.id] = state.selectedVerse;
        saveState(); loadVerse();
        offerReview();
      };
      if ((state.selectedVerse + 1) % 5 === 0) showRepeatBatch(station, state.selectedVerse - 4, state.selectedVerse, advance);
      else advance();
    } else {
      // وضع التصفّح يعبر إلى المحطة التالية دون أن يُتمّ المحطة أو يفتح ما بعدها
      if (isBrowse()) { browseNext(); return; }
      state.versePositions[station.id] = 0;
      state.dailyLeft = null; state.dailyIds = [];
      markStationCompleted(station);
      startStationQuiz(station, () => {
        window.lastCompletedStation = station;
        guideSay("station");
        renderGuideOutfit();
        if (content.journeyData.every(s => getStationStatus(s) === "completed")) setTimeout(showFinale, 1200);
        document.getElementById("rewardVerb").innerText = guideVocative() + "، " + gForm("أتممتَ", "أتممتِ");
        document.getElementById("popupPhotoWrap").innerHTML = rewardPhoto()
          ? `<img class="reward-photo" src="${rewardPhoto()}" alt="">` : "";
        document.getElementById("popupStationName").innerText = station.title;
        document.getElementById("popupRewardIcon").innerText = station.reward.icon;
        document.getElementById("popupRewardName").innerText = station.reward.name;
        document.getElementById("rewardPopup").classList.add("active");
        launchConfetti();
      });
    }
  } else if (playMode === MODE_FOCUS && focusTarget) {
    focusTarget.remaining--;
    if (focusTarget.remaining <= 0) finishFocus();
    else loadVerse();
  } else {
    playIndex++;
    if (playIndex >= playQueue.length) finishSession();
    else loadVerse();
  }
}

/* درس اليوم: يبدأ من المحطة المفتوحة وموضع الطفل، ويتوقف بعد ثلاثة أبيات دون أن يعبر المحطة */
function startDailyLesson() {
  const idx = content.journeyData.findIndex(s => { const st = getStationStatus(s); return st !== "completed" && st !== "locked"; });
  if (idx < 0) { kidToast(kidLine("allDone"), "success"); return; }
  const station = content.journeyData[idx];
  state.selectedStation = idx;
  state.selectedVerse = Math.min(state.versePositions[station.id] || 0, station.verses.length - 1);
  playMode = MODE_NORMAL;
  state.dailyLeft = 3;
  state.dailyIds = [];
  enterPlayScreen(station.title);
}
function dailyLessonDone(station) {
  state.selectedVerse++;
  state.versePositions[station.id] = Math.min(state.selectedVerse, station.verses.length - 1);
  const ids = state.dailyIds || [];
  state.dailyLeft = null; state.dailyIds = [];
  saveState();
  kidToast(kidLine("lessonDone"), "success");
  // سؤال المكان: يظهر إن كان أحد أبيات الدرس مرتبطاً بموضع على الخريطة
  const visit = (typeof PLACE_VISITS !== "undefined" ? PLACE_VISITS : []).find(v => ids.includes(v.ref));
  if (visit && typeof askPlaceAfterLesson === "function") askPlaceAfterLesson(visit, showMap);
  else showMap();
}
/* سؤال المكان: ثلاثة خيارات، والجواب الصحيح يُحتسب مرة واحدة لكل بيت في اليوم */
let placeHubDone = null;
/* أي إغلاق لنافذة سؤال المكان (✕ أو الخلفية أو الرجوع) يعيد الطفل إلى الخريطة مرة واحدة */
function placeHubClosed() {
  const d = placeHubDone; placeHubDone = null;
  if (d) d();
}
function askPlaceAfterLesson(visit, done) {
  placeHubDone = done;
  const token = done;
  const verse = vpFindVerse(visit.ref);
  const others = Object.keys(GEO_PLACES).filter(n => n !== visit.place);
  const opts = shuffleWords([visit.place, ...shuffleWords(others).slice(0, 2)]);
  const body = document.getElementById("hubBody");
  document.getElementById("hubTitle").textContent = "📍 أين وقع هذا؟";
  body.innerHTML = `<p style="font-size:1.1rem;line-height:1.9">${escapeHtml(verse ? verse.fullVerse : "")}</p><div class="word-bank" id="placeOpts"></div>`;
  const box = document.getElementById("placeOpts");
  opts.forEach(name => {
    const b = document.createElement("button");
    b.className = "word-btn"; b.textContent = name;
    b.onclick = () => {
      box.querySelectorAll("button").forEach(x => x.disabled = true);
      if (name === visit.place) {
        b.classList.add("success"); playSuccess();
        if (firstCreditToday("place|" + visit.ref)) addPoints(2);
      } else {
        b.classList.add("fail"); playFail();
        box.querySelectorAll("button").forEach(x => { if (x.textContent === visit.place) x.classList.add("success"); });
      }
      setTimeout(() => { if (placeHubDone === token) closePopup("hubPopup"); }, 1400);
    };
    box.appendChild(b);
  });
  document.getElementById("hubPopup").classList.add("active");
}

function startReview() {
  const ms = getMistakesSorted();
  if (ms.length === 0) { kidToast(kidLine("noMistakes"), "success"); return; }
  playQueue = [];
  ms.forEach(m => {
    const si = content.journeyData.findIndex(s => s.id === m.stationId);
    if (si === -1) return;
    const vi = content.journeyData[si].verses.findIndex(v => v.id === m.verseId);
    if (vi === -1) return;
    playQueue.push({stationIndex:si, verseIndex:vi});
  });
  if (playQueue.length === 0) return;
  playMode = MODE_REVIEW; playIndex = 0;
  sessionStats = {correct:0, wrong:0, total:playQueue.length};
  enterPlayScreen("جلسة مراجعة 🎯");
}

function startChallenge() {
  const pool = [];
  content.journeyData.forEach((st, si) => {
    if (getStationStatus(st) === "locked") return;
    st.verses.forEach((v, vi) => {
      if (state.seenVerses && state.seenVerses[v.id]) {
        pool.push({stationIndex:si, verseIndex:vi});
      }
    });
  });
  if (pool.length === 0) { kidToast(kidLine("needOneVerse"), "error"); return; }
  pool.sort(() => Math.random() - .5);
  playQueue = pool.slice(0, Math.min(5, pool.length));
  playMode = MODE_CHALLENGE; playIndex = 0;
  sessionStats = {correct:0, wrong:0, total:playQueue.length};
  enterPlayScreen("⚡ تحدٍّ سريع");
}

function startFocus(stationIndex, verseIndex) {
  focusTarget = {stationIndex, verseIndex, remaining:3};
  playMode = MODE_FOCUS;
  sessionStats = {correct:0, wrong:0, total:3};
  const st = content.journeyData[stationIndex];
  enterPlayScreen("🎯 تركيز: " + st.title);
}

function startPreview(stationIndex, verseIndex) {
  previewTarget = {stationIndex, verseIndex};
  playMode = MODE_PREVIEW;
  sessionStats = {correct:0, wrong:0, total:1};
  const st = content.journeyData[stationIndex];
  enterPlayScreen("👁 معاينة: " + st.title);
}

function finishFocus() {
  const perfect = sessionStats.wrong === 0;
  if (perfect) { state.stats.perfectSessions = (state.stats.perfectSessions||0) + 1; saveState(); checkAchievements(); }
  document.getElementById("summaryIcon").innerText = perfect ? "✨" : "💪";
  document.getElementById("summaryTitle").innerText = "أتممت التركيز!";
  document.getElementById("summaryScore").innerText = `${sessionStats.correct} / 3`;
  document.getElementById("summaryMessage").innerText = perfect ? "أداء مثالي!" : "تدرّب مرة أخرى.";
  document.getElementById("summaryPopup").classList.add("active");
  if (perfect) launchConfetti();
  focusTarget = null;
}

function finishSession() {
  const total = sessionStats.total, correct = sessionStats.correct;
  const perfect = correct === total;
  const icon = perfect ? "🏆" : correct >= total/2 ? "👍" : "💪";
  const title = playMode === MODE_REVIEW ? "انتهت المراجعة" : "انتهى التحدي";
  const msg = perfect ? "أداء مثالي!" : correct >= total/2 ? "أداء جيد." : "التكرار يعلّم!";
  document.getElementById("summaryIcon").innerText = icon;
  document.getElementById("summaryTitle").innerText = title;
  document.getElementById("summaryScore").innerText = `${correct} / ${total}`;
  document.getElementById("summaryMessage").innerText = msg;
  document.getElementById("summaryPopup").classList.add("active");
  if (perfect) state.stats.perfectSessions = (state.stats.perfectSessions||0) + 1;
  if (playMode === MODE_REVIEW) state.stats.reviewSessions = (state.stats.reviewSessions||0) + 1;
  if (playMode === MODE_CHALLENGE) state.stats.challengeSessions = (state.stats.challengeSessions||0) + 1;
  saveState(); checkAchievements();
  if (perfect) launchConfetti();
}

function closeSummary() {
  closePopup("summaryPopup");
  playMode = MODE_NORMAL; playQueue = []; playIndex = 0;
  focusTarget = null; previewTarget = null;
  showMap();
}

/* تلميح: يُظهر الكلمة التالية الصحيحة، وتخصم نصف نقاط البيت */
let hintUsedThisVerse = false;
let verseFlawed = false, wrongAtPos = 0;
function giveHint() {
  const cur = getCurrentVerse(); if (!cur) return;
  const next = cur.verse.correctOrder[selectedWords.length];
  if (next === undefined) return;
  const btn = [...document.querySelectorAll("#wordsBank .word-btn")]
    .find(b => !b.classList.contains("selected") && b.textContent === next);
  if (!btn) return;
  btn.classList.add("hint");
  hintUsedThisVerse = true;
  setTimeout(() => btn.classList.remove("hint"), 2500);
}
/* تراجع: يلغي آخر كلمة اختارها الطفل */
function undoWord() {
  if (selectedWords.length === 0) return;
  const dz = document.getElementById("dropZone");
  if (dz.classList.contains("success") || dz.classList.contains("fail")) return;
  const last = selectedWords.pop();
  if (dz.lastChild) dz.removeChild(dz.lastChild);
  const btn = [...document.querySelectorAll("#wordsBank .word-btn")]
    .reverse().find(b => b.classList.contains("selected") && b.textContent === last);
  if (btn) btn.classList.remove("selected");
}

/* نمط «أكمل الكلمة»: يُولَّد تلقائياً من البيت، والمشتّتات من أبيات أخرى */
let activeVariant = null;
function makeMissingVariant(verse) {
  const words = verse.words, cand = words.map((w, i) => i).filter(i => normalizeArabic(words[i]).length >= 3);
  if (!cand.length) return null;
  const i = cand[Math.floor(Math.random() * cand.length)], correct = words[i];
  const pool = [];
  content.journeyData.forEach(st => st.verses.forEach(v => { if (v.id !== verse.id) v.words.forEach(w => {
    if (normalizeArabic(w).length >= 3 && normalizeArabic(w) !== normalizeArabic(correct) && !pool.includes(w)) pool.push(w); }); }));
  const distract = pool.sort(() => Math.random() - .5).slice(0, 3);
  if (distract.length < 2) return null;
  return Object.assign({}, verse, {type: "missing_choice", textPart1: words.slice(0, i).join(" "),
    textPart2: words.slice(i + 1).join(" "), correctWord: correct, options: [correct, ...distract]});
}

/* ---------- شريط البيت: استمع / سجّل / صوتي ---------- */
function barVerse() { const c = getCurrentVerse(); return c ? c.verse : null; }
function listenVerse() {
  const v = barVerse(); if (!v || recIsActive()) return;
  if (typeof playVerseAndStory === "function") playVerseAndStory(v, false); else speak(v.fullVerse);
}
async function recordVerse() {
  const v = barVerse(); if (!v) return;
  if (recIsActive()) { recStop(); return; }
  audioStopAll();
  if (typeof guideHidePanel === "function") guideHidePanel();
  await recToggle(v.id, () => { updateRecBar(); if (typeof flushHeldVoice === "function") flushHeldVoice(); });
  updateRecBar();
}
function playMyVerse() { const v = barVerse(); if (v && !recIsActive()) recPlay(v.id); }
/* حالة الأزرار: أثناء التسجيل «أوقف» أحمر نابض و«استمع» معطّل؛ «صوتي» يظهر إن وُجد تسجيل */
async function updateRecBar() {
  const rb = document.getElementById("recordBtn"), lb = document.getElementById("listenBtn"), mb = document.getElementById("mineBtn");
  if (!rb) return;
  const on = recIsActive();
  rb.textContent = on ? "⏹ أوقف" : "🎤 سجّل";
  rb.classList.toggle("recording", on);
  if (lb) lb.disabled = on;
  if (mb) {
    mb.disabled = on;
    const v = barVerse();
    let has = false;
    try { has = !!(v && await recGet(recKey(v.id))); } catch (e) {}
    mb.style.display = has ? "" : "none";
  }
}
