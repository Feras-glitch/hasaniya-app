/* اختبار جسر أندرويد (بدون متصفح): النطق يُصفّ ويُلغى كله، والجهاز بلا عربية يُعرف، وسبب الخطأ يصل إلى الصفحة */
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const src = fs.readFileSync(path.join(__dirname, "..", "js", "android-shim.js"), "utf8");
function load(status) {
  const calls = { cancel: 0, speak: [] };
  const B = { speak: (id, t) => calls.speak.push([id, t]), cancel: () => { calls.cancel++; }, isSpeaking: () => false,
    ttsStatus: () => status.value, shareFile() {}, printHtml() {} };
  function Anchor() {} Anchor.prototype.click = function () {};
  const win = { AndroidBridge: B };
  const ctx = { window: win, navigator: {}, HTMLAnchorElement: Anchor, FileReader: function () {}, Blob: function () {}, fetch() {}, Promise, Object, String };
  win.navigator = ctx.navigator;
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return { win, calls };
}
const st = { value: "ok" };
const { win, calls } = load(st);
assert.strictEqual(calls.cancel, 1, "يُوقف الكلام القديم مرة عند البدء");
const synth = win.speechSynthesis;
assert.ok(synth.getVoices().some(v => /^ar/.test(v.lang)), "صوت عربي حين يكون المحرك سليماً");
st.value = "noarabic";
assert.ok(synth.getVoices().length && !synth.getVoices().some(v => /^ar/.test(v.lang)), "بلا عربية: لا صوت عربي في القائمة");
st.value = "none";
assert.strictEqual(synth.getVoices().length, 0, "بلا محرك: لا أصوات");
st.value = "init";
assert.ok(synth.getVoices().some(v => /^ar/.test(v.lang)), "أثناء بدء المحرك لا يُعدّ الجهاز بلا صوت");
// سبب الخطأ يصل إلى الصفحة
const U = win.SpeechSynthesisUtterance;
const u1 = new U("أ"); let err1 = null; u1.onerror = e => { err1 = e.error; };
synth.speak(u1);
win.__ttsEvent("error", calls.speak[0][0], "language-unavailable");
assert.strictEqual(err1, "language-unavailable");
// الإيقاف يُنهي كل ما في الصف
const u2 = new U("ب"), u3 = new U("ج"); const errs = [];
u2.onerror = e => errs.push(e.error); u3.onerror = e => errs.push(e.error);
synth.speak(u2); synth.speak(u3); synth.cancel();
assert.deepStrictEqual(errs, ["interrupted", "interrupted"]);
console.log("android-shim: ok");
