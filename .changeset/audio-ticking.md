---
"@tapflowio/relay": patch
"@tapflowio/audiotap-helper": patch
---

Device audio plays without ticking. The dashboard plays device audio at its own 44.1 kHz instead of the speakers' rate: each audio chunk is scheduled on its own, and at 48 kHz the chunk boundaries drifted off the sample grid and ticked several times a second. The audiotap helper's resampler carries its position and the previous frame from one Core Audio callback to the next; it used to start each callback afresh, dropping part of a frame and leaving each boundary uninterpolated, a tick every 10 ms and 44,062 frames a second instead of 44,100. The rebuilt helper asks once more for permission to record audio, which both iOS capture and the Android host-mute need.
