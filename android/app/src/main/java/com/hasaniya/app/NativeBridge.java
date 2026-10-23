package com.hasaniya.app;

import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.util.Locale;

/** Native services exposed to the web app as window.AndroidBridge. */
public class NativeBridge {
    private final MainActivity act;
    private final WebView web;
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private boolean ttsWarned = false;
    private volatile boolean speaking = false;
    /** حالة محرك النطق للصفحة: init (يبدأ)، ok، noarabic (لا عربية)، none (لا محرك) */
    private volatile String ttsState = "init";
    private WebView printView;

    public NativeBridge(MainActivity act, WebView web) {
        this.act = act;
        this.web = web;
        tts = new TextToSpeech(act, status -> {
            if (status != TextToSpeech.SUCCESS) ttsState = "none";
            if (status == TextToSpeech.SUCCESS) {
                int r = tts.setLanguage(new Locale("ar"));
                ttsReady = r != TextToSpeech.LANG_MISSING_DATA && r != TextToSpeech.LANG_NOT_SUPPORTED;
                ttsState = ttsReady ? "ok" : "noarabic";
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String id) { speaking = true; js("window.__ttsEvent&&window.__ttsEvent('start'," + JSONObject.quote(id) + ")"); }
                    @Override public void onDone(String id) { speaking = false; js("window.__ttsEvent&&window.__ttsEvent('end'," + JSONObject.quote(id) + ")"); }
                    @Override public void onError(String id) { speaking = false; js("window.__ttsEvent&&window.__ttsEvent('error'," + JSONObject.quote(id) + ")"); }
                    @Override public void onStop(String id, boolean interrupted) { speaking = false; js("window.__ttsEvent&&window.__ttsEvent('error'," + JSONObject.quote(id) + ")"); }
                });
            }
        });
    }

    private void js(String code) {
        web.post(() -> web.evaluateJavascript(code, null));
    }

    // ---------- TTS ----------
    @JavascriptInterface
    public void speak(String id, String text, double rate, double pitch) {
        act.runOnUiThread(() -> {
            if (tts == null || !ttsReady) {
                if (!ttsWarned) {
                    ttsWarned = true;
                    Toast.makeText(act, "صوت القراءة العربي غير مثبّت. ثبّته من إعدادات الجهاز > اللغة > تحويل النص إلى كلام", Toast.LENGTH_LONG).show();
                }
                // سبب الخطأ يصل إلى الصفحة، فتُسكت القراءة الآلية وتنبّه الوالد بدل الصمت
                String code = "noarabic".equals(ttsState) ? "language-unavailable" : "none".equals(ttsState) ? "synthesis-unavailable" : "interrupted";
                js("window.__ttsEvent&&window.__ttsEvent('error'," + JSONObject.quote(id) + "," + JSONObject.quote(code) + ")");
                return;
            }
            tts.setSpeechRate((float) Math.max(0.1, Math.min(3.0, rate)));
            tts.setPitch((float) Math.max(0.1, Math.min(2.0, pitch)));
            // QUEUE_ADD مثل speechSynthesis في المتصفح: النطق الجديد ينتظر الذي قبله، والإيقاف عبر cancel()
            tts.speak(text, TextToSpeech.QUEUE_ADD, null, id);
        });
    }

    @JavascriptInterface
    public void cancel() {
        act.runOnUiThread(() -> { if (tts != null) tts.stop(); speaking = false; });
    }

    @JavascriptInterface
    public boolean isSpeaking() { return speaking; }

    @JavascriptInterface
    public String ttsStatus() { return ttsState; }

    /** ساعة لا يغيّرها المستخدم (منذ تشغيل الجهاز) وعدد مرات التشغيل: لمدة انتظار إلغاء الرقم السري */
    @JavascriptInterface
    public String clockInfo() {
        int boot = -1;
        try { boot = android.provider.Settings.Global.getInt(act.getContentResolver(), android.provider.Settings.Global.BOOT_COUNT); } catch (Exception e) { }
        return "{\"mono\":" + android.os.SystemClock.elapsedRealtime() + ",\"boot\":" + boot + "}";
    }

    public void stopSpeech() { cancel(); }

    // ---------- Share / save ----------
    @JavascriptInterface
    public void shareFile(String name, String mime, String base64) {
        try {
            String safe = (name == null ? "file" : name).replaceAll("[^\\p{L}\\p{N}._-]", "_").replace("..", "_");
            while (safe.startsWith(".")) safe = safe.substring(1);
            if (safe.isEmpty()) safe = "file";
            File dir = new File(act.getCacheDir(), "shared");
            if (!dir.exists()) dir.mkdirs();
            cleanShared(dir);
            File f = new File(dir, safe);
            try (FileOutputStream o = new FileOutputStream(f)) {
                o.write(Base64.decode(base64, Base64.DEFAULT));
            }
            Uri uri = Uri.parse("content://com.hasaniya.app.share/" + Uri.encode(safe));
            Intent s = new Intent(Intent.ACTION_SEND);
            s.setType(mime == null || mime.isEmpty() ? "application/octet-stream" : mime);
            s.putExtra(Intent.EXTRA_STREAM, uri);
            s.setClipData(ClipData.newRawUri(safe, uri));
            s.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            act.runOnUiThread(() -> act.startActivity(Intent.createChooser(s, "مشاركة / حفظ")));
        } catch (Exception e) {
            act.runOnUiThread(() -> Toast.makeText(act, "تعذّر تجهيز الملف", Toast.LENGTH_LONG).show());
        }
    }

    /** يحذف ملفات المشاركة المؤقتة الأقدم من ساعة، فلا تتراكم في ذاكرة الجهاز */
    static void cleanShared(File dir) {
        File[] old = dir.listFiles();
        if (old == null) return;
        long cutoff = System.currentTimeMillis() - 60L * 60L * 1000L;
        for (File f : old) { if (f.isFile() && f.lastModified() < cutoff) f.delete(); }
    }

    // ---------- البريد: رسالة جاهزة بشفرة استرجاع الرقم السري ----------
    /** يفتح تطبيق البريد برسالة جاهزة؛ الوالد هو من يضغط «إرسال». التطبيق نفسه لا يتصل بالإنترنت. */
    @JavascriptInterface
    public void sendEmail(String to, String subject, String body) {
        final String addr = to == null ? "" : to.trim();
        if (!addr.matches("^[A-Za-z0-9._+-]{1,64}@[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,}$")) return;
        act.runOnUiThread(() -> {
            String sub = subject == null ? "" : subject, txt = body == null ? "" : body;
            // العنوان والنص في الرابط وفي الإضافات معاً: بعض تطبيقات البريد تقرأ أحدهما فقط
            Intent i = new Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:" + addr + "?subject=" + Uri.encode(sub) + "&body=" + Uri.encode(txt)));
            i.putExtra(Intent.EXTRA_SUBJECT, sub);
            i.putExtra(Intent.EXTRA_TEXT, txt);
            try {
                act.startActivity(i);
            } catch (android.content.ActivityNotFoundException e) {
                Toast.makeText(act, "لا يوجد تطبيق بريد على هذا الجهاز. انسخ الشفرة واحفظها بنفسك", Toast.LENGTH_LONG).show();
            }
        });
    }

    // ---------- Print ----------
    @JavascriptInterface
    public void printHtml(String html) {
        act.runOnUiThread(() -> {
            printView = new WebView(act);
            printView.getSettings().setJavaScriptEnabled(false);
            printView.setWebViewClient(new WebViewClient() {
                @Override public void onPageFinished(WebView v, String url) {
                    PrintManager pm = (PrintManager) act.getSystemService(android.content.Context.PRINT_SERVICE);
                    if (pm != null) {
                        pm.print("المنظومة الحسنية", v.createPrintDocumentAdapter("hasaniya"),
                                new PrintAttributes.Builder().build());
                    }
                }
            });
            printView.loadDataWithBaseURL("https://appassets.androidplatform.net/", html, "text/html", "UTF-8", null);
        });
    }

    public void shutdown() {
        if (tts != null) { tts.stop(); tts.shutdown(); tts = null; }
    }
}
