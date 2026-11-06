/* يُحمَّل في النافذة الرئيسية فقط (لا نوافذ الطباعة)، مع العزل الكامل (contextIsolation وsandbox).
   يكشف للصفحة شيئاً واحداً: ساعة الجهاز الداخلية (منذ تشغيل الجهاز)، لا يغيّرها تعديل التاريخ والوقت،
   لحساب مدة انتظار إلغاء الرقم السري — مثل AndroidBridge.clockInfo في أندرويد.
   النتيجة نص JSON: {"mono": ملّي ثانية منذ تشغيل الجهاز، "boot": -1}
   boot = -1 مقصود (لا عدّاد تشغيل على الحاسوب): الصفحة تعرف أن الجهاز أُعيد تشغيله حين يصغر mono. */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("HasaniyaDesktop", {
  clockInfo: () => ipcRenderer.sendSync("hasaniya-clock")
});
