---
'@tapflowio/relay': patch
---

An iOS frame button pressed again within 100 ms of releasing one keeps its pressed image while held. The earlier release's timer used to clear it; the timer is now cancelled by the next press and when the viewer unmounts.
