/* بطاقات للطباعة: وجه فيه البيت، وظهر فيه الحدث والشرح */
function buildCardsHtml(stations) {
  const cards = stations.flatMap(st => st.verses.map(v => `
    <div class="pc">
      <div class="pc-front">
        <div class="pc-station">${escapeHtml(st.icon)} ${escapeHtml(st.title)}</div>
        <div class="pc-verse">${escapeHtml(v.fullVerse)}</div>
      </div>
      <div class="pc-back">
        <div class="pc-event">${escapeHtml(v.event)}</div>
        <div class="pc-meaning">${escapeHtml(v.meaning || "")}</div>
      </div>
    </div>`)).join("");
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<title>بطاقات المنظومة الحسنية</title>
<style>
@page{size:A4;margin:10mm}
body{font-family:Tahoma,'Segoe UI',sans-serif;margin:0;color:#222}
h1{text-align:center;color:#d81b60;font-size:18px;margin:4px 0 10px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.pc{border:2px solid #d81b60;border-radius:10px;padding:8px;min-height:120px;page-break-inside:avoid;display:flex;flex-direction:column;justify-content:center;text-align:center}
.pc-station{font-size:11px;color:#888}
.pc-verse{font-size:15px;line-height:1.9;margin-top:6px}
.pc-back{display:none}
.pc-event{font-weight:bold;color:#d81b60;font-size:13px}
.pc-meaning{font-size:11px;margin-top:6px;line-height:1.6}
@media print{.noprint{display:none}}
</style></head><body>
<div class="noprint" style="text-align:center;margin:8px"><button onclick="window.print()">🖨️ طباعة</button></div>
<h1>المنظومة الحسنية — بطاقات الحفظ</h1>
<div class="grid">${cards}</div>
</body></html>`;
}
function printAllCards() {
  closePopup("hubPopup");
  const w = window.open("", "_blank");
  if (!w) { showToast("افتح النوافذ المنبثقة لطباعة البطاقات", "error"); return; }
  w.document.open();
  w.document.write(buildCardsHtml(content.journeyData));
  w.document.close();
}
