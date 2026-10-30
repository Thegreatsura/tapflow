---
"@tapflowio/protocol": minor
"@tapflowio/relay": patch
---

A viewer that reconnects to a device no longer wipes the app under test. Every install clears the app's data first (iOS uninstalls, Android clears), and the dashboard sent one on each `device:ready`, which a reconnect produces twice, so a Wi-Fi drop of a second cost the tester the app's state. `app:install` takes an optional `keepIfInstalled`: the relay then answers `app:install-done` itself when it last installed that build on the device, identified by build id and stored path, and joins an install of it already in flight instead of sending a second one. The dashboard sets it on every install after the first one of a session has landed, so picking a device still starts with a clean install. The relay drops its record on a shutdown, a cold boot or a ready that does not say, a full-erase or run-reset boot, and another install; a request joined to an install in flight is answered with an error when its agent leaves. `app:install-done` moves to `RelayOrAgentToBrowser`, since the relay now produces it too.
