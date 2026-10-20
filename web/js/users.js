/* المستخدمون */
function switchUser(id) {
  if (id === activeUserId) { closePopup("usersPopup"); return; }
  const u = getUserById(id);
  if (!u) return;
  // وقت الجلسة يُحسب للطفل السابق قبل التبديل، لا للطفل الجديد
  if (typeof stopTimeTracking === "function") stopTimeTracking();
  saveState();
  activeUserId = id;
  state = u.state;
  saveState();
  closePopup("usersPopup");
  playMode = MODE_NORMAL; playQueue = []; playIndex = 0; focusTarget = null; previewTarget = null;
  updateUserChip();
  updatePointsDisplay();
  showMap();
  showToast("مرحباً " + u.name + " " + u.avatar, "success");
}

function updateUserChip() {
  document.getElementById("userAvatar").innerHTML = avatarHTML(getCurrentUser(), "chip-photo");
  document.getElementById("userName").textContent = getUserName();
  applyKidMode();
}
/* v102: وضع الطفل الصغير (لمن لا يقرأ): أزرار أكبر وأقل، والألغاز بالاختيار. يفعّله الوالد لكل طفل بالرقم السري */
function isSmallKid() { const u = getCurrentUser(); return !!(u && u.small); }
function applyKidMode() { document.body.classList.toggle("small-kid", isSmallKid()); }

function showUsersModal() {
  const list = document.getElementById("usersList");
  if (!users || users.length === 0) {
    list.innerHTML = `<p class="empty-state">لا يوجد مستخدمون.</p>`;
  } else {
    list.innerHTML = users.map(u => {
      const isCurrent = u.id === activeUserId;
      const pts = u.state?.points || 0;
      const completed = Object.values(u.state?.stationStatus || {}).filter(v => v === "completed").length;
      return `
        <div class="user-card ${isCurrent ? 'current' : ''}">
          <div class="u-avatar">${escapeHtml(u.avatar)}</div>
          <div class="u-info">
            <strong>${escapeHtml(u.name)} ${isCurrent ? '<span style="color:var(--success);font-size:.8rem">(نشط)</span>' : ''}</strong>
            <small>⭐ ${pts} نقطة · ✅ ${completed} محطة</small>
          </div>
          <div class="u-actions">
            ${isCurrent ? '' : `<button class="mini-btn edit" onclick="switchUser('${escapeForAttr(u.id)}')">استخدام</button>`}
            <button class="mini-btn train" onclick="openUserEditor('${escapeForAttr(u.id)}')">✎</button>
            ${users.length > 1 ? `<button class="mini-btn delete" onclick="deleteUser('${escapeForAttr(u.id)}')">🗑</button>` : ''}
          </div>
        </div>`;
    }).join("");
  }
  document.getElementById("usersPopup").classList.add("active");
}

let editingUserId = null, editOnboarding = false;
/* opts.onboarding: أول تشغيل للطفل، يُطلب فيه الاسم والجنس قبل البدء */
function openUserEditor(id, opts = {}) {
  editingUserId = id;
  editOnboarding = !!opts.onboarding;
  const u = id ? getUserById(id) : null;
  document.getElementById("userEditId").value = id || "";
  document.getElementById("userEditorTitle").textContent = editOnboarding ? "👋 أهلاً! لنبدأ" : (u ? "✏️ تعديل بيانات الطفل" : "➕ إضافة طفل جديد");
  document.getElementById("userNameInput").value = u && !editOnboarding ? u.name : "";
  editGender = u && !editOnboarding ? (u.gender || null) : null;
  editPhoto = u && !editOnboarding ? (u.photo || null) : null;
  editShowPhoto = u && !editOnboarding ? (u.showPhoto !== false) : true;
  editSmall = !!(u && !editOnboarding && u.small);
  renderEditorExtras();
  const grid = document.getElementById("avatarGrid");
  const currentAvatar = u ? u.avatar : AVATARS[0];
  grid.innerHTML = AVATARS.map(a =>
    `<button class="avatar-option ${a === currentAvatar ? 'selected' : ''}" data-avatar="${escapeForAttr(a)}" onclick="selectAvatar(this)">${a}</button>`
  ).join("");
  document.getElementById("userEditorPopup").classList.add("active");
}

function selectAvatar(btn) {
  document.querySelectorAll(".avatar-option").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
}

