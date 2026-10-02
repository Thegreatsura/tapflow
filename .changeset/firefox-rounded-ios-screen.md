---
'@tapflowio/relay': patch
---

The iOS screen keeps its rounded corners in Firefox on macOS (#908). While frames flow, Firefox's compositor promotes the large WebGL screen canvas to a native layer and drops its rounded clip ([Bugzilla 2068303](https://bugzilla.mozilla.org/show_bug.cgi?id=2068303)). The dashboard now gives the screen canvas and the decoder surface an opaque `mask-image` there, which keeps them out of that promotion — confirmed on #908 by toggling it with the stream running. Other browsers are left alone: the defect was seen only there, and what the mask costs elsewhere was not measured.
