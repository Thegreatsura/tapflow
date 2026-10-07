---
"@tapflowio/android-agent": patch
---

**Launch app** opens the app on Android emulators. tapflow launched it with `monkey`, which by default spends part of its events on system keys and, on a device with no physical system keys (an AVD with `hw.mainKeys=no`, as Pixel profiles have), stops before sending any event, the launch included. In the dashboard the button stopped spinning and the app stayed closed, with nothing on screen to say why; a flow's `launchApp` step, run by `tapflow flow run` or the MCP server, failed with the `monkey` command in its error. tapflow now tells `monkey` to send no system keys.
