---
"@tapflowio/protocol": minor
"@tapflowio/agent-core": minor
"@tapflowio/ios-agent": minor
"@tapflowio/android-agent": minor
"@tapflowio/flow-runner": minor
"@tapflowio/relay": minor
"tapflow": minor
---

`tapflow flow run` resets the device before its flows, and `--no-reset` turns that off. `device:boot` takes `runReset: { uninstall, clear }` (app ids), which a relay drops rather than refusing the boot when it is malformed; the agent carries it out after the device is up and before `device:ready`, and reports `runReset: { done, failed }` there as `RunResetItem`s. iOS uninstalls the apps the run will install, clears the files of the rest, waits for `simctl bootstatus` on a cold boot, then resets the keychain, `simctl privacy` grants, pasteboard and simulated location; Android `pm clear`s every named app and clears the clipboard over gRPC. `agent-core` adds `runResetSteps`, `resetApps` and `RESETTABLE_APP_ID`, which keeps an id that is not an app id away from `adb shell`. `RelayClient.bootDevice` now returns what the ready said (`BootOutcome`). Run records gain `device_reset_json` (migration 019), written as `requested` at creation and filled from `POST /api/v1/runs/:id/device` right after the boot; the run page shows it.
