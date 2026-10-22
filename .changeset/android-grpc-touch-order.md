---
"@tapflowio/android-agent": patch
---

On an emulator, a tap's up could overtake its down and leave the touch pressed. Each touch event is its own gRPC call, and the emulator does not take concurrent calls in the order they were sent: while it was busy right after an app install, the up arrived first, the kernel dropped it as a release of a touch that was already up, and the down that followed stayed pressed, so the app ignored that tap and the next one. Touch calls from a stream now go out one at a time, each after the one before it is answered or times out; a call that timed out may still be applied after the next one. Measured on Android 14: 3 of 16 fresh-install runs missed a tap before, none of 19 after.
