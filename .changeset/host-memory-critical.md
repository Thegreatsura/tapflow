---
"@tapflowio/relay": minor
"@tapflowio/protocol": minor
"@tapflowio/agent-core": minor
"@tapflowio/ios-agent": minor
"@tapflowio/android-agent": minor
"@tapflowio/flow-runner": minor
"@tapflowio/mcp-server": minor
"tapflow": minor
---

The boot gate refuses new devices on a Mac whose kernel reports critical memory pressure. Agents report `kern.memorystatus_vm_pressure_level` as `agent:resources.resources.memoryPressure` (`normal`, `warn`, `critical`; macOS only, absent elsewhere). While an agent on a Mac reports `critical`, the relay refuses automated cold boots there with `device:boot-error` `reason: 'host-memory-critical'`, and holds a person's cold boot in the reservation as it does behind another boot; the reading lapses 15 s after the last report that said so. `device:boot-waiting` carries an optional `reason` and is sent again when the wait's reason changes. flow-runner and MCP treat any `reason` on a refused boot as a busy Mac, including one they do not know (`AdmissionReason`, `'unrecognised-refusal'`), so a newer relay's reason is waited out instead of failing the run.
