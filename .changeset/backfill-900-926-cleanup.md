---
"@tapflowio/relay": patch
"@tapflowio/android-agent": patch
"@tapflowio/flow-runner": patch
---

Removes code nothing used: the dashboard's old session list and its relay plumbing, and lint directives that disabled rules the config never enables. No behaviour changes.

Backfills: #900, #926

<!-- changelog: internal — dead code and unused lint directives, nothing a user can observe -->
