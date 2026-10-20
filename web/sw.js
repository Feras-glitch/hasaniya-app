/* Service Worker — المنظومة الحسنية V13 — القسم الأول */
const CACHE = "hasaniya-v102-s1";
const ASSETS = ["./", "./index.html", "./manifest.json", "./css/styles.css", "./js/config.js", "./js/data/manzumah.js", "./js/data/stories.js", "./js/data/khilaf.js", "./js/data/scenes.js", "./img/scenes/s2v1.webp", "./img/scenes/s3v7.webp", "./img/scenes/s4v11.webp", "./img/scenes/s4v12.webp", "./img/scenes/s4v14.webp", "./img/scenes/s5v1.webp", "./img/scenes/s5v10.webp", "./img/scenes/s5v9.webp", "./img/scenes/s6v4.webp", "./img/scenes/s6v7.webp", "./img/scenes/s7v1.webp", "./img/scenes/s8v2.webp", "./img/scenes/s9v1.webp", "./img/scenes/s9v3.webp", "./img/scenes/s10v14.webp", "./img/scenes/s11av11.webp", "./img/scenes/s11av5.webp", "./img/scenes/s11bv3.webp", "./img/scenes/s11bv4.webp", "./img/scenes/s11bv9.webp", "./img/scenes/s12av3.webp", "./img/scenes/s12bv5.webp", "./img/scenes/s12cv6.webp", "./img/scenes/s13v1.webp", "./img/scenes/s13v4.webp", "./js/data/explanations.js", "./js/data/links.js", "./js/upgrades.js", "./js/exercises.js", "./js/backup.js", "./js/places.js", "./js/extras.js", "./js/i18n.js", "./js/data/places.js", "./js/data/discussion.js", "./js/data/quizzes.js", "./js/quiz.js", "./js/data/riddles.js", "./js/data/stickers.js", "./js/leitner.js", "./js/recall.js", "./js/shadow.js", "./js/ask.js", "./js/journey.js", "./js/print.js", "./js/weekly.js", "./js/tools.js", "./js/profile.js", "./js/recitation.js", "./js/voicepack.js", "./js/voice.js", "./js/studio.js", "./js/dashboard.js", "./js/android-shim.js", "./js/guide.js", "./js/companion.js", "./js/utils.js", "./js/parser.js", "./js/achievements.js", "./js/storage.js", "./js/safety.js", "./js/pin.js", "./js/users.js", "./js/progress.js", "./js/audio.js", "./js/game.js", "./js/ui.js", "./js/parent.js", "./js/editor.js", "./js/app.js"];

/* cache:"reload" يتجاوز ذاكرة المتصفح المؤقتة، فلا تمتلئ النسخة الجديدة بملفات قديمة */
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  if (!e.request.url.startsWith("http")) return;
  /* صفحة التطبيق تُطابق دون النظر إلى ما بعد «?» (اختصارات مثل ?action=review)، وإن لم تُوجد فالصفحة الرئيسة */
  const nav = e.request.mode === "navigate";
  e.respondWith(
    caches.match(e.request, { ignoreSearch: nav })
      .then(c => c || (nav ? caches.match("./index.html") : undefined))
      .then(cached => {
      const network = fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
