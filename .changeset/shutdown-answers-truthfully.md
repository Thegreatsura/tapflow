---
'@tapflowio/protocol': patch
'@tapflowio/agent-core': patch
'@tapflowio/relay': patch
'@tapflowio/ios-agent': patch
'@tapflowio/android-agent': patch
---

A device shutdown that fails now says so (#455). iOS answered a failed `simctl shutdown` with nothing and Android answered a failed `adb emu kill` with `device:shutdown-done`; both now send `device:shutdown-error`, which moves from `RelayToBrowser` to `RelayOrAgentToBrowser`, and when `adb emu kill` fails (or adb has no console for the emulator) Android checks the process table before answering. Both agents also answer a correlated shutdown for a session they hold no state for. The relay now hands a correlated shutdown's answer to the socket that asked when that socket does not hold the session (#567), and tells it the outcome is unknown if the agent goes away for good first. Upgrade the relay before the agents: an older relay drops the agent's new error, so a failed shutdown on an upgraded Android agent goes unanswered instead of being reported as a success.
