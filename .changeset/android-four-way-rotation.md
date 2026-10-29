---
"@tapflowio/protocol": minor
"@tapflowio/android-agent": minor
"@tapflowio/ios-agent": patch
---

An Android emulator streaming over gRPC now turns the way it is held, as iOS simulators do. The agent reports `AndroidChrome.bodyRotation` — how far the emulator's body is turned clockwise — and turns the body a quarter at a time on `input:rotate { direction }` with `adb emu rotate`, from a fresh accelerometer reading on the emulator console. It no longer writes `wm user-rotation lock`: the lock earlier versions set is freed once per AVD (a marker file beside the AVD), and a lock set after that is left alone. A boot that starts the emulator, and a flow run, stand the body upright; any other session joins it where it is held. `AndroidChrome.streamRotation` keeps its meaning, and a touch still means the screen Android draws, so MCP, flows and older dashboards are unaffected. `input:touch:start`/`move` and `input:pinch:start`/`move` take an optional `space: 'frame'`, which says the point is on the video frame as it arrives; the agent turns it by that frame's own orientation, so a viewer drawing the body can send a touch the moment a turn lands instead of waiting for the chrome to catch up. A `direction` never answers with a rotation lock, even while the gRPC stream restarts, and a lock tapflow writes on an emulator without gRPC is freed again by its next gRPC session.

A flow run also stands an iPhone Duo upright, through its helper.
