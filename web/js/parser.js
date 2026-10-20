/* ============================================================
   المحلل — يحوّل RAW_MANZUMAH + STORIES + EXPLANATIONS إلى journeyData
   ============================================================ */
const PARSE_WARNINGS = [];
const SHOWN_STORY_STATUSES = ["ok", "book"];

/** تطبيع عربي للمقارنة: يحذف التشكيل والتطويل ويوحّد الألفات والياء والتاء المربوطة */
function normalizeArabic(s) {
  return String(s || "")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "")
    .replace(/[ً-ٰٟۖ-ۭـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

/* موضع الفصل بين الشطرين (عدد كلمات الصدر). المنظومة من الرجز المزدوج: آخر الصدر يوافق قافية العجز،
   فيُختار أقرب موضع إلى المنتصف تتفق فيه القافيتان. وما لا تكشفه القافية مضبوط يدوياً. */
const HEMISTICH_OVERRIDES = { s4v6: 2, s4v9: 3, s5v5: 3, s11av6: 3, s13v5: 4 };
function hemistichSplit(id, words) {
  const n = words.length;
  if (HEMISTICH_OVERRIDES[id] && HEMISTICH_OVERRIDES[id] < n) return HEMISTICH_OVERRIDES[id];
  const rhyme = w => w.replace(/[\u064B-\u0652\u0670]/g, "").replace(/[أإآٱ]/g, "ا").replace(/[اوىيه]+$/, "").slice(-1);
  const r = rhyme(words[n - 1]);
  const cands = [];
  for (let k = 2; k <= n - 2; k++) if (rhyme(words[k - 1]) === r) cands.push(k);
  cands.sort((a, b) => Math.abs(a - n / 2) - Math.abs(b - n / 2));
  return cands.length ? cands[0] : Math.ceil(n / 2);
}

function parseManzumah(rawText, stories, explanations) {
  stories = stories || {};
  explanations = explanations || {};
  const stations = [];
  let current = null, counter = 0;

  rawText.split("\n").map(l => l.trim()).filter(Boolean).forEach(line => {
    if (line.startsWith("@")) {
      const p = line.slice(1).split("|");
      current = {
        id: p[0] || ("s" + (stations.length + 1)),
        title: p[1] || "محطة", icon: p[2] || "📖",
        reward: { name: p[3] || "مكافأة", icon: p[4] || "🏅", unlocked: false },
        verses: []
      };
      stations.push(current); counter = 0; return;
    }
    if (!current) return;
    const p = line.split("||");
    const fullVerse = (p[0] || "").trim();
    const words = fullVerse.split(/\s+/).filter(Boolean);
    if (words.length < 2) return;

    counter++;
    const id = current.id + "v" + counter;
    let st = stories[id];
    let shared = false;
    // قصة واحدة قد تغطي عدة أبيات: البيت التابع يحيل إلى بيت القصة بـ share
    if (st && st.share) { st = stories[st.share]; shared = true; }
    let story = "", sources = [], note = "", storyStatus = "";
    if (st) {
      storyStatus = st.status || "review";
      note = st.note || "";
      if (!shared && st.anchor && !normalizeArabic(fullVerse).includes(normalizeArabic(st.anchor))) {
        PARSE_WARNINGS.push(`${id}: الكلمة المرجعية «${st.anchor}» ليست في البيت`);
      } else if (SHOWN_STORY_STATUSES.includes(storyStatus)) {
        story = st.story || "";
        sources = Array.isArray(st.sources) ? st.sources.slice() : [];
      }
    }
    current.verses.push({
      id, type: "word_order", fullVerse,
      words: words.slice(), correctOrder: words.slice(), half: hemistichSplit(id, words),
      event: (p[1] || "").trim() || current.title,
      meaning: explanations[id] || "",
      story, source: sources.join(" ؛ "), sources, storyStatus, note
    });
  });
  return stations;
}

const DEFAULT_JOURNEY = parseManzumah(
  RAW_MANZUMAH,
  typeof STORIES !== "undefined" ? STORIES : {},
  typeof EXPLANATIONS !== "undefined" ? EXPLANATIONS : {}
);
