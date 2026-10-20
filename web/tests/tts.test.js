/* يتحقق من تهيئة النص للقراءة الآلية: الوقف على آخر الكلمة، والتاء المربوطة هاءً، وحذف علامات الوقف القرآنية */
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "js/audio.js"), "utf8");
const start = src.indexOf("const TTS_STOP_MARKS");
const end = src.indexOf("function speakQueue");
const ttsText = new Function(src.slice(start, end) + "\nreturn ttsText;")();

const cases = [
  ["الْحَمْدُ لِلْمَحْمُودِ الْوَاحِدِ الْمَعْبُودِ", "الْحَمْدُ لِلْمَحْمُودِ الْوَاحِدِ الْمَعْبُود"],
  ["الْمَحْمُودَةُ", "الْمَحْمُودَه"],
  ["كِتَابٌ جَمِيلٌ.", "كِتَابٌ جَمِيل."],
  ["حَمْدًا يَدُومُ سَرْمَدًا", "حَمْدًا يَدُومُ سَرْمَدًا"],
  ["قَالَ: الْحَقُّ، ثُمَّ سَكَتَ", "قَال: الْحَقّ، ثُمَّ سَكَت"],
  ["ذَهَبَ إِلَى الْمَدِينَةِ", "ذَهَبَ إِلَى الْمَدِينَه"],
  ["ۖ الْحَمْدُ ۗ لِلَّهِ", "الْحَمْدُ لِلَّه"],
];
const fail = [];
for (const [input, expected] of cases) {
  const got = ttsText(input);
  if (got !== expected) fail.push(`«${input}»: الناتج «${got}» والمتوقع «${expected}»`);
}
/* النص المعروض لا يتغيّر: الدالة لا تعدّل إلا نسخة النطق */
const shown = "الْحَمْدُ لِلَّهِ";
ttsText(shown);
if (shown !== "الْحَمْدُ لِلَّهِ") fail.push("النص المعروض تغيّر");
if (fail.length) { console.error(fail.join("\n")); process.exit(1); }
console.log("تهيئة القراءة الآلية تطابق قواعد الوقف في الحالات المختبرة");
