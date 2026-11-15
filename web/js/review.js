/* ============================================================
   v110: «📝 وضع المراجعة» للوالدين والمعلمين (يحل محل جدول Excel)
   - كل نص علمي أو تعليمي في التطبيق يُراجَع ويُعدَّل من داخله: أسماء المحطات، والأحداث، والشروح،
     والقصص والقصص القصيرة، والحواشي والمصادر، وأسئلة المحطات وخياراتها وتعقيبها، والألغاز، وأسئلة النقاش،
     وصناديق الخلاف، وحواشي الآيات، وملاحظات الأماكن، ورسائل التطبيق للطفل.
   - نص البيت لا يُعدَّل أبداً؛ يُقترح تشكيله فقط (اقتراح لا يُطبَّق، ويُشترط ألا تتغير حروفه).
   - لكل نص حكم: صحيح / يحتاج نظراً / صعب على الصغير، وملاحظة. التعديل يُطبَّق فوراً على هذا الجهاز.
   - التصدير ملف واحد فيه التعديلات والأحكام واسم المراجع وصفته؛ والاستيراد يعرض المراجع قبل التطبيق.
   - المحفوظ مشترك بين ملفات الأطفال على الجهاز (localStorage: hasaniya_review_v1)، ولا يمس تقدّمهم.
   ============================================================ */
const REVIEW_KEY = "hasaniya_review_v1";
const REVIEW_INLINE_KEY = "hasaniya_review_inline";
const REVIEW_MAX_TEXT = 8000, REVIEW_MAX_NOTE = 1500, REVIEW_MAX_ITEMS = 6000, REVIEW_MAX_FILE = 5 * 1024 * 1024;
const REVIEW_VERDICTS = { ok: "✅ صحيح", check: "⚠ يحتاج نظراً", hard: "👶 صعب على الصغير" };
const REVIEW_ROLES = { parent: "ولي أمر", teacher: "معلم" };
/* مصادر تغيّرت في v107 (من المواقع إلى الكتب)، وأماكن الخريطة الجديدة: أولوية في المراجعة */
const REVIEW_V107_SOURCES = ["s2v8", "s3v1", "s3v2", "s4v5", "s10v3", "s11bv9", "s11bv10", "s12bv1", "s12bv2", "s12bv3", "s12bv6", "s12cv4", "s13v6"];
const REVIEW_V107_PLACES = ["نخلة", "بواط", "العشيرة", "سفوان", "حمراء الأسد", "الرجيع", "بئر معونة"];

/* ---------- النسخة الأصلية من كل نص (قبل أي تعديل)، تُؤخذ عند تحميل الملف ---------- */
const reviewClone = o => o === undefined ? undefined : JSON.parse(JSON.stringify(o));
const REVIEW_PRISTINE = {
  QUIZZES: typeof QUIZZES !== "undefined" ? reviewClone(QUIZZES) : {},
  RIDDLES: typeof RIDDLES !== "undefined" ? reviewClone(RIDDLES) : [],
  STORIES_SHORT: typeof STORIES_SHORT !== "undefined" ? reviewClone(STORIES_SHORT) : {},
  DISCUSSION: typeof DISCUSSION !== "undefined" ? reviewClone(DISCUSSION) : {},
  KHILAF: typeof KHILAF !== "undefined" ? reviewClone(KHILAF) : {},
  QURAN_LINKS: typeof QURAN_LINKS !== "undefined" ? reviewClone(QURAN_LINKS) : {},
  GEO_PLACES: typeof GEO_PLACES !== "undefined" ? reviewClone(GEO_PLACES) : {},
  KID_LINES: typeof KID_LINES !== "undefined" ? reviewClone(KID_LINES) : {}
};
/* مفاتيح الألغاز من نسختها الأصلية، فلا يتغيّر مفتاح اللغز إن عُدّل جوابه */
const REVIEW_RIDDLE_KEYS = REVIEW_PRISTINE.RIDDLES.map(r => r.ref + "|" + normalizeArabic(r.answer));

/* ---------- التخزين ---------- */
function reviewLoad() {
  try {
    const s = JSON.parse(localStorage.getItem(REVIEW_KEY) || "null");
    if (s && typeof s === "object") return { reviewer: s.reviewer || null, edits: s.edits || {}, verdicts: s.verdicts || {} };
  } catch (e) {}
  return { reviewer: null, edits: {}, verdicts: {} };
}
let reviewStore = reviewLoad();
function reviewSave() {
  try { localStorage.setItem(REVIEW_KEY, JSON.stringify(reviewStore)); return true; }
  catch (e) { showToast("تعذّر حفظ المراجعة: مساحة التخزين ممتلئة", "error"); return false; }
}
function reviewInlineOn() { try { return localStorage.getItem(REVIEW_INLINE_KEY) === "1"; } catch (e) { return false; } }
function reviewSetInline(on) {
  try { localStorage.setItem(REVIEW_INLINE_KEY, on ? "1" : "0"); } catch (e) {}
  document.body.classList.toggle("review-inline", !!on);
}

