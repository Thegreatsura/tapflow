---
'@tapflowio/android-agent': patch
---

A boot owns the stream it starts (#587). `startVideoStream` checks the boot's seq after each await and before each write to the shared device state, including inside the screen reconcile and posture normalisation it awaits; a start that has been overtaken stops the handles it created, clears a shared field only while it still points at its own handle, and never falls back from gRPC to scrcpy over the newer boot. A restart captures the seq too and passes "restart" as an argument rather than through a shared flag. A boot whose emulator stopped mid-boot (#611) now answers `device:boot-error` before announcing anything, and a stream restart that finds its emulator gone reports it.
