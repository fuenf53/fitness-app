#!/usr/bin/env bash
# Rebuild the web app and produce a fresh debug APK.
#
# Needs a JDK and the Android SDK (platform 34, build-tools 34.0.0) — see
# README.md "Android APK" section for the one-time setup. Defaults below
# point at where that setup puts them; override via env vars if yours live
# elsewhere.
set -euo pipefail

: "${JAVA_HOME:=$HOME/tools/jdk21}"
: "${ANDROID_HOME:=$HOME/tools/android-sdk}"
export JAVA_HOME ANDROID_HOME
export PATH="$JAVA_HOME/bin:$PATH"

cd "$(dirname "$0")/.."

echo "==> Building web assets"
npm run build

echo "==> Syncing into the Android project"
npx cap sync android

echo "==> Assembling debug APK"
(cd android && ./gradlew assembleDebug --no-daemon --console=plain)

APK=android/app/build/outputs/apk/debug/app-debug.apk
echo
echo "==> Done: $APK"
echo "    Copy it to your phone and install (allow \"unknown sources\" for the app you use to open it)."
echo "    Or, with the phone connected over USB and USB debugging on:"
echo "    $ANDROID_HOME/platform-tools/adb install -r $APK"
