# مصادر رسم الآيات (مصحف المدينة، QPC V2)

هذه الملفات محفوظة هنا حتى لا تضيع. التطبيق لا يحمّلها مباشرة؛ تولّد منها الأداة `tools/build_quran_glyphs.py` ما يحتاجه التطبيق.

| الملف | ما هو | من أين |
|---|---|---|
| `qpc-v2-ayah-by-ayah-glyphs.json.zip` | رموز كل آية كاملة (مع علامة رقمها) ورقم صفحتها في المصحف، 6236 آية | أرسله فراس (v108)، من مكتبة QUL (Tarteel) |
| `qpc-v2-ayah-by-ayah-glyphs.db.zip` | البيانات نفسها بصيغة SQLite (جدول `verses`) | أرسله فراس مع الأول |
| `fonts/QCF2NNN.ttf` | خط صفحة المصحف NNN من خطوط مجمع الملك فهد لطباعة المصحف الشريف (الإصدار الثاني) | مستودع `nuqayah/qpc-fonts`، مجلد `mushaf-v2`، الإيداع `8a4f39d`؛ وأصلها من qurancomplex.gov.sa |

الرموز لا تُقرأ إلا بخط صفحتها: رموز الآية في صفحة 601 تُرسم بخط `QCF2601.ttf` فقط.

## إضافة آية جديدة
1. أضف الآية إلى `web/js/data/links.js` (الحقل `ref` بصيغة «السورة رقم:من–إلى»، والحقل `text` نص تنزيل).
2. إن كانت في صفحة ليس خطها هنا، انسخ `QCF2NNN.ttf` من المصدر نفسه إلى `fonts/`.
3. شغّل `python3 tools/build_quran_glyphs.py` (يحتاج `pyftsubset` من حزمة fonttools).
4. أضف الخط الجديد `fonts/qpc-pNNN.woff` إلى قائمة `ASSETS` في `web/sw.js`. ويتحقق `tests/quran-glyphs.test.js` من ذلك كله.

بصمات الملفين كما وصلا (sha256):
- json.zip: `d7a10dc44dcc561a4019fda2d9db2fedec0bfbed7ce727fd3677e294a75836b1`
- db.zip: `9d6c655df334e7f782a363f44e8b035efe346600203d714cf47aeb72c40bbf54`
