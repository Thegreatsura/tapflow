---
"@tapflowio/relay": patch
---

The dashboard records an iOS device at the stream's resolution. The recording canvas was the size the device was laid out on the page, so a phone shown 420 px wide was recorded about 420 px wide from a 1206-px stream; it is now the laid-out device scaled by the screen's stream pixels per page pixel, frame and cursor included, held to 1920 px on its longest side and to even dimensions. Android recordings were already at the stream's size and are unchanged.
