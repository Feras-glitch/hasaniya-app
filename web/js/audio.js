/* الصوت والنطق والتسجيل */
let audioCtx = null;
function ensureAudioCtx() {
  if (!audioCtx) { try { audioCtx = new (window.AudioContext||window.webkitAudioContext)(); } catch(e) { audioCtx = null; } }
  return audioCtx;
}
function playTone(f, d=.15, type="sine", delay=0) {
  const ctx = ensureAudioCtx(); if (!ctx) return;
  try {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f; g.gain.value = .09;
    o.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime + delay;
    o.start(t); g.gain.setValueAtTime(.09, t);
    g.gain.exponentialRampToValueAtTime(.001, t + d); o.stop(t + d);
  } catch(e) {}
}
function playSuccess() { if (recIsActive()) return; playTone(523.25,.12,"sine",0); playTone(659.25,.12,"sine",.10); playTone(783.99,.25,"sine",.20); }
function playFail() { if (recIsActive()) return; playTone(220,.15,"triangle",0); playTone(165,.25,"triangle",.14); }
function playClick() { if (recIsActive()) return; playTone(880,.05,"sine",0); }

let confettiActive = false;
let confettiResizeHandler = null;
let confettiRafId = null;

function launchConfetti() {
  if (confettiActive) return;
  confettiActive = true;

  const cv = document.getElementById("confettiCanvas");
  function onResize() { cv.width = window.innerWidth; cv.height = window.innerHeight; }
  onResize();
  confettiResizeHandler = onResize;
  window.addEventListener("resize", onResize);

  const ctx = cv.getContext("2d");
  const colors = ["#d81b60","#ffb300","#4caf50","#2196f3","#9c27b0","#ff5722"];
  const ps = [];
  for (let i = 0; i < 120; i++) ps.push({
    x: Math.random()*cv.width, y: -20-Math.random()*120,
    vx: (Math.random()-.5)*5, vy: 2+Math.random()*4,
    s: 6+Math.random()*8, c: colors[Math.floor(Math.random()*colors.length)],
    r: Math.random()*Math.PI, vr: (Math.random()-.5)*.25
  });
  let frame = 0;
  function anim() {
    ctx.clearRect(0,0,cv.width,cv.height);
    let alive = 0;
    ps.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += .06; p.r += p.vr;
      if (p.y < cv.height + 30) {
        alive++;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s*.6);
        ctx.restore();
      }
    });
    frame++;
    if (alive > 0 && frame < 200) {
      confettiRafId = requestAnimationFrame(anim);
    } else {
      cv.style.display = "none";
      ctx.clearRect(0,0,cv.width,cv.height);
      if (confettiResizeHandler) {
        window.removeEventListener("resize", confettiResizeHandler);
        confettiResizeHandler = null;
      }
      confettiRafId = null;
      confettiActive = false;
    }
  }
  cv.style.display = "block";
  confettiRafId = requestAnimationFrame(anim);
}

let voicesLoaded = false;
function loadVoices() { if (!("speechSynthesis" in window)) return; const v = window.speechSynthesis.getVoices(); if (v && v.length > 0) voicesLoaded = true; }
function initSpeech() {
  if (!("speechSynthesis" in window)) return;
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
  let t = 0; const iv = setInterval(() => { loadVoices(); if (voicesLoaded || ++t > 10) clearInterval(iv); }, 300);
}
/* v101: الاستماع بضغطة من الطفل: تسجيل الوالد أو المعلم لهذا النص إن وُجد، وإلا القراءة الآلية (voice.js) */
function speak(text) { return voicePlay([text]); }

let mediaRecorder = null, recordedChunks = [], mediaStream = null;
/* v100: التسجيل من شريط البيت (recordVerse) يحفظ تسجيل الطفل لكل بيت. يبقى هذا الاسم لمن يستدعيه */
async function toggleRecording() { return recordVerse(); }
function stopMediaStream() {
  if (mediaStream) {
    try { mediaStream.getTracks().forEach(t => t.stop()); } catch(e) {}
    mediaStream = null;
  }
  mediaRecorder = null;
}

