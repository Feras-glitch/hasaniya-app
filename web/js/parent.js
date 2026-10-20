/* شاشة الوالدين + المشاركة */
function updateStats() {
  document.getElementById("parentUserName").textContent = getUserAvatar() + " " + getUserName();
  const completed = content.journeyData.filter(s => getStationStatus(s) === "completed").length;
  const mistakes = getMistakesSorted();
  document.getElementById("statCompleted").innerText = completed;
  document.getElementById("statMistakes").innerText = mistakes.length;
  document.getElementById("statPoints").innerText = state.points || 0;
  document.getElementById("statTime").innerText = Math.floor((state.totalTimeSeconds||0)/60) + "د";
  document.getElementById("statAccuracy").innerText = Math.round(completed/Math.max(1,content.journeyData.length)*100) + "%";
  document.getElementById("statAchievements").innerText = Object.keys(state.achievements).length + "/" + ACHIEVEMENTS.length;

  const mastery = calculateMastery(state);
  document.getElementById("masteryStars").textContent = "⭐".repeat(mastery.stars);
  document.getElementById("masteryLevel").textContent = tParent(mastery.level);
  document.getElementById("masteryPercent").textContent = mastery.percent + "%";
  document.getElementById("masteryBar").style.width = mastery.percent + "%";
  document.getElementById("masteryBreakdown").innerHTML = `
    <div>📚 ${tParent("إتقان الحفظ")}: <strong>${mastery.mastered} ${tParent("متقنة من")} ${mastery.seen} ${tParent("بيتاً مرئياً")}</strong></div>
    <div>🗺️ ${tParent("التقدم في المنظومة")}: <strong>${mastery.progress}%</strong></div>
    <div>🔥 ${tParent("الالتزام")}: <strong>${mastery.commitment}%</strong></div>
    <div>🏆 ${tParent("الإنجازات")} (${tParent("لا تدخل في الإتقان")}): <strong>${mastery.details.achievements}/${ACHIEVEMENTS.length}</strong></div>
  `;
}
/* دليل أول زيارة للوالد: يظهر مرة واحدة على هذا الجهاز ثم يُخفى */
function maybeParentIntro() {
  const box = document.getElementById("parentIntro");
  if (!box) return;
  let seen = false;
  try { seen = !!getPrefs().parentIntroSeen; } catch(e) {}
  box.style.display = seen ? "none" : "block";
}
function dismissParentIntro() {
  try {
    const p = getPrefs(); p.parentIntroSeen = true;
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch(e) {}
  const box = document.getElementById("parentIntro");
  if (box) box.style.display = "none";
}
function showParentScreen() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  if (typeof audioStopAll === "function") audioStopAll();
  stopMediaStream(); stopTimeTracking();
  document.getElementById("mapScreen").style.display = "none";
  document.getElementById("gameScreen").style.display = "none";
  document.getElementById("parentScreen").style.display = "block";
  renderAutoReadRow();
  document.getElementById("mainHeader").style.background = "var(--parent-border)";
  document.getElementById("appTitle").innerText = tParent("وضع الأسرة 👨‍👩‍👧");
  document.getElementById("backToMapBtn").style.display = "inline-block";
  document.getElementById("eventBadge").classList.add("hidden");
  document.getElementById("progressBars").style.display = "none";
  updateStats();
  maybeParentIntro();
  renderFamilyBoard();
  const pl = document.getElementById("parentMistakesList");
  const ms = getMistakesSorted();
  const misses = Object.entries(state.eventMisses || {}).filter(([, n]) => n > 0);
  const missHtml = misses.map(([vid, n]) => {
    const v = content.journeyData.flatMap(st => st.verses).find(x => x.id === vid);
    return `<div class="parent-mistake-item">
      <strong style="color:var(--danger)">سؤال الحدث: ${escapeHtml(v ? v.event : vid)}</strong>
      <div style="font-size:.86rem;color:#666;margin-top:6px">البيت: ${escapeHtml(v ? v.fullVerse : "")}</div>
      <div style="font-size:.75rem;color:#999;margin-top:4px">أخطأ ${n} ${n === 1 ? "مرة" : "مرات"}</div>
    </div>`;
  }).join("");
  if (ms.length === 0 && misses.length === 0) pl.innerHTML = `<p class="empty-state">✅ ${tParent("الطفل متقن للحفظ.")}</p>`;
  else pl.innerHTML = ms.map(m => `
    <div class="parent-mistake-item">
      <strong style="color:var(--danger)">${escapeHtml(m.word)}</strong>
      <div style="font-size:.86rem;color:#666;margin-top:6px">السياق: ${escapeHtml(m.context)}</div>
      <div style="font-size:.75rem;color:#999;margin-top:4px">المستوى: ${m.level}/2</div>
    </div>`).join("") + missHtml;
}
function exportReport() {
  try {
    const mastery = calculateMastery(state);
    const report = {
      exportedAt: new Date().toISOString(),
      user: {name:getUserName(), avatar:getUserAvatar()},
      mastery,
      points: state.points || 0,
      streak: state.streak || 0,
      totalTimeMinutes: Math.floor((state.totalTimeSeconds||0)/60),
      completedStations: content.journeyData.filter(s => getStationStatus(s) === "completed").length,
      totalStations: content.journeyData.length,
      achievements: Object.keys(state.achievements),
      stats: state.stats,
      mistakes: getMistakesSorted()
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hasaniya_report_" + getUserName().replace(/\s+/g,"_") + "_" + Date.now() + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("تم التصدير", "success");
  } catch(e) { showToast("تعذّر التصدير", "error"); }
}

/* ============================================================
   19. مشاركة النتيجة
   ============================================================ */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}
