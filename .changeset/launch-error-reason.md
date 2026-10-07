---
"@tapflowio/ios-agent": patch
"@tapflowio/android-agent": patch
---

A failed app launch says why, without the command line. The reason used to be node's `Command failed: <argv>` message, which carries the simulator UDID on iOS and the host's SDK path and the emulator serial on Android, and on Android was followed by `monkey` repeating its own arguments. iOS now sends simctl's own reason, as a failed boot already did. Android sends `monkey`'s or adb's own line, or "No launchable activity found for <package>" when the app has nothing to launch.
