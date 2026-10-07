---
"@tapflowio/relay": patch
---

The dashboard says why **Launch app** failed. A failed launch stopped the spinner and showed nothing, so the button looked like it did nothing; it now raises a notice, "The app did not launch", with the device's reason beneath it. A launch started by another client on the same session, such as an MCP agent, still shows nothing in this viewer.
