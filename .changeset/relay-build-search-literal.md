---
"@tapflowio/relay": patch
---

The App Center's version search matches `%` and `_` as typed. They were read as wildcards, so searching for `%` listed every build and `1_0` also found `1.0.5`.
