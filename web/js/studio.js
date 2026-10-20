/* v101: استوديو التسجيل (يحل محل «صوت الوالد»): الوالد أو المعلم يسجّل بصوته كل ما يسمعه الطفل.
   - الأقسام بترتيب الأولوية، ولكل قسم عدّاد «مسجّل من المجموع».
   - التسجيل المتتابع: نص واحد كبير على الشاشة، ثم سجّل / أوقف / استمع / التالي، وإعادة التسجيل تستبدل السابق.
   - رفع ملف صوتي جاهز، وعلامة «مراجَع»، وفحص الجودة بعد كل تسجيل.
   - ما لم يُسجَّل يقرؤه القارئ الآلي، فلا يلزم إكمال كل شيء. */

const PV_MAX_UPLOAD = 15 * 1024 * 1024;
const PV_AUDIO_EXT = /\.(mp3|m4a|aac|ogg|oga|wav|webm|opus|3gp)$/i;
function pvKey(kind, id) { return authorKey(kind, id); }
let pvSeq = null;   // { list, i } أثناء التسجيل المتتابع

function openParentVoice() {
  const sel = document.getElementById("pvStation");
  sel.innerHTML = `<option value="all">كل المحطات</option>` +
    content.journeyData.map((st, i) => `<option value="${i}">${i + 1}. ${escapeHtml(st.title)}</option>`).join("");
  sel.value = String(state.selectedStation || 0);
  const kind = document.getElementById("pvKind");
  kind.innerHTML = VOICE_SECTIONS.map(s => `<option value="${s.id}">${escapeHtml(s.title)}</option>`).join("");
  kind.value = "verse";
  document.getElementById("vpAuthor").value = vpAuthorName();
  pvSeq = null;
  document.getElementById("pvPopup").classList.add("active");
  renderParentVoice();
}
/* عنصر من السجل بنوعه ومعرّفه، وإن لم يكن في السجل (نص قديم) يُبنى من التسجيل نفسه */
function pvItem(kind, id) {
  const key = authorKey(kind, id);
  const it = voiceRegistry().byKey.get(key);
  if (it) return it;
  if (kind !== "line") {
    const v = vpFindVerse(id);
    if (v) return { section: kind === "story" ? "story" : "verse", kind: vpKindOf(kind), id, key, text: vpTextOf(kind, v) };
  }
  return null;
}
const PV_NO_STATION = ["names", "guide", "titles"];
function pvSection() { return document.getElementById("pvKind").value || "verse"; }
function pvCurrentList() {
  const sec = pvSection();
  const stv = document.getElementById("pvStation").value;
  return voiceRegistry().items.filter(it => it.section === sec && (PV_NO_STATION.includes(sec) || stv === "all" || it.station === +stv));
}
function pvMaxMs(it) { return it.kind === "story" ? 180000 : (it.section === "expl" || it.section === "quizex" || it.section === "disc") ? 120000 : 60000; }
function pvFmtMin(sec) {
  const all = Math.round(sec / 60);
  const mins = m => m === 1 ? "دقيقة" : m === 2 ? "دقيقتان" : m <= 10 ? `${m} دقائق` : `${m} دقيقة`;
  if (all < 1) return "أقل من دقيقة";
  if (all < 60) return mins(all);
  const h = Math.floor(all / 60), m = all % 60;
  const hs = h === 1 ? "ساعة" : h === 2 ? "ساعتان" : `${h} ساعات`;
  return m ? `${hs} و${mins(m)}` : hs;
}

