---
"@tapflowio/relay": patch
---

The comment box in a QA session recovers from a failed post. If the relay could not be reached, Post stayed greyed out; if it refused the comment, nothing was said. Either way it now says the comment was not posted and keeps the text to try again. Picking an image also behaves: a rejected pick no longer leaves the earlier image attached, and the same image can be picked again after posting.
