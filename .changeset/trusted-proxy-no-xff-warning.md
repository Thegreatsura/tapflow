---
"@tapflowio/relay": patch
---

A trusted proxy that leaves out `X-Forwarded-For` is now flagged. A request from an address in `TAPFLOW_TRUSTED_PROXIES` without that header is treated as coming from the proxy itself, and for a proxy on the relay host that means local, which is deliberate because the host's own agent and CLI connect that way. The relay now states that rule at start when the list is set. It also warns once when a listed proxy sends proxy headers such as `X-Real-IP` or `X-Forwarded-Proto` but no `X-Forwarded-For`, which is the usual sign of a misconfigured proxy. `SECURITY.md` previously said such requests were treated as remote and has been corrected. Reported by @jourasharsy as part of GHSA-pq37-jfvf-hhhc.
