---
"@tapflowio/android-agent": patch
---

**Launch app** opens the app on Android emulators. tapflow launched it with `monkey`, which by default spends part of its events on system keys and, on a device with no physical system keys, stops before sending any event, the launch included. The button stopped spinning and the app stayed closed, with nothing on screen to say why. tapflow now tells `monkey` to send no system keys.
