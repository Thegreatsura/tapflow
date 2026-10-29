---
"@tapflowio/relay": minor
---

The dashboard draws an Android emulator that reports `bodyRotation` by its body: the frame as it arrives, in a shell of its shape, so a portrait-locked app shows on its side. Rotate spins the device a quarter clockwise, as on iOS, sends the turn once the spin has finished, and the next frame ends the spin; a turn whose frame never comes is undone after 4 s. Touches go out in the frame's space (`space: 'frame'`), so one sent right after a turn lands where it is aimed; a touch is refused only while the device is drawn mid-spin. Leaving a session no longer turns the device back. Real devices and emulators without gRPC (scrcpy) still toggle portrait/landscape.
