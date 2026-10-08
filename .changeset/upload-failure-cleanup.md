---
"@tapflowio/relay": patch
---

A failed upload no longer leaves a partial file or an open file behind. An avatar or team logo upload that fails or is over the size limit now keeps the current image instead of saving a broken or truncated one.
