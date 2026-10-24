---
"@tapflowio/protocol": minor
"@tapflowio/relay": minor
"@tapflowio/flow-runner": minor
---

`device:lease` asks the relay to choose a device instead of naming one. In one step the relay picks a free device of the platform, or of the build's platform, makes the asker its holder and boots it. It takes a device automation left up first. Otherwise it boots one on the Mac with the most memory left that its boot gate, automation cap and resource checks would let through. Those checks are asked without being recorded, so a Mac passed over is not charged a refusal. A device of automation's on another tier counts as a boot, as the boot itself would judge it.

It never takes a device in a person's idle countdown (including one an AI client handed back to them), one a person booted, one starting or stopping outside the relay, or one that was up before the relay booted it. The answer is `device:leased`, followed by the boot's own `device:ready` or `device:boot-error` with the lease's `requestId`; a lease that cannot be served gets `device:lease-refused` with a reason and whether waiting can help. `agents:listed` gains `features: ['device-lease']`, so a client can tell a relay that would drop the message.

`RelayClient` gains `lease()`, which leaves the session again if the join or boot after the choice fails, `canLease()` and a `clientId` option, so the clients of one run are one holder. `AdmissionReason` gains `all-held`.
