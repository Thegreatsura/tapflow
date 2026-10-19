---
'@tapflowio/relay': patch
---

`POST /api/v1/apps` answers 409 when an app with the same bundle ID already exists, on any platform, instead of creating a second one. Migration 007 dropped the database constraint to have the handler check it, and the check was never written. An upload without `app_id` finds its app by bundle ID alone, so a second app with the same bundle ID never received those builds. The dashboard's message for this case now reads "App with this bundle ID already exists".
