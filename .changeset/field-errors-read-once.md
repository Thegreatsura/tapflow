---
'@tapflowio/relay': patch
---

Dashboard forms no longer read the focused field's error twice to a screen reader after a refused submit (#824). A field's error is its input's description only. Focus moves to the first invalid field after the render that describes it (react-hook-form's own focus, which arrived before the error, is off), so the error is read once as focus lands. One visually hidden polite region per form says how many fields need attention, led by the error of a field that already had focus (Enter pressed in it), emptied and refilled on each refusal. Nothing changes on screen.
