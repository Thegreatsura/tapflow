---
'@tapflowio/relay': patch
---

`POST /api/v1/apps` answers 409 when an app with the same bundle ID and platform already exists, instead of creating a second one. Migration 007 dropped the database constraint to have the handler check it, and the check was never written, so the dashboard's "App with this bundle ID and platform already exists" message could not appear.
