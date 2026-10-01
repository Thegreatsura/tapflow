---
'@tapflowio/protocol': patch
'@tapflowio/ios-agent': patch
'@tapflowio/android-agent': patch
'@tapflowio/relay': patch
---

`input:rotate` carries an optional target, `payload.orientation` (`portrait` or `landscape`), and both agents go there instead of toggling (#910). A toggle has a memory on each side, and the agent's was reset on every re-register while the device stayed put, so after an agent restart the viewer's undo turned the device landscape and every later press stayed inverted. Rotations are now queued per device, so a held shortcut or a boot racing the first press lands in order, and both agents stand the device upright when a session boots: iOS always, Android only when it is already locked to a turn, so an auto-rotating emulator is never newly locked. An agent without the field toggles as before, and the dashboard still sends its undo only from landscape, so a newer dashboard against an older agent behaves as it does today.