function shareResult() {
  const cv = document.getElementById("shareCanvas");
  const ctx = cv.getContext("2d");
  const W = cv.width, H = cv.height;
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,"#d81b60"); g.addColorStop(1,"#ad1457");
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle = "rgba(255,255,255,.4)"; ctx.lineWidth = 4;
  ctx.strokeRect(20,20,W-40,H-40);
  ctx.fillStyle = "#fff"; ctx.textAlign = "center";
  ctx.font = "bold 34px 'Segoe UI',Tahoma";
  ctx.fillText("المنظومة الحسنية", W/2, 90);
  ctx.font = "bold 22px 'Segoe UI',Tahoma";
  ctx.fillStyle = "#ffd54f";
  ctx.fillText("في السيرة النبوية", W/2, 130);
  ctx.font = "60px 'Segoe UI',Tahoma";
  ctx.fillText(getUserAvatar(), W/2, 200);
  drawSharePhoto(ctx, W/2, 172);
  ctx.fillStyle = "#fff"; ctx.font = "bold 24px 'Segoe UI',Tahoma";
  ctx.fillText(getUserName(), W/2, 235);

  ctx.fillStyle = "rgba(255,255,255,.95)";
  const cardX = 60, cardY = 270, cardW = W-120, cardH = H-400;
  roundRect(ctx, cardX, cardY, cardW, cardH, 24); ctx.fill();

  const mastery = calculateMastery(state);
  const stats = [
    ["⭐ النقاط", state.points || 0],
    ["🔥 السلسلة", (state.streak||0) + " أيام"],
    ["📚 محطات مكتملة", content.journeyData.filter(s => getStationStatus(s) === "completed").length + " / " + content.journeyData.length],
    ["🏆 إنجازات", Object.keys(state.achievements).length + " / " + ACHIEVEMENTS.length],
    ["🎯 مستوى الإتقان", mastery.percent + "%"]
  ];
  ctx.font = "bold 24px 'Segoe UI',Tahoma";
  stats.forEach((s, i) => {
    const y = cardY + 80 + i*70;
    ctx.fillStyle = "#666"; ctx.textAlign = "right";
    ctx.fillText(s[0], W-100, y);
    ctx.fillStyle = "#d81b60"; ctx.textAlign = "left";
    ctx.fillText(String(s[1]), 100, y);
  });

  const pct = (content.journeyData.filter(s => getStationStatus(s) === "completed").length/Math.max(1,content.journeyData.length))*100;
  const barX = 100, barY = cardY + cardH - 60, barW = W-200, barH = 20;
  ctx.fillStyle = "#eee"; roundRect(ctx, barX, barY, barW, barH, 10); ctx.fill();
  ctx.fillStyle = "#4caf50";
  roundRect(ctx, barX, barY, barW*(pct/100), barH, 10); ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,.9)";
  ctx.font = "bold 18px 'Segoe UI',Tahoma"; ctx.textAlign = "center";
  ctx.fillText("📅 " + new Date().toLocaleDateString("ar-EG"), W/2, H-60);

  document.getElementById("sharePopup").classList.add("active");
}
function downloadShare() {
  try {
    const cv = document.getElementById("shareCanvas");
    const a = document.createElement("a");
    a.href = cv.toDataURL("image/png");
    a.download = "hasaniya_result_" + Date.now() + ".png"; a.click();
    state.stats.shared = (state.stats.shared||0) + 1;
    saveState(); checkAchievements();
    showToast("تم التنزيل", "success");
  } catch(e) { showToast("تعذّر التنزيل", "error"); }
}
async function nativeShare() {
  try {
    const cv = document.getElementById("shareCanvas");
    const blob = await new Promise(r => cv.toBlob(r, "image/png"));
    const file = new File([blob], "result.png", {type:"image/png"});
    if (navigator.canShare && navigator.canShare({files:[file]})) {
      await navigator.share({files:[file], title:"نتيجتي في المنظومة الحسنية"});
      state.stats.shared = (state.stats.shared||0) + 1; saveState(); checkAchievements();
    } else {
      showToast("المشاركة غير مدعومة، استخدم التنزيل", "error");
    }
  } catch(e) { console.warn(e); }
}


