/* الإنجازات + التقييم */
const ACHIEVEMENTS = [
  {id:"first_step", icon:"👣", name:"أول خطوة", desc:"أكمل أول محطة", check:s=>Object.values(s.stationStatus||{}).filter(v=>v==="completed").length>=1},
  {id:"scholar", icon:"📚", name:"طالب علم", desc:"أكمل 5 محطات", check:s=>Object.values(s.stationStatus||{}).filter(v=>v==="completed").length>=5},
  {id:"graduate", icon:"🎓", name:"حافظ القسم", desc:"أكمل كل المحطات", check:s=>content.journeyData.length>0 && content.journeyData.every(st=>s.stationStatus[st.id]==="completed")},
  {id:"streak3", icon:"🔥", name:"مثابر", desc:"3 أيام متتالية", check:s=>(s.streak||0)>=3},
  {id:"streak7", icon:"⚡", name:"نجم الأسبوع", desc:"7 أيام متتالية", check:s=>(s.streak||0)>=7},
  {id:"points100", icon:"💯", name:"مئة نقطة", desc:"اجمع 100 نقطة", check:s=>(s.points||0)>=100},
  {id:"points500", icon:"🌟", name:"خمسمئة نقطة", desc:"اجمع 500 نقطة", check:s=>(s.points||0)>=500},
  {id:"perfect", icon:"✨", name:"بلا أخطاء", desc:"جلسة كاملة دون خطأ", check:s=>(s.stats?.perfectSessions||0)>=1},
  {id:"reviewer", icon:"🧠", name:"مراجع مجتهد", desc:"5 جلسات مراجعة", check:s=>(s.stats?.reviewSessions||0)>=5},
  {id:"time30", icon:"⏱️", name:"مثابر الوقت", desc:"30 دقيقة تدريب", check:s=>(s.totalTimeSeconds||0)>=1800},
  {id:"sharer", icon:"📸", name:"سفير", desc:"شارك نتيجتك", check:s=>(s.stats?.shared||0)>=1}
];

function checkAchievements() {
  ACHIEVEMENTS.forEach(a => {
    if (state.achievements[a.id]) return;
    try {
      if (a.check(state)) {
        state.achievements[a.id] = {unlockedAt: Date.now()};
        saveState();
        setTimeout(() => showNewAchievement(a), 400);
      }
    } catch(e) {}
  });
}
/* v104: نافذة الوسام لا تغطي البيت أو السؤال وهو يُقرأ: تنتظر حتى يعود الطفل إلى الخريطة */
let achQueue = [];
function achBusy() {
  const gs = document.getElementById("gameScreen");
  const inLesson = gs && gs.style.display !== "none" && getComputedStyle(gs).display !== "none";
  const quiz = document.getElementById("quizPopup");
  return inLesson || (quiz && quiz.classList.contains("active"));
}
function flushAchievements() {
  if (!achQueue.length || achBusy() || document.getElementById("newAchievementPopup").classList.contains("active")) return;
  showNewAchievementNow(achQueue.shift());
}
function showNewAchievement(a) {
  if (achBusy()) { if (!achQueue.some(x => x.id === a.id)) achQueue.push(a); return; }
  showNewAchievementNow(a);
}
function showNewAchievementNow(a) {
  const ph = rewardPhoto();
  document.getElementById("newAchIcon").innerHTML = ph
    ? `<img class="reward-photo" src="${ph}" alt=""><div class="ach-mini">${escapeHtml(a.icon)}</div>`
    : escapeHtml(a.icon);
  document.getElementById("newAchName").textContent = a.name;
  document.getElementById("newAchDesc").textContent = a.desc;
  document.getElementById("newAchievementPopup").classList.add("active");
  playSuccess(); launchConfetti();
  if (typeof autoSay === "function") autoSay([a.name, a.desc]);
}

/* v87: ثلاثة مؤشرات منفصلة بدل درجة واحدة مخلوطة:
   - إتقان الحفظ (percent): صحة ما رآه الطفل من أبيات، من إجاباته الفعلية فقط. متقن = صحيح مرتين فأكثر ولم يُخطأ بعده (1)،
     صحيح مرة ولم يُخطأ بعده (0.4)، وما عدا ذلك (0.1). البيت المرئي دون إجابة لا يُحتسب.
   - التقدم: نسبة الأبيات التي مرّ بها الطفل من المنظومة.
   - الالتزام: أيام التتابع وعدد جلسات الإتقان والمراجعة والتحدي.
   الإنجازات والنقاط والمكافآت لا تدخل في إتقان الحفظ. */