/* ---------- سجل النصوص القابلة للمراجعة ---------- */
const REVIEW_SECTIONS = [
  { id: "title", name: "🏷️ أسماء المحطات" },
  { id: "event", name: "🗓️ أحداث الأبيات" },
  { id: "meaning", name: "📘 الشروح" },
  { id: "story", name: "📜 القصص" },
  { id: "short", name: "🧒 القصص القصيرة للصغير" },
  { id: "note", name: "🗒️ الحواشي" },
  { id: "sources", name: "📚 المصادر" },
  { id: "khilaf", name: "⚖️ الخلاف بين العلماء" },
  { id: "quran", name: "📖 حواشي الآيات" },
  { id: "quiz", name: "❓ أسئلة المحطات" },
  { id: "riddle", name: "🧩 الألغاز" },
  { id: "disc", name: "💬 أسئلة النقاش" },
  { id: "place", name: "🌍 أماكن الخريطة" },
  { id: "tashkeel", name: "✍️ تشكيل الأبيات (اقتراح)" },
  { id: "kid", name: "🐪 رسائل التطبيق للطفل" }
];
function rvGet(o, path) { return path.reduce((x, k) => x == null ? undefined : x[k], o); }
function rvSet(o, path, val) { const last = path[path.length - 1]; const p = rvGet(o, path.slice(0, -1)); if (p != null) p[last] = val; }
function reviewStoryOwner(id) { const s = typeof STORIES !== "undefined" ? STORIES[id] : null; return (s && s.share) || id; }
let reviewRegCache = null;
function reviewRegistry() {
  if (reviewRegCache) return reviewRegCache;
  const items = [];
  const J = content.journeyData, P = DEFAULT_JOURNEY;
  const live = id => { for (const st of content.journeyData) for (const v of st.verses) if (v.id === id) return v; return null; };
  const sharers = owner => content.journeyData.flatMap(st => st.verses).filter(v => reviewStoryOwner(v.id) === owner);
  const add = it => { it.tags = it.tags || []; items.push(it); };
  /* نص في كائن عام (أسئلة، ألغاز…): يُقرأ ويُكتب بمساره */
  const glob = (sec, key, name, path, extra) => {
    const orig = rvGet(REVIEW_PRISTINE[name], path);
    if (typeof orig !== "string" || !orig.trim()) return;
    add(Object.assign({ sec, key, orig, apply: t => rvSet(reviewGlobal(name), path, t) }, extra));
  };
  P.forEach((pst, si) => {
    const st = J[si]; if (!st) return;
    add({ sec: "title", key: "title|" + pst.id, si, group: "st:" + pst.id, label: "اسم المحطة " + (si + 1), orig: pst.title,
      apply: t => { const s = content.journeyData[si]; if (s) s.title = t; } });
    pst.verses.forEach(pv => {
      const g = "v:" + pv.id, base = { si, vid: pv.id, group: g, n: pv.n };
      add(Object.assign({ sec: "event", key: "event|" + pv.id, label: "الحدث", orig: pv.event, apply: t => { const v = live(pv.id); if (v) v.event = t; } }, base));
      if (pv.meaning) add(Object.assign({ sec: "meaning", key: "meaning|" + pv.id, label: "الشرح", orig: pv.meaning, multiline: true,
        apply: t => { const v = live(pv.id); if (v) v.meaning = t; } }, base));
      const owner = reviewStoryOwner(pv.id), isOwner = owner === pv.id;
      const sTags = [];
      if (pv.storyStatus === "review") sTags.push("قيد المراجعة");
      if (REVIEW_V107_SOURCES.includes(pv.id)) sTags.push("مصدر تغيّر في v107");
      if (pv.story && isOwner) {
        add(Object.assign({ sec: "story", key: "story|" + pv.id, label: "القصة", orig: pv.story, multiline: true, tags: sTags.slice(),
          apply: t => sharers(owner).forEach(v => { v.story = t; }) }, base));
        add(Object.assign({ sec: "sources", key: "sources|" + pv.id, label: "المصادر (مصدر في كل سطر)", orig: (pv.sources || []).join("\n"), multiline: true, tags: sTags.slice(),
          apply: t => { const list = t.split("\n").map(x => x.trim()).filter(Boolean); sharers(owner).forEach(v => { v.sources = list.slice(); v.source = list.join(" ؛ "); }); } }, base));
      }
      if (pv.note && isOwner) add(Object.assign({ sec: "note", key: "note|" + pv.id, label: "الحاشية", orig: pv.note, multiline: true, tags: sTags.slice(),
        apply: t => sharers(owner).forEach(v => { v.note = t; }) }, base));
      if (REVIEW_PRISTINE.STORIES_SHORT[pv.id]) glob("short", "short|" + pv.id, "STORIES_SHORT", [pv.id], Object.assign({ label: "القصة القصيرة للصغير", multiline: true, tags: ["جديد v107"], kidHard: true }, base));
      add(Object.assign({ sec: "tashkeel", key: "tashkeel|" + pv.id, label: "تشكيل البيت (اقتراح فقط، لا يُطبَّق)", orig: pv.fullVerse, suggestOnly: true, apply: () => {} }, base));
      const K = REVIEW_PRISTINE.KHILAF[pv.id];
      if (K) {
        ["title", "question", "agreed"].forEach(f => glob("khilaf", `khilaf|${pv.id}|${f}`, "KHILAF", [pv.id, f], Object.assign({ label: "الخلاف: " + ({ title: "العنوان", question: "سؤال التفكير", agreed: "المتفق عليه" })[f], multiline: f !== "title" }, base)));
        (K.sides || []).forEach((s, i) => ["who", "text", "source"].forEach(f => glob("khilaf", `khilaf|${pv.id}|sides.${i}.${f}`, "KHILAF", [pv.id, "sides", i, f],
          Object.assign({ label: `الخلاف: القول ${i + 1} (${({ who: "القائل", text: "القول", source: "المصدر" })[f]})`, multiline: f !== "who" }, base))));
        (K.think || []).forEach((s, i) => glob("khilaf", `khilaf|${pv.id}|think.${i}`, "KHILAF", [pv.id, "think", i], Object.assign({ label: `الخلاف: خطوة التفكير ${i + 1}`, multiline: true }, base)));
      }
      (REVIEW_PRISTINE.QURAN_LINKS[pv.id] || []).forEach((q, i) => glob("quran", `quran|${pv.id}|${i}`, "QURAN_LINKS", [pv.id, i, "note"], Object.assign({ label: "حاشية الآية " + q.ref, multiline: true }, base)));
    });
    (REVIEW_PRISTINE.QUIZZES[pst.id] || []).forEach((q, i) => {
      const b = { si, vid: q.ref || null, group: `q:${pst.id}:${i}`, quizInVerse: q.ref };
      glob("quiz", `quiz|${pst.id}|${i}|q`, "QUIZZES", [pst.id, i, "q"], Object.assign({ label: `سؤال المحطة ${i + 1}`, kidHard: true }, b));
      glob("quiz", `quiz|${pst.id}|${i}|correct`, "QUIZZES", [pst.id, i, "correct"], Object.assign({ label: `سؤال ${i + 1}: الجواب الصحيح`, mustInVerse: q.ref }, b));
      (q.wrong || []).forEach((w, j) => glob("quiz", `quiz|${pst.id}|${i}|wrong.${j}`, "QUIZZES", [pst.id, i, "wrong", j], Object.assign({ label: `سؤال ${i + 1}: خيار خاطئ ${j + 1}` }, b)));
      glob("quiz", `quiz|${pst.id}|${i}|explain`, "QUIZZES", [pst.id, i, "explain"], Object.assign({ label: `سؤال ${i + 1}: التعقيب`, multiline: true }, b));
    });
    (REVIEW_PRISTINE.DISCUSSION[pst.id] || []).forEach((d, i) => glob("disc", `disc|${pst.id}|${i}`, "DISCUSSION", [pst.id, i], { si, group: "st:" + pst.id, label: `سؤال نقاش ${i + 1}` }));
  });
  REVIEW_PRISTINE.RIDDLES.forEach((r, i) => {
    const si = P.findIndex(s => s.id === r.station), rk = REVIEW_RIDDLE_KEYS[i];
    const b = { si, vid: r.ref, group: "r:" + rk, tags: i >= 16 ? ["جديد v109"] : [], kidHard: true };
    glob("riddle", `riddle|${rk}|riddle`, "RIDDLES", [i, "riddle"], Object.assign({ label: "اللغز", multiline: true }, b));
    glob("riddle", `riddle|${rk}|answer`, "RIDDLES", [i, "answer"], Object.assign({ label: "جواب اللغز", mustInVerse: r.ref, kidHard: false }, b));
  });
  Object.keys(REVIEW_PRISTINE.GEO_PLACES).forEach(name => glob("place", "place|" + name, "GEO_PLACES", [name, "note"],
    { si: -1, group: "p:" + name, label: "ملاحظة المكان: " + name, tags: REVIEW_V107_PLACES.includes(name) ? ["جديد v107"] : [] }));
  Object.keys(REVIEW_PRISTINE.KID_LINES).forEach(k => (REVIEW_PRISTINE.KID_LINES[k] || []).forEach((t, i) =>
    glob("kid", `kid|${k}|${i}`, "KID_LINES", [k, i], { si: -1, group: "k:" + k, label: (REVIEW_PRISTINE.KID_LINES[k].length > 1 ? (i ? "للبنت" : "للولد") : "رسالة") + " · " + k, keepN: /\{N\}/.test(t) })));
  const byKey = new Map(items.map(it => [it.key, it]));
  reviewRegCache = { items, byKey };
  return reviewRegCache;
}
/* الكائنات العامة معرّفة بـ const، فلا تُقرأ من window؛ تُعاد بأسمائها */
function reviewGlobal(name) {
  switch (name) {
    case "QUIZZES": return QUIZZES; case "RIDDLES": return RIDDLES; case "STORIES_SHORT": return STORIES_SHORT;
    case "DISCUSSION": return DISCUSSION; case "KHILAF": return KHILAF; case "QURAN_LINKS": return QURAN_LINKS;
    case "GEO_PLACES": return GEO_PLACES; case "KID_LINES": return KID_LINES;
  }
  return {};
}
function reviewCurrent(it) { const e = reviewStore.edits[it.key]; return e && typeof e.text === "string" ? e.text : it.orig; }

