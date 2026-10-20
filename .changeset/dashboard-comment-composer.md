---
"@tapflowio/relay": patch
---

The comment box in a QA session recovers from a failed post. If the relay could not be reached, Post stayed greyed out until the page was reloaded; it now says the comment was not posted and keeps the text to try again. Picking an image also behaves: a rejected pick no longer leaves the earlier image attached, and the same image can be picked again after posting.
