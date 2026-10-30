---
"@tapflowio/relay": minor
"@tapflowio/mcp-server": minor
---

An app can have a different bundle ID on iOS and Android. Upload a build with `app_id` and its ID is added to that app when the app has none on that platform, instead of starting a new app. `POST /api/v1/apps/:id/merge` moves one platform of an app, with its builds, into another. `GET /api/v1/apps` adds `bundle_ids` and `build_platforms`, and MCP `list_builds` gives each build its own bundle ID. A build's platform now comes from its file, and the build list's `platform` filter and the `build.status_changed` webhook use the build's platform rather than the app's.
