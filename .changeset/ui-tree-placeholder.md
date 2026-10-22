---
"@tapflowio/protocol": minor
"@tapflowio/ios-agent": minor
"@tapflowio/flow-runner": minor
"@tapflowio/mcp-server": minor
---

The UI tree carries a text field's placeholder as its own field, `placeholder`, and a bare-text selector falls back to it after label. A field with no label and no identifier could not be found by any selector before; `tapOn: "Nickname"` now finds it. The placeholder is the last stage, after a partial label, so a flow that resolved before resolves the same way now, and it never matches in part. iOS reads it from `placeholderValue`, which it keeps after a value is typed. The relay's inbound schema lists the field, so it reaches clients. Android is unchanged for now.
