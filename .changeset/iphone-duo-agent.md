---
"@tapflowio/protocol": minor
"@tapflowio/ios-agent": minor
---

The iOS agent drives the iPhone Duo simulator (Xcode 27.1). It captures whichever panel is lit and sends that panel's frame, and taps, gestures, typing and the hardware buttons reach the lit panel. It folds and unfolds the device through the posture capability Android foldables already use, and follows a fold or turn made in Xcode's DeviceHub. Input goes through a helper the agent runs inside the simulator (`duo-helper`, Apple silicon); a Mac that cannot run it leaves the iPhone Duo out of the device list, and a runtime that refuses it fails the boot with the reason. While a session is open the agent reads the device's panel and orientation every 2 s, slowing to every 6 s once nothing has moved for 30 s.

`ChromeData` gains `streamRotation` (the device's physical orientation, in quarter turns clockwise), `scaleBasis` and `screenCornerRadii`, and `input:rotate` can carry `direction` instead of `orientation`. All are optional and sent only for the iPhone Duo; every other iPhone and iPad behaves as before.
