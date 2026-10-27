---
"@tapflowio/agent-core": minor
"@tapflowio/ios-agent": patch
"@tapflowio/android-agent": patch
---

A drag on a device no longer stutters at a steady interval. The agents ran four child processes synchronously on timers, on the event loop that forwards every video frame and touch: the iOS agent's audio poll (`ps` and `plutil`, about 45 ms every 1.5 s) and both agents' resource report (`vm_stat` and `sysctl`, every 5 s). They run asynchronously now, by absolute path and with timeouts, so the stream keeps moving while they do.

`createResourceSampler()` in `@tapflowio/agent-core/utils` changes with it: `getMemoryUsage()` and `getMemoryPressure()` return promises, and the function takes optional paths for the two tools. Only the agents call it.
