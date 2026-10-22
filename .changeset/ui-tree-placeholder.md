---
"@tapflowio/protocol": minor
"@tapflowio/ios-agent": minor
"@tapflowio/flow-runner": minor
"@tapflowio/mcp-server": minor
---

The UI tree carries a text field's placeholder as its own field, `placeholder`, and a bare-text selector falls back to it after label. A field with no label and no identifier could not be found by any selector before; `tapOn: "Nickname"` now finds it. The placeholder is the last stage, after a partial label, so a step that found an element before finds the same one now, and it never matches in part. A step that found nothing because the field had only a placeholder now sees it: `assertNotVisible` on that text, which always passed before, now fails while the field is on screen. iOS reads it from `placeholderValue`, which it keeps after a value is typed. The relay's inbound schema lists the field, so it reaches clients. Android is unchanged for now.
