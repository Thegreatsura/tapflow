---
'@tapflowio/relay': patch
---

`serveStatic` confines what it serves to `publicDir` (GHSA-pq37-jfvf-hhhc). It joined the raw request target onto `publicDir` with no containment check, so an unauthenticated request such as `GET /../../etc/passwd` read any file the relay's user could — including the database and the JWT secret (the persisted `jwt-secret` file, `.env`, or `/proc/self/environ`), which together were enough to forge any member's session. The joined path is now resolved and refused with 404 unless it stays inside `publicDir`, before the index lookup and the precompressed siblings are derived from it — the check `serveUpload` has had since #173.
