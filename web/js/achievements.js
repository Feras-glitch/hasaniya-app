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
function showNewAchievement(a) {
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

  return { percent: memory, level, stars, progress, commitment, mastered, seen: seenIds.length,
    details: { memory, progress, commitment, achievements } };
}