function saveUserEditor() {
  const raw = document.getElementById("userNameInput").value;
  const name = raw.trim().replace(/\s+/g, " ").slice(0, 20);
  const selected = document.querySelector(".avatar-option.selected");
  const avatar = selected ? selected.dataset.avatar : AVATARS[0];
  if (!name) { showToast("أدخل الاسم", "error"); return; }
  if (!editGender) { showToast("اختر ولداً أو بنتاً، ليتناسب الخطاب مع الطفل", "error"); return; }
  const wasOnboarding = editOnboarding;
  editOnboarding = false;

  if (editingUserId) {
    const u = getUserById(editingUserId);
    if (u) { u.name = name; u.avatar = avatar; u.gender = editGender; u.photo = editPhoto; u.showPhoto = editShowPhoto; u.small = editSmall; }
  } else {
    const u = createNewUser(name, avatar);
    u.gender = editGender; u.photo = editPhoto; u.showPhoto = editShowPhoto; u.small = editSmall;
    users.push(u);
    if (users.length === 1) { activeUserId = u.id; state = u.state; }
  }
  saveState();
  closePopup("userEditorPopup");
  updateUserChip();
  showToast("تم الحفظ", "success");
  if (wasOnboarding) { afterOnboarding(); return; }
  showUsersModal();
}

function deleteUser(id) {
  if (users.length <= 1) { showToast("لا يمكن حذف آخر مستخدم", "error"); return; }
  const u = getUserById(id);
  if (!u) return;
  if (!confirm(`حذف ملف "${u.name}" وكل تقدمه؟ لا يمكن التراجع.`)) return;
  users = users.filter(x => x.id !== id);
  if (activeUserId === id) {
    activeUserId = users[0].id;
    state = users[0].state;
    updateUserChip();
    updatePointsDisplay();
    saveState();
    closePopup("usersPopup");
    showMap();
  } else {
    saveState();
    showUsersModal();
  }
  showToast("تم الحذف", "success");
}

/* ---------- الجنس والصورة في نافذة بيانات الطفل ---------- */
let editGender = null, editPhoto = null, editShowPhoto = true, editSmall = false;
function renderEditorExtras() {
  document.getElementById("genderRow").innerHTML = `
    <button class="word-btn ${editGender === "boy" ? "selected" : ""}" onclick="setEditGender('boy')">👦 ولد</button>
    <button class="word-btn ${editGender === "girl" ? "selected" : ""}" onclick="setEditGender('girl')">👧 بنت</button>`;
  document.getElementById("photoRow").innerHTML = editPhoto
    ? `<img class="editor-photo" src="${editPhoto}" alt=""><button class="tool-btn" onclick="removeEditorPhoto()">🗑 إزالة الصورة</button>`
    : `<span style="color:#888">لا توجد صورة</span>`;
  renderShowPhotoRow();
  renderSmallKidRow();
}
function renderSmallKidRow() {
  let row = document.getElementById("smallKidRow");
  const after = document.getElementById("showPhotoRow");
  if (!row && after) { row = document.createElement("div"); row.id = "smallKidRow"; row.className = "small-kid-row"; after.insertAdjacentElement("afterend", row); }
  if (!row) return;
  row.innerHTML = `<span>🧒 وضع الطفل الصغير (لا يقرأ بعد): ${editSmall ? "مفعّل" : "متوقف"}</span>
    <button class="tool-btn" type="button" id="smallKidBtn" onclick="toggleEditSmall()">${editSmall ? "إيقاف" : "تفعيل"} 🔐</button>`;
}
/* التغيير يطلب الرقم السري، ويُحفظ مع بيانات الطفل */
function toggleEditSmall() { requirePin(() => { editSmall = !editSmall; renderSmallKidRow(); }, "وضع الطفل الصغير يضبطه الوالد"); }
function setEditGender(g) { editGender = g; renderEditorExtras(); }
async function pickEditorPhoto(file) {
  if (!file) return;
  try { editPhoto = await readPhotoFile(file); renderEditorExtras(); }
  catch(e) { showToast("تعذّر استخدام هذه الصورة", "error"); }
}
function removeEditorPhoto() { editPhoto = null; renderEditorExtras(); }
function renderShowPhotoRow() {
  document.getElementById("showPhotoRow").innerHTML = editPhoto
    ? `<label style="display:flex;gap:8px;align-items:center;cursor:pointer;margin-top:6px"><input type="checkbox" ${editShowPhoto ? "checked" : ""} onchange="editShowPhoto=this.checked"> عرض صورة الطفل في الشهادات والأوسمة</label>`
    : "";
}
