---
"tapflow": minor
"@tapflowio/flow-runner": minor
---

`tapflow flow run --parallel N` shares a run's flows across up to N devices (1–16) the relay chooses. Each device is leased (`device:lease`): the relay picks a device automation left up, or boots one, and resets it with the run's reset (unless `--no-reset`); the run installs the build on it and the device takes flows off one queue until none are left. Every device is held under the run's one client id, so the relay sees one run. `--platform ios|android` names the platform of a run without `--build`; with one, the relay reads the build's. `--parallel` cannot be combined with `--device` or `--session`, and a relay that cannot lease is told apart before anything waits.

A device that cannot boot or install, or whose flow fails outside the app, leaves the run and is excluded from the run's later leases; its flow is not replayed, and the other devices go on. Flows no device ran end the run with exit code 2, as a relay with no device of the platform does. Output lines are prefixed with the device's name, each flow is recorded with the device it ran on, and each device cuts its own videos.

`@tapflowio/flow-runner` adds `toJUnitXmlSuites`, which writes a `<testsuite>` per device, skipped flows in a `tapflow-flows (skipped)` suite and flows no device ran as `<error>` cases in a `tapflow-flows (not run)` suite, so a CI report does not read them as green; `toJUnitXml`'s output is unchanged. It also adds `leasedSessionOf(error)`, the session a lease had been given before its join or boot failed, so a caller sharing devices can keep that one out of later leases.
