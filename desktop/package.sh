#!/usr/bin/env bash
# يجهّز نسختي ويندوز ولينكس من Electron الجاهز + ملفات التطبيق من web/
# الاستعمال: bash desktop/package.sh <نسخة Electron> <مجلد الإخراج>
# البنية الصحيحة: resources/app/{main.js, package.json, app/index.html ...}
set -euo pipefail
V="$1"; OUT="$2"; mkdir -p "$OUT"
for P in win32 linux; do
  curl -fsSL -o "el-$P.zip" "https://github.com/electron/electron/releases/download/v$V/electron-v$V-$P-x64.zip"
  D="$OUT/hasaniya-$([ $P = win32 ] && echo windows || echo linux)"
  rm -rf "$D"; mkdir -p "$D"; unzip -q "el-$P.zip" -d "$D"; rm -f "el-$P.zip"
  rm -f "$D/resources/default_app.asar"
  mkdir -p "$D/resources/app/app"
  cp desktop/main.js desktop/package.json "$D/resources/app/"
  cp -r web/index.html web/sw.js web/manifest.json web/css web/js web/img "$D/resources/app/app/"
  cp desktop/README.txt "$D/"
  if [ $P = win32 ]; then mv "$D/electron.exe" "$D/Hasaniya.exe"; else
    mv "$D/electron" "$D/hasaniya-bin"; chmod +x "$D/hasaniya-bin"
    # مُشغّل: فك الضغط يُفقد أداة العزل (chrome-sandbox) صلاحيتها في أكثر توزيعات لينكس فلا يفتح التطبيق،
    # فإن لم تكن مضبوطة يعمل بدونها. التطبيق لا يفتح إلا ملفاته ولا يتصل بأي موقع.
    cat > "$D/Hasaniya" <<'SH'
#!/bin/sh
# يعمل بالعزل متى أمكن: أداة العزل مضبوطة، أو مساحات المستخدم متاحة؛ وإلا (مثل Ubuntu 24.04) بدونه
DIR="$(cd "$(dirname "$0")" && pwd)"
SB="$DIR/chrome-sandbox"
if [ "$(id -u)" != "0" ]; then
  if [ -u "$SB" ] && [ "$(stat -c %u "$SB" 2>/dev/null)" = "0" ]; then exec "$DIR/hasaniya-bin" "$@"; fi
  if [ "$(cat /proc/sys/kernel/apparmor_restrict_unprivileged_userns 2>/dev/null)" != "1" ] \
     && [ "$(cat /proc/sys/kernel/unprivileged_userns_clone 2>/dev/null)" != "0" ] \
     && command -v unshare >/dev/null 2>&1 && unshare -Ur true >/dev/null 2>&1; then
    exec "$DIR/hasaniya-bin" "$@"
  fi
fi
exec "$DIR/hasaniya-bin" --no-sandbox "$@"
SH
    chmod +x "$D/Hasaniya"
  fi
  test -f "$D/resources/app/app/index.html"
done
