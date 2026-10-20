/* اسأل المنظومة: يبحث في الأبيات عن كلمات السؤال */
const ASK_STOP_RAW = ["ما", "من", "في", "على", "إلى", "عن", "هل", "كم", "كان", "الذي", "التي", "أين", "متى", "كيف", "لماذا", "أن", "إن", "هو", "هي", "و"];
function askTokens(q) {
  const stop = new Set(ASK_STOP_RAW.map(normalizeArabic));
  return normalizeArabic(q).split(" ").filter(t => t.length >= 3 && !stop.has(t));
}
function askManzumah(q) {
  const toks = askTokens(q);
  if (!toks.length) return [];
  const res = [];
  content.journeyData.forEach(st => st.verses.forEach(v => {
    const n = normalizeArabic(v.fullVerse);
    const score = toks.filter(t => n.includes(t)).length;
    if (score) res.push({score, station: st, verse: v});
  }));
  return res.sort((a, b) => b.score - a.score).slice(0, 5);
}
function showAsk() {
  openHub("💬 اسأل المنظومة", `
    <input id="askIn" placeholder="مثال: من أرضع النبي؟" class="ask-input"
      onkeydown="if(event.key==='Enter')runAsk()">
    <button class="action-btn" style="width:100%;margin-top:8px" onclick="runAsk()">ابحث 🔍</button>
    <div id="askOut" style="margin-top:12px;text-align:right"></div>`);
  setTimeout(() => { const i = document.getElementById("askIn"); if (i) i.focus(); }, 100);
}
function runAsk() {
  const q = document.getElementById("askIn").value;
  const out = document.getElementById("askOut");
  const res = askManzumah(q);
  if (!res.length) { out.innerHTML = `<p class="empty-state">لم أجد بيتاً يطابق السؤال. جرّب كلمة أوضح من البيت.</p>`; return; }
  out.innerHTML = res.map(r => `
    <div class="ask-result">
      <small>${escapeHtml(r.station.icon)} ${escapeHtml(r.station.title)}</small>
      <div class="ask-verse">${escapeHtml(r.verse.fullVerse)}</div>
      ${r.verse.story && state.storyUnlocked && state.storyUnlocked[r.verse.id]
        ? `<div class="ask-story">${escapeHtml(r.verse.story)}</div>` : ""}
    </div>`).join("");
}
