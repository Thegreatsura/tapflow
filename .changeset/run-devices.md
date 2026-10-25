---
"@tapflowio/relay": minor
"tapflow": minor
---

A run's record can hold several devices. `POST /api/v1/runs/:id/device` takes the reporting device's `sessionId`, `deviceId` and `deviceName` and keeps one entry per session in `deviceReset.devices`, merged inside the write so devices reporting at once do not overwrite each other; the fields beside it stay the first device's. A new `POST /api/v1/runs/:id/flows/:idx/start` says which device a flow started on, so the run page shows each running flow on its device instead of guessing the first unreported one; a run from a runner that does not send it is shown as before. `GET /api/v1/runs/:id` adds `watchSessionIds`, every session the runner holds.

`tapflow flow run` sends both. The run page lists the devices of a run on several, each with its reset, the flow it is on and its own watch link, and the runs list says how many devices a run shared.
