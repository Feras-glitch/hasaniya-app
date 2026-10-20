/* ملف الطفل: الجنس والصورة، وصيغ المخاطبة، وشهادة الإتقان */

/* يختار الصيغة حسب جنس الطفل: ولد أو بنت */
function gForm(boyForm, girlForm) {
  /* gForm.force: يضبطه سجل الأصوات مؤقتاً ليجمع صيغتي الولد والبنت لكل رسالة */
  const g = gForm.force || getCurrentUser()?.gender;
  return g === "girl" ? girlForm : boyForm;
}

/* تصغير الصورة إلى مربع صغير بصيغة JPEG، لتبقى خفيفة في التخزين */
function readPhotoFile(file, size = 160) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) { reject(new Error("ليس ملف صورة")); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("تعذّر فتح الصورة"));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
        const c = document.createElement("canvas");
        c.width = size; c.height = size;
        c.getContext("2d").drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(c.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* عرض الصورة أو الرمز في الشريط العلوي */
function avatarHTML(u, cls) {
  const ph = u ? safeImg(u.photo) : null;
  if (ph) return `<img class="${cls}" src="${ph}" alt="">`;
  return escapeHtml(u ? u.avatar : "👤");
}

/* ---------- صورة الطفل في المكافآت: تظهر إلا إذا عطّلها الوالد ---------- */
/* الصورة لا تُقبل إلا إن كانت بيانات صورة صحيحة، حمايةً من ملفات النسخ الاحتياطي المعدّلة */
function safeImg(src) {
  return typeof src === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(src) ? src : null;
}
function rewardPhoto() {
  const u = getCurrentUser();
  return u && u.showPhoto !== false ? safeImg(u.photo) : null;
}
/* يصغّر الخط حتى يتسع النص للعرض المحدد */
function fitFont(x, text, maxW, size, weight) {
  let s = size;
  x.font = `${weight} ${s}px Tahoma, sans-serif`;
  while (s > 40 && x.measureText(text).width > maxW) { s -= 4; x.font = `${weight} ${s}px Tahoma, sans-serif`; }
}

/* ---------- الشهادة: قابلة للطباعة، بألوان وصيغة تناسب الجنس ---------- */
const JOURNEY_CERT = { title: "رحلة السيرة النبوية كاملة" };
const CERT_THEMES = {
  boy:  { bg1: "#e3f2fd", bg2: "#e0f7fa", main: "#0d47a1", accent: "#ffb300" },
  girl: { bg1: "#fff8e1", bg2: "#fce4ec", main: "#ad1457", accent: "#ffb300" },
  none: { bg1: "#f1f8e9", bg2: "#fff8e1", main: "#2e7d32", accent: "#ffb300" }
};
function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
/* لوحة بدقة طباعة 1800×1200 */
async function drawCertificate(station, cert = { code: "----", at: Date.now() }) {
  const u = getCurrentUser() || {};
  const t = CERT_THEMES[u.gender] || CERT_THEMES.none;
  const W = 1800, H = 1200, cx = W / 2;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.direction = "rtl"; x.textAlign = "center"; x.textBaseline = "middle";
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, t.bg1); g.addColorStop(1, t.bg2);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = t.main; x.lineWidth = 28; x.strokeRect(48, 48, W - 96, H - 96);
  x.strokeStyle = t.accent; x.lineWidth = 6; x.strokeRect(88, 88, W - 176, H - 176);
  [[130, 130], [W - 130, 130], [130, H - 130], [W - 130, H - 130]].forEach(([px, py]) => {
    x.beginPath(); x.arc(px, py, 34, 0, Math.PI * 2); x.fillStyle = t.accent; x.fill();
  });
  // الصورة أو الرمز في الأعلى
  x.beginPath(); x.arc(cx, 200, 112, 0, Math.PI * 2); x.fillStyle = t.accent; x.fill();
  const ph = rewardPhoto();
  let drew = false;
  if (ph) {
    try {
      const img = await loadImage(ph);
      x.save(); x.beginPath(); x.arc(cx, 200, 100, 0, Math.PI * 2); x.clip();
      x.drawImage(img, cx - 100, 100, 200, 200); x.restore(); drew = true;
    } catch(e) { drew = false; }
  }
  if (!drew) {
    x.fillStyle = "#fff"; x.beginPath(); x.arc(cx, 200, 100, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#000"; x.font = "110px sans-serif"; x.fillText(u.avatar || "⭐", cx, 210);
  }
  // النصوص
  x.fillStyle = t.main; x.font = "bold 128px Tahoma, sans-serif";
  x.fillText("شهادة إتقان", cx, 380);
  x.fillStyle = "#555"; x.font = "44px Tahoma, sans-serif";
  x.fillText("تُمنح من تطبيق المنظومة الحسنية في السيرة النبوية", cx, 500);
  x.fillStyle = "#222"; fitFont(x, u.name || "الطفل", 1400, 120, "bold");
  x.fillText(u.name || "الطفل", cx, 625);
  x.fillStyle = "#333"; x.font = "56px Tahoma, sans-serif";
  x.fillText(gForm("قد أتمّ حفظ", "قد أتمّت حفظ") + " محطة", cx, 725);
  x.fillStyle = t.main; fitFont(x, station.title, 1400, 80, "bold");
  x.fillText(station.title, cx, 820);
  x.fillStyle = "#333"; x.font = "52px Tahoma, sans-serif";
  x.fillText(gForm("أحسنتَ، واصل المسيرة", "أحسنتِ، واصلي المسيرة"), cx, 912);
  x.fillStyle = "#555"; x.font = "40px Tahoma, sans-serif";
  x.fillText(new Date(cert.at).toLocaleDateString("ar-EG"), cx, 1040);
  x.fillStyle = "#777"; x.font = "26px Tahoma, sans-serif";
  x.fillText("رمز التحقق: " + cert.code, cx, 1088);
  // توقيع الوالد في الزاوية اليمنى السفلى
  if (u.parentSig) {
    try { const sig = await loadImage(u.parentSig); x.drawImage(sig, 1230, 840, 380, 162); } catch(e) {}
  }
  x.strokeStyle = "#555"; x.lineWidth = 3;
  x.beginPath(); x.moveTo(1230, 1005); x.lineTo(1610, 1005); x.stroke();
  x.fillStyle = "#555"; x.font = "30px Tahoma, sans-serif";
  x.fillText("توقيع الوالد", 1420, 1040);
  return c;
}
function certificateBlob(station, cert) {
  return drawCertificate(station, cert).then(c => new Promise(res => c.toBlob(res, "image/png")));
}

/* الحفظ والطباعة يطلبان الرقم السري (موافقة الوالد) */
function certSave(station) {
  if (!station) { kidToast(kidLine("noDoneStation"), "error"); return; }
  requirePin(() => saveCertificate(station), "حفظ الشهادة أو مشاركتها يحتاج موافقة الوالد");
}
function certPrint(station) {
  if (!station) { kidToast(kidLine("noDoneStation"), "error"); return; }
  requirePin(() => printCertificate(station), "طباعة الشهادة تحتاج موافقة الوالد");
}
async function saveCertificate(station) {
  try {
    const cert = issueCert(station);
    const blob = await certificateBlob(station, cert);
    const name = "certificate-" + Date.now() + ".png";
    const file = new File([blob], name, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "شهادة إتقان" }); return; } catch(e) {}
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showToast("تم حفظ الشهادة", "success");
  } catch(e) { showToast("تعذّر إنشاء الشهادة", "error"); }
}
async function printCertificate(station) {
  try {
    const cert = issueCert(station);
    const blob = await certificateBlob(station, cert);
    const dataUrl = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
    const w = window.open("", "_blank");
    if (!w) { showToast("افتح النوافذ المنبثقة لطباعة الشهادة", "error"); return; }
    w.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>شهادة إتقان</title>
<style>@page{size:A4 landscape;margin:0}html,body{margin:0;height:100%}img{width:100%;height:100vh;object-fit:contain;display:block}</style>
</head><body><img src="${dataUrl}" onload="setTimeout(function(){window.print()},300)"></body></html>`);
    w.document.close();
  } catch(e) { showToast("تعذّر تجهيز الشهادة للطباعة", "error"); }
}

/* ---------- رمز التحقق وسجل الشهادات (محلي على الجهاز) ---------- */
function certCode(...parts) {
  let h = 0x811c9dc5;
  for (const ch of parts.join("|")) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  const hex = h.toString(16).toUpperCase().padStart(8, "0");
  return hex.slice(0, 4) + "-" + hex.slice(4, 8);
}
/* تسجيل الشهادة الصادرة: شهادة واحدة لكل محطة في اليوم نفسه */
function issueCert(station) {
  const u = getCurrentUser() || {};
  const iso = new Date().toISOString().slice(0, 10);
  state.certs = state.certs || [];
  let rec = state.certs.find(c => c.station === station.title && c.date === iso);
  if (!rec) {
    rec = { station: station.title, date: iso, code: certCode(u.name || "", station.title, iso, String(u.createdAt || "")), at: Date.now() };
    state.certs.push(rec);
    saveState();
  }
  return rec;
}
function showCertLog() {
  const list = (state && state.certs) || [];
  const rows = list.slice().reverse().map(c => `<div class="hub-row"><span style="flex:1;text-align:right">🎖️ ${escapeHtml(c.station)} · ${escapeHtml(new Date(c.at).toLocaleDateString("ar-EG"))}</span><strong style="font-family:monospace">${escapeHtml(c.code)}</strong></div>`).join("")
    || `<p class="empty-state">لم تُصدر شهادات بعد.</p>`;
  openHub("🎖️ سجل الشهادات", `<p style="color:#666;font-size:.9rem">كل شهادة تحمل رمز تحقق. قارِن الرمز المطبوع على الشهادة بهذا السجل. السجل محفوظ على هذا الجهاز فقط.</p>
    ${rows}
    <div class="controls" style="margin-top:12px"><input id="certVerifyInput" placeholder="أدخل رمز الشهادة" maxlength="9" style="flex:1;padding:8px;border-radius:10px;font-family:monospace;text-transform:uppercase"><button class="tool-btn" onclick="verifyCertCode()">تحقّق</button></div>
    <div id="certVerifyResult" class="rec-count"></div>`);
}
function verifyCertCode() {
  let raw = (document.getElementById("certVerifyInput").value || "").toUpperCase().replace(/\s/g, "");
  if (raw.length === 8 && !raw.includes("-")) raw = raw.slice(0, 4) + "-" + raw.slice(4);
  const hit = ((state && state.certs) || []).find(c => c.code === raw);
  document.getElementById("certVerifyResult").textContent = hit
    ? `✅ مطابق: ${hit.station} · ${new Date(hit.at).toLocaleDateString("ar-EG")}`
    : "❌ لا يوجد هذا الرمز في سجل هذا الجهاز";
}

/* ---------- توقيع الوالد: يُرسم مرة ويظهر في كل شهادة ---------- */
let sigDrawing = false, sigLast = null, sigTouched = false;
function sigPoint(cv, e) {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height };
}
function clearSignature() {
  const cv = document.getElementById("sigCanvas");
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.strokeStyle = "#1a237e";
  sigTouched = false;
}
function openSignature() {
  const cv = document.getElementById("sigCanvas");
  if (!cv.dataset.bound) {
    cv.addEventListener("pointerdown", e => { sigDrawing = true; sigTouched = true; sigLast = sigPoint(cv, e); cv.setPointerCapture(e.pointerId); e.preventDefault(); });
    cv.addEventListener("pointermove", e => {
      if (!sigDrawing) return;
      const p = sigPoint(cv, e), ctx = cv.getContext("2d");
      ctx.beginPath(); ctx.moveTo(sigLast.x, sigLast.y); ctx.lineTo(p.x, p.y); ctx.stroke(); sigLast = p;
    });
    const end = () => { sigDrawing = false; };
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
    cv.dataset.bound = "1";
  }
  clearSignature();
  const saved = getCurrentUser()?.parentSig;
  if (saved) {
    loadImage(saved).then(img => { cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height); sigTouched = true; }).catch(() => {});
  }
  document.getElementById("sigPopup").classList.add("active");
}
function saveSignature() {
  const u = getCurrentUser();
  if (!u) return;
  if (!sigTouched) { showToast("ارسم التوقيع أولاً", "error"); return; }
  u.parentSig = document.getElementById("sigCanvas").toDataURL("image/png");
  saveState();
  closePopup("sigPopup");
  showToast("تم حفظ توقيع الوالد", "success");
}
