---
"@tapflowio/protocol": minor
"@tapflowio/agent-core": minor
"@tapflowio/flow-runner": minor
"@tapflowio/mcp-server": minor
"@tapflowio/relay": minor
"@tapflowio/ios-agent": minor
"@tapflowio/android-agent": minor
---

An app can have launch defaults in `tapflow.config.json` (#1047): `launch.<bundle id>` with `arguments`, `env`, and `envFrom`, which reads an environment value from another variable by name so a secret stays in `.env`. The relay merges them into every `app:launch` for that app (the dashboard's Launch button, MCP `launch_app`, a flow's `launchApp`), key by key with the caller's values winning. An invalid entry, an unset `envFrom` variable, or one naming the relay's own secrets stops the relay from starting; only the commands that start a relay read the section, so `tapflow doctor` and the agent are unaffected.

Defaults a device cannot take are left out with a warning rather than failing the launch: env on an agent without the new `launch-env` capability (only iOS has it), everything on an agent without `launch-options`. A launch carrying only defaults is marked `defaultsOnly` to the agent, and Android launches without them when no single launcher activity resolves. `app:launch-done.applied` names what reached the app; `RelayClient.launchApp` and `TapflowClient.launchApp` return it, `FlowDriver.launchApp` may resolve to it, run records append the defaults' keys to the `launchApp` step, and MCP's `launch_app` result carries it.
