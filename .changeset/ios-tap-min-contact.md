---
"@tapflowio/ios-agent": patch
---

A tap from a flow or an AI agent on iOS now lasts at least 50ms. Clients send the touch's down and up back to back, and a `UISwitch` ignored most such taps (3 of 20 toggled on iOS 26.5); the agent now holds the up back until the touch has lasted that long, and acks the tap once the up is written. A person's tap and every swipe already last longer, so nothing they send is delayed.