async function renderParentVoice() {
  const body = document.getElementById("pvBody");
  if (!body) return;
  let recs = [];
  try { recs = await vpAllAuthorRecs(); } catch (e) {}
  const have = new Map(recs.map(r => [r.key, r]));
  /* العدّادات في قائمة الأقسام، والملخص العام */
  const prog = voiceProgress(recs);
  const kindSel = document.getElementById("pvKind");
  prog.forEach(p => { const o = kindSel.querySelector(`option[value="${p.id}"]`); if (o) o.textContent = `${VOICE_SECTIONS.find(s => s.id === p.id).title} (${p.done}/${p.total})`; });
  /* الملخص العام بالنصوص المختلفة: الخيار المكرر في قسمين يُحسب مرة */
  const reg = voiceRegistry();
  const uniq = [...reg.byKey.values()];
  const done = uniq.filter(it => voiceRecValid(it, have.get(it.key))).length, total = uniq.length;
  const left = uniq.filter(it => !voiceRecValid(it, have.get(it.key))).reduce((a, it) => a + voiceEstSec(it.text), 0);
  const orphans = recs.filter(r => r.kind === "line" && !reg.byKey.has(r.key)).length;
  document.getElementById("pvSummary").innerHTML =
    `<div class="pv-bar"><span style="width:${total ? Math.round(done / total * 100) : 0}%"></span></div>
     <div>مسجّل <strong>${done}</strong> من ${total} نصاً${done < total ? ` · بقي نحو ${pvFmtMin(left)} من القراءة` : " ✅"}</div>
     <small class="rec-count">ما لم يُسجَّل يقرؤه القارئ الآلي، فابدأ بالأهم: الأبيات ثم التعليمات.</small>`;
  const ob = document.getElementById("pvOrphanBtn");
  ob.style.display = orphans ? "" : "none";
  ob.textContent = `🧹 حذف ${orphans} تسجيلاً لنصوص تغيّرت`;
  const sec = pvSection();
  document.getElementById("pvStation").style.display = PV_NO_STATION.includes(sec) ? "none" : "";
  if (pvSeq) { body.style.display = "none"; return pvSeqRender(have); }
  document.getElementById("pvSeq").style.display = "none";
  body.style.display = "";
  const onlyLeft = document.getElementById("pvOnlyLeft").checked;
  const all = pvCurrentList();
  const list = onlyLeft ? all.filter(it => !voiceRecValid(it, have.get(it.key))) : all;
  const doneHere = all.filter(it => voiceRecValid(it, have.get(it.key))).length;
  document.getElementById("pvCount").textContent = `مسجّل ${doneHere} من ${all.length}`;
  if (!list.length) { body.innerHTML = `<p class="empty-state">${all.length ? "✅ كل نصوص هذا القسم مسجّلة" : "لا توجد نصوص هنا."}</p>`; renderVoiceStatus(); return; }
  body.innerHTML = list.map(it => pvRowHTML(it, have.get(it.key))).join("");
  renderVoiceStatus();
}
function pvRowHTML(it, rec) {
  const k = it.kind, id = escapeForAttr(it.id);
  const stale = !!rec && !voiceRecValid(it, rec);
  const recording = recIsRecording("pv:" + it.key);
  const status = !rec ? ""
    : stale ? `<small class="rec-count" style="color:var(--danger)">⚠ النص تغيّر بعد التسجيل، أعد التسجيل</small>`
    : `<small class="rec-count">${rec.source === "upload" ? "ملف مرفوع" : "مسجّل"}${rec.author ? " · من: " + escapeHtml(rec.author) : ""} · ${fmtBytes(rec.blob.size)}</small>`;
  const warn = rec && rec.q && rec.q.warnings && rec.q.warnings.length ? `<small class="rec-count" style="color:#b26a00">⚠ ${escapeHtml(rec.q.warnings.join("، "))}</small>` : "";
  return `<div class="rec-row${rec && !stale ? " pv-done" : ""}">
      <div class="rec-text">${it.n ? it.n + ". " : ""}${escapeHtml(it.text)}</div>
      <div class="rec-actions">
        <button class="tool-btn" onclick="pvRecord('${k}','${id}')">${recording ? "⏹ أوقف" : rec ? "🔁 أعد التسجيل" : "⏺ سجّل"}</button>
        <label class="tool-btn" style="cursor:pointer">📁 رفع ملف<input type="file" accept="audio/*" style="display:none" onchange="pvUpload('${k}','${id}',this.files[0]); this.value=''"></label>
        ${rec ? `<button class="tool-btn" onclick="pvPlay('${k}','${id}')">▶ استمع</button>
        <button class="tool-btn" onclick="pvDelete('${k}','${id}')">🗑</button>
        <button class="tool-btn" onclick="vpToggleReviewed('${k}','${id}')">${rec.reviewed ? "✔ مراجَع" : "☐ مراجَع"}</button>` : ""}
      </div>
      ${status}${warn}
    </div>`;
}

