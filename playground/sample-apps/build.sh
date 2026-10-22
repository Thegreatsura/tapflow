#!/usr/bin/env bash
# Build the tree measurement sample apps into playground/test-builds/, where the other test builds live
# (gitignored). Nothing built here is committed — see `.work` e2e-followups A3 for why.
#
#   ./build.sh            # iOS: both targets
#   ./build.sh <udid>     # and install them on that booted simulator
#
# Outputs, ready to upload to App Center:
#   playground/test-builds/sample-uikit.app.zip     dev.tapflow.sample.uikit
#   playground/test-builds/sample-swiftui.app.zip   dev.tapflow.sample.swiftui
set -euo pipefail
cd "$(dirname "$0")"
UDID="${1:-}"
OUT="$(cd .. && pwd)/test-builds"
mkdir -p "$OUT"

(
  cd ios
  xcodegen generate >/dev/null
  for target in SampleUIKit SampleSwiftUI; do
    xcodebuild -project TapflowSample.xcodeproj -scheme "$target" -configuration Debug \
      -sdk iphonesimulator -destination "generic/platform=iOS Simulator" -derivedDataPath build \
      CODE_SIGNING_ALLOWED=NO build >/dev/null
  done
)

for pair in "SampleUIKit:sample-uikit" "SampleSwiftUI:sample-swiftui"; do
  target="${pair%%:*}"
  name="${pair##*:}"
  app="ios/build/Build/Products/Debug-iphonesimulator/$target.app"
  [[ -d "$app" ]] || { echo "build produced no app at $app" >&2; exit 1; }
  # The .app at the zip's root, which is the layout App Center accepts.
  rm -f "$OUT/$name.app.zip"
  ditto -c -k --keepParent "$app" "$OUT/$name.app.zip"
  echo "built $OUT/$name.app.zip"
  if [[ -n "$UDID" ]]; then
    xcrun simctl install "$UDID" "$app"
    echo "installed $target on $UDID"
  fi
done
