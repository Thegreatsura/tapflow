#!/bin/bash
# Build `bin/duo-helper` from `src/duo-helper.m` — the in-simulator input helper for multi-panel devices
# (iPhone Duo). It runs inside the simulator through `xcrun simctl spawn`, so it is an iOS-simulator
# executable, built and committed the way `build-nethook.sh` builds the injected library.
#
# The private frameworks it needs (HID.framework, the IOKit HID event constructors) are opened with dlopen
# rather than linked, so this builds with any Xcode's iphonesimulator SDK — the Duo runtime only exists on
# Xcode 27.1, and a link-time dependency would tie the build to that one host.
#
# `-mios-simulator-version-min=17.0` matches the dylib next door. arm64 only, like it: an Intel host never
# runs the Duo runtime. An ad-hoc signature is what `simctl spawn` requires of an executable; the linker
# applies one on Apple silicon, and `codesign -s -` makes that explicit and reproducible.
set -euo pipefail
cd "$(dirname "$0")"

out=bin/duo-helper
xcrun --sdk iphonesimulator clang \
  -arch arm64 \
  -mios-simulator-version-min=17.0 \
  -fobjc-arc \
  -O2 \
  -framework Foundation \
  -o "$out" \
  src/duo-helper.m
codesign -s - -f "$out" 2>/dev/null

chmod 755 "$out"
echo "built $out"
otool -l "$out" | grep -A3 LC_BUILD_VERSION | sed 's/^/  /'

# Record in the same step that produced the binary, for the reason build-nethook.sh gives.
node ../../scripts/record-duo-helper-artifact.mjs --after-build
