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
  if [ $P = win32 ]; then mv "$D/electron.exe" "$D/Hasaniya.exe"; else mv "$D/electron" "$D/Hasaniya"; chmod +x "$D/Hasaniya"; fi
  test -f "$D/resources/app/app/index.html"
done