/* ---------- متابعة الوالد: ثلاث علامات لكل بيت (سمعه، قرأه، فهمه) ---------- */
function openParentFollow() {
  const sel = document.getElementById("fwStation");
  sel.innerHTML = content.journeyData.map((st, i) => `<option value="${i}">${escapeHtml(st.title)}</option>`).join("");
  sel.value = String(state.selectedStation || 0);
  document.getElementById("followPopup").classList.add("active");
  renderFollow();
}
function renderFollow() {
  const st = content.journeyData[+document.getElementById("fwStation").value];
  if (!st) return;
  const f = state.follow || {};
  const marks = [["h", "سمعه"], ["r", "قرأه"], ["u", "فهمه"]];
  document.getElementById("fwBody").innerHTML = st.verses.map((v, j) => {
    const m = f[v.id] || {};
    const boxes = marks.map(([k, l]) =>
      `<label style="margin-inline-end:12px"><input type="checkbox" ${m[k] ? "checked" : ""} onchange="setFollow('${v.id}','${k}',this.checked)"> ${l}</label>`).join("");
    return `<div class="rec-row"><div class="rec-text">${j + 1}. ${escapeHtml(v.fullVerse)}</div><div class="rec-actions">${boxes}</div></div>`;
  }).join("");
}
function setFollow(id, k, val) {
  state.follow = state.follow || {};
  const m = state.follow[id] || (state.follow[id] = {});
  m[k] = !!val;
  saveState();
}

/* القراءة التلقائية للطفل: قرار الوالد (v100) */
function setAutoRead(on) {
  const p = getPrefs(); p.autoRead = !!on; p.guideVoice = !!on;
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch (e) {}
  renderAutoReadRow();
  showToast(on ? "القراءة التلقائية مفعّلة" : "القراءة التلقائية متوقفة", "success");
}
function renderAutoReadRow() {
  const on = autoReadOn();
  const a = document.getElementById("autoReadOn"), b = document.getElementById("autoReadOff");
  if (a) a.classList.toggle("selected-pref", on);
  if (b) b.classList.toggle("selected-pref", !on);
}
