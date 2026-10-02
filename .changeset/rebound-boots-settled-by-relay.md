---
'@tapflowio/relay': patch
'@tapflowio/mcp-server': patch
'@tapflowio/flow-runner': patch
---

A `device:boot` stranded by an agent restart is now settled by the relay instead of the client (#885). The relay tracks in-flight boots by the agent socket they were dispatched to and answers only the ones tied to the replaced socket with a correlated `device:boot-error`, sent after `session:rebound` — so a boot the new agent is already handling completes normally instead of failing with "never saw this request". The failure still carries the rebound cause and reads as environmental. A new client against an older relay no longer has the client-side workaround and waits out the boot deadline again, as before #865: slower but correct, and intentional, since the relay and the clients upgrade separately.
