---
"@tapflowio/relay": patch
---

The iOS viewer no longer stays on its loading placeholder when the agent could not build the device frame. It shows the screen on its own, at the device's own proportions once the first frame arrives, and says the side buttons (lock, volume) are unavailable for that session. "Waiting for first frame" is now readable over a picture already on screen: the screen is dimmed behind it.
