/* v67: ترجمة واجهة الوالدين إلى الإنجليزية. المحتوى (المنظومة والقصص وأسماء الأطفال) يبقى بالعربية كما كتب. */
const PARENT_EN = {
  "أهلاً بك في وضع الأسرة 👋": "Welcome to parent mode 👋",
  "الأرقام أعلاه تُظهر تقدّم الطفل، وقسم «نقاط تحتاج إلى تكرار» يبيّن ما يحتاج مراجعة.": "The numbers above show the child's progress. The “points to review” section shows what needs practice.",
  "التسجيلات تبقى على هذا الجهاز، ولا تُرسل إلا عندما تضغط زر الإرسال بنفسك.": "Recordings stay on this device and are sent only when you press the send button yourself.",
  "أزرار «التوثيق» و«عينة للمراجعة» تساعدك على التحقق من مصادر القصص، والتحرير والحذف يطلبان الرقم السري.": "The “Documentation” and “Review sample” buttons help you check story sources. Editing and deleting require the PIN.",
  "فهمت، ابدأ": "Got it, start",
  "🔊 قراءة التعليمات والرسائل للطفل تلقائياً": "🔊 Read instructions and messages aloud to the child",
  "تشغيل": "On",
  "إيقاف": "Off",
  "🔍 عينة للمراجعة": "🔍 Review sample",
  "✍️ توقيع الوالد": "✍️ Parent signature",
  "🎖️ سجل الشهادات": "🎖️ Certificate log",
  "🎙️ استوديو التسجيل": "🎙️ Recording studio",
  "🏫 لوحة الصف": "🏫 Class dashboard",
  "📊 تقرير المتابعة": "📊 Progress report",
  "الطفل الحالي:": "Current child:",
  "محطات مكتملة": "Stations completed",
  "كلمات للمراجعة": "Words to review",
  "مجموع النقاط": "Total points",
  "وقت التدريب": "Practice time",
  "نسبة الإنجاز": "Completion",
  "الإنجازات": "Achievements",
  "🎯 مستوى الإتقان": "🎯 Mastery level",
  "🏅 تحدّي الأسرة هذا الأسبوع": "🏅 Family challenge this week",
  "📝 نقاط تحتاج إلى تكرار:": "📝 Points that need review:",
  "✏️ تحرير": "✏️ Edit",
  "👥 المستخدمون": "👥 Children",
  "📸 مشاركة": "📸 Share",
  "📤 تقرير": "📤 Report",
  "🔐 الرقم السري": "🔐 PIN",
  "🔄 تصفير": "🔄 Reset",
  "⚙️ الإعدادات": "⚙️ Settings",
  "📋 التوثيق": "📋 Coverage",
  "📝 تقرير الأسبوع": "📝 Weekly report",
  "💬 أسئلة النقاش": "💬 Discussion",
  "🖨️ تقرير للمعلم": "🖨️ Teacher report",
  "💾 نسخة احتياطية": "💾 Backup",
  "📥 استعادة نسخة": "📥 Restore backup",
  "العودة": "Back",
  "وضع الأسرة 👨‍👩‍👧": "Parent mode 👨‍👩‍👧",
  "إتقان الأبيات": "Verses mastered",
  "نظافة الأخطاء": "Clean answers",
  "جودة الجلسات": "Session quality",
  "الالتزام": "Consistency",
  "إتقان الحفظ": "Memorization mastery",
  "متقنة من": "mastered of",
  "بيتاً مرئياً": "verses seen",
  "التقدم في المنظومة": "Poem progress",
  "لا تدخل في الإتقان": "not part of mastery",
  "🛟 استعادة تلقائية": "🛟 Auto restore",
  "الإنجازات:": "Achievements:",
  "مبتدئ": "Beginner",
  "مبتدئ متحسن": "Improving beginner",
  "متوسط": "Intermediate",
  "متقدم": "Advanced",
  "حافظ متقن": "Skilled memorizer",
  "الطفل متقن للحفظ.": "The child has mastered the memorization."
};
let parentLang = "ar";

function parentLangCurrent() { return parentLang; }
function tParent(ar) { return parentLang === "en" && PARENT_EN[ar] ? PARENT_EN[ar] : ar; }

/* يطبّق اللغة على عناصر وضع الأسرة ذات السمة data-i18n، ويحفظ النص العربي الأصلي */
function applyParentLang() {
  const scr = document.getElementById("parentScreen");
  if (!scr) return;
  scr.querySelectorAll("[data-i18n]").forEach(el => {
    if (!el.dataset.ar) el.dataset.ar = el.textContent.trim();
    el.textContent = tParent(el.dataset.ar);
  });
  scr.dir = parentLang === "en" ? "ltr" : "rtl";
  scr.lang = parentLang;
  const title = document.getElementById("appTitle");
  if (title && scr.style.display !== "none") title.innerText = tParent("وضع الأسرة 👨‍👩‍👧");
}
function setParentLang(lang) {
  parentLang = lang === "en" ? "en" : "ar";
  applyParentLang();
}