let toastTimer = null;
function showToast(m, t="") {
  const el = document.getElementById("toast");
  el.textContent = m; el.className = "toast " + t + " show";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

/* قراءة متتابعة بصوت هادئ: كل جزء يُقرأ بعد الذي قبله */
/* ---------- تهيئة النص للقراءة الآلية ----------
   محرّك النطق لا يطبّق قواعد الوقف، فنحاكيها هنا على آخر كلمة في كل جملة أو بيت:
   - تُحذف الحركة الأخيرة (الضمة والفتحة والكسرة والتنوين) كما يسكّن القارئ آخر الكلمة عند الوقف.
   - التاء المربوطة في آخر الكلمة تُقرأ هاءً ساكنة.
   - الشدّة تبقى لأنها جزء من نطق الحرف.
   - علامات الوقف القرآنية (ۖ ۗ ۚ …) تُحذف من النص المُلقى فقط، ولا تغيّر النص المعروض.
   النص المعروض لا يتغيّر أبداً؛ هذه التهيئة تُطبَّق لحظة النطق فقط. */
const TTS_STOP_MARKS = /[\u06D6-\u06ED]/g;
function ttsWaqfWord(w) {
  const m = w.match(/^(.*?[\u0621-\u064A])([\u064B-\u0652\u0670]*)$/u);
  if (!m) return w;
  let base = m[1];
  const keepShadda = m[2].includes("\u0651") ? "\u0651" : "";
  if (base.endsWith("ة")) base = base.slice(0, -1) + "ه";
  return base + keepShadda;
}
function ttsText(text) {
  return String(text || "")
    .replace(TTS_STOP_MARKS, "")
    .replace(/([^\s.،؛؟!:…]+)(?=\s*(?:[.،؛؟!:…]|$))/gu, ttsWaqfWord)
    .replace(/\s+/g, " ")
    .trim();
}
function speakQueue(parts) { return voicePlay(parts); }
function stopSpeech() {
  audioStopAll();
}

/* ---------- حَكَم الصوت: صوت واحد في كل لحظة ----------
   - أي صوت يبدأ يوقف كل الأصوات الأخرى (نطق، تسجيلات، قصص، تسميع).
   - أثناء التسجيل لا يُشغَّل أي صوت، وعند بدء التسجيل تتوقف كل الأصوات.
   - كل تشغيل يمر عبر audioBegin()، وكل صوت مُدار يُسجَّل عبر audioPlayEl(). */
let seqToken = 0, seqAudio = null;
const seqWaiters = new Set();   // وعود تنتظر نهاية جزء من التسميع، تُحلّ عند الإيقاف
const liveAudios = new Set();   // عناصر الصوت الجارية

function recIsActive() {
  if (typeof recState !== "undefined" && recState && recState.recorder) return true;
  return typeof mediaRecorder !== "undefined" && !!mediaRecorder && mediaRecorder.state === "recording";
}
function audioPlayEl(a) {
  liveAudios.add(a);
  const drop = () => liveAudios.delete(a);
  a.addEventListener("ended", drop);
  a.addEventListener("error", drop);
  return a.play();
}
/* تشغيل تسجيل من Blob: يُحرَّر رابطه المؤقت عند انتهاء التشغيل أو تعذّره أو إيقافه، حتى لا يتراكم في الذاكرة */
function blobAudio(blob) {
  const url = URL.createObjectURL(blob);
  const a = new Audio(url);
  const release = () => { try { URL.revokeObjectURL(url); } catch(e) {} };
  a.addEventListener("ended", release);
  a.addEventListener("error", release);
  a._release = release;
  return a;
}
function audioStopAll(except) {
  seqToken++;
  seqWaiters.forEach(done => { try { done(); } catch(e) {} });
  seqWaiters.clear();
  if (typeof guideDance === "function") guideDance(false);
  liveAudios.forEach(a => { if (a !== except) { try { a.pause(); } catch(e) {} if (a._release) a._release(); } });
  liveAudios.clear();
  document.querySelectorAll("audio,video").forEach(m => { if (m !== except) { try { m.pause(); } catch(e) {} } });
  seqAudio = null;
  try { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); } catch(e) {}
}
/* يُستدعى قبل كل تشغيل من المستخدم. يُرجع false إن كان التسجيل جارياً */
function audioBegin() {
  if (recIsActive()) { kidToast(kidLine("stopRecFirst"), "error"); return false; }
  audioStopAll();
  return true;
}
/* هل يوجد صوت يُسمع الآن؟ (يمنع ناجي من الكلام فوق الصوت) */
function audioBusy() {
  if (recIsActive()) return true;
  for (const a of liveAudios) if (!a.paused && !a.ended) return true;
  if ([...document.querySelectorAll("audio,video")].some(m => !m.paused && !m.ended)) return true;
  return !!(("speechSynthesis" in window) && window.speechSynthesis.speaking);
}
/* أي مشغّل صوت أصلي (أزرار المتصفح) يبدأ يوقف الباقي */
document.addEventListener("play", e => {
  const t = e.target;
  if (!t || typeof t.pause !== "function" || liveAudios.has(t)) return;
  if (recIsActive()) { try { t.pause(); } catch(err) {} kidToast(kidLine("stopRecFirst"), "error"); return; }
  audioStopAll(t);
}, true);
