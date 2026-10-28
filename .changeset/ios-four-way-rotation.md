---
"@tapflowio/ios-agent": minor
---

Every iOS simulator now turns the way it is held, as the iPhone Duo does. The agent reports `streamRotation` for single-panel iPhones and iPads too, and turns them a quarter at a time on `input:rotate`'s `direction`, through Purple. It reads the orientation when a session starts and before each turn — with `devicectl device orientation get` on an Xcode 27 host, and on an older one, whose devicectl does not see simulators, inside the simulator through the guest helper (`guest-helper --orientation`, renamed from `duo-helper`) — and never resets it, so a reload or a second viewer no longer turns the device under the first. A run's boot still stands the device upright, so a flow replays from the same orientation. An older viewer's `landscape` target still means the landscape it draws.
