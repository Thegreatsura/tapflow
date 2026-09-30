---
"@tapflowio/android-agent": patch
---

The Android agent finds the SDK without `ANDROID_HOME`, the same way `tapflow doctor` does, and says so when it cannot list AVDs instead of reporting 0 devices silently (#903).