/* ---------- التسجيل والرفع والتشغيل والحذف ---------- */
/* التسجيل يُحفظ بالمفتاح المشترك ومعه بصمة النص */
function pvRecord(kind, id) {
  const it = pvItem(kind, id);
  if (!it) return;
  recToggle("pv:" + it.key, () => renderParentVoice(), {
    storeKey: it.key, recId: it.id, kind: it.kind, maxMs: pvMaxMs(it),
    fp: it.kind === "line" ? it.id : textFingerprint(it.text), source: "rec", author: true, check: true,
    text: it.kind === "line" ? it.text : null
  });
}
async function pvUpload(kind, id, file) {
  if (!file) return;
  const it = pvItem(kind, id);
  if (!it) return;
  const isAudio = (file.type && file.type.startsWith("audio/")) || PV_AUDIO_EXT.test(file.name || "");
  if (!isAudio) { showToast("هذا الملف ليس صوتياً", "error"); return; }
  if (file.size > PV_MAX_UPLOAD) { showToast("الملف أكبر من 15 ميجابايت", "error"); return; }
  try {
    const row = { key: it.key, verseId: it.id, kind: it.kind, uid: "author", mime: file.type || "audio/mpeg",
      blob: file, fp: it.kind === "line" ? it.id : textFingerprint(it.text), source: "upload", at: Date.now() };
    if (it.kind === "line") row.text = it.text;
    await recPut(row);
    showToast("تم رفع الملف", "success");
    vpQualityCheck(it.key, file, Infinity);
    renderParentVoice();
  } catch (e) { showToast("تعذّر حفظ الملف", "error"); }
}
async function pvPlay(kind, id) {
  if (!audioBegin()) return;
  const token = seqToken;
  const it = pvItem(kind, id);
  const rec = await recGet(authorKey(kind, id));
  if (!rec || token !== seqToken) return;
  if (it && !voiceRecValid(it, rec)) { showToast("النص تغيّر بعد التسجيل، أعد التسجيل", "error"); return; }
  seqAudio = blobAudio(rec.blob);
  audioPlayEl(seqAudio).catch(() => showToast("تعذّر التشغيل", "error"));
}
async function pvDelete(kind, id) {
  if (!confirm("حذف هذا الصوت؟ سيُقرأ النص آلياً بعد الحذف.")) return;
  await recDelete(pvKey(kind, id));
  renderParentVoice();
  if (typeof renderStorageInfo === "function") renderStorageInfo();
}
/* تسجيلات لنصوص لم تعد في التطبيق (تغيّر النص بعد تحديث) تشغل مساحة ولا تُسمع */
async function pvCleanOrphans() {
  const reg = voiceRegistry();
  const list = (await vpAllAuthorRecs()).filter(r => r.kind === "line" && !reg.byKey.has(r.key));
  if (!list.length || !confirm(`حذف ${list.length} تسجيلاً لنصوص لم تعد مستعملة؟`)) return;
  for (const r of list) await recDelete(r.key);
  showToast(`تم حذف ${list.length} تسجيلاً`, "success");
  renderParentVoice();
}