/* ---------- تطبيق التعديلات عند التشغيل وبعد كل تعديل ---------- */
function reviewApplyAll() {
  reviewRegCache = null;
  const reg = reviewRegistry();
  let changed = false;
  for (const [k, e] of Object.entries(reviewStore.edits)) {
    const it = reg.byKey.get(k);
    if (!it || !e || typeof e.text !== "string") continue;
    // دُمج التعديل في التطبيق نفسه (صار النص الأصلي هو المعدَّل): لا حاجة إليه
    if (e.text === it.orig) { delete reviewStore.edits[k]; changed = true; continue; }
    e.conflict = e.orig !== it.orig;
    if (!it.suggestOnly) { try { it.apply(e.text); } catch (err) {} }
  }
  if (changed) reviewSave();
  if (typeof voiceCacheReset === "function") voiceCacheReset();
  if (typeof reviewInlineOn === "function") document.body.classList.toggle("review-inline", reviewInlineOn());
}
/* تحقق قبل الحفظ: يُرجع رسالة خطأ، أو تنبيهاً لا يمنع ({warn}) */
function reviewValidate(it, t) {
  if (!t.trim()) return { err: "النص فارغ" };
  if (t.length > REVIEW_MAX_TEXT) return { err: "النص أطول من المسموح" };
  if (it.keepN && !/\{N\}/.test(t)) return { err: "أبقِ {N} في النص: مكانه اسم الطفل" };
  if (it.suggestOnly && normalizeArabic(t).replace(/\s+/g, " ") !== normalizeArabic(it.orig).replace(/\s+/g, " "))
    return { err: "يُقترح التشكيل فقط: حروف البيت وكلماته لا تتغيّر" };
  if (it.mustInVerse) {
    const v = DEFAULT_JOURNEY.flatMap(s => s.verses).find(x => x.id === it.mustInVerse);
    if (v && !normalizeArabic(v.fullVerse).includes(normalizeArabic(t).replace(/^ال/, ""))) return { warn: "الجواب ليس من لفظ البيت (" + v.fullVerse + ")" };
  }
  return {};
}
function reviewSetText(key, text) {
  const it = reviewRegistry().byKey.get(key); if (!it) return false;
  const t = String(text == null ? "" : text).replace(/\r/g, "");
  const chk = reviewValidate(it, t);
  if (chk.err) { showToast(chk.err, "error"); return false; }
  if (t === it.orig) return reviewRevert(key);
  reviewStore.edits[key] = { orig: it.orig, text: t, at: Date.now(), by: reviewerLabel() };
  if (!it.suggestOnly) it.apply(t);
  const vd = reviewStore.verdicts[key];
  reviewStore.verdicts[key] = Object.assign({}, vd, { v: vd && vd.v === "hard" ? "hard" : "edited", at: Date.now(), by: reviewerLabel() });
  reviewSave();
  if (typeof voiceCacheReset === "function") voiceCacheReset();
  if (chk.warn) showToast("حُفظ، وتنبيه: " + chk.warn, "error"); else showToast("حُفظ التعديل", "success");
  return true;
}
function reviewRevert(key) {
  const it = reviewRegistry().byKey.get(key); if (!it) return false;
  if (!it.suggestOnly) it.apply(it.orig);
  delete reviewStore.edits[key];
  const vd = reviewStore.verdicts[key];
  if (vd && vd.v === "edited") delete reviewStore.verdicts[key];
  reviewSave();
  if (typeof voiceCacheReset === "function") voiceCacheReset();
  return true;
}
function reviewSetVerdict(key, v, note) {
  if (!reviewRegistry().byKey.has(key)) return;
  const cur = reviewStore.verdicts[key] || {};
  if (v && !REVIEW_VERDICTS[v] && v !== "edited") return;
  const nv = { v: v === undefined ? cur.v : v, note: note === undefined ? (cur.note || "") : String(note).slice(0, REVIEW_MAX_NOTE), at: Date.now(), by: reviewerLabel() };
  if (!nv.v && !nv.note) delete reviewStore.verdicts[key]; else reviewStore.verdicts[key] = nv;
  reviewSave();
}
function reviewStatusOf(key) {
  const vd = reviewStore.verdicts[key];
  if (reviewStore.edits[key]) return vd && vd.v === "hard" ? "hard" : vd && vd.v === "check" ? "check" : "edited";
  return vd && vd.v ? vd.v : "";
}
function reviewerLabel() { const r = reviewStore.reviewer; return r ? `${r.name} (${REVIEW_ROLES[r.role] || ""})` : ""; }

