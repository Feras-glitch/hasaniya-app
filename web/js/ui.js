/* النوافذ والقوائم */
function closePopup(id) {
  if ((id === "recPopup" || id === "pvPopup") && typeof recStop === "function" && recState && recState.recorder) recStop();
  if (id === "pvPopup" && typeof pvSeq !== "undefined") pvSeq = null;
  document.getElementById(id).classList.remove("active");
  if (id === "hubPopup" && typeof placeHubClosed === "function") placeHubClosed();
  if (id === "rewardPopup") showMap();
}

/* إغلاق النافذة من أي مدخل (الزر ✕، الخلفية، Escape، زر الرجوع في أندرويد) بسياسة واحدة.
   النوافذ التي فيها تقدّم لا تُغلق بالخلفية أو Escape حتى لا يضيع التقدم: الاختبار والمحرر. */
const NO_DISMISS = ["quizPopup", "editorPopup", "userEditorPopup"];
function appDismiss(id) {
  if (NO_DISMISS.includes(id)) return false;
  const el = document.getElementById(id);
  if (!el || !el.classList.contains("active")) return false;
  if (id === "rewardPopup") { closePopup(id); return true; }
  if (id === "pinPopup") { cancelPin(); return true; }
  if (id === "recPopup") { closePopup(id); return true; }
  el.classList.remove("active");
  if (id === "hubPopup" && typeof placeHubClosed === "function") placeHubClosed();
  return true;
}
/* زر الرجوع: يغلق أعلى نافذة مفتوحة، ثم يرجع للخريطة إن كانت شاشة اللعب مفتوحة. يُرجع true إن تم شيء */
function appBack() {
  const open = [...document.querySelectorAll(".modal-overlay.active")];
  for (let i = open.length - 1; i >= 0; i--) {
    if (appDismiss(open[i].id)) return true;
    if (NO_DISMISS.includes(open[i].id)) return true; // نعرض التنبيه ولا نغلق
  }
  const b = document.getElementById("backToMapBtn");
  if (b && getComputedStyle(b).display !== "none") { b.click(); return true; }
  return false;
}

function showInventory() {
  const total = content.journeyData.length;
  const got = content.journeyData.filter(s => isRewardUnlocked(s)).length;
  const ph = rewardPhoto();
  document.getElementById("inventoryTitle").innerHTML = `${ph ? `<img class="board-photo" src="${ph}" alt="">` : ""}🎒 ألبوم الملصقات <small style="font-size:.7em;color:#666">${got} / ${total}</small>`;
  const grid = document.getElementById("inventoryGrid");
  grid.innerHTML = content.journeyData.map(s => {
    const u = isRewardUnlocked(s);
    const st = (typeof STICKERS !== "undefined" && STICKERS[s.id]) || {icon: s.reward.icon, name: s.reward.name};
    return `<div class="inv-item ${u ? '' : 'locked'}">
      <div class="inv-icon">${u ? escapeHtml(st.icon) : "❓"}</div>
      <div class="inv-name">${u ? escapeHtml(st.name) : "مقفل"}</div>
    </div>`;
  }).join("");
  document.getElementById("inventoryPopup").classList.add("active");
}
function showMistakesReview() {
  const list = document.getElementById("mistakesList");
  const ms = getMistakesSorted();
  if (ms.length === 0) list.innerHTML = `<p class="empty-state">🎉 ممتاز! لا أخطاء.</p>`;
  else list.innerHTML = ms.map((m, i) => `
    <div class="mistake-card">
      <div class="mistake-word">${escapeHtml(m.word)}</div>
      <div class="mistake-context">${escapeHtml(m.context)}</div>
      <div class="srs-badge">مستوى: ${m.level} / 2</div>
      <button class="mini-btn train" style="margin-top:8px" onclick="trainMistake(${i})">🎯 تدرّب</button>
    </div>`).join("");
  document.getElementById("reviewPopup").classList.add("active");
}
function trainMistake(i) {
  const m = getMistakesSorted()[i];
  if (!m) return;
  const si = content.journeyData.findIndex(s => s.id === m.stationId);
  if (si === -1) return;
  const vi = content.journeyData[si].verses.findIndex(v => v.id === m.verseId);
  if (vi === -1) return;
  closePopup("reviewPopup");
  startFocus(si, vi);
}
function showAchievements() {
  const grid = document.getElementById("achievementsGrid");
  grid.innerHTML = ACHIEVEMENTS.map(a => {
    const u = !!state.achievements[a.id];
    return `<div class="ach-card ${u?'':'locked'}">
      <div class="ach-icon">${u?a.icon:"🔒"}</div>
      <div class="ach-name">${escapeHtml(a.name)}</div>
      <div class="ach-desc">${escapeHtml(a.desc)}</div>
    </div>`;
  }).join("");
  document.getElementById("achievementsPopup").classList.add("active");
}
