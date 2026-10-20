/* v65: أسئلة النقاش للمربين، تقرير قابل للطباعة للمعلم، أوسمة جديدة */

/* ---------- أسئلة النقاش ---------- */
function showDiscussion() {
  const rows = content.journeyData.map((st, i) => {
    const qs = (typeof DISCUSSION !== "undefined" && DISCUSSION[st.id]) || [];
    return `<div style="margin-bottom:12px"><strong>${i + 1}. ${escapeHtml(st.icon)} ${escapeHtml(st.title)}</strong>
      <ul style="margin:6px 0 0;padding-right:18px;line-height:1.8">${qs.map(q => `<li>${sayBtnHTML(q, "استمع للسؤال")} ${escapeHtml(q)}</li>`).join("")}</ul></div>`;
  }).join("");
  openHub("💬 أسئلة النقاش", `<p style="color:#666;font-size:.9rem">أسئلة للحوار مع الطفل بعد كل محطة، بلا إجابات جاهزة.</p>${rows}`);
}

/* ---------- تقرير للمعلم (يُفتح للطباعة من المتصفح، ولا يُرسل تلقائياً) ---------- */
function buildTeacherReportHtml() {
  const w = ensureWeekly(state);
  const stationRows = content.journeyData.map((st, i) => {
    const s = getStationStatus(st);
    const label = s === "completed" ? "مكتملة" : s === "current" ? "قيد الحفظ" : "لم تُفتح";
    const date = (state.stampDates || {})[st.id] || "";
    return `<tr><td>${i + 1}</td><td>${escapeHtml(st.icon)} ${escapeHtml(st.title)}</td><td>${label}</td><td>${escapeHtml(date)}</td></tr>`;
  }).join("");
  const mistakes = getMistakesSorted().slice(0, 10).map(m => `<li>${escapeHtml(m.word)}</li>`).join("") || "<li>لا يوجد</li>";
  const reflections = Object.entries(state.reflections || {}).filter(([, t]) => t).map(([sid, t]) => {
    const st = content.journeyData.find(s => s.id === sid);
    return `<li><strong>${escapeHtml(st ? st.title : sid)}:</strong> ${escapeHtml(t)}</li>`;
  }).join("") || "<li>لا توجد تأمّلات مكتوبة</li>";
  const mastered = Object.values(state.verseStats || {}).filter(s => s.correct >= 2 && s.lastCorrect >= (s.lastWrong || 0)).length;
  const badges = Object.keys(state.customBadges || {}).map(id => (CUSTOM_BADGES[id] || {}).name).filter(Boolean).join("، ") || "لا يوجد بعد";
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<title>تقرير المنظومة الحسنية</title>
<style>
body{font-family:Tahoma,'Segoe UI',sans-serif;margin:24px;color:#222;line-height:1.7}
h1{color:#d81b60;font-size:20px;margin:0 0 4px} h2{font-size:15px;color:#ad1457;margin:18px 0 6px;border-bottom:1px solid #eee;padding-bottom:4px}
table{width:100%;border-collapse:collapse;font-size:13px} td,th{border:1px solid #ddd;padding:5px 8px;text-align:right}
th{background:#fce4ec} ul{margin:4px 0;padding-right:18px} .meta{color:#666;font-size:13px}
@media print{.noprint{display:none}}
</style></head><body>
<div class="noprint" style="text-align:center;margin-bottom:10px"><button onclick="window.print()">🖨️ طباعة</button></div>
<h1>تقرير المنظومة الحسنية</h1>
<div class="meta">الطفل: ${escapeHtml(getUserName())} · التاريخ: ${new Date().toLocaleDateString("ar-EG")}</div>
<h2>ملخص</h2>
<div>المحطات المكتملة: ${content.journeyData.filter(s => getStationStatus(s) === "completed").length} من ${content.journeyData.length}</div>
<div>أبيات أُتقنت: ${mastered}</div>
<div>تحدّي الأسبوع: ${Object.keys(w.done).length} من 5 (هذا الأسبوع)</div>
<div>الأوسمة: ${escapeHtml(badges)}</div>
<h2>المحطات</h2>
<table><tr><th>#</th><th>المحطة</th><th>الحالة</th><th>تاريخ الختم</th></tr>${stationRows}</table>
<h2>كلمات تحتاج تكراراً</h2><ul>${mistakes}</ul>
<h2>تأمّلات الطفل</h2><ul>${reflections}</ul>
</body></html>`;
}
function printTeacherReport() {
  const w = window.open("", "_blank");
  if (!w) { showToast("افتح النوافذ المنبثقة لطباعة التقرير", "error"); return; }
  w.document.open();
  w.document.write(buildTeacherReportHtml());
  w.document.close();
}

/* ---------- الأوسمة (تُحفظ على الجهاز مع تقدّم الطفل) ---------- */
const CUSTOM_BADGES = {
  places5: { icon: "🧭", name: "حافظ الأماكن", desc: "كل أسئلة الأماكن أُجيبت بشكل صحيح" },
  docs20: { icon: "📚", name: "باحث التوثيق", desc: "عشرون قصة موثّقة قُرئت" },
  reflect3: { icon: "💭", name: "متأمّل", desc: "ثلاثة تأمّلات مكتوبة" },
  weekly: { icon: "🗓️", name: "بطل الأسبوع", desc: "تحدّي الأسبوع كله مُنجَز" }
};
function awardBadge(id) {
  if (!state || !CUSTOM_BADGES[id]) return;
  state.customBadges = state.customBadges || {};
  if (state.customBadges[id]) return;
  state.customBadges[id] = Date.now();
  saveState();
  const b = CUSTOM_BADGES[id];
  kidToast(`${b.icon} ${kidLine("newBadge")} ${b.name}`, "success", [kidLine("newBadge"), b.name]);
}
function markStoryRead(vid) {
  if (!state) return;
  state.storiesRead = state.storiesRead || {};
  if (state.storiesRead[vid]) return;
  state.storiesRead[vid] = 1;
  if (Object.keys(state.storiesRead).length >= 20) awardBadge("docs20");
  saveState();
}
function showMyBadges() {
  const got = state.customBadges || {};
  const rows = Object.keys(CUSTOM_BADGES).map(id => {
    const b = CUSTOM_BADGES[id];
    return `<div class="badge-row ${got[id] ? "" : "locked"}"><span class="stamp-icon">${got[id] ? b.icon : "🔒"}</span>
      <div><strong>${escapeHtml(b.name)}</strong><small>${escapeHtml(b.desc)}</small></div></div>`;
  }).join("");
  const read = Object.keys(state.storiesRead || {}).length;
  openHub("🏅 أوسمتي الجديدة", `${rows}<p style="color:#888;font-size:.85rem">قصص قرأتها: ${read} من 20 للوسام الثاني.</p>`);
}
