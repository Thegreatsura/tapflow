---
"@tapflowio/protocol": minor
"@tapflowio/ios-agent": minor
---

The iOS agent drives the iPhone Duo simulator (Xcode 27.1). It captures whichever panel is lit and sends that panel's frame, and taps, gestures, typing and the hardware buttons reach the lit panel. It folds and unfolds the device through the posture capability Android foldables already use, and follows a fold or turn made in Xcode's DeviceHub. Input goes through a helper the agent runs inside the simulator (`guest-helper`, Apple silicon). An install without the helper or without `devicectl` leaves the iPhone Duo out of the device list, and a runtime that refuses the helper, or a helper not ready within 60 s, fails the boot with the reason. While a session is open the agent reads the device's panel and orientation every 2 s, slowing to every 6 s once nothing has moved for 30 s.

`ChromeData` gains `streamRotation` (the device's physical orientation, in quarter turns clockwise), `scaleBasis` and `screenCornerRadii`, and `input:rotate` can carry `direction` instead of `orientation`. All are optional and sent only for the iPhone Duo.

A button on the top edge of a device frame is now placed by the rule that matches DeviceHub on the Duo. The only single-panel frame with one is the iPad mini's (6th generation and A17 Pro), whose volume buttons move 5 pt along the top edge, the drawn button, its pressed image and where it can be clicked together.
