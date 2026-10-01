---
'@tapflowio/relay': patch
---

Axios 1.20.0 through `acme-client`, for twelve advisories in 1.x — among them GHSA-m8m8-qj5v-23w3 (socket hijack through a prototype-pollution gadget) and GHSA-mghh-pgcx-3jjj (ReDoS reachable through a redirect `Location`), both in the Node HTTP adapter `acme-client` uses. The relay sends requests through it only to issue LAN HTTPS certificates. Also records Nodemailer 10.0.11, which landed in #906, a Dependabot PR the changeset gate does not run on: GHSA-prgh-xp8r-p3m5 and GHSA-v53p-9fqp-m79j (quadratic-time address parsing, a denial of service) and GHSA-g57g-f23g-4646 (a quoted local-part producing a malformed envelope recipient).

Backfills: #906
