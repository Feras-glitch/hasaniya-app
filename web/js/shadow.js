/* ردّد معي: يعرض البيت كاملاً ويقرؤه بصوت الوالد أو الآلي. لا يسمع الطفل ولا يصحّح نطقه،
   لأن التعرّف على الصوت العربي كان يخطئ في كلمات صحيحة (مثل «محمود» و«عدداً»). */
function startShadow() {
  const out = document.getElementById("shadowResult");
  if (!out) return;
  const cur = getCurrentVerse(); if (!cur) return;
  if (typeof audioStopAll === "function") audioStopAll();
  // كل كلمة قابلة للنقر: يسمعها الطفل وحدها عند الحاجة
  const words = cur.verse.words.map(w => `<span class="speak-word" onclick="speak('${escapeForAttr(w)}')" style="cursor:pointer;padding:0 2px;border-bottom:1px dashed #bbb">${escapeHtml(w)}</span>`).join(" ");
  out.innerHTML = `<div class="shadow-words" style="font-size:1.25rem;line-height:2">${words}</div>
    <div class="rec-count">اضغط أي كلمة لتسمعها</div>
    <div class="controls" style="margin-top:8px"><button class="tool-btn" onclick="speak('${escapeForAttr(cur.verse.fullVerse)}')">🔊 اسمع مرة أخرى</button></div>`;
  const v = cur.verse;
  if (typeof playVerseAndStory === "function") playVerseAndStory(v, false);
  else speak(v.fullVerse);
}
/* يُمنح الثواب (نقاط أو احتساب إتقان) مرة واحدة فقط لكل بيت في اليوم الواحد.
   يُرجع true إذا كان هذا أول احتساب اليوم، ويُسجَّل الاحتساب فوراً. */
function firstCreditToday(key) {
  state.dailyCredits = state.dailyCredits || {};
  const day = new Date().toDateString();
  if (state.dailyCredits[key] === day) return false;
  // تنظيف: ما مضى يومه لا حاجة له، فلا يكبر المخزن بلا حد
  const keys = Object.keys(state.dailyCredits);
  if (keys.length > 1500) keys.forEach(k => { if (state.dailyCredits[k] !== day) delete state.dailyCredits[k]; });
  state.dailyCredits[key] = day;
  if (typeof saveState === "function") saveState();
  return true;
}

/* رتّب الكلمات: كلمات البيت مخلوطة، والطفل ينقرها بالترتيب الصحيح. يكشف التبديل الذي لا يلتقطه التعرّف الصوتي */
let TAP_STATE = null;
/* خلط Fisher–Yates: كل ترتيب ممكن متساوي الاحتمال، ولا يُعاد الترتيب الأصلي إلا بالصدفة النادرة */
function shuffleWords(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function startTapOrder() {
  const out = document.getElementById("shadowResult");
  const cur = getCurrentVerse(); if (!cur || !out) return;
  let shuffled = cur.verse.words.map((w, i) => ({ w, i }));
  // إن جاء الخلط مطابقاً للأصل نعيد الخلط، حتى لا يكون التمرين محلولاً من البداية
  for (let tries = 0; tries < 5; tries++) {
    shuffled = shuffleWords(shuffled);
    if (shuffled.some((x, k) => x.i !== k)) break;
  }
  TAP_STATE = { verse: cur.verse, shuffled, picked: [] };
  renderTapOrder(out);
}
function renderTapOrder(out) {
  const st = TAP_STATE;
  const bank = st.shuffled.map((x, k) =>
    `<button class="word-btn ${st.picked.includes(k) ? "selected" : ""}" onclick="pickTapWord(${k})">${escapeHtml(x.w)}</button>`).join("");
  const built = st.picked.map(k => escapeHtml(st.shuffled[k].w)).join(" ");
  out.innerHTML = `<div><strong>🔀 انقر كلمات البيت بالترتيب الصحيح:</strong></div>
    <div class="order-built">${built || "…"}</div>
    <div class="word-bank">${bank}</div>
    <div class="controls" style="margin-top:8px"><button class="tool-btn" onclick="startTapOrder()">↺ ابدأ من جديد</button></div>`;
}
function pickTapWord(k) {
  const st = TAP_STATE; if (!st || st.picked.includes(k)) return;
  st.picked.push(k);
  const out = document.getElementById("shadowResult");
  if (st.picked.length < st.shuffled.length) { renderTapOrder(out); return; }
  // التحقق بنص الكلمة لا برقمها: إن تكررت كلمة في البيت فتبديل النسختين ليس خطأً
  const got = st.picked.map(j => st.shuffled[j].w);
  const cells = got.map((w, pos) => {
    const ok = w === st.verse.words[pos];
    return `<span class="${ok ? "hit" : "miss"}">${escapeHtml(st.verse.words[pos])}</span>`;
  }).join(" ");
  const right = got.filter((w, pos) => w === st.verse.words[pos]).length;
  const total = got.length;
  const allOk = right === total;
  let credit = "";
  if (allOk && !noCredit() && firstCreditToday("tap|" + st.verse.id)) addPoints(3);
  else if (allOk && !noCredit()) credit = "<div class='rec-count'>أُحتسبت النقاط لهذا البيت اليوم بالفعل</div>";
  out.innerHTML = `<div class="shadow-words">${cells}</div>
    <strong>${Math.round(right / total * 100)}%</strong> ${allOk
      ? "🌟 ممتاز! " + gForm("رتّبتَ", "رتّبتِ") + " البيت كله بترتيبه الصحيح"
      : "الكلمات الحمراء في غير مكانها. جرّب مرة أخرى"}
    ${credit}
    <div class="controls" style="margin-top:8px"><button class="tool-btn" onclick="startTapOrder()">↺ ابدأ من جديد</button></div>`;
}
