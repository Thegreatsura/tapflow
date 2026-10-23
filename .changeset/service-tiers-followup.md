---
"@tapflowio/protocol": patch
"@tapflowio/agent-core": patch
"@tapflowio/flow-runner": patch
"@tapflowio/ios-agent": patch
"@tapflowio/relay": minor
"tapflow": patch
---

Follow-ups to service tiers. **The feature list is renamed from `allow` to `keep`** (`serviceTier.keep`, `tapflow flow run --keep push,photos`) before any release carried it: "allow push" read as granting the app a permission. `--service-tier stock --keep ...` is refused, since stock switches nothing off. The run record keeps the tier a run asked for (`serviceTier`, migration 018), and the run page shows it. The dashboard marks a running device a run left slim (**Most services off**) and says in the info card that a restart turns its services back on. `tapflow doctor` counts devices by tier (`on (2 devices: 1 lean, 1 slim now)`). And a simulator whose override marker cannot be read is put back on its plist defaults for every label a tier can touch, instead of having its current overrides recorded as the originals and left off for good: `LeanStore` takes the managed labels as its second constructor argument (`MANAGED_LABELS`).
