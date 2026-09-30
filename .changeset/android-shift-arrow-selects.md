---
"@tapflowio/android-agent": patch
---

Android holds Shift and Ctrl with the arrows, Home, End, Page Up and Page Down, so Shift+Arrow selects text instead of moving the caret, and Cmd with them is held as Ctrl. On Android below 13, which cannot hold a modifier from adb, those keys are answered as unsupported rather than pressed bare; every other key is still pressed as before (#416).
