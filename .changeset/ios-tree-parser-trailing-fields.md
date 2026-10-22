---
"@tapflowio/ios-agent": patch
---

The iOS UI tree reads a text field's identifier and a selected element's label correctly. A field with placeholder text reported an identifier with the placeholder glued on (`email', placeholderValue: 'Email`), so a flow or MCP selector naming it by `id` never matched; a selected tab or segment reported an empty label, so it could not be found by its text once chosen.
