---
"@tapflowio/relay": minor
"@tapflowio/protocol": minor
"@tapflowio/flow-runner": minor
"@tapflowio/mcp-server": minor
"tapflow": minor
---

The relay boots one device at a time per Mac. A boot holds the Mac's slot from the moment it is let through until the device has settled — its CPU flat across three reports, or a cap — because the boot is what slows the other sessions on that Mac. An automated boot (flow runner, MCP) that finds the slot taken is answered with `device:boot-error` carrying `reason: 'host-booting'`. A person's boot is never refused: it waits in the Mac's one reservation, ahead of any automated retry, for at most 60 s. While a boot holds the slot, the `session:start` CPU check is paused for that Mac. `tapflow flow run` waits out a refusal with backoff, letting go of the session while it waits, for up to `--admission-timeout` (600 s). flow-runner exports `retryAdmission`, `admissionRefusalOf` and `AdmissionRefusedError`; MCP's `boot_device` says the Mac is busy and to call it again.
