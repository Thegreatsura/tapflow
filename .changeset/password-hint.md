---
'@tapflowio/relay': minor
---

Every dashboard form that sets a password states the 8-character rule under the new password field before anything is submitted (#823): first-admin setup, invitation, password reset and the password change in Settings. The hint is the field's description, and a refusal replaces it in the same place with the error, which states the rule itself, and the length now comes from one constant shared with the validation, so the two cannot drift.
