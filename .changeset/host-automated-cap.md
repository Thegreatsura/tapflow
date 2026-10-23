---
"@tapflowio/relay": minor
"@tapflowio/protocol": minor
"@tapflowio/flow-runner": minor
"@tapflowio/mcp-server": minor
"tapflow": minor
---

The relay caps how many devices automation keeps running on each Mac (`TAPFLOW_MAX_AUTOMATED_DEVICES`, default half the Mac's memory in GB, 1–8; an Android emulator counts as two). Each session remembers who cold-booted its device (`lastBoot`), past the holder leaving. An automated cold boot past the cap shuts down the longest-running idle device automation started, once the gate lets the boot through; with none idle it is refused with the new `BootRefusalReason` `host-at-capacity`, which flow-runner and MCP wait out. An automated boot refused for `host-memory-critical` also shuts down one idle automation device, one at a time per Mac. An automation client that joined a device during a person's idle countdown restarts the countdown when it leaves.
