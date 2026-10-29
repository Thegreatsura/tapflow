---
"@tapflowio/relay": patch
---

The dashboard copies an iOS device's picture into the canvas that recording and screenshots read only when a new frame arrives. It copied it at full resolution on every display refresh, up to 120 times a second on a ProMotion display for a 30 fps stream, which cost the viewing Mac GPU time while nothing was recorded.
