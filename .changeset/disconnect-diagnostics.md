---
"@tapflowio/agent-core": patch
"@tapflowio/relay": patch
"@tapflowio/ios-agent": patch
"@tapflowio/android-agent": patch
---

An agent that drops off the relay can now be diagnosed afterwards. Relay and agent output lines start with the local time. The relay records in `tapflow logs` when it ends a connection that stopped answering, and when an agent's connection closes, with the agent's name and how long since it last answered. It also notes a check that ran late because the relay itself was held or the machine slept. The agent's "relay disconnected" line now carries the close code, any network error, and how long since the relay last checked on it. A relay or agent whose work was held up for more than two seconds says so, with how long, when it started, and whether it was busy or waiting.
