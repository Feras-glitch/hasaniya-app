#!/usr/bin/env bash
# يجهّز نسختي ويندوز ولينكس من Electron الجاهز + ملفات التطبيق من web/
# الاستعمال: bash desktop/package.sh <نسخة Electron> <مجلد الإخراج>   (من جذر المستودع)
# البنية الصحيحة: resources/app/{main.js, preload.js, package.json, app/index.html ...}
set -euo pipefail
V="$1"; OUT="$2"; mkdir -p "$OUT"
SUMS="desktop/electron-sha256.txt"
# v105: بصمة الإصدار من مصدرين مستقلين إن لم تكن مثبّتة في المستودع:
# ملف SHASUMS256.txt من إصدارات Electron على GitHub، وchecksums.json داخل حزمة electron على npm.
# لا يُبنى شيء إلا إذا اتفق المصدران؛ وتُطبع البصمتان لتُثبَّتا في electron-sha256.txt.
twosrc_sum() {
  local z="$1" a b tmp
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/SHASUMS256.txt" "https://github.com/electron/electron/releases/download/v$V/SHASUMS256.txt" || return 1
  a="$(awk -v f="$z" '{ n = $2; sub(/^\*/, "", n); if (n == f) print $1 }' "$tmp/SHASUMS256.txt")"
  (cd "$tmp" && npm pack "electron@$V" --silent >/dev/null 2>&1 && tar -xzf electron-*.tgz package/checksums.json) || return 1
  b="$(node -e "const c=require(process.argv[1]);process.stdout.write(c[process.argv[2]]||'')" "$tmp/package/checksums.json" "$z")"
  rm -rf "$tmp"
  [[ "$a" =~ ^[0-9a-f]{64}$ ]] && [ "$a" = "$b" ] || return 1
  echo "$a"
}
for P in win32 linux; do
  Z="electron-v$V-$P-x64.zip"
  # البصمة المثبّتة في المستودع لهذا الإصدار وهذه المنصة؛ السطر كما في SHASUMS256.txt الرسمي أو بلا النجمة
  WANT="$(awk -v f="$Z" '$1 !~ /^#/ { n = $2; sub(/^\*/, "", n); if (n == f) print $1 }' "$SUMS")"
  if ! [[ "$WANT" =~ ^[0-9a-f]{64}$ ]]; then
    if WANT="$(twosrc_sum "$Z")"; then
      echo "::notice::بصمة $Z غير مثبّتة، واتفق عليها المصدران (GitHub وnpm): $WANT  $Z — أضف هذا السطر إلى $SUMS"
    else
      echo "::error::لا توجد بصمة sha256 مثبّتة لـ $Z في $SUMS، ولم يتفق عليها المصدران المستقلان (GitHub وnpm). لن يُبنى شيء."
      exit 1
    fi
  fi
  curl -fsSL -o "el-$P.zip" "https://github.com/electron/electron/releases/download/v$V/$Z"
  GOT="$(sha256sum "el-$P.zip" | cut -d' ' -f1)"
  if [ "$GOT" != "$WANT" ]; then
    echo "::error::بصمة $Z لا تطابق المثبّتة في $SUMS (المتوقع $WANT، الفعلي $GOT). لن يُبنى شيء."
    rm -f "el-$P.zip"
    exit 1
  fi
  echo "بصمة $Z مطابقة: $GOT"
  D="$OUT/hasaniya-$([ $P = win32 ] && echo windows || echo linux)"
  rm -rf "$D"; mkdir -p "$D"; unzip -q "el-$P.zip" -d "$D"; rm -f "el-$P.zip"
  rm -f "$D/resources/default_app.asar"
  mkdir -p "$D/resources/app/app"
  cp desktop/main.js desktop/preload.js desktop/package.json "$D/resources/app/"
  cp -r web/index.html web/sw.js web/manifest.json web/css web/js web/img web/fonts web/audio "$D/resources/app/app/"
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
  test -f "$D/resources/app/preload.js"
done
