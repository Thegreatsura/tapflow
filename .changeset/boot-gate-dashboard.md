---
"@tapflowio/relay": minor
"@tapflowio/protocol": minor
---

The dashboard shows the per-Mac boot gate. A person whose boot is held behind another device starting on the same Mac sees "Another device is starting on this Mac. Yours starts next…", from the relay's new `device:boot-waiting` (correlated, with the time the boot goes ahead regardless). The Mac picker no longer recomputes an 80 % threshold: `agents:listed` carries each Mac's `admission` (`booting`, `overloaded`) from the relay's own join gate, so a Mac at high CPU while a device is starting there can still be picked, and the card says a device is starting. On a Mac short of memory the card stays open while it has a device up to rejoin, and the device list marks the ones the relay would refuse (`memoryRefuses`: devices it has not brought up itself).
