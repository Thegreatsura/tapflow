---
'@tapflowio/android-agent': patch
---

An Android install that fails because the device's `/data` is full now says so and what to do, instead of passing PackageManager's `Requested internal only, but not enough space` exception through. Recognised in three forms: the streamed-install exception, `ENOSPC` from a write that ran out after the size pre-check passed, and `Failure [INSTALL_FAILED_INSUFFICIENT_STORAGE]`, which the code-only branch used to reduce to a bare code. The advice is a Full reset, raising `disk.dataPartition.size` first for a larger partition: on a metadata-encrypted user build the partition cannot be grown in place.
