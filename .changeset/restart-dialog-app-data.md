---
'@tapflowio/relay': patch
---

The **Restart this device?** dialog in a QA Session no longer says that installed apps and their data stay. After a restart the dashboard installs the build under test again, and both agents clear that app before installing it, so its data is gone; other apps on the device keep theirs. The dialog now says so.
