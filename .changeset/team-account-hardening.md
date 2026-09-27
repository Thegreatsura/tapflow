---
'@tapflowio/relay': minor
---

Team accounts are harder to take over and easier to recover.

- Changing a password, by reset link or in Settings, ends every session issued before it and closes the user's open connections. The browser that made a self-service change gets a new cookie and stays signed in. Everyone signs in once after upgrading.
- An invitation never changes an existing account: inviting a member's address, or accepting an invitation for one, is refused with 409.
- **Reset pwd** gives the Admin a copyable reset link, as an invitation does, and also emails it when SMTP is configured. `send-reset` returns `token` and `resetUrl`; only the newest link works.
- Email addresses are stored and compared without regard to letter case or surrounding spaces, and existing ones are normalized on upgrade. Addresses that differ only in case are left alone and named in the relay's startup log.
