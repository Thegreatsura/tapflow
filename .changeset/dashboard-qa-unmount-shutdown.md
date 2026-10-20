---
"@tapflowio/relay": patch
---

Leaving a QA session shuts its device down again. Going to another page with a device running was meant to stop it, but the message was dropped as the page's connection closed, so the device kept running until the relay's idle timeout (5 minutes by default) and stayed taken for the rest of the team.
