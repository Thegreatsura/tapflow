---
"@tapflowio/ios-agent": patch
"@tapflowio/android-agent": patch
---

A failed app launch says why, without the command line. The reason used to be node's `Command failed: <argv>` message, which carries the simulator UDID on iOS and the host's SDK path and the emulator serial on Android, and on Android was followed by `monkey` repeating its own arguments. iOS now sends the first line of simctl's output that is not a header, such as "Simulator device failed to launch <bundle id>." Android sends `monkey`'s or adb's own error line; failing that, "No launchable activity found for <package>" when `monkey` ran, or "adb did not finish the launch" when nothing shows it did. Both agents log the full output.
