---
"@tapflowio/relay": patch
---

Leaving a QA session now shuts its device down. Going to another page with a device running was meant to stop it, but the message was dropped as the page's connection closed, so the device kept running, unused, until the relay's idle timeout (5 minutes by default).
