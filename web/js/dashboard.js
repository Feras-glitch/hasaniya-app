/* لوحة الصف للمعلم: تقرأ نوعين من الملفات، وتعمل على هذا الجهاز وحده:
   - «تقرير الطفل» (زر 📤 تقرير): ملخص لطفل واحد.
   - «النسخة الاحتياطية» (زر 💾 نسخة احتياطية): كل أطفال الجهاز في ملف واحد، ومعها تفاصيل الأبيات المتعثرة.
   لا تقرأ اللوحة صور الأطفال ولا توقيع الوالد، ولا تكتب شيئاً على الجهاز، ولا يُرفع شيء. */

const DASH_STALE_DAYS = 7;
const DASH_LOW_PERCENT = 40;
const DASH_MAX_FILE = 30 * 1024 * 1024;
let dashRows = [];
let dashSorted = [];

/* ---------- التحقق من الملفات ---------- */
function dashValid(d) {
  return !!d && typeof d === "object" && !!d.user && typeof d.user.name === "string"
    && typeof d.completedStations === "number" && typeof d.totalStations === "number" && d.totalStations > 0
    && !!d.mastery && typeof d.mastery.percent === "number";
}
function dashValidBackup(d) {
  return !!d && typeof d === "object" && d.app === "hasaniya" && Array.isArray(d.users)
    && d.users.length > 0 && d.users.length <= 200
    && d.users.every(u => u && typeof u.name === "string" && !!u.state && typeof u.state === "object");
}

/* ---------- الصفوف ---------- */
/* صف من تقرير طفل: رقم إجمالي فقط */
function dashRow(d, now = Date.now()) {
  const exported = Date.parse(d.exportedAt) || 0;
  return {
    name: String(d.user.name).slice(0, 30),
    avatar: String(d.user.avatar || "👤").slice(0, 4),
    percent: Math.max(0, Math.min(100, Math.round(d.mastery.percent))),
    completed: d.completedStations, total: d.totalStations,
    points: +d.points || 0, streak: +d.streak || 0, minutes: +d.totalTimeMinutes || 0,
    mistakes: Array.isArray(d.mistakes) ? d.mistakes.length : 0,
    achievements: Array.isArray(d.achievements) ? d.achievements.length : 0,
    exportedAt: d.exportedAt || "", days: exported ? Math.floor((now - exported) / 86400000) : null,
    weak: [], source: "تقرير", calcFailed: false
  };
}
/* الأبيات الأكثر تعثراً من حالة الطفل، مع نصها عند توفره */
function dashWeakVerses(state, lookup, limit = 3) {
  const counts = {};
  for (const m of Object.values((state && state.mistakes) || {})) {
    if (!m || typeof m.verseId !== "string") continue;
    counts[m.verseId] = (counts[m.verseId] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id, n]) => {
    const v = lookup ? lookup(id) : null;
    return { id, n, text: v && v.fullVerse ? v.fullVerse : id };
  });
}
/* صف من طفل داخل النسخة الاحتياطية. mastery دالة تُرجع النسبة، وقد تفشل فيُعلَّم الصف */
function dashRowFromUser(u, when, now, lookup, mastery, totalStations) {
  const s = u.state || {};
  const exported = Date.parse(when) || 0;
  let percent = 0, calcFailed = false;
  try { const p = mastery(u); if (typeof p === "number" && isFinite(p)) percent = p; else calcFailed = true; }
  catch(e) { calcFailed = true; }
  const status = s.stationStatus && typeof s.stationStatus === "object" ? s.stationStatus : {};
  return {
    name: String(u.name).slice(0, 30),
    avatar: String(u.avatar || "👤").slice(0, 4),
    percent: Math.max(0, Math.min(100, Math.round(percent))),
    completed: Math.min(totalStations, Object.values(status).filter(v => v === "completed").length),
    total: totalStations,
    points: +s.points || 0, streak: +s.streak || 0,
    minutes: Math.floor((+s.totalTimeSeconds || 0) / 60),
    mistakes: Object.keys(s.mistakes || {}).length,
    achievements: Object.keys(s.achievements || {}).length,
    exportedAt: when || "", days: exported ? Math.floor((now - exported) / 86400000) : null,
    weak: dashWeakVerses(s, lookup), source: "نسخة", calcFailed
  };
}
/* الإبقاء على أحدث صف لكل طفل */
function dashMerge(rows) {
  const by = new Map();
  for (const r of rows) {
    const old = by.get(r.name);
    if (!old || (r.exportedAt || "") > (old.exportedAt || "")) by.set(r.name, r);
  }
  return [...by.values()];
}

