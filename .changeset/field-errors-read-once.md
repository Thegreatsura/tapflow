---
'@tapflowio/relay': patch
---

Dashboard forms no longer read the focused field's error twice to a screen reader after a refused submit (#824). A field's error is its input's description only, and one visually hidden polite region per form says how many fields need attention, set once per submit. Nothing changes on screen.
