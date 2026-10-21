---
"@tapflowio/relay": patch
---

A nickname or team name of only spaces is no longer saved. Settings refuses it with the message an empty one gets, and the relay trims both: a blank nickname now falls back to the part of your email before the `@`, and a blank team name leaves the current one. Before, the name showed blank in the sidebar and on comments, and the avatar was an empty colored circle. A name already saved as spaces stays blank until it is saved again.
