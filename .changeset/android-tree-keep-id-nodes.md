---
"@tapflowio/android-agent": patch
---

The Android UI tree keeps a node that has an id even when it is neither clickable nor labelled, as the iOS tree does. A Compose `Slider` (a `SeekBar` that is focusable but not clickable) and the selected item of a navigation bar (which reports `selected` and drops `clickable`) were missing, so a selector naming them by `id` never matched. Keeping more nodes surfaced a rounding defect too: a node flush with the bottom edge came out at `y + height = 1.0001`, and every client refuses the whole tree for one element outside 0–1. The far edge is now rounded down, as on iOS.
