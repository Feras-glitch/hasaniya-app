/* محرر المحتوى */
function openEditor() {
  renderEditorStations();
  refreshStationSelect();
  loadJsonIntoTextarea();
  switchEditorTab("stations");
  document.getElementById("editorPopup").classList.add("active");
}
function switchEditorTab(tab) {
  document.querySelectorAll(".editor-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
  document.querySelectorAll(".editor-panel").forEach(p => p.classList.remove("active"));
  document.getElementById("panel-" + tab).classList.add("active");
  if (tab === "data") loadJsonIntoTextarea();
}
function renderEditorStations() {
  const el = document.getElementById("editorStationsList");
  if (content.journeyData.length === 0) { el.innerHTML = `<p class="empty-state">لا توجد محطات.</p>`; return; }
  el.innerHTML = content.journeyData.map((s, si) => `
    <div class="editor-list-item" style="flex-direction:column;align-items:stretch">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div class="info">
          <strong>${escapeHtml(s.icon)} ${escapeHtml(s.title)}</strong>
          <small>${escapeHtml(s.id)} — ${s.verses.length} بيت</small>
        </div>
        <div style="display:flex;gap:4px">
          <button class="mini-btn edit" onclick="editStation(${si})">تعديل</button>
          <button class="mini-btn delete" onclick="deleteStation(${si})">حذف</button>
        </div>
      </div>
      <div style="margin-top:8px">
        ${s.verses.map((v, vi) => `
          <div style="background:#fff;padding:6px 8px;border-radius:8px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;gap:4px;font-size:.82rem">
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(v.fullVerse)}</span>
            <button class="mini-btn train" onclick="startPreviewFromEditor(${si},${vi})" title="معاينة">👁</button>
            <button class="mini-btn train" onclick="startFocusFromEditor(${si},${vi})" title="تركيز">🎯</button>
            <button class="mini-btn edit" onclick="editVerse(${si},${vi})">✎</button>
            <button class="mini-btn delete" onclick="deleteVerse(${si},${vi})">✕</button>
          </div>`).join("")}
      </div>
    </div>`).join("");
}
function startPreviewFromEditor(si, vi) {
  closePopup("editorPopup");
  startPreview(si, vi);
}
function startFocusFromEditor(si, vi) {
  closePopup("editorPopup");
  startFocus(si, vi);
}
function editStation(si) {
  const s = content.journeyData[si];
  document.getElementById("stEditId").value = si;
  document.getElementById("stId").value = s.id;
  document.getElementById("stIcon").value = s.icon;
  document.getElementById("stTitle").value = s.title;
  document.getElementById("stRewardName").value = s.reward.name;
  document.getElementById("stRewardIcon").value = s.reward.icon;
  switchEditorTab("addStation");
}
function clearStationForm() {
  document.getElementById("stEditId").value = "";
  ["stId","stIcon","stTitle","stRewardName","stRewardIcon"].forEach(id => document.getElementById(id).value = "");
}
function saveStation() {
  const editIdx = document.getElementById("stEditId").value;
  const id = document.getElementById("stId").value.trim();
  const icon = document.getElementById("stIcon").value.trim() || "📖";
  const title = document.getElementById("stTitle").value.trim();
  const rn = document.getElementById("stRewardName").value.trim() || "مكافأة";
  const ri = document.getElementById("stRewardIcon").value.trim() || "🏅";
  if (!id || !title) { showToast("المعرّف والعنوان مطلوبان", "error"); return; }
  const data = {id, title, icon, reward:{name:rn, icon:ri, unlocked:false}, verses:[]};
  if (editIdx === "") {
    if (content.journeyData.find(s => s.id === id)) { showToast("المعرّف مستخدم", "error"); return; }
    content.journeyData.push(data);
    if (content.journeyData.length === 1) state.stationStatus[id] = "current";
  } else {
    const s = content.journeyData[+editIdx];
    data.verses = s.verses;
    data.reward.unlocked = !!state.rewardUnlocked[s.id];
    content.journeyData[+editIdx] = data;
  }
  saveState(); renderEditorStations(); refreshStationSelect(); clearStationForm();
  showToast("تم الحفظ", "success");
}
function deleteStation(si) {
  if (!confirm("حذف هذه المحطة وكل أبياتها؟")) return;
  content.journeyData.splice(si, 1);
  cleanupOrphanedState();
  renderEditorStations(); refreshStationSelect();
  showToast("تم الحذف", "success");
}
function refreshStationSelect() {
  const sel = document.getElementById("vStationSelect");
  sel.innerHTML = content.journeyData.map((s, i) =>
    `<option value="${i}">${escapeHtml(s.icon)} ${escapeHtml(s.title)}</option>`
  ).join("");
}
function onVerseTypeChange() {
  const t = document.getElementById("vType").value;
  document.getElementById("mcFields").style.display = t === "missing_choice" ? "block" : "none";
  document.getElementById("woFields").style.display = t === "word_order" ? "block" : "none";
}
function editVerse(si, vi) {
  const s = content.journeyData[si];
  const v = s.verses[vi];
  document.getElementById("vEditStationId").value = si;
  document.getElementById("vEditVerseId").value = vi;
  document.getElementById("vStationSelect").value = si;
  document.getElementById("vId").value = v.id;
  document.getElementById("vType").value = v.type;
  document.getElementById("vFull").value = v.fullVerse || "";
  document.getElementById("vEvent").value = v.event || "";
  document.getElementById("vMeaning").value = v.meaning || "";
  document.getElementById("vStory").value = v.story || "";
  document.getElementById("vSource").value = v.source || "";
  if (v.type === "missing_choice") {
    document.getElementById("vPart1").value = v.textPart1 || "";
    document.getElementById("vPart2").value = v.textPart2 || "";
    document.getElementById("vCorrect").value = v.correctWord || "";
    document.getElementById("vOptions").value = (v.options||[]).join("، ");
  } else {
    document.getElementById("vWords").value = (v.words||[]).join("، ");
    document.getElementById("vOrder").value = (v.correctOrder||[]).join("، ");
  }
  onVerseTypeChange();
  switchEditorTab("addVerse");
}
function clearVerseForm() {
  ["vEditStationId","vEditVerseId","vId","vFull","vEvent","vMeaning","vStory","vSource","vPart1","vPart2","vCorrect","vOptions","vWords","vOrder"].forEach(id => document.getElementById(id).value = "");
  onVerseTypeChange();
}

