---
'@tapflowio/android-agent': patch
---

An install that fails for lack of space now rolls back the updates of `LEAN_PACKAGES` that carry one under `/data/app`, then retries after 0, 3 and 6 seconds, because the package manager frees the old code path on a delay (measured ~5.5 s on API 35) (#918). Only on an emulator this agent launched, and each rollback rechecks the boot. GMS, WebView and Play Store are never rolled back, a disabled package stays disabled, and `pm uninstall-system-updates`' exit code 1 on success is read through its output. With nothing to roll back, or not enough freed, the `StorageFullError` (#919's message) is returned unchanged.
