---
'@tapflowio/ios-agent': patch
---

The iOS network control keeps working after an app is launched again while it is running (#692), and a status bar it could not reset is retried and put right on the next toggle (#668). `SimulatorNetwork.target()` no longer deletes the hooks' verdict before each launch: it records the target bundle and when the launch was issued, and `readVerdict` treats a file that names another bundle, names none, or predates a launch that returned a new pid as missing. A launch that returns the same pid, which `simctl launch` does for a running app, keeps the running process's verdict, and a launch whose pid could not be read changes nothing. Layer 3 now tries `status_bar` up to three times; a bar that still fails is marked stale and written again on the device's next `setOffline`, including one refused because layer 1 is unavailable.
