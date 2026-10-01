---
"@tapflowio/relay": patch
---

The iOS viewer's frame buttons are pressed through elements the browser hit-tests, laid out once per layout instead of a per-event nearest-rectangle search with a hand-written inverse of the landscape rotation. Each target stops at the frame's body rather than at the screen, so clicking the bezel no longer presses a side button (#785).
