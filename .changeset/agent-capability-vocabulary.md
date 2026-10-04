---
'@tapflowio/agent-core': minor
'@tapflowio/relay': patch
---

`agent-core` exports the capability vocabulary as a runtime value, `KNOWN_AGENT_CAPABILITIES`, with `AgentCapability` derived from it, plus `isAgentCapability()` and `hasCapability()` (#700). The relay checks `network-control` and `build-download` through `hasCapability`, so renaming a capability fails to compile there instead of silently turning a gate off. The capability list on the wire stays `string[]` and the relay still forwards entries it does not know.

<!-- changelog: internal — typed capability checks inside the relay, nothing a user can observe -->
