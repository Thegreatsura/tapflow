---
"@tapflowio/ios-agent": patch
---

Installing an iOS build no longer freezes the agent while the archive is unpacked and cleaned up. The extraction and the removal of the temporary files used to hold the agent's event loop, so on a large build or a busy Mac other sessions stopped responding and the relay could drop the agent's connection.
