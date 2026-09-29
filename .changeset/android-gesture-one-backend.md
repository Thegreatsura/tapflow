---
'@tapflowio/android-agent': patch
---

A gesture stays on the backend that opened it (#487). The opening and closing frames of a touch or pinch used to choose between the pointer channel and the adb helper by different conditions, so a gesture opened on the helper during a stream restart closed on the channel that came back: a touch-up with no touch-down answered `delivered`, and the helper, left mid-gesture, tapped the abandoned position on the next end it received. The backend is now recorded when the gesture opens and compared by identity; an end whose backend was replaced is answered `no-gesture` — before `channel-down`, since its touch-down did land — and released best effort on the channel serving now, because a gRPC emulator keeps a pointer down across the client a restart replaced; a move with no gesture behind it is dropped. The record is released before the end dispatches, so a fast next tap keeps its own, and `AndroidTouchHelper.stop()` forgets an open gesture.
