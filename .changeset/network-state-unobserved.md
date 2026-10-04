---
'@tapflowio/protocol': minor
'@tapflowio/agent-core': minor
'@tapflowio/android-agent': patch
'@tapflowio/relay': patch
---

An Android device whose network state tapflow has never managed to read is reported as unknown, not as online (#667). If airplane mode could not be read when the device booted, or when a network toggle failed before any read had succeeded, the agent answered `offline: false`, so a device someone had taken offline in the emulator's own UI was drawn as on the network. `network:state` now carries a third payload shape, `NetworkUnobserved` (`{ available: false, reason: 'state-unconfirmed' }` with no `offline`), sent on `device:ready` and in reply to `network:set`; the reply to a viewer's re-join stays silent as before. The dashboard draws it as unknown and says the state could not be read.

**Type-level breaking change.** `NetworkStatePayload` gains the member, so `offline` is `boolean | undefined`: code that assigns it to a `boolean` no longer compiles, and a truthy test reads the new shape as online. Narrow on `payload.offline === undefined`, not on `'offline' in payload`. Android's in-process `networkState()` now returns this payload where it used to throw for a device never observed. A released dashboard (0.20–0.26) draws the new shape as online, which is what it drew for the `false` it replaces.
