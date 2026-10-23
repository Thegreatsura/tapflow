---
"@tapflowio/ios-agent": patch
---

Lean mode no longer disables `com.apple.financed`. Wallet's `passd` depends on it and crashed at start-up on lean simulators (3 of 7 measured boots on iOS 26.5, none with it on). A device already lean picks the change up on its next cold boot. The slim tier's `wallet` keep now keeps `com.apple.financed` along with `com.apple.passd`.
