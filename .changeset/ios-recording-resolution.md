---
"@tapflowio/relay": patch
---

The dashboard records an iOS device at up to the stream's resolution. The recording canvas was the size the device was laid out on the page, under a third of the stream on a native-tier iPhone; it is now the laid-out device scaled by the screen's stream pixels per page pixel, frame and cursor included, held to 1920 px on its longest side and to even dimensions. A native-tier phone with its frame meets that limit and is recorded at about 70% of the stream; the smaller stream tiers are recorded at their full size. Android recordings were already at the stream's size and are unchanged.