/* ---------- التسجيل المتتابع ---------- */
async function pvSeqStart() {
  const list = pvCurrentList();
  if (!list.length) return;
  const have = new Map((await vpAllAuthorRecs()).map(r => [r.key, r]));
  const first = list.findIndex(it => !voiceRecValid(it, have.get(it.key)));
  pvSeq = { list, i: first < 0 ? 0 : first };
  await renderParentVoice();
  const box = document.getElementById("pvSeq"); if (box && box.scrollIntoView) box.scrollIntoView({ block: "nearest" });
}
function pvSeqEnd() {
  if (recState && recState.recorder) recStop();
  pvSeq = null;
  renderParentVoice();
}
function pvSeqMove(d) {
  if (!pvSeq || (recState && recState.recorder)) return;
  pvSeq.i = Math.max(0, Math.min(pvSeq.list.length - 1, pvSeq.i + d));
  audioStopAll();
  renderParentVoice();
}
async function pvSeqNextLeft() {
  if (!pvSeq || (recState && recState.recorder)) return;
  const have = new Map((await vpAllAuthorRecs()).map(r => [r.key, r]));
  const n = pvSeq.list.length;
  for (let k = 1; k <= n; k++) {
    const j = (pvSeq.i + k) % n;
    if (!voiceRecValid(pvSeq.list[j], have.get(pvSeq.list[j].key))) { pvSeq.i = j; audioStopAll(); renderParentVoice(); return; }
  }
  showToast("✅ كل نصوص هذا القسم مسجّلة", "success");
}
function pvSeqItem() { return pvSeq && pvSeq.list[pvSeq.i]; }
function pvSeqRecord() { const it = pvSeqItem(); if (it) pvRecord(it.kind, it.id); }
function pvSeqPlay() { const it = pvSeqItem(); if (it) pvPlay(it.kind, it.id); }
async function pvSeqRender(have) {
  const box = document.getElementById("pvSeq");
  const it = pvSeqItem();
  if (!it) { pvSeq = null; return renderParentVoice(); }
  const rec = have.get(it.key);
  const ok = voiceRecValid(it, rec);
  const recording = recIsRecording("pv:" + it.key);
  const n = pvSeq.list.length;
  const doneN = pvSeq.list.filter(x => voiceRecValid(x, have.get(x.key))).length;
  const warn = ok && rec.q && rec.q.warnings && rec.q.warnings.length ? `<div style="color:#b26a00">⚠ ${escapeHtml(rec.q.warnings.join("، "))}</div>` : "";
  const sec = VOICE_SECTIONS.find(s => s.id === it.section);
  box.style.display = "block";
  box.innerHTML = `
    <div class="seq-head">${escapeHtml(sec ? sec.title : "")} · ${pvSeq.i + 1} من ${n} · مسجّل ${doneN}</div>
    <div class="seq-text${it.kind === "verse" ? " seq-verse" : ""}">${escapeHtml(it.text)}</div>
    <div class="seq-status">${recording ? "🔴 يسجّل الآن… اضغط «أوقف» عند الانتهاء" : ok ? "✅ مسجّل" + (rec.reviewed ? " · مراجَع" : "") : rec ? "⚠ النص تغيّر بعد التسجيل، أعد التسجيل" : "لم يُسجَّل بعد"}</div>
    ${recording ? "" : warn}
    <div class="seq-main">
      <button class="action-btn ${recording ? "btn-danger" : "btn-success"}" id="pvSeqRec" onclick="pvSeqRecord()">${recording ? "⏹ أوقف" : rec ? "🔁 أعد التسجيل" : "⏺ سجّل"}</button>
      <button class="action-btn btn-info" id="pvSeqPlay" onclick="pvSeqPlay()" ${rec && !recording ? "" : "disabled"}>▶ استمع</button>
    </div>
    <div class="controls seq-nav">
      <button class="tool-btn" onclick="pvSeqMove(-1)" ${recording || pvSeq.i === 0 ? "disabled" : ""}>→ السابق</button>
      <button class="tool-btn" id="pvSeqNext" onclick="pvSeqMove(1)" ${recording || pvSeq.i >= n - 1 ? "disabled" : ""}>التالي ←</button>
      <button class="tool-btn" onclick="pvSeqNextLeft()" ${recording ? "disabled" : ""}>⏭ غير المسجّل</button>
    </div>
    <div class="controls seq-nav">
      ${ok && !recording ? `<button class="tool-btn" onclick="vpToggleReviewed('${it.kind}','${escapeForAttr(it.id)}')">${rec.reviewed ? "✔ مراجَع" : "☐ علّم كمراجَع"}</button>` : ""}
      <button class="tool-btn" onclick="pvSeqEnd()">✕ إنهاء التسجيل المتتابع</button>
    </div>`;
}