/* v104: تعريف واحد لـ«بيت متقن» تقرأ منه كل التقارير (كان مكرراً في أربعة مواضع، وبعضها يعدّ أبياتاً لم يرها الطفل):
   بيت رآه الطفل في درسه، وأجاب عنه صحيحاً في يومين مختلفين على الأقل، ولم يخطئ بعد آخر صحيح */
function verseMastered(vid, userState) {
  const st = userState || state;
  if (!st || !st.seenVerses || !st.seenVerses[vid]) return false;
  const s = (st.verseStats || {})[vid];
  return !!s && s.correct >= 2 && (s.lastCorrect || 0) >= (s.lastWrong || 0);
}
function masteredCount(userState, verses) {
  const list = verses || content.journeyData.flatMap(x => x.verses);
  return list.filter(v => verseMastered(v.id, userState)).length;
}
/* v105: مستويان صريحان في التقارير:
   «يرتّبه» = verseMastered (من تمرين الترتيب، والكلمات أمامه)،
   «يحفظه غيباً (مؤكَّد)» = سمّعه الوالد بلا فتح ولم يخطئ فيه بعد ذلك، أو بلغ الصندوقين 6 و7 (لا يدخلهما إلا بتسميع الوالد) */
function verseConfirmed(vid, userState) {
  const st = userState || state;
  if (!st || !st.seenVerses || !st.seenVerses[vid]) return false;
  const e = (st.leitner || {})[vid];
  const pc = (st.parentChecks || {})[vid];
  const lastWrong = ((st.verseStats || {})[vid] || {}).lastWrong || 0;
  if (pc && pc.r === "ok" && lastWrong <= (+pc.at || 0)) return true;
  return !!e && e.box >= 6;   // أي خطأ بعده يعيده إلى الصندوق الأول
}
function confirmedCount(userState, verses) {
  const list = verses || content.journeyData.flatMap(x => x.verses);
  return list.filter(v => verseConfirmed(v.id, userState)).length;
}
function calculateMastery(userState) {
  const totalVerses = content.journeyData.reduce((s, st) => s + st.verses.length, 0);
  const empty = { percent: 0, level: "مبتدئ", stars: 0, progress: 0, commitment: 0, mastered: 0, seen: 0,
    details: { memory: 0, progress: 0, commitment: 0, achievements: 0 } };
  if (totalVerses === 0) return empty;
  const vs = userState.verseStats || {};
  const seenIds = Object.keys(userState.seenVerses || {});
  let score = 0, mastered = 0;
  seenIds.forEach(id => {
    const s = vs[id];
    if (!s || !(s.correct >= 1)) { if (s) score += 0.1; return; }
    const stillGood = (s.lastCorrect || 0) >= (s.lastWrong || 0);
    if (stillGood && s.correct >= 2) { score += 1; mastered++; }
    else if (stillGood) score += 0.4;
    else score += 0.1;
  });
  const memory = seenIds.length ? Math.round(100 * score / seenIds.length) : 0;
  const progress = Math.min(100, Math.round(100 * seenIds.length / totalVerses));
  const st = userState.stats || {};
  const sessions = (st.perfectSessions || 0) + (st.reviewSessions || 0) + (st.challengeSessions || 0);
  const commitment = Math.min(100, Math.round((userState.streak || 0) * 8 + Math.min(20, sessions * 2)));
  const achievements = Object.keys(userState.achievements || {}).length;

  let level, stars;
  if (!seenIds.length) { level = "مبتدئ"; stars = 0; }
  else if (memory >= 90) { level = "حافظ متقن"; stars = 5; }
  else if (memory >= 75) { level = "متقدم"; stars = 4; }
  else if (memory >= 55) { level = "متوسط"; stars = 3; }
  else if (memory >= 30) { level = "مبتدئ متحسن"; stars = 2; }
  else { level = "مبتدئ"; stars = 1; }

  // v105: «يحفظه غيباً (مؤكَّد)» بتسميع الوالد، إلى جانب «يرتّبه» (mastered)
  let confirmed = 0; try { confirmed = confirmedCount(userState); } catch (e) {}
  return { percent: memory, level, stars, progress, commitment, mastered, confirmed, seen: seenIds.length,
    details: { memory, progress, commitment, achievements } };
}
