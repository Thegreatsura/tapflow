---
"@tapflowio/protocol": minor
"@tapflowio/agent-core": minor
"@tapflowio/flow-runner": minor
"@tapflowio/mcp-server": minor
"@tapflowio/relay": minor
"@tapflowio/ios-agent": minor
"@tapflowio/android-agent": minor
---

An app can be launched with launch arguments and, on iOS, environment variables (#1047). A flow writes `launchApp: { arguments, env }`, and MCP's `launch_app` takes the same two inputs. Arguments are a map of strings, whole numbers, booleans and lists of strings: iOS receives them as `-key value` after the bundle id, which `UserDefaults` reads, and Android as intent extras typed by value. `env` reaches the app's process on iOS and is refused on Android, which has no such channel. A launch carrying either restarts a running app, since a running process has already read its arguments.

Nothing is dropped silently. One check in `@tapflowio/protocol/launch` refuses the same keys and values at flow load, at the MCP tool, at the relay and at the agent: fractions, keys written with their iOS dash, environment names tapflow's network hook depends on, and launches over 8,192 characters. The relay advertises `launch-options` in `agents:listed.features` and refuses arguments for an agent without the `launch-options` capability; clients check the feature before sending, and fail a launch whose `app:launch-done` does not name the applied keys. Run records show argument values and mask env values.
