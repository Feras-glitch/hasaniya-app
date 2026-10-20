/* اختبارات v62: الغريب مرتبط بنص القصة، وأسئلة الفهم تستند إلى البيت، والروابط القرآنية على أبيات موجودة */
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const ctx = { console };
vm.createContext(ctx);
["js/data/manzumah.js", "js/data/stories.js", "js/data/explanations.js", "js/data/links.js", "js/data/quizzes.js", "js/parser.js", "js/exercises.js"]
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f }));
const get = expr => vm.runInContext(expr, ctx);
const norm = get("normalizeArabic");
const verses = get("DEFAULT_JOURNEY").flatMap(st => st.verses);
const byId = Object.fromEntries(verses.map(v => [v.id, v]));
const STORIES = get("STORIES");
let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log("ok   ", name);
  else { failed++; console.log("FAIL ", name, detail || ""); }
}

check("لا تحذير من تطابق الكلمات المرجعية", get("PARSE_WARNINGS").length === 0, get("PARSE_WARNINGS").join(" | "));
check("معرّفات الأبيات فريدة", new Set(verses.map(v => v.id)).size === verses.length);

for (const g of get("GLOSSARY")) {
  const v = byId[g.ref];
  const inText = v && (norm(v.fullVerse).includes(norm(g.term)) || norm((STORIES[g.ref] || {}).story || "").includes(norm(g.term)));
  check(`الغريب «${g.term}» موجود في بيته أو قصته`, !!inText, g.ref);
}

/* مطابقة النص القرآني مع ملف تنزيل: نزيل الحركات والرموز ونقارن كل سطر */
const tanzil = fs.readFileSync(path.join(__dirname, "data/quran-uthmani-tanzil.xml"), "utf8");
const ayat = new Map();
for (const sm of tanzil.matchAll(/<sura index="(\d+)"[^>]*>([\s\S]*?)<\/sura>/g))
  for (const am of sm[2].matchAll(/<aya index="(\d+)" text="([^"]*)"/g)) ayat.set(sm[1] + ":" + am[1], am[2]);
const skel = s => s.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u06DD-\u06DE\u06E9\u0660-\u0669\u06F0-\u06F9\u08D3-\u08FF\s]/g, "")
  .replace(/\u0671/g, "\u0627").replace(/[\u0622\u0623\u0625]/g, "\u0627").replace(/\u0649/g, "\u064A").replace(/\u0629/g, "\u0647")
  .replace(/…/g, "");
const suraAya = { "الفيل": "105", "العلق": "96", "الضحى": "93", "الحجر": "15", "الشعراء": "26", "القمر": "54", "النجم": "53", "الشرح": "94", "الإسراء": "17", "التوبة": "9", "البقرة": "2", "آل عمران": "3" };
for (const [id, list] of Object.entries(get("QURAN_LINKS"))) {
  check(`رابط قرآني على بيت موجود ${id}`, !!byId[id]);
  for (const q of list) {
    const sura = suraAya[q.ref.split(" ")[0]] || (q.ref.match(/^(\S+)/) || [])[1];
    const m = q.ref.match(/(\d+):(\d+)(?:–(\d+))?/);
    const from = +m[2], to = m[3] ? +m[3] : from;
    const verse = Array.from({ length: to - from + 1 }, (_, i) => ayat.get(m[1] + ":" + (from + i)) || "").join(" ");
    const lines = q.text.split("\n").map(skel).filter(Boolean);
    const ok = lines.every(l => skel(verse).includes(l));
    check(`نص ${q.ref} مطابق لملف تنزيل`, ok && lines.length > 0);
  }
}

for (const [station, qs] of Object.entries(get("QUIZZES"))) {
  for (const q of qs) {
    const v = byId[q.ref];
    const ok = v && norm(v.fullVerse).includes(norm(q.correct));
    check(`سؤال ${station}: الإجابة «${q.correct}» موجودة في البيت ${q.ref}`, !!ok);
  }
}

for (const [id, s] of Object.entries(STORIES)) {
  if (s.share) continue;
  if (s.status === "ok" || s.status === "book") {
    check(`قصة ${id} لها نص ومصدر`, !!(s.story && s.sources && s.sources.length));
  }
}

/* التمارين: كل سؤال صحيح، والاسم أو المكان لم يبقَ ظاهراً في نص السؤال */
const journey = get("DEFAULT_JOURNEY");
const exPlaces = get("buildPlaceQs(100, DEFAULT_JOURNEY)");
const exFigs = get("buildFigureQs(100, DEFAULT_JOURNEY)");
check("توجد أسئلة أماكن", exPlaces.length >= 5);
check("توجد أسئلة أسماء", exFigs.length >= 5);
let badEx = null;
for (const q of [...exPlaces, ...exFigs]) {
  const hasCorrect = q.options.includes(q.correct);
  const unique = new Set(q.options).size === q.options.length;
  const masked = !norm(q.prompt).includes(norm(q.correct));
  if (!(hasCorrect && unique && masked) && !badEx) badEx = q.verseId;
}
check("أسئلة التمارين سليمة (الإجابة ضمن الخيارات، والاسم مخفي)", badEx === null);
console.log(failed ? `\n${failed} فشل` : "\nكل الاختبارات نجحت");
process.exit(failed ? 1 : 0);
