---
"@tapflowio/protocol": minor
"@tapflowio/agent-core": minor
"@tapflowio/relay": patch
"@tapflowio/ios-agent": patch
---

Devices carry an optional `formFactor` (`phone` | `tablet` | `foldable`) from the agent's register to `agents:listed`. The iOS agent reports it from `simctl list devicetypes` (`productFamily`), read once per connect with a timeout; a failed lookup registers the device without it. A relay drops a value it does not know rather than refusing the register, and refuses a value that is not a string. The iOS viewer uses it to name an iPad's volume buttons by what they do: iPadOS raises the volume with whichever button is on the right or on top as held, so in landscape the tooltips swap where that differs from the physical names.
