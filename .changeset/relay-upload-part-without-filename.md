---
'@tapflowio/relay': patch
---

A build upload whose file part has no file name (sent as `application/octet-stream`) is refused with 400 "Only .app.zip / .tar.gz (iOS) or .apk (Android) files allowed" instead of failing with 500.
