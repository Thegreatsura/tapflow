---
"@tapflowio/flow-runner": minor
"tapflow": minor
"@tapflowio/mcp-server": minor
"@tapflowio/relay": minor
---

A run decides which flows apply before it touches a device. `isEligible` in flow-runner is the one place that decides, for `tapflow flow run` and MCP's `run_flow` alike. With a build, a flow whose `appId` differs from the build's bundle id is skipped and the line names both ids; until now `appId` was read only by `clearState`, so a flow for another app ran and failed on its first selector, which read as a regression. A flow can carry `tags`, and `flow run --include-tags` / `--exclude-tags` pick by them (include is any of, exclude wins). A skipped flow is not a failure, but a run where none ran exits 2 before choosing a device, so a CI job that tested nothing does not pass. The build's bundle id is read from `GET /api/v1/builds/:id`; only a 404 is an error, and a token without `builds:write`, no token or no answer leaves the app check out with one line. The run record keeps a skipped flow and why (`skipReason`), the runs page and `list_runs` count them, and JUnit lists them as `<skipped>`. The relay migrates `flow_run_flows` to allow it. A new CLI on an older relay warns once that skipped flows are not recorded and records the rest.
