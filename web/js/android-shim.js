/* جسر أندرويد: يعمل فقط داخل تطبيق APK (حين يوجد AndroidBridge)، ولا يغيّر شيئاً في المتصفح العادي.
   يوفّر ما لا يوفّره WebView: النطق الآلي، والتعرّف الصوتي، والمشاركة والحفظ، وطباعة البطاقات. */
(function () {
  var B = window.AndroidBridge;
  if (!B) return;
  var nextId = 1, live = {};

  function define(obj, name, value) {
    try { Object.defineProperty(obj, name, { value: value, configurable: true, writable: true }); }
    catch (e) { try { obj[name] = value; } catch (e2) {} }
  }

  /* ---------- النطق الآلي عبر محرك النطق في أندرويد ---------- */
  function Utterance(text) {
    this.text = text === undefined ? "" : String(text);
    this.lang = ""; this.rate = 1; this.pitch = 1; this.volume = 1; this.voice = null;
    this.onstart = this.onend = this.onerror = this.onboundary = this.onpause = this.onresume = this.onmark = null;
  }
  var voices = [{ name: "Android TTS", lang: "ar-SA", default: true, localService: true, voiceURI: "android-tts" }];
  var synth = {
    onvoiceschanged: null,
    pending: false,
    paused: false,
    get speaking() { return Object.keys(live).length > 0 || !!B.isSpeaking(); },
    speak: function (u) {
      var id = String(nextId++);
      live[id] = u;
      B.speak(id, String(u.text), +u.rate || 1, +u.pitch || 1);
    },
    cancel: function () { B.cancel(); },
    pause: function () {},
    resume: function () {},
    getVoices: function () { return voices; },
    addEventListener: function () {},
    removeEventListener: function () {}
  };
  window.__ttsEvent = function (type, id) {
    var u = live[id]; if (!u) return;
    if (type === "start") { if (typeof u.onstart === "function") u.onstart({ type: "start" }); return; }
    delete live[id];
    var h = type === "end" ? u.onend : u.onerror;
    if (typeof h === "function") h({ type: type, error: type === "error" ? "interrupted" : undefined });
  };
  define(window, "SpeechSynthesisUtterance", Utterance);
  define(window, "speechSynthesis", synth);

  /* ---------- الحفظ والمشاركة: تُفتح قائمة المشاركة في أندرويد ---------- */
  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { var s = String(fr.result); resolve(s.slice(s.indexOf(",") + 1)); };
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  }
  function shareBlob(name, blob) {
    return blobToBase64(blob).then(function (b64) {
      B.shareFile(name, blob.type || "application/octet-stream", b64);
    });
  }
  var origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    var a = this, href = a.href || "";
    if (a.hasAttribute("download") && (href.indexOf("blob:") === 0 || href.indexOf("data:") === 0)) {
      var name = a.getAttribute("download") || "file";
      fetch(href).then(function (r) { return r.blob(); })
        .then(function (blob) { return shareBlob(name, blob); })
        .catch(function () {
          try { if (typeof showToast === "function") showToast("تعذّر مشاركة الملف. حاول مرة أخرى", "error"); } catch (e) {}
        });
      return;
    }
    return origClick.apply(this, arguments);
  };
  define(navigator, "canShare", function (d) { return !!(d && d.files && d.files.length); });
  define(navigator, "share", function (d) {
    if (d && d.files && d.files.length) { var f = d.files[0]; return shareBlob(f.name || "file", f); }
    /* نص بلا ملف (مثل تقرير الأسبوع): يُشارك ملفاً نصياً، لأن الجسر يقبل الملفات */
    if (d && (d.text || d.url)) {
      var body = [d.title, d.text, d.url].filter(Boolean).join("\n\n");
      return shareBlob("hasaniya_" + Date.now() + ".txt", new Blob([body], { type: "text/plain;charset=utf-8" }));
    }
    return Promise.reject(new Error("unsupported"));
  });

  /* ---------- طباعة البطاقات: نافذة وهمية تُرسل HTML إلى طباعة أندرويد ---------- */
  define(window, "open", function () {
    var html = "";
    var doc = {
      open: function () { html = ""; },
      write: function (s) { html += s; },
      close: function () { if (html) B.printHtml(html); }
    };
    return { document: doc, close: function () {}, focus: function () {} };
  });
})();
