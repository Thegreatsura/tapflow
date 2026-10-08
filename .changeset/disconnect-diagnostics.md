---
"@tapflowio/agent-core": patch
"@tapflowio/relay": patch
"@tapflowio/ios-agent": patch
"@tapflowio/android-agent": patch
---

An agent that drops off the relay can now be diagnosed afterwards. Relay and agent output lines start with the local time. In `tapflow logs` the relay records agents connecting, an agent's connection closing or being replaced by a new one, and a connection it ended because it stopped answering, with the agent's name and how long since it last answered; it also notes a check that ran late because the relay itself was held up or the machine slept. The agent's "relay disconnected" line now carries the close code, any network error, and how long since the relay last checked on it. In the terminal output, a process whose work was held up for about three seconds or more prints a `[stall]` line with a lower bound on how long, a window for when it began, and whether it was busy or waiting. Under `tapflow start`, where the relay and agents share one process, that line cannot say which of them was held.
