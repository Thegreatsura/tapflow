---
"@tapflowio/relay": minor
---

A build's label shows on its row in App Center and can be changed, along with its version and build number, from the row's ⋯ menu (Edit build); scheduling and cancelling deletion moved into the same menu. The upload dialog takes a label and, folded away, a version and build number. `POST /api/v1/builds` accepts `version_name` and `build_number`, and `PATCH /api/v1/builds/:id` accepts both (empty goes back to the file's). The file's values are kept (migration 022, read through the `builds_effective` view) and returned as `binary`; `version_name` and `build_number` keep returning the values in use. Search also matches the label. An upload's `label` no longer names the app when the build file has no app name.
