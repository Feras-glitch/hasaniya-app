/* اختبارات الرقم السري: الصيغة الآمنة، الترقية من الصيغ القديمة، وعدم المسح عند تعذّر التشفير */
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
let failed = 0;
const check = (name, cond) => { if (cond) console.log("ok   ", name); else { failed++; console.log("FAIL ", name); } };

function load(withCrypto) {
  const store = {};
  const ctx = {
    console, TextEncoder, btoa, atob, Uint8Array, Date, Math, Promise,
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    window: withCrypto ? { crypto: globalThis.crypto } : {},
    crypto: withCrypto ? globalThis.crypto : undefined,
    showToast() {}, playFail() {}, closePopup() {}, updatePinStatus() {}, document: {}
  };
  ctx.STORAGE_PIN = "hasaniya_v13_parentPin";
  ctx.parentPinHash = null;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, "js/pin.js"), "utf8"), ctx, { filename: "pin.js" });
  return { ctx, store };
}
const run = (ctx, code) => vm.runInContext(code, ctx);

(async () => {
  {
    const { ctx, store } = load(true);
    const h = await ctx.hashPin("1234");
    check("الصيغة الجديدة تبدأ بـ p1", h && h.startsWith("p1:"));
    ctx.parentPinHash = h;
    check("الرقم الصحيح يُقبل", await ctx.verifyPin("1234") === true);
    check("الرقم الخاطئ يُرفض", await ctx.verifyPin("4321") === false);
    check("الهاش لا يحوي الرقم نفسه", !h.includes("1234"));
  }
  {
    const { ctx } = load(true);
    ctx.parentPinHash = await run(ctx, `pinLegacyHash("1234","s2")`);
    check("ترقية s2: يُقبل الرقم القديم", await ctx.verifyPin("1234") === true);
    check("ترقية s2: صار الهاش p1", ctx.parentPinHash.startsWith("p1:"));
  }
  {
    const { ctx } = load(true);
    ctx.parentPinHash = await run(ctx, `pinLegacyHash("5678","f1")`);
    check("ترقية f1: يُقبل الرقم القديم", await ctx.verifyPin("5678") === true);
    check("ترقية f1: صار الهاش p1", ctx.parentPinHash.startsWith("p1:"));
  }
  {
    const { ctx } = load(true);
    ctx.parentPinHash = await run(ctx, `pinLegacyHash("0000","h")`);
    check("ترقية h: قبل v13 تُقبل", await ctx.verifyPin("0000") === true);
  }
  {
    const { ctx } = load(true);
    ctx.parentPinHash = await run(ctx, `pinLegacyHash("1111","f1")`);
    await ctx.verifyPin("2222");
    check("رقم خاطئ لا يغيّر الهاش", ctx.parentPinHash.startsWith("f1:"));
  }
  {
    const { ctx } = load(false);
    check("بلا تشفير: لا يُحفظ رقم ضعيف", (await ctx.hashPin("1234")) === null);
    ctx.parentPinHash = "p1:200000:AAAAAAAAAAAAAAAAAAAAAA==:AAAA";
    const ok = await ctx.verifyPin("1234");
    check("بلا تشفير: لا يُرفض الرقم بصمت", ok === false && run(ctx, "pinUnavailable") === true);
    check("بلا تشفير: الهاش الأصلي محفوظ", ctx.parentPinHash.startsWith("p1:"));
  }
  console.log(failed ? `\n${failed} فشل` : "\nكل اختبارات الرقم السري نجحت");
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
