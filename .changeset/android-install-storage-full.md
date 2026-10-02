---
'@tapflowio/android-agent': patch
---

An Android install that fails because the device's `/data` is full now says so and what to do, instead of passing PackageManager's `Requested internal only, but not enough space` exception through. It matches the measured streamed-install exception, `Failure [INSTALL_FAILED_INSUFFICIENT_STORAGE]` (which the code-only branch used to reduce to a bare code), and `ENOSPC`, the expected but unobserved shape of a write that runs out after the size pre-check passed. The match ignores adb's `failed to install <path>:` prefix, so a build whose name mentions ENOSPC is not misread, and the original error is kept as the `cause`. The advice is a Full reset, raising `disk.dataPartition.size` first for a larger partition: on a metadata-encrypted user build the partition cannot be grown in place.
