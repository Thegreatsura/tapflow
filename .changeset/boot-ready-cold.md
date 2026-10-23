---
"@tapflowio/protocol": patch
"@tapflowio/ios-agent": patch
"@tapflowio/android-agent": patch
---

`device:ready` carries an optional `payload.cold`: whether this boot brought the device up, as opposed to finding it already running. Both agents report it. Nothing reads it yet; it is the fact the relay's per-host boot gate will charge a boot by, and it ships ahead of that gate so agents on other Macs already send it when the relay starts reading it. Absent means unknown, never `false`.

<!-- changelog: internal — no consumer reads the field yet; the boot gate that uses it will carry the user-facing entry -->
