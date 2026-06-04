#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="${SCRIPT_DIR}/build"
PACKAGES_DIR="${BUILD_DIR}/packages"
PACKAGE_SOURCE_DIR="${BUILD_DIR}/package-source"
CLEAN_CHROME_DIR="${PACKAGE_SOURCE_DIR}/chrome"
CLEAN_FIREFOX_DIR="${PACKAGE_SOURCE_DIR}/firefox"
UNPACKED_DIR="${BUILD_DIR}/unpacked"
CHROME_DIR="${UNPACKED_DIR}/chrome"
FIREFOX_DIR="${UNPACKED_DIR}/firefox"
CHROME_ZIP="${PACKAGES_DIR}/distraction-free-web-chrome.zip"
FIREFOX_ZIP="${PACKAGES_DIR}/distraction-free-web-firefox.zip"
FIREFOX_XPI="${PACKAGES_DIR}/distraction-free-web-firefox.xpi"
SHARED_PATHS=(
  "config"
  "dashboard"
  "icons"
  "limit"
  "popup"
  "scripts"
  "styles"
)

copy_shared() {
  local target_dir="$1"
  mkdir -p "$target_dir"
  rm -rf "${target_dir}/_locales"
  for path in "${SHARED_PATHS[@]}"; do
    cp -R -X "${SCRIPT_DIR}/${path}" "$target_dir/"
  done
}

write_build_info() {
  local target_dir="$1"
  local target_browser="$2"
  local version
  local created_at
  version="$(node -e "console.log(require('${target_dir}/manifest.json').version)")"
  created_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  cat > "${target_dir}/build-info.json" <<EOF
{
  "target": "${target_browser}",
  "version": "${version}",
  "createdAt": "${created_at}"
}
EOF
}

rm -rf "$BUILD_DIR"
rm -rf "${SCRIPT_DIR}/dist" "${SCRIPT_DIR}/unpacked" "${SCRIPT_DIR}/distraction-free-web.zip"
mkdir -p "$CLEAN_CHROME_DIR" "$CLEAN_FIREFOX_DIR" "$CHROME_DIR" "$FIREFOX_DIR" "$PACKAGES_DIR"

copy_shared "$CLEAN_CHROME_DIR"
cp -X "${SCRIPT_DIR}/manifest.chrome.json" "${CLEAN_CHROME_DIR}/manifest.json"
write_build_info "$CLEAN_CHROME_DIR" "chrome"

copy_shared "$CLEAN_FIREFOX_DIR"
cp -X "${SCRIPT_DIR}/manifest.json" "${CLEAN_FIREFOX_DIR}/manifest.json"
write_build_info "$CLEAN_FIREFOX_DIR" "firefox"

copy_shared "$CHROME_DIR"
cp -X "${SCRIPT_DIR}/manifest.chrome.json" "${CHROME_DIR}/manifest.json"
write_build_info "$CHROME_DIR" "chrome"

copy_shared "$FIREFOX_DIR"
cp -X "${SCRIPT_DIR}/manifest.json" "${FIREFOX_DIR}/manifest.json"
write_build_info "$FIREFOX_DIR" "firefox"

find "$BUILD_DIR" -name ".DS_Store" -delete
xattr -cr "$BUILD_DIR" 2>/dev/null || true

(
  cd "$CLEAN_CHROME_DIR"
  zip -qr "$CHROME_ZIP" manifest.json build-info.json config dashboard icons limit popup scripts styles
)

(
  cd "$CLEAN_FIREFOX_DIR"
  zip -qr "$FIREFOX_ZIP" manifest.json build-info.json config dashboard icons limit popup scripts styles
)

cp -X "$FIREFOX_ZIP" "$FIREFOX_XPI"

echo "Chrome for loading:  $CHROME_DIR"
echo "Firefox for loading: $FIREFOX_DIR"
echo "Chrome zip:       $CHROME_ZIP"
echo "Firefox zip:      $FIREFOX_ZIP"
echo "Firefox xpi:      $FIREFOX_XPI"
