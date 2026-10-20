package com.hasaniya.app;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;

/**
 * يفتح التطبيق من ملفات مضمّنة داخل الـAPK عبر عنوان https داخلي آمن.
 * هذا يجعل الميكروفون وIndexedDB تعمل، ولا يُسمح بأي طلب لموقع خارجي.
 */
public class MainActivity extends Activity {
    static final String HOST = "appassets.androidplatform.net";
    static final int REQ_MIC = 101;
    static final int REQ_FILE = 102;

    private WebView web;
    private NativeBridge bridge;
    private PermissionRequest pendingWebPermission;
    private Runnable afterMicGranted;
    private ValueCallback<Uri[]> fileCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setTextZoom(100);

        NativeBridge.cleanShared(new java.io.File(getCacheDir(), "shared"));
        bridge = new NativeBridge(this, web);
        web.addJavascriptInterface(bridge, "AndroidBridge");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return serve(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // أي رابط خارجي مرفوض: التطبيق يعمل بلا اتصال
                return !HOST.equals(request.getUrl().getHost());
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        boolean wantsAudio = false;
                        for (String r : request.getResources()) {
                            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) wantsAudio = true;
                        }
                        if (!wantsAudio) { request.deny(); return; }
                        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                            request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                        } else {
                            pendingWebPermission = request;
                            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
                        }
                    }
                });
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    startActivityForResult(chooserIntent(params), REQ_FILE);
                } catch (Exception e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });

        web.loadUrl("https://" + HOST + "/index.html");
    }

    /** يقدّم ملفات التطبيق من مجلد assets/www، ويمنع كل ما عداها */
    private WebResourceResponse serve(Uri uri) {
        HashMap<String, String> headers = new HashMap<String, String>();
        if (!HOST.equals(uri.getHost())) {
            return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", headers, new ByteArrayInputStream(new byte[0]));
        }
        String path = uri.getPath();
        if (path == null || path.equals("/")) path = "/index.html";
        path = path.substring(1);
        try {
            InputStream in = getAssets().open("www/" + path);
            return new WebResourceResponse(mimeFor(path), "UTF-8", in);
        } catch (IOException e) {
            return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", headers, new ByteArrayInputStream(new byte[0]));
        }
    }

    private static String mimeFor(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js")) return "text/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".webmanifest")) return "application/manifest+json";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".ico")) return "image/x-icon";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".gif")) return "image/gif";
        if (p.endsWith(".mp3")) return "audio/mpeg";
        if (p.endsWith(".ogg")) return "audio/ogg";
        if (p.endsWith(".wav")) return "audio/wav";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".woff")) return "font/woff";
        return "application/octet-stream";
    }

    /** يطلب إذن الميكروفون، ثم ينفّذ العمل المطلوب إن مُنح */
    void askMic(Runnable after) {
        afterMicGranted = after;
        requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQ_MIC) return;
        boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
        if (pendingWebPermission != null) {
            if (granted) pendingWebPermission.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            else pendingWebPermission.deny();
            pendingWebPermission = null;
        }
        if (afterMicGranted != null) {
            Runnable r = afterMicGranted;
            afterMicGranted = null;
            if (granted) r.run();
        }
        if (!granted) Toast.makeText(this, "لا يعمل التسجيل بدون إذن الميكروفون", Toast.LENGTH_LONG).show();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_FILE && fileCallback != null) {
            fileCallback.onReceiveValue(pickedUris(resultCode, data));
            fileCallback = null;
        }
    }

    /** نافذة اختيار الملفات: الصور والصوت بنوعها، أما ملفات json وzip فتُعرض كل الملفات،
     *  لأن أكثر مديري الملفات لا يعرفون نوع json فيُخفونه. ويُسمح بأكثر من ملف إن طلبت الصفحة ذلك. */
    static Intent chooserIntent(WebChromeClient.FileChooserParams params) {
        String[] acc = params.getAcceptTypes();
        boolean media = false;
        if (acc != null) for (String a : acc) {
            if (a != null && (a.startsWith("image/") || a.startsWith("audio/"))) media = true;
        }
        if (media) return params.createIntent();
        Intent i = new Intent(Intent.ACTION_GET_CONTENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.setType("*/*");
        if (params.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE) {
            i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        }
        return i;
    }

    /** نتيجة الاختيار: ملف واحد أو عدة ملفات (ClipData)، أو لا شيء عند الإلغاء */
    static Uri[] pickedUris(int resultCode, Intent data) {
        if (resultCode != Activity.RESULT_OK || data == null) return null;
        ClipData clip = data.getClipData();
        if (clip != null && clip.getItemCount() > 0) {
            Uri[] out = new Uri[clip.getItemCount()];
            for (int k = 0; k < out.length; k++) out[k] = clip.getItemAt(k).getUri();
            return out;
        }
        Uri one = data.getData();
        return one == null ? null : new Uri[]{ one };
    }

    /** زر الرجوع: يغلق النافذة المفتوحة، ثم يعود إلى الخريطة، ثم يخرج */
    @Override
    public void onBackPressed() {
        String js = "(function(){if(typeof appBack==='function'){return appBack()?1:0;}"
                + "var m=document.querySelectorAll('.modal-overlay.active');"
                + "if(m.length){m[m.length-1].classList.remove('active');return 1;}"
                + "var b=document.getElementById('backToMapBtn');"
                + "if(b&&getComputedStyle(b).display!=='none'){b.click();return 1;}return 0;})()";
        web.evaluateJavascript(js, new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String value) {
                if (!"1".equals(value)) MainActivity.super.onBackPressed();
            }
        });
    }

    @Override
    protected void onPause() {
        super.onPause();
        bridge.stopSpeech();
        web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        bridge.shutdown();
        web.destroy();
        super.onDestroy();
    }
}
