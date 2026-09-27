---
'@tapflowio/relay': patch
---

When the relay cannot read its database right after a write that reduced a member's access (role change, removal, token revocation, password reset or change), it now closes the connections that rest on what was changed (one revoked token's, a password change's sessions, or all of a member's) instead of leaving them until the database recovers. Other members' connections are still left alone during a database fault.
