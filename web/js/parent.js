/* شاشة الوالدين + المشاركة */
/* v105: الرقم الرئيسي للوالد: ما يحفظه الطفل غيباً مؤكَّداً بتسميع الوالد، ثم ما يرتّبه، ثم ما رآه */
function renderParentHeadline() {
  const box = document.getElementById("parentHeadline"); if (!box) return;
  const total = content.journeyData.reduce((n, s) => n + s.verses.length, 0);
  const confirmed = typeof confirmedCount === "function" ? confirmedCount(state) : 0;
  const mastered = typeof masteredCount === "function" ? masteredCount(state) : 0;
  const seen = Object.keys(state.seenVerses || {}).length;
  const done = content.journeyData.filter(s => getStationStatus(s) === "completed").length;
  box.innerHTML = `<div class="ph-main">يحفظ غيباً <strong>${confirmed}</strong> من ${total} بيتاً <small>(مؤكَّدة بتسميع الوالد)</small></div>
    <div class="ph-sub">يرتّب كلماته: ${mastered} · رآه في دروسه: ${seen} · محطات مكتملة: ${done} من ${content.journeyData.length}
    ${seen && !confirmed ? "<br>«سمّعه الآن» أدناه هو ما ينقل البيت إلى «يحفظ غيباً»." : ""}</div>`;
  const bi = document.getElementById("backupInfo");
  if (bi) { const t = typeof backupLastInfo === "function" ? backupLastInfo() : 0;
    let when = ""; try { when = t ? new Date(t).toLocaleDateString("ar-EG") : ""; } catch (e) {}
    bi.textContent = t ? `آخر نسخة احتياطية: ${when}` : "لم تُحفظ نسخة احتياطية بعد."; }
}
function updateStats() {
  renderParentHeadline();
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
  document.getElementById("masteryLevel").textContent = mastery.level;
  document.getElementById("masteryPercent").textContent = mastery.percent + "%";
  document.getElementById("masteryBar").style.width = mastery.percent + "%";
  document.getElementById("masteryBreakdown").innerHTML = `
    <div>📚 ${"إتقان الحفظ"}: <strong>${mastery.mastered} ${"متقنة من"} ${mastery.seen} ${"بيتاً مرئياً"}</strong></div>
    <div>🗺️ ${"التقدم في المنظومة"}: <strong>${mastery.progress}%</strong></div>
    <div>🔥 ${"الالتزام"}: <strong>${mastery.commitment}%</strong></div>
    <div>🏆 ${"الإنجازات"} (${"لا تدخل في الإتقان"}): <strong>${mastery.details.achievements}/${ACHIEVEMENTS.length}</strong></div>
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
  renderParentAlerts();
  renderDailyLimitRow();
  renderNewPerDayRow();
  renderPlaySetRow();
  if (typeof renderParentCheckCard === "function") renderParentCheckCard();
  document.getElementById("mainHeader").style.background = "var(--parent-border)";
  document.getElementById("appTitle").innerText = "وضع الأسرة 👨‍👩‍👧";
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
  const started = Object.keys(state.seenVerses || {}).length > 0;
  if (!started) pl.innerHTML = `<p class="empty-state">🌱 ${"لم يبدأ الطفل الحفظ بعد."}</p>`;
  else if (ms.length === 0 && misses.length === 0) pl.innerHTML = `<p class="empty-state">✅ ${"لا توجد أخطاء مسجّلة حتى الآن."}</p>`;
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
      user: {name:getUserName(), avatar:getUserAvatar(), id: activeUserId},
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
/* v104: حدّ اللعب اليومي (يُحفظ لكل طفل) */
function renderDailyLimitRow() {
  const box = document.getElementById("dailyLimitBtns"); if (!box) return;
  const cur = +(state.dailyLimitMin || 0);
  box.innerHTML = [0, 20, 30, 45].map(m => `<button class="word-btn ${m === cur ? "selected-pref" : ""}" onclick="setDailyLimit(${m})">${m ? m + " د" : "بلا حد"}</button>`).join("");
}
function setDailyLimit(m) { state.dailyLimitMin = [0, 20, 30, 45].includes(+m) ? +m : 0; saveState(); renderDailyLimitRow(); }
/* v105: سقف الأبيات الجديدة في اليوم لكل طفل (الافتراضي 3 للكبير و2 للصغير) */
function renderNewPerDayRow() {
  const box = document.getElementById("newPerDayBtns"); if (!box) return;
  const cur = newPerDayOf();
  box.innerHTML = [1, 2, 3, 4, 5].map(n => `<button class="word-btn ${n === cur ? "selected-pref" : ""}" onclick="setNewPerDay(${n})">${n}</button>`).join("");
}
function setNewPerDay(n) { n = +n; state.newPerDay = n >= 1 && n <= 5 ? n : null; saveState(); renderNewPerDayRow(); }
/* v105: أنشطة «العب» وإظهار المراجعة والأدوات كاملتين، لكل طفل */
function renderPlaySetRow() {
  const box = document.getElementById("playSetBtns"), all = document.getElementById("allActBtns");
  if (box) {
    const cur = playSetOf();
    box.innerHTML = Object.keys(PLAY_ACTIVITIES).map(k => { const a = PLAY_ACTIVITIES[k];
      return `<button class="word-btn ${cur.includes(k) ? "selected-pref" : ""}" onclick="togglePlayAct('${k}')">${a.icon} ${escapeHtml(a.name)}</button>`; }).join("");
  }
  if (all) all.innerHTML = `<button class="word-btn ${state.allActivities ? "selected-pref" : ""}" onclick="setAllActivities(true)">نعم</button>
    <button class="word-btn ${state.allActivities ? "" : "selected-pref"}" onclick="setAllActivities(false)">لا</button>`;
}
function togglePlayAct(k) {
  if (!PLAY_ACTIVITIES[k]) return;
  const cur = playSetOf().slice(), i = cur.indexOf(k);
  if (i >= 0) { if (cur.length <= 1) { showToast("يبقى نشاط واحد على الأقل", "error"); return; } cur.splice(i, 1); }
  else { if (cur.length >= 5) { showToast("خمسة أنشطة على الأكثر، حتى تبقى الشاشة بسيطة", "error"); return; } cur.push(k); }
  state.playSet = cur; saveState(); renderPlaySetRow();
}
function setAllActivities(on) { state.allActivities = !!on; saveState(); renderPlaySetRow(); if (typeof applyHomeMode === "function") applyHomeMode(); }

/* v104: تنبيهات تهمّ الوالد في أعلى منطقته: ما جرى على الرقم السري مؤخراً، وتعديلات المحتوى المحفوظة */
function renderParentAlerts() {
  const box = document.getElementById("parentAlerts"); if (!box) return;
  const out = [];
  const recent = (typeof pinLogGet === "function" ? pinLogGet() : []).filter(x => Date.now() - x.at < 14 * 86400000 && ["remove", "waitExpire", "recover", "waitStart", "change"].includes(x.ev));
  if (recent.length) {
    const x = recent[recent.length - 1];
    let when = ""; try { when = new Date(x.at).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" }); } catch (e) {}
    out.push(`<div class="parent-alert">🔐 ${escapeHtml(PIN_LOG_LABELS[x.ev])} — ${escapeHtml(when)}. إن لم يكن ذلك منك فراجع «إدارة الرقم السري».</div>`);
  }
  if (typeof contentPrevInfo === "function") { const c = contentPrevInfo(); if (c) out.push(c); }
  const b = backupReminderHTML(); if (b) out.push(b);
  if (iosNeedsInstall()) out.push(`<div class="parent-alert">${iosInstallHTML((users || []).some(u => Object.keys((u.state && u.state.seenVerses) || {}).length))}</div>`);
  box.innerHTML = out.join("");
  // حزمة الصوت: كانت تنبثق للطفل بعد إنشاء ملفه؛ صارت تنبيهاً هنا للوالد
  if (typeof vpAllAuthorRecs === "function") vpAllAuthorRecs().then(recs => {
    if (recs.length || document.getElementById("packAlert")) return;
    const d = document.createElement("div"); d.className = "parent-alert"; d.id = "packAlert";
    const noVoice = typeof voiceMissingNotice === "function" && voiceMissingNotice();
    d.innerHTML = `🎙️ لا توجد على هذا الجهاز حزمة صوت المعلم. بها تُسمع الأبيات صحيحة؛ وبدونها يقرؤها القارئ الآلي${noVoice ? "، ولا صوت عربي على هذا الجهاز فلن تُسمع أصلاً" : ""}.
      <div class="parent-alert-btns"><button class="tool-btn" onclick="openVoiceImport()">📥 استورد حزمة</button><button class="tool-btn" onclick="requirePin(openParentVoice,'استوديو التسجيل')">🎤 سجّل بنفسك</button></div>`;
    box.appendChild(d);
  }).catch(() => {});
}

/* v105: الآيفون والآيباد: Safari قد يمسح بيانات موقع لم يُفتح أياماً، أما التطبيق المضاف إلى الشاشة الرئيسية فلا.
   ومخزن التطبيق المضاف منفصل عن مخزن Safari، فمن له تقدّم في Safari ينقله بنسخة احتياطية. */
function iosNeedsInstall() {
  try {
    const ua = navigator.userAgent || "";
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (!ios || !/^https?:$/.test(location.protocol)) return false;
    return !(navigator.standalone === true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches));
  } catch (e) { return false; }
}
function iosInstallHTML(hasProgress) {
  return `📱 <strong>على الآيفون والآيباد:</strong> أضف التطبيق إلى الشاشة الرئيسية، فإن بقي في Safari قد يُمسح تقدّم الأطفال إن لم يُفتح أياماً.
    الطريقة: زر المشاركة في Safari، ثم «إضافة إلى الشاشة الرئيسية»، ثم افتحه من أيقونته.` +
    (hasProgress ? `<br>للأطفال تقدّم هنا: احفظ نسخة احتياطية أولاً، ثم استعدها داخل التطبيق بعد إضافته، لأن الآيفون يفصل بينهما.` : "");
}

/* v105: تذكير بالنسخة الاحتياطية: كل شيء على هذا الجهاز وحده (النسخ التلقائي في أندرويد معطّل للخصوصية) */
function backupLastInfo() {
  let t = 0; try { t = +localStorage.getItem(STORAGE_LAST_BACKUP) || 0; } catch (e) {}
  return t;
}
function backupReminderHTML() {
  let snooze = 0, recs = 0;
  try { snooze = +localStorage.getItem(STORAGE_BACKUP_SNOOZE) || 0; recs = +localStorage.getItem(STORAGE_RECS_SINCE) || 0; } catch (e) {}
  if (Date.now() < snooze) return "";
  const last = backupLastInfo();
  // أول تذكير بعد تقدّم يستحق الحفظ (عشرة أبيات لأحد الأطفال)، ثم كل أسبوع
  const seenMax = Math.max(0, ...(users || []).map(u => Object.keys((u.state && u.state.seenVerses) || {}).length));
  const progress = seenMax > 0;
  const days = last ? Math.floor((Date.now() - last) / 86400000) : null;
  const needBackup = progress && (days === null ? seenMax >= 10 : days >= 7), needPack = recs >= 20;
  if (!needBackup && !needPack) return "";
  const msgs = [];
  if (needBackup) msgs.push(days === null ? "لم تحفظ نسخة احتياطية من تقدّم الأطفال بعد." : `آخر نسخة احتياطية قبل ${arCount(days, "يوم", "يومين", "أيام", "يوماً")}.`);
  if (needPack) msgs.push(`على هذا الجهاز ${arCount(recs, "تسجيل جديد", "تسجيلان جديدان", "تسجيلات جديدة", "تسجيلاً جديداً")} لم تُصدَّر في حزمة الصوت بعد.`);
  return `<div class="parent-alert" id="backupAlert">💾 ${msgs.join(" ")} كل شيء محفوظ على هذا الجهاز وحده، وضياعه أو مسح بياناته يمحوه.
    <div class="parent-alert-btns">
      ${needBackup ? `<button class="tool-btn" onclick="exportBackup()">💾 احفظ نسخة الآن</button>` : ""}
      ${needPack ? `<button class="tool-btn" onclick="exportVoicePack()">📤 صدّر حزمة الصوت</button>` : ""}
      <button class="tool-btn" onclick="backupSnooze()">لاحقاً</button></div></div>`;
}
function backupSnooze() {
  try { localStorage.setItem(STORAGE_BACKUP_SNOOZE, String(Date.now() + 3 * 86400000)); } catch (e) {}
  renderParentAlerts();
}

function renderAutoReadRow() {
  const on = autoReadOn();
  const a = document.getElementById("autoReadOn"), b = document.getElementById("autoReadOff");
  if (a) a.classList.toggle("selected-pref", on);
  if (b) b.classList.toggle("selected-pref", !on);
  /* v103: تنبيه الوالد إن لم يكن على الجهاز صوت عربي للقراءة الآلية */
  const row = document.getElementById("autoReadRow");
  if (row) {
    let n = document.getElementById("voiceMissing");
    const msg = typeof voiceMissingNotice === "function" ? voiceMissingNotice() : "";
    if (!n && msg) { n = document.createElement("div"); n.id = "voiceMissing"; n.className = "voice-missing"; row.insertAdjacentElement("afterend", n); }
    if (n) { n.textContent = msg; n.style.display = msg ? "" : "none"; }
  }
}
