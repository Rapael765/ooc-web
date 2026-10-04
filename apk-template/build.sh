#!/usr/bin/env bash
# Membangun APK pembungkus WebView tanpa Gradle.
# Input (environment): APP_NAME, SITE_URL, ICON_URL, JOB_ID
# Output: apk-template/out/<NamaAplikasi>.apk
set -euo pipefail
cd "$(dirname "$0")"

: "${APP_NAME:?APP_NAME kosong}" "${SITE_URL:?SITE_URL kosong}" "${ICON_URL:?ICON_URL kosong}" "${JOB_ID:?JOB_ID kosong}"

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
BT="$SDK/build-tools/34.0.0"
JAR="$SDK/platforms/android-34/android.jar"
[ -d "$BT" ] || { echo "build-tools 34.0.0 tidak ditemukan di $SDK"; exit 1; }
[ -f "$JAR" ] || { echo "android.jar platform 34 tidak ditemukan"; exit 1; }

# ID pekerjaan hanya boleh huruf kecil/angka -> aman dipakai sebagai nama package
JOB_ID="$(echo "$JOB_ID" | tr -cd 'a-z0-9')"
PKG="ooc.app.a${JOB_ID}"
SLUG="$(echo "$APP_NAME" | tr -cd 'A-Za-z0-9' | cut -c1-24)"
[ -n "$SLUG" ] || SLUG="app"

rm -rf build out
mkdir -p build/res/values build/obj build/dex build/src/ooc/wrap out

echo "==> Ikon"
# ImageMagick: runner baru kadang hanya punya "magick" (v7) atau belum terpasang
if command -v magick >/dev/null 2>&1; then
  IM="magick"
elif command -v convert >/dev/null 2>&1; then
  IM="convert"
else
  sudo apt-get update -qq
  sudo apt-get install -y -qq imagemagick
  if command -v magick >/dev/null 2>&1; then IM="magick"; else IM="convert"; fi
fi
curl -fsSL --max-time 40 -o build/icon.src "$ICON_URL"
for pair in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
  d="${pair%%:*}"; s="${pair##*:}"
  mkdir -p "build/res/mipmap-$d"
  $IM "build/icon.src[0]" -background white -alpha remove -alpha off \
    -resize "${s}x${s}^" -gravity center -extent "${s}x${s}" \
    "PNG:build/res/mipmap-$d/ic_launcher.png"
done

echo "==> Manifest & teks"
python3 - "$PKG" <<'PY'
import os, sys
from xml.sax.saxutils import escape

pkg = sys.argv[1]

def res(s):
    s = escape(s).replace("\\", "\\\\").replace("'", "\\'").replace('"', '\\"')
    if s[:1] in ("@", "?"):
        s = "\\" + s
    return s

name = os.environ["APP_NAME"].strip() or "App"
url = os.environ["SITE_URL"].strip()

with open("build/res/values/strings.xml", "w", encoding="utf-8") as f:
    f.write(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        '  <string name="app_name" formatted="false">%s</string>\n'
        '  <string name="site_url" formatted="false">%s</string>\n'
        '</resources>\n' % (res(name), res(url))
    )

with open("AndroidManifest.xml", encoding="utf-8") as f:
    manifest = f.read().replace("__PKG__", pkg)
with open("build/AndroidManifest.xml", "w", encoding="utf-8") as f:
    f.write(manifest)
PY
cp MainActivity.java build/src/ooc/wrap/MainActivity.java

echo "==> Resource"
"$BT/aapt2" compile --dir build/res -o build/compiled.zip
"$BT/aapt2" link -o build/app-unsigned.apk -I "$JAR" \
  --manifest build/AndroidManifest.xml \
  --min-sdk-version 21 --target-sdk-version 34 \
  --version-code 1 --version-name 1.0 \
  build/compiled.zip

echo "==> Kode Java"
javac --release 8 -Xlint:-options -classpath "$JAR" -d build/obj build/src/ooc/wrap/MainActivity.java
"$BT/d8" --release --min-api 21 --lib "$JAR" --output build/dex $(find build/obj -name '*.class')
( cd build/dex && zip -q ../app-unsigned.apk classes.dex )

echo "==> Tanda tangan"
"$BT/zipalign" -f -p 4 build/app-unsigned.apk build/app-aligned.apk
keytool -genkeypair -keystore build/ks.jks -storepass android -keypass android \
  -alias key -dname "CN=OOC Web to APK" -keyalg RSA -keysize 2048 -validity 10000 >/dev/null 2>&1
"$BT/apksigner" sign --ks build/ks.jks --ks-pass pass:android --key-pass pass:android \
  --out "out/${SLUG}.apk" build/app-aligned.apk
"$BT/apksigner" verify "out/${SLUG}.apk"

ls -la out