/* التحقق من صحة بيت: يعيد نصاً بالخطأ أو "" إن كان سليماً */
function sameWordBag(a, b) {
  if (a.length !== b.length) return false;
  const x = a.slice().sort(), y = b.slice().sort();
  return x.every((w, i) => w === y[i]);
}
function verseProblem(v) {
  if (!v || typeof v !== "object") return "بيت غير صالح";
  if (typeof v.id !== "string" || !v.id.trim()) return "معرّف البيت مفقود";
  if (typeof v.fullVerse !== "string" || !v.fullVerse.trim()) return "نص البيت مفقود (" + v.id + ")";
  const strs = a => Array.isArray(a) && a.length >= 2 && a.every(x => typeof x === "string" && x.trim());
  if (v.type === "missing_choice") {
    if (typeof v.correctWord !== "string" || !v.correctWord) return "الكلمة الصحيحة مفقودة (" + v.id + ")";
    if (!strs(v.options) || !v.options.includes(v.correctWord)) return "الخيارات لا تتضمن الكلمة الصحيحة (" + v.id + ")";
  } else if (v.type === "word_order") {
    if (!strs(v.words) || !strs(v.correctOrder)) return "الكلمات أو الترتيب غير صالحة (" + v.id + ")";
    if (!sameWordBag(v.words, v.correctOrder)) return "ترتيب الكلمات لا يطابق كلمات البيت (" + v.id + ")";
  } else return "نوع البيت غير معروف (" + v.id + ")";
  return "";
}
function journeyProblem(arr) {
  const sids = new Set(), vids = new Set();
  for (const s of arr) {
    if (!s || typeof s.id !== "string" || !s.id.trim() || typeof s.title !== "string" || !s.title.trim()) return "محطة بلا معرّف أو عنوان";
    if (sids.has(s.id)) return "معرّف محطة مكرر: " + s.id;
    sids.add(s.id);
    if (!Array.isArray(s.verses)) return "أبيات المحطة غير صالحة: " + s.id;
    for (const v of s.verses) {
      const pr = verseProblem(v);
      if (pr) return pr;
      if (vids.has(v.id)) return "معرّف بيت مكرر: " + v.id;
      vids.add(v.id);
    }
  }
  return "";
}
function parseList(str) { return str.split(/[،,]/).map(s => s.trim()).filter(s => s); }
function saveVerse() {
  const stIdx = +document.getElementById("vStationSelect").value;
  if (!content.journeyData[stIdx]) { showToast("اختر محطة", "error"); return; }
  const editVid = document.getElementById("vEditVerseId").value;
  const id = document.getElementById("vId").value.trim();
  const type = document.getElementById("vType").value;
  const fullVerse = document.getElementById("vFull").value.trim();
  const event = document.getElementById("vEvent").value.trim() || "حدث";
  const meaning = document.getElementById("vMeaning").value.trim() || "";
  const story = document.getElementById("vStory").value.trim() || "";
  const source = document.getElementById("vSource").value.trim() || "";
  if (!id || !fullVerse) { showToast("المعرّف والبيت مطلوبان", "error"); return; }
  const data = {id, type, fullVerse, event, meaning, story, source};
  if (type === "missing_choice") {
    const p1 = document.getElementById("vPart1").value.trim();
    const p2 = document.getElementById("vPart2").value.trim();
    const cw = document.getElementById("vCorrect").value.trim();
    const opts = parseList(document.getElementById("vOptions").value);
    if (!cw || opts.length < 2) { showToast("أدخل الكلمة الصحيحة وخيارين على الأقل", "error"); return; }
    if (!opts.includes(cw)) opts.unshift(cw);
    data.textPart1 = p1; data.textPart2 = p2; data.correctWord = cw; data.options = opts.slice(0, 4);
  } else {
    const words = parseList(document.getElementById("vWords").value);
    const order = parseList(document.getElementById("vOrder").value);
    if (words.length < 2 || order.length < 2) { showToast("أدخل الكلمات والترتيب", "error"); return; }
    data.words = words; data.correctOrder = order;
  }
  const editSt = document.getElementById("vEditStationId").value;
  if (editVid !== "" && editSt !== "" && +editSt !== stIdx) { showToast("لا يمكن نقل البيت إلى محطة أخرى أثناء التعديل", "error"); return; }
  const bad = verseProblem(data);
  if (bad) { showToast(bad, "error"); return; }
  const dup = content.journeyData.some((s, si) => s.verses.some((v, vi) => v.id === id && !(editVid !== "" && si === stIdx && vi === +editVid)));
  if (dup) { showToast("معرّف البيت مستخدم من قبل", "error"); return; }
  const st = content.journeyData[stIdx];
  if (editVid === "") st.verses.push(data);
  else st.verses[+editVid] = data;
  saveState(); renderEditorStations(); clearVerseForm();
  showToast("تم حفظ البيت", "success");
}
function deleteVerse(si, vi) {
  if (!confirm("حذف هذا البيت؟")) return;
  content.journeyData[si].verses.splice(vi, 1);
  cleanupOrphanedState();
  renderEditorStations();
  showToast("تم الحذف", "success");
}
function loadJsonIntoTextarea() {
  try {
    const clean = content.journeyData.map(s => ({
      id:s.id, title:s.title, icon:s.icon,
      reward:{name:s.reward.name, icon:s.reward.icon, unlocked:false},
      verses:s.verses
    }));
    document.getElementById("jsonText").value = JSON.stringify(clean, null, 2);
  } catch(e) {}
}
function importJson() {
  try {
    const raw = document.getElementById("jsonText").value.trim();
    if (!raw) { showToast("الصق بيانات JSON أولاً", "error"); return; }
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) { showToast("البيانات غير صحيحة", "error"); return; }
    const prob = journeyProblem(arr);
    if (prob) { showToast("لم يُستورد: " + prob, "error"); return; }
    if (!confirm("سيتم استبدال كل المحتوى الحالي (لكل الأطفال). متابعة؟")) return;
    content.journeyData = arr.map(s => ({
      id:s.id, title:s.title, icon:s.icon||"📖",
      reward:{name:(s.reward && s.reward.name)||"مكافأة", icon:(s.reward && s.reward.icon)||"🏅", unlocked:false},
      verses:s.verses || []
    }));
    cleanupOrphanedState();
    renderEditorStations(); refreshStationSelect();
    showToast("تم الاستيراد بنجاح", "success");
  } catch(e) { showToast("JSON غير صالح: " + e.message, "error"); }
}
function downloadJourneyData() {
  try {
    const clean = content.journeyData.map(s => ({
      id:s.id, title:s.title, icon:s.icon,
      reward:{name:s.reward.name, icon:s.reward.icon, unlocked:false},
      verses:s.verses
    }));
    const blob = new Blob([JSON.stringify(clean, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "journeyData_" + Date.now() + ".json"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("تم التنزيل", "success");
  } catch(e) { showToast("تعذّر التنزيل", "error"); }
}
