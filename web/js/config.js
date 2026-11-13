/* الثوابت العامة */
const STORAGE_CONTENT = "hasaniya_v13_content";
const STORAGE_USERS   = "hasaniya_v13_users";
const STORAGE_ACTIVE  = "hasaniya_v13_activeUserId";
const STORAGE_PIN     = "hasaniya_v13_parentPin";   // نسخة للإصدارات القديمة فقط (تطلب الرقم)، لا يُقرأ منها
const STORAGE_PIN2    = "hasaniya_pin_v2";          // v104: المرجع الوحيد للرقم السري
const STORAGE_PIN_MIG = "hasaniya_pin_v2_migrated";
/* v105: تذكير النسخة الاحتياطية: آخر نسخة، وتسجيلات المعلم منذ آخر تصدير، وتأجيل التذكير */
const STORAGE_LAST_BACKUP   = "hasaniya_last_backup";
const STORAGE_RECS_SINCE    = "hasaniya_recs_since_export";
const STORAGE_BACKUP_SNOOZE = "hasaniya_backup_snooze";
const OLD_V12_CONTENT = "hasaniya_v12_content";
const OLD_V12_USERS   = "hasaniya_v12_users";
const OLD_V12_ACTIVE  = "hasaniya_v12_activeUserId";
const OLD_V12_PIN     = "hasaniya_v12_parentPin";

const MODE_NORMAL="normal",MODE_REVIEW="review",MODE_CHALLENGE="challenge",
      MODE_FOCUS="focus",MODE_PREVIEW="preview";

const AVATARS = ["🦁","🐯","🐻","🐼","🦊","🐰","🐸","🐵","🦄","🐧","🐨","🐺","🦉","🐢","🦋","🌟","⭐","🌙","☀️","🌈"];

/* غيّر هذا الرقم كلما عدّلت نص المنظومة أو القصص أو الشروح ليُحدَّث المحتوى المخزّن عند المستخدمين */
const CONTENT_VERSION = 42;

/* v105: بصمة الصوت البشري المضمّن (audio/voice-pack.zip). فارغة = لا صوت مضمّن.
   لا تُكتب باليد: تكتبها الأداة tools/bundle-voice-pack.js مع الملف نفسه */
const BUNDLED_VOICE_ID = "";
