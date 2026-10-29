---
"@tapflowio/ios-agent": patch
---

The iOS screen-capture helper copies each frame on the GPU (Metal) instead of with a CPU memcpy, keeping the tear guard: the copy is bracketed by the surface's seed and waited for before the seed is read again. Measured while a video played, the helper went from ~7% to ~4% of a core, with the simulator's processes and WindowServer unchanged. A surface the GPU cannot take (not 32-bit BGRA, or a row stride Metal cannot wrap) is copied on the CPU as before.