/* ---------- الواجهة ---------- */
let reviewView = { sec: "all", si: "all", status: "todo", q: "", group: null, shown: 30, priority: true };
function reviewEnsurePopup() {
  if (document.getElementById("rvPopup")) return;
  const d = document.createElement("div");
  d.className = "modal-overlay"; d.id = "rvPopup";
  d.innerHTML = `<div class="modal-content review-modal">
      <h2 style="color:var(--primary);margin-top:0;text-align:center">📝 وضع المراجعة</h2>
      <div id="rvBody"></div>
      <button class="action-btn btn-gray" onclick="closePopup('rvPopup')" style="width:100%;margin-top:14px">إغلاق</button>
    </div>`;
  document.body.appendChild(d);
}
/* المدخل من منطقة الوالدين (بعد الرقم السري) */
function openReviewMode(filter) {
  reviewEnsurePopup();
  if (!reviewStore.reviewer) return reviewAskWho(() => openReviewMode(filter));
  if (filter && filter.group) reviewView = Object.assign({}, reviewView, { group: filter.group, status: "all", shown: 60 });
  else if (filter === "home") reviewView.group = null;
  document.getElementById("rvPopup").classList.add("active");
  renderReview();
}
function reviewAskWho(then) {
  reviewEnsurePopup();
  const r = reviewStore.reviewer || {};
  document.getElementById("rvBody").innerHTML = `
    <p>من يراجع؟ يظهر الاسم والصفة في ملف المراجعة حين يُصدَّر، ليعرف من يستورده مصدره.</p>
    <input id="rvName" class="ask-input" maxlength="40" placeholder="الاسم، مثل: الأستاذ أحمد" value="${escapeHtml(r.name || "")}">
    <div class="word-bank" style="margin:10px 0">
      ${Object.entries(REVIEW_ROLES).map(([k, n]) => `<label class="tool-btn" style="cursor:pointer"><input type="radio" name="rvRole" value="${k}" ${r.role === k || (!r.role && k === "parent") ? "checked" : ""}> ${n}</label>`).join("")}
    </div>
    <button class="action-btn btn-success" style="width:100%" id="rvWhoOk">متابعة</button>`;
  document.getElementById("rvWhoOk").onclick = () => {
    const name = document.getElementById("rvName").value.trim().slice(0, 40);
    const role = (document.querySelector('input[name="rvRole"]:checked') || {}).value || "parent";
    if (!name) { showToast("اكتب الاسم", "error"); return; }
    reviewStore.reviewer = { name, role }; reviewSave();
    then && then();
  };
  document.getElementById("rvPopup").classList.add("active");
}
function reviewPriority(it) { return it.tags.length ? 0 : (it.sec === "story" || it.sec === "sources" || it.sec === "note") ? 1 : 2; }
function reviewFiltered() {
  const v = reviewView, q = normalizeArabic(v.q || "");
  let list = reviewRegistry().items.filter(it =>
    (!v.group || it.group === v.group) &&
    (v.group || v.sec === "all" || it.sec === v.sec) &&
    (v.group || v.si === "all" || it.si === +v.si) &&
    (v.status === "all" || (v.status === "todo" ? !reviewStatusOf(it.key) : reviewStatusOf(it.key) === v.status)) &&
    (!q || normalizeArabic(reviewCurrent(it) + " " + it.label).includes(q)));
  if (v.priority && !v.group) list = list.map((it, i) => [it, i]).sort((a, b) => reviewPriority(a[0]) - reviewPriority(b[0]) || a[1] - b[1]).map(x => x[0]);
  return list;
}
function reviewCounts() {
  const items = reviewRegistry().items, c = { total: items.length, done: 0, ok: 0, edited: 0, check: 0, hard: 0 };
  items.forEach(it => { const s = reviewStatusOf(it.key); if (s) { c.done++; c[s] = (c[s] || 0) + 1; } });
  return c;
}
function renderReview() {
  const el = document.getElementById("rvBody"); if (!el) return;
  const v = reviewView, c = reviewCounts(), list = reviewFiltered();
  const pct = c.total ? Math.round(c.done * 100 / c.total) : 0;
  const J = content.journeyData;
  const opt = (val, label, cur) => `<option value="${escapeHtml(String(val))}" ${String(cur) === String(val) ? "selected" : ""}>${escapeHtml(label)}</option>`;
  el.innerHTML = `
    <div class="review-who">👤 ${escapeHtml(reviewerLabel())} <button class="tool-btn rv-btn" onclick="reviewAskWho(()=>renderReview())">تغيير</button></div>
    <div class="review-progress"><div style="width:${pct}%"></div></div>
    <div class="rec-count">المُراجَع ${c.done} من ${c.total} نصاً (${pct}٪)<br>صحيح ${c.ok} · معدَّل ${c.edited} · يحتاج نظراً ${c.check} · صعب على الصغير ${c.hard}</div>
    <div class="review-actions">
      <button class="tool-btn rv-btn" onclick="reviewExport()">📤 تصدير المراجعة</button>
      <label class="tool-btn rv-btn" style="cursor:pointer">📥 استيراد مراجعة<input type="file" accept=".json,application/json" style="display:none" onchange="reviewImportFile(this.files[0]); this.value=''"></label>
      <button class="tool-btn rv-btn" onclick="reviewToggleInline()">${reviewInlineOn() ? "✏️ أخفِ أزرار المراجعة في التطبيق" : "✏️ أظهر أزرار المراجعة في التطبيق"}</button>
      <button class="tool-btn rv-btn" onclick="reviewRevertAll()">↩️ أرجع كل التعديلات</button>
    </div>
    ${v.group ? `<div class="review-group">تُعرض نصوص موضع واحد فقط <button class="tool-btn rv-btn" onclick="reviewView.group=null;reviewView.status='todo';renderReview()">كل النصوص</button></div>` : `
    <div class="review-filters">
      <select onchange="reviewView.sec=this.value;reviewView.shown=30;renderReview()">${opt("all", "كل الأنواع", v.sec)}${REVIEW_SECTIONS.map(s => opt(s.id, s.name, v.sec)).join("")}</select>
      <select onchange="reviewView.si=this.value;reviewView.shown=30;renderReview()">${opt("all", "كل المحطات", v.si)}${J.map((s, i) => opt(i, (i + 1) + ". " + s.title, v.si)).join("")}</select>
      <select onchange="reviewView.status=this.value;reviewView.shown=30;renderReview()">${opt("todo", "لم يُراجع بعد", v.status)}${opt("check", "⚠ يحتاج نظراً", v.status)}${opt("edited", "✏️ عدّلته", v.status)}${opt("ok", "✅ صحيح", v.status)}${opt("hard", "👶 صعب على الصغير", v.status)}${opt("all", "الكل", v.status)}</select>
      <input class="ask-input" placeholder="ابحث في النصوص" value="${escapeHtml(v.q)}" onchange="reviewView.q=this.value;reviewView.shown=30;renderReview()">
      <label class="rec-count"><input type="checkbox" ${v.priority ? "checked" : ""} onchange="reviewView.priority=this.checked;renderReview()"> الأولوية أولاً (قيد المراجعة، والجديد، والمصادر المتغيّرة)</label>
    </div>`}
    <div class="rec-count">${list.length} نصاً</div>
    <div id="reviewList">${list.slice(0, v.shown).map(reviewRowHTML).join("") || `<p class="empty-state">لا نصوص هنا 🎉</p>`}</div>
    ${list.length > v.shown ? `<button class="action-btn btn-info" style="width:100%" onclick="reviewView.shown+=30;renderReview()">عرض المزيد (${list.length - v.shown})</button>` : ""}`;
}
function reviewContext(it) {
  const J = DEFAULT_JOURNEY;
  const st = it.si >= 0 ? J[it.si] : null;
  const v = it.vid ? J.flatMap(s => s.verses).find(x => x.id === it.vid) : null;
  return (st ? `${it.si + 1}. ${escapeHtml(st.title)}` : "") + (v ? ` · البيت ${v.n}: <span class="review-verse">${escapeHtml(v.fullVerse)}</span>` : "");
}
function reviewRowHTML(it) {
  const k = escapeForAttr(it.key), st = reviewStatusOf(it.key), e = reviewStore.edits[it.key], vd = reviewStore.verdicts[it.key] || {};
  const cur = reviewCurrent(it);
  const badge = st ? `<span class="review-badge rb-${st}">${escapeHtml(st === "edited" ? "✏️ عدّلته" : REVIEW_VERDICTS[st] || "")}</span>` : "";
  const tags = it.tags.map(t => `<span class="review-tag">${escapeHtml(t)}</span>`).join("");
  return `<div class="review-row" id="rv_${escapeHtml(it.key.replace(/[^a-z0-9]/gi, "_"))}">
    <div class="review-ctx">${reviewContext(it)}</div>
    <div class="review-label">${escapeHtml(it.label)} ${badge} ${tags} ${e && e.conflict ? `<span class="review-tag" style="background:#fde2e2">النص الأصلي تغيّر بعد تعديلك</span>` : ""}</div>
    <div class="review-text${it.multiline ? " ml" : ""}">${escapeHtml(cur)}</div>
    ${e ? `<details class="review-orig"><summary>النص الأصلي</summary>${escapeHtml(it.orig)}${e.by ? `<div class="rec-count">عدّله: ${escapeHtml(e.by)}</div>` : ""}</details>` : ""}
    ${vd.note ? `<div class="review-note">🗒️ ${escapeHtml(vd.note)}</div>` : ""}
    <div class="review-btns">
      <button class="tool-btn rv-btn" onclick="reviewQuick('${k}','ok')">✅ صحيح</button>
      <button class="tool-btn rv-btn" onclick="reviewEdit('${k}')">✏️ عدّل</button>
      <button class="tool-btn rv-btn" onclick="reviewQuick('${k}','check')">⚠ يحتاج نظراً</button>
      ${it.kidHard ? `<button class="tool-btn rv-btn" onclick="reviewQuick('${k}','hard')">👶 صعب على الصغير</button>` : ""}
      ${st ? `<button class="tool-btn rv-btn" onclick="reviewClear('${k}')">↺ ألغِ الحكم</button>` : ""}
    </div>
    <div class="review-editor" hidden></div>
  </div>`;
}
function reviewRowEl(key) { return document.getElementById("rv_" + key.replace(/[^a-z0-9]/gi, "_")); }
function reviewQuick(key, v) {
  if (v === "check" || v === "hard") return reviewEdit(key, v);
  reviewSetVerdict(key, v); renderReview();
}
function reviewClear(key) {
  if (reviewStore.edits[key] && !confirm("سيُرجَع النص إلى أصله ويُلغى الحكم. متابعة؟")) return;
  if (reviewStore.edits[key]) reviewRevert(key);
  delete reviewStore.verdicts[key]; reviewSave(); renderReview();
}
/* نموذج التعديل داخل الصف: النص، والملاحظة، والحكم إن جاء من «يحتاج نظراً» أو «صعب على الصغير» */
function reviewEdit(key, verdict) {
  const it = reviewRegistry().byKey.get(key), row = reviewRowEl(key); if (!it || !row) return;
  const box = row.querySelector(".review-editor"), vd = reviewStore.verdicts[key] || {};
  const onlyNote = !!verdict;
  box.hidden = false;
  box.innerHTML = `
    ${onlyNote ? "" : `<textarea class="review-ta" rows="${it.multiline ? 6 : 2}">${escapeHtml(reviewCurrent(it))}</textarea>
      ${it.suggestOnly ? `<div class="rec-count">غيّر الحركات فقط. يُحفظ اقتراحاً لصاحب المشروع، ولا يتغيّر البيت في التطبيق.</div>` : ""}
      ${it.keepN ? `<div class="rec-count">{N} مكان اسم الطفل، أبقِه.</div>` : ""}`}
    <input class="ask-input review-note-in" maxlength="${REVIEW_MAX_NOTE}" placeholder="${onlyNote ? "ما الذي يحتاج نظراً؟ (اختياري)" : "ملاحظة أو المصدر الذي اعتمدت عليه (اختياري)"}" value="${escapeHtml(vd.note || "")}">
    <div class="review-btns">
      <button class="tool-btn rv-btn edit rv-save">💾 احفظ</button>
      ${!onlyNote && reviewStore.edits[key] ? `<button class="tool-btn rv-btn rv-orig">↩️ أرجع الأصل</button>` : ""}
      <button class="tool-btn rv-btn rv-cancel">إلغاء</button>
    </div>`;
  const ta = box.querySelector(".review-ta");
  if (ta) ta.focus();
  box.querySelector(".rv-cancel").onclick = () => { box.hidden = true; box.innerHTML = ""; };
  const ob = box.querySelector(".rv-orig"); if (ob) ob.onclick = () => { reviewRevert(key); renderReview(); };
  box.querySelector(".rv-save").onclick = () => {
    const note = box.querySelector(".review-note-in").value;
    if (ta && ta.value.replace(/\r/g, "") !== reviewCurrent(it)) { if (!reviewSetText(key, ta.value)) return; }
    reviewSetVerdict(key, verdict || (reviewStore.edits[key] ? (reviewStore.verdicts[key] || {}).v || "edited" : (reviewStore.verdicts[key] || {}).v), note);
    renderReview();
  };
}
function reviewToggleInline() { reviewSetInline(!reviewInlineOn()); renderReview(); }
function reviewRevertAll() {
  const n = Object.keys(reviewStore.edits).length;
  if (!n) { showToast("لا تعديلات", "error"); return; }
  if (!confirm(`سيُرجَع ${n} نصاً إلى أصله على هذا الجهاز (الأحكام والملاحظات تبقى). متابعة؟`)) return;
  Object.keys(reviewStore.edits).forEach(k => reviewRevert(k));
  renderReview();
}
/* زر «راجع» داخل التطبيق: يفتح نصوص الموضع نفسه */
function reviewInlineBtn(group) {
  if (!reviewInlineOn()) return "";
  return `<button class="tool-btn review-inline-btn" onclick="requirePin(()=>openReviewMode({group:'${escapeForAttr(group)}'}),'وضع المراجعة')">📝 راجع</button>`;
}

