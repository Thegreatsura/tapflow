---
"@tapflowio/relay": minor
"@tapflowio/protocol": minor
"@tapflowio/agent-core": minor
"@tapflowio/ios-agent": minor
"@tapflowio/android-agent": minor
---

The QA session device list follows the Mac without an agent restart: agents re-read their simulators and emulators every 30 s and send the list when it changed (`agent:devices`, to a relay that announces `'device-updates'` on `agent:registered`). The list is grouped by OS version with each person's favourites on top, and an Admin can rename or hide devices for the team (`PUT /api/v1/device-prefs`, `PUT`/`DELETE /api/v1/device-favourites`, migration 021). Hidden and renamed devices stay listed under their own names for MCP clients and runs. An Android emulator that is not running reports the version of its system image.
