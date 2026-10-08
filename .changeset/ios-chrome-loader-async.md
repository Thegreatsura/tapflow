---
"@tapflowio/ios-agent": patch
---

Booting an iOS device no longer freezes the agent while it prepares the device frame. The frame used to be built with blocking calls — `simctl list devicetypes` on every boot and, the first time a model was used, several image renders — so every session on that Mac stopped responding for seconds, and longer on a busy machine. It is now built in the background with time limits, once per device model while the agent runs; two boots of the same model share the work, and a render that is interrupted can no longer leave a broken frame image cached.
