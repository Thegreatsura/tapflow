---
"@tapflowio/relay": patch
---

The iOS viewer's frame buttons are pressed through elements the browser hit-tests, laid out once per layout instead of a per-event nearest-rectangle search with a hand-written inverse of the landscape rotation. Each target is the button's length along its edge and runs from the frame's box to the button's centre line, where the frame body begins, so clicking the bezel or the page beside the device no longer presses a side button (#785).
