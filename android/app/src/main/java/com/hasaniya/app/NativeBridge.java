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
    private WebView printView;

    public NativeBridge(MainActivity act, WebView web) {
        this.act = act;
        this.web = web;
        tts = new TextToSpeech(act, status -> {
            if (status == TextToSpeech.SUCCESS) {
                int r = tts.setLanguage(new Locale("ar"));
                ttsReady = r != TextToSpeech.LANG_MISSING_DATA && r != TextToSpeech.LANG_NOT_SUPPORTED;
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
                js("window.__ttsEvent&&window.__ttsEvent('error'," + JSONObject.quote(id) + ")");
                return;
            }
            tts.setSpeechRate((float) Math.max(0.1, Math.min(3.0, rate)));
            tts.setPitch((float) Math.max(0.1, Math.min(2.0, pitch)));
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, id);
        });
    }

    @JavascriptInterface
    public void cancel() {
        act.runOnUiThread(() -> { if (tts != null) tts.stop(); speaking = false; });
    }

    @JavascriptInterface
    public boolean isSpeaking() { return speaking; }

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
