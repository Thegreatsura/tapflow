---
"@tapflowio/protocol": minor
"@tapflowio/agent-core": minor
"@tapflowio/ios-agent": minor
"@tapflowio/relay": minor
"@tapflowio/flow-runner": minor
"tapflow": minor
---

A run can choose which background services an iOS simulator boots with. `device:boot.payload.serviceTier` (`{ name: 'stock' | 'lean' | 'slim', allow }`) asks for a tier; the iOS agent writes exactly that tier's launchd overrides before the boot — reverting the previous one first, so a device a run left slim comes back to a person on exactly the default tier — and restarts a running device that is on another tier. A boot that asks for none gets `agent.lean`'s tier, as before. Each device reports its current tier on register and on `device:ready`, and the relay counts a restart onto another tier as a cold boot for the per-Mac boot gate. `tapflow flow run --service-tier slim --allow push,photos` asks for it; flow-runner exports `parseServiceTier` and `SERVICE_FEATURES`; agent-core exports `sameServiceTier`. `LeanStore.apply` is now private: change a device's tier through `setTier`.