/* ---------- الواجهة ---------- */
function openClassDashboard() {
  document.getElementById("dashPopup").classList.add("active");
  renderDashboard();
}
async function importDashFiles(fileList) {
  const files = [...(fileList || [])].slice(0, 60);
  let skipped = 0;
  const fresh = [];
  const now = Date.now();
  const lookup = id => vpFindVerse(id);
  const totalStations = content.journeyData.length;
  const mastery = u => calculateMastery(u.state).percent;
  for (const f of files) {
    if (f.size > DASH_MAX_FILE) { skipped++; continue; }
    let d;
    try { d = JSON.parse(await f.text()); } catch(e) { skipped++; continue; }
    if (dashValid(d)) fresh.push(dashRow(d, now));
    else if (dashValidBackup(d)) {
      for (const u of d.users) fresh.push(dashRowFromUser(u, d.exportedAt, now, lookup, mastery, totalStations));
    }
    else skipped++;
  }
  dashRows = dashMerge(dashRows.concat(fresh));
  renderDashboard();
  if (skipped) showToast(`تم تجاهل ${skipped} ملف لأنه ليس تقريراً ولا نسخة من هذا التطبيق`, "error");
}
function clearDashboard() {
  if (!dashRows.length) return;
  if (!confirm("مسح القائمة من هذه الشاشة؟ الملفات الأصلية لا تتأثر.")) return;
  dashRows = [];
  renderDashboard();
}
function dashShow(i) {
  const r = dashSorted[i];
  const box = document.getElementById("dashDetail");
  if (!r || !box) return;
  const weak = r.weak.length
    ? `<ol style="margin:6px 0 0;padding-right:20px">${r.weak.map(w => `<li>${escapeHtml(w.text)} <small style="color:#888">(تعثّر ${w.n})</small></li>`).join("")}</ol>`
    : `<p class="rec-count">${r.source === "تقرير" ? "هذا تقرير مختصر. للاطلاع على الأبيات المتعثرة استخدم النسخة الاحتياطية." : "لا توجد أبيات متعثرة."}</p>`;
  box.innerHTML = `<div style="border:1px solid #eee;border-radius:12px;padding:10px;margin-top:10px">
    <strong>${escapeHtml(r.avatar)} ${escapeHtml(r.name)}</strong>
    <div style="font-size:.9rem;margin-top:4px">المحطات المكتملة: ${r.completed} من ${r.total} · الإتقان ${r.percent}%${r.calcFailed ? " (تعذّر الحساب)" : ""}</div>
    <div style="font-size:.85rem;color:#666;margin-top:6px">أكثر الأبيات تعثراً:</div>${weak}
  </div>`;
}
function renderDashboard() {
  const body = document.getElementById("dashBody");
  const sum = document.getElementById("dashSummary");
  if (!body) return;
  if (!dashRows.length) {
    body.innerHTML = `<p class="empty-state">اختر ملف النسخة الاحتياطية، أو ملفات تقارير الأطفال، لتظهر المقارنة هنا.</p>`;
    sum.textContent = "";
    document.getElementById("dashDetail").innerHTML = "";
    return;
  }
  const sort = document.getElementById("dashSort").value;
  dashSorted = [...dashRows].sort((a, b) =>
    sort === "name" ? a.name.localeCompare(b.name, "ar")
    : sort === "completed" ? b.completed - a.completed
    : b.percent - a.percent);
  const avg = Math.round(dashRows.reduce((s, r) => s + r.percent, 0) / dashRows.length);
  const low = dashRows.filter(r => r.percent < DASH_LOW_PERCENT).length;
  sum.textContent = `${dashRows.length} طفلاً · متوسط الإتقان ${avg}%${low ? ` · ${low} يحتاج متابعة` : ""}`;
  /* ملخص أسبوعي مختصر: سطر لكل طفل بالجمل التي يحتاج المعلم أن يقرأها */
  const weeklyLine = r => {
    const weak = r.weak && r.weak.length ? "، أكثر الأبيات تعثراً: " + r.weak.map(w => w.text).join(" / ") : "";
    const need = r.percent < DASH_LOW_PERCENT ? " — يحتاج متابعة" : "";
    return `${r.avatar} ${r.name}: ${r.completed} من ${r.total} محطات، إتقان ${r.percent}%${need}${weak}`;
  };
  const weekly = `<div style="background:#fbf8f2;border:1px solid #eee;border-radius:12px;padding:8px 10px;margin-bottom:10px;line-height:1.9;font-size:.9rem">
    <strong>ملخص مختصر</strong>${dashSorted.map(r => `<div>• ${escapeHtml(weeklyLine(r))}</div>`).join("")}</div>`;
  const flags = r => {
    const f = [];
    if (r.percent < DASH_LOW_PERCENT) f.push("يحتاج متابعة");
    if (r.days !== null && r.days > DASH_STALE_DAYS) f.push(`آخر بيانات قبل ${r.days} يوماً`);
    if (r.calcFailed) f.push("تعذّر حساب الإتقان");
    return f.join("، ");
  };
  body.innerHTML = weekly + `<table class="dash-table" style="width:100%;border-collapse:collapse;font-size:.88rem">
    <thead><tr style="background:#f5f5f5">
      <th style="padding:6px;text-align:right">الطفل</th><th>الإتقان</th><th>المحطات</th>
      <th>النقاط</th><th>الأخطاء</th><th>الوقت</th><th style="text-align:right">ملاحظة</th>
    </tr></thead>
    <tbody>${dashSorted.map((r, i) => `<tr onclick="dashShow(${i})" style="border-bottom:1px solid #eee;cursor:pointer">
      <td style="padding:6px">${escapeHtml(r.avatar)} ${escapeHtml(r.name)}</td>
      <td style="text-align:center"><strong>${r.percent}%</strong>
        <div style="height:6px;background:#eee;border-radius:4px;margin-top:3px"><div style="height:6px;width:${r.percent}%;background:${r.percent < DASH_LOW_PERCENT ? "var(--danger)" : "var(--success)"};border-radius:4px"></div></div></td>
      <td style="text-align:center">${r.completed}/${r.total}</td>
      <td style="text-align:center">${r.points}</td>
      <td style="text-align:center">${r.mistakes}</td>
      <td style="text-align:center">${r.minutes} د</td>
      <td style="color:#b26a00">${escapeHtml(flags(r))}</td>
    </tr>`).join("")}</tbody></table>
    <p class="rec-count">اضغط على الطفل لرؤية أبياته المتعثرة. الأرقام من آخر ملف أُخذ لكل طفل.</p>`;
  document.getElementById("dashDetail").innerHTML = "";
}
