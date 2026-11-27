/* إعداد ESLint للمحررات. سكربتات التطبيق فضاء عام واحد، فـ«اسم غير معرّف» لا يُفحص ملفاً ملفاً هنا؛
   يفحصه «npm run lint» (tools/lint.js) بعد دمج السكربتات بترتيب index.html. */
const globals = require("globals");
module.exports = [
  { files: ["web/js/**/*.js"], languageOptions: { ecmaVersion: 2022, sourceType: "script", globals: globals.browser },
    rules: { "no-dupe-keys": "error", "no-unreachable": "error", "no-const-assign": "error", "no-dupe-args": "error" } },
  { files: ["tests/**/*.js", "tools/**/*.js"], languageOptions: { ecmaVersion: 2022, sourceType: "commonjs", globals: Object.assign({}, globals.node, globals.browser) } }
];
