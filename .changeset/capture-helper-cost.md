---
"@tapflowio/ios-agent": patch
---

The iOS screen-capture helper uses less CPU while the screen moves. It looked up the simulator's framebuffer surface on every frame the simulator drew, 60 times a second or more, for a surface that does not change; it now looks it up when the simulator reports its surfaces changed, when a panel is selected, and once a second as a fallback. The helper is also compiled with optimisation.
