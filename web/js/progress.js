/* النقاط والسلسلة والزمن + الأخطاء SRS */
function addPoints(n) {
  state.points = (state.points || 0) + n;
  updatePointsDisplay(); saveState(); checkAchievements();
}
function updatePointsDisplay() {
  document.getElementById("pointsBadge").textContent = "⭐ " + (state.points || 0);
  const sb = document.getElementById("streakBadge");
  if (state.streak > 1) { sb.style.display = "inline-block"; sb.textContent = "🔥 " + state.streak; }
  else sb.style.display = "none";
}
function todayISO() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}
function daysBetween(a, b) {
  return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / (1000*60*60*24));
}
function updateStreak() {
  const t = todayISO();
  if (state.lastPracticeDate === t) return;
  if (!state.lastPracticeDate) state.streak = 1;
  else {
    const d = daysBetween(state.lastPracticeDate, t);
    if (d === 1) state.streak = (state.streak||0) + 1;
    else if (d > 1) state.streak = 1;
  }
  state.lastPracticeDate = t;
  updatePointsDisplay(); saveState(); checkAchievements();
}
let sessionStartTime = null;
function startTimeTracking() { if (!sessionStartTime) sessionStartTime = Date.now(); }
function stopTimeTracking() {
  if (sessionStartTime) {
    const s = Math.floor((Date.now() - sessionStartTime)/1000);
    state.totalTimeSeconds = (state.totalTimeSeconds||0) + s;
    sessionStartTime = null;
    saveState(); checkAchievements();
  }
}

function mistakeKey(vid, w) { return vid + "::" + w; }
function buildContext(v, w) {
  if (v.type === "missing_choice") return (v.textPart1||"") + " " + w + " " + (v.textPart2||"");
  return v.fullVerse || "";
}
function addMistake(v, w, sid) {
  const key = mistakeKey(v.id, w);
  const ex = state.mistakes[key];
  if (ex) { ex.level = Math.max(0, ex.level - 1); ex.lastAttempt = Date.now(); }
  else {
    state.mistakes[key] = {word:w, verseId:v.id, stationId:sid, context:buildContext(v,w),
      level:0, addedAt:Date.now(), lastAttempt:Date.now()};
  }
  saveState();
}
function recordCorrectAttempt(vid, w) {
  const key = mistakeKey(vid, w);
  const m = state.mistakes[key]; if (!m) return;
  m.level += 1; m.lastAttempt = Date.now();
  if (m.level >= 2) delete state.mistakes[key];
  saveState();
}
function getMistakesSorted() {
  return Object.values(state.mistakes).sort((a,b) => {
    if (a.level !== b.level) return a.level - b.level;
    return (a.lastAttempt || 0) - (b.lastAttempt || 0);
  });
}
