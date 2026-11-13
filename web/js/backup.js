/* v64: نسخة احتياطية لتقدّم الأطفال واستعادتها (ملف JSON على الجهاز، بلا خادم) */
function exportBackup() {
  try {
    const data = {
      app: "hasaniya", format: 1, exportedAt: new Date().toISOString(),
      note: "هذه النسخة لا تشمل التسجيلات الصوتية، لأنها محفوظة في قاعدة منفصلة على الجهاز.",
      users: users.map(u => ({ id: u.id, name: u.name, avatar: u.avatar, gender: u.gender || null, small: !!u.small, photo: u.photo || null, showPhoto: u.showPhoto !== false, parentSig: u.parentSig || null, createdAt: u.createdAt, state: u.state }))
    };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "hasaniya_backup_" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    try { localStorage.setItem(STORAGE_LAST_BACKUP, String(Date.now())); } catch (e) {}
    if (typeof renderParentAlerts === "function") renderParentAlerts();
    showToast("تم تجهيز النسخة الاحتياطية", "success");
  } catch(e) { showToast("تعذّر تجهيز النسخة", "error"); }
}

/* v106 (من الدفعة «ز»): نقل الأسرة إلى جهاز آخر خطوة بخطوة: النسخة الاحتياطية (تقدّم كل الأطفال)،
   وحزمة الصوت (تسجيلاتك)، ثم ما يُفعل على الجهاز الجديد. تسجيلات الأطفال لأبياتهم لا تنتقل. */
async function openDeviceMove() {
  let own = 0;
  try { own = (await vpAllAuthorRecs()).filter(r => !(typeof vpIsBundled === "function" && vpIsBundled(r))).length; } catch (e) {}
  openHub("📦 نقل إلى جهاز آخر", `
    <div class="move-steps">
      <div class="move-h">على هذا الجهاز</div>
      <div class="move-step"><b>1.</b> نسخة احتياطية: تقدّم كل الأطفال وأسماؤهم وصورهم.
        <button class="tool-btn" onclick="exportBackup()">💾 احفظ النسخة</button></div>
      ${own ? `<div class="move-step"><b>2.</b> حزمة الصوت: ${arCount(own, "تسجيل واحد", "تسجيلان", "تسجيلات", "تسجيلاً")} بصوتك للأبيات والقصص والرسائل.
        <button class="tool-btn" onclick="closePopup('hubPopup');requirePin(exportVoicePack,'تصدير حزمة الصوت')">📤 صدّر الحزمة</button></div>` : ""}
      <div class="move-step">ثم أرسل الملفات إلى الجهاز الجديد (بالبريد أو واتساب أو كابل)، واحتفظ بنسخة منها.</div>
      <div class="move-h">على الجهاز الجديد</div>
      <div class="move-step"><b>1.</b> ثبّت التطبيق، ثم «للوالدين» ← «الحذف والاستعادة» ← «📥 استعادة»، واختر ملف النسخة.</div>
      ${own ? `<div class="move-step"><b>2.</b> «👥 المستخدمون» ← «📥 استيراد حزمة الصوت»، واختر ملفات الحزمة.</div>` : ""}
      <div class="move-step"><b>${own ? 3 : 2}.</b> اضبط الرقم السري من جديد، فهو لا ينتقل مع النسخة.</div>
      <div class="move-note">تسجيلات الأطفال لأبياتهم لا تنتقل. ويستطيع الطفل إرسالها إلى معلمه من «🎤 تسجيلاتي» قبل النقل.</div>
    </div>`);
}

function isValidBackup(d) {
  return d && d.app === "hasaniya" && Array.isArray(d.users) && d.users.length > 0 &&
    d.users.every(u => u && typeof u.id === "string" && typeof u.name === "string" && u.state && typeof u.state === "object");
}

function importBackupFile() {
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = ".json,application/json";
  inp.onchange = async () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    let d;
    try { d = JSON.parse(await f.text()); } catch(e) { showToast("الملف ليس نسخة صالحة", "error"); return; }
    if (!isValidBackup(d)) { showToast("الملف ليس نسخة احتياطية من هذا التطبيق", "error"); return; }
    if (!confirm(`استعادة ${d.users.length} طفل من النسخة؟ سيُستبدل التقدم الحالي على هذا الجهاز.`)) return;
    const r = restoreUsersFromList(d.users);
    if (!r.ok) { showToast(r.error, "error"); return; }
    /* استعادة ذرية: نحفظ نسخة من الحالي، فإن تعذّر الحفظ عاد كل شيء كما كان */
    const oldUsers = users, oldActive = activeUserId, oldState = state;
    safetyBackupPush("قبل الاستعادة");
    users = r.users; activeUserId = users[0].id; state = users[0].state;
    if (saveState() === false) {
      users = oldUsers; activeUserId = oldActive; state = oldState; saveState();
      showToast("تعذّرت الاستعادة وبقيت البيانات كما كانت", "error"); return;
    }
    showToast("تمت الاستعادة", "success");
    setTimeout(() => location.reload(), 800);
  };
  inp.click();
}
