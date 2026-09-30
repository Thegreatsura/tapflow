---
"@tapflowio/android-agent": patch
---

Android holds Shift, Ctrl and Alt with arrows, Home, End and the other special keys, so Shift+Arrow selects text instead of moving the caret. Cmd is held as Ctrl. On Android below 13, which cannot hold a modifier from adb, the key is answered as unsupported rather than pressed bare (#416).
