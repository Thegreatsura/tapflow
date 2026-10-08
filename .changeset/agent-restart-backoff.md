---
"@tapflowio/ios-agent": patch
"@tapflowio/android-agent": patch
---

The agents hold up better when a device misbehaves. An iOS screen stream that keeps ending before its first frame — a simulator shut down from outside, or one still starting — is restarted with a growing delay (up to 5s) instead of in a tight loop, and a stream that ended in an error no longer risks ending the agent when the session is torn down. A reconnect to the relay no longer waits forever on a stuck `simctl list`: the attempt gives up after 10 seconds and tries again. On Android, stopping the host-speaker mute no longer blocks the agent, and a quick re-boot of the same emulator cannot cancel its own new mute.
