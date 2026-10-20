// تشغيل: node tests/smoke.js  (يتطلب playwright وchromium)
const { chromium } = require("playwright");
const path = require("path");
const closeAch = p => p.evaluate(() => document.getElementById("newAchievementPopup").classList.remove("active"));
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || process.env.CHROME || "/opt/pw-browsers/chromium", args:["--no-sandbox"] }).catch(()=>chromium.launch({args:["--no-sandbox"]}));
  const p = await b.newPage(); const errs = [];
  p.on("pageerror", e => errs.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type()==="error") errs.push("console: " + m.text()); });
  await p.goto("file://" + path.join(__dirname, "..", "index.html"));
  await p.waitForSelector(".station", { state: "attached" }); await p.evaluate(() => { window.showNewAchievement = () => {}; const u = getCurrentUser(); if (u && !u.gender) { u.gender = "boy"; saveState(); } closePopup("userEditorPopup"); if (!showStationList) toggleStationList(); });
  await p.waitForSelector(".station", { state: "visible" });
  console.log("محطات:", await p.locator(".station").count());
  await p.locator(".station").first().click();
  
  for (let v = 0; v < 7; v++) {
    const full = await p.evaluate(() => getCurrentVerse().verse.fullVerse);
    // v95: البيت الجديد يُعرض كاملاً أولاً، ثم «أرتّبه الآن»
    await p.waitForSelector("#introGo", { state: "visible" }); await p.click("#introGo");
    for (const w of full.split(/\s+/)) {
      await p.locator("#wordsBank .word-btn:not(.selected)").filter({hasText: new RegExp("^"+w+"$")}).first().click();
    }
    await p.waitForSelector("#nextBtn", {state:"visible"});
    if (v === 0) { console.log("شرح:", (await p.innerText("#meaningBox")).slice(0,60)); }
    await closeAch(p); await p.click("#nextBtn");
    if (v === 4) { await p.waitForSelector("#repeatPopup.active"); await p.click("#repeatNextBtn"); }
  }
  // الاختبار القصير بعد المحطة: أجب كل سؤال بالخيار الصحيح
  await p.waitForSelector("#quizPopup.active");
  for (let q = 0; q < 3; q++) {
    const txt = await p.evaluate(() => quizState.items[quizState.i].correct);
    await p.locator("#quizBody .word-btn", {hasText: txt}).first().click();
    await p.waitForTimeout(1900);
  }
  await p.waitForSelector("#rewardPopup.active");
  console.log("ظهرت المكافأة؛ نقاط:", await p.innerText("#pointsBadge"));
  // اختبار تلميح وتراجع
  await closeAch(p); await p.click("#rewardPopup button:has-text('استمر')"); await p.locator(".station").nth(1).click(); 
  if (await p.locator("#introGo").isVisible()) await p.click("#introGo");
  await p.click("text=💡 تلميح"); console.log("تلميح:", await p.locator(".word-btn.hint").count());
  // ---- الأدوات الجديدة ----
  await p.setViewportSize({width:390,height:844});
  await closeAch(p);
  await p.evaluate(() => { document.querySelectorAll(".modal-overlay.active").forEach(m => m.classList.remove("active")); });
  await p.evaluate(() => { document.querySelectorAll(".modal-overlay.active").forEach(m => m.classList.remove("active")); showTools(); }); await p.waitForSelector("#hubPopup.active");
  const tiles = await p.locator("#hubPopup .hub-tile").count();
  console.log("أدوات في القائمة:", tiles); if (tiles < 8) errs.push("قائمة الأدوات ناقصة");
  await p.screenshot({path: path.join(__dirname, "..", "..", "scratchpad", "t_hub.png")});
  for (const fn of ["showLeitnerBoxes","showRecallMenu","showAsk","showJourneyMap","showWeekly","showInventory","showAchievements"]) {
    await p.evaluate(f => { document.querySelectorAll(".modal-overlay.active").forEach(m => m.classList.remove("active")); window[f](); }, fn);
    await p.waitForTimeout(150);
    const visible = await p.evaluate(() => [...document.querySelectorAll(".modal-overlay.active")].length);
    console.log(fn, "فتح نافذة:", visible > 0 ? "نعم" : "لا");
    if (!visible) errs.push("لم تفتح " + fn);
  }
  // الشادو والتذكّر والسؤال
  await p.evaluate(() => { document.querySelectorAll(".modal-overlay.active").forEach(m => m.classList.remove("active")); startRecall("keyword"); });
  await p.waitForTimeout(150);
  console.log("تذكّر بالكلمة المفتاح:", await p.locator("#recallBox, .modal-overlay.active").count() ? "نعم" : "لا");
  await p.evaluate(() => { document.querySelectorAll(".modal-overlay.active").forEach(m => m.classList.remove("active")); document.getElementById("askIn") || showAsk(); });
  await p.fill("#askIn", "من أرضع النبي؟"); await p.evaluate(() => runAsk());
  console.log("نتيجة السؤال:", (await p.innerText(".ask-verse").catch(()=>"—")).slice(0,50));
  await p.evaluate(() => { document.querySelectorAll(".modal-overlay.active").forEach(m => m.classList.remove("active")); });
  await p.setViewportSize({width:390,height:844});
  await p.screenshot({path: path.join(__dirname, "..", "..", "scratchpad", "t_end.png")});
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  console.log("تمرير أفقي:", overflow ? "نعم (مشكلة)" : "لا");
  if (overflow) errs.push("تمرير أفقي في الجوال");
  console.log(errs.length ? errs.join("\n") : "لا أخطاء JS");
  await b.close(); process.exit(errs.length?1:0);
})();