/* ---------- التصدير والاستيراد ---------- */
function reviewExportDoc() {
  const reg = reviewRegistry(), keys = new Set([...Object.keys(reviewStore.edits), ...Object.keys(reviewStore.verdicts)]);
  const items = [];
  for (const k of keys) {
    const it = reg.byKey.get(k); if (!it) continue;
    const e = reviewStore.edits[k], vd = reviewStore.verdicts[k] || {};
    items.push({ key: k, label: it.label, orig: it.orig, text: e ? e.text : null, verdict: vd.v || null, note: vd.note || "", at: Math.max((e && e.at) || 0, vd.at || 0), by: (e && e.by) || vd.by || "" });
  }
  return { app: "hasaniya", type: "review", version: 1, reviewer: reviewStore.reviewer, createdAt: new Date().toISOString(), contentVersion: CONTENT_VERSION, items };
}
function reviewExport() {
  const doc = reviewExportDoc();
  if (!doc.items.length) { showToast("لا مراجعة بعد للتصدير", "error"); return; }
  const who = (doc.reviewer && doc.reviewer.name || "مراجع").replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 30);
  downloadJson(doc, `hasaniya-review-${who}-${new Date().toISOString().slice(0, 10)}.json`);
  showToast(`صُدّر ${doc.items.length} نصاً`, "success");
}
function reviewValidateDoc(d) {
  const bad = m => ({ ok: false, error: m });
  if (!d || d.app !== "hasaniya" || d.type !== "review" || d.version !== 1) return bad("هذا ليس ملف مراجعة");
  if (!Array.isArray(d.items) || d.items.length > REVIEW_MAX_ITEMS) return bad("محتوى الملف غير صالح");
  const r = d.reviewer;
  if (!r || typeof r.name !== "string" || !r.name.trim() || r.name.length > 40 || !REVIEW_ROLES[r.role]) return bad("الملف بلا اسم مراجع صالح");
  const reg = reviewRegistry(), items = [];
  let unknown = 0;
  for (const x of d.items) {
    if (!x || typeof x.key !== "string" || x.key.length > 120) return bad("عنصر غير صالح");
    const it = reg.byKey.get(x.key);
    if (!it) { unknown++; continue; }
    if (x.text != null && (typeof x.text !== "string" || x.text.length > REVIEW_MAX_TEXT)) return bad("نص غير صالح");
    if (x.verdict != null && !REVIEW_VERDICTS[x.verdict] && x.verdict !== "edited") return bad("حكم غير معروف");
    if (x.note != null && (typeof x.note !== "string" || x.note.length > REVIEW_MAX_NOTE)) return bad("ملاحظة غير صالحة");
    if (x.text != null && reviewValidate(it, x.text).err) { unknown++; continue; }
    items.push({ it, text: x.text, verdict: x.verdict || null, note: x.note || "", origMatches: x.orig === it.orig });
  }
  return { ok: true, items, unknown, reviewer: { name: r.name.trim(), role: r.role }, createdAt: String(d.createdAt || "").slice(0, 10) };
}
let reviewStaged = null;
function reviewImportFile(file) {
  if (!file) return;
  if (file.size > REVIEW_MAX_FILE) { showToast("الملف أكبر من المسموح", "error"); return; }
  const fr = new FileReader();
  fr.onload = () => { let d; try { d = JSON.parse(fr.result); } catch (e) { showToast("ملف غير صالح", "error"); return; } reviewImportDoc(d); };
  fr.readAsText(file);
}
function reviewImportDoc(d) {
  const v = reviewValidateDoc(d);
  if (!v.ok) { showToast(v.error, "error"); return; }
  reviewEnsurePopup();
  const edits = v.items.filter(x => x.text != null && x.text !== x.it.orig);
  const conflicts = edits.filter(x => reviewStore.edits[x.it.key] && reviewStore.edits[x.it.key].text !== x.text);
  reviewStaged = v;
  document.getElementById("rvBody").innerHTML = `
    <div class="review-import-head">📥 مراجعة من: <strong>${escapeHtml(v.reviewer.name)}</strong> (${escapeHtml(REVIEW_ROLES[v.reviewer.role])})${v.createdAt ? ` · ${escapeHtml(v.createdAt)}` : ""}</div>
    <div class="rec-count">${edits.length} تعديلاً، و${v.items.length - edits.length} حكماً أو ملاحظة${conflicts.length ? ` · ⚠ ${conflicts.length} تخالف تعديلاتك` : ""}${v.unknown ? ` · ${v.unknown} لا تطابق هذه النسخة فتُترك` : ""}</div>
    <div class="review-import-list">${edits.slice(0, 15).map(x => `<div class="review-row"><div class="review-ctx">${reviewContext(x.it)}</div><div class="review-label">${escapeHtml(x.it.label)}</div>
      <div class="review-old">${escapeHtml(reviewCurrent(x.it))}</div><div class="review-new">${escapeHtml(x.text)}</div>${x.note ? `<div class="review-note">🗒️ ${escapeHtml(x.note)}</div>` : ""}</div>`).join("")}
      ${edits.length > 15 ? `<div class="rec-count">و${edits.length - 15} غيرها</div>` : ""}</div>
    <div class="review-btns" style="margin-top:10px">
      <button class="action-btn btn-success" onclick="reviewCommitImport(true)">طبّق الكل</button>
      ${conflicts.length ? `<button class="action-btn btn-info" onclick="reviewCommitImport(false)">طبّق ما لا يخالف تعديلاتي</button>` : ""}
      <button class="action-btn btn-gray" onclick="reviewStaged=null;renderReview()">إلغاء</button>
    </div>`;
  document.getElementById("rvPopup").classList.add("active");
}
function reviewCommitImport(all) {
  const v = reviewStaged; if (!v) return;
  const by = `${v.reviewer.name} (${REVIEW_ROLES[v.reviewer.role]})`;
  let n = 0;
  for (const x of v.items) {
    const k = x.it.key, mine = reviewStore.edits[k];
    if (x.text != null && x.text !== x.it.orig) {
      if (mine && mine.text !== x.text && !all) continue;
      reviewStore.edits[k] = { orig: x.it.orig, text: x.text, at: Date.now(), by };
      if (!x.it.suggestOnly) x.it.apply(x.text);
      n++;
    }
    if (x.verdict || x.note) {
      const cur = reviewStore.verdicts[k] || {};
      reviewStore.verdicts[k] = { v: x.verdict || cur.v, note: [cur.note, x.note && `${by}: ${x.note}`].filter(Boolean).join(" | ").slice(0, REVIEW_MAX_NOTE), at: Date.now(), by };
    }
  }
  reviewStaged = null;
  reviewSave();
  if (typeof voiceCacheReset === "function") voiceCacheReset();
  showToast(`طُبّق ${n} تعديلاً من ${v.reviewer.name}`, "success");
  renderReview();
}
