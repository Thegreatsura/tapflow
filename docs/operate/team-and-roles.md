---
title: Team, roles & tokens
description: "The dashboard's Settings pages: your profile, the member list with roles and invitations (Admin only), and personal access tokens for CI and remote agents."
---

# Team, roles & tokens

The dashboard's **Settings** has three sub-pages accessible from the left nav.

## Default

Personal profile settings for the currently signed-in user.

- **Workspace** — the team name and logo. Visible to Admins only.
- **Apps** — rename or delete apps. Visible to Admins, Developers and QA, hidden from Viewers.
- **Nickname** — shown in comments and session history.
- **Avatar** — click the pencil icon on the avatar to upload a new image (PNG or JPEG, max 2 MB).
- **Change password** — requires current password.

## Team

Visible to **Admin** only.

- **Members list** — all accounts with email, role, and join date.
- **Invite member** — send an email invite or generate a copy-paste link. Invites expire after 7 days.
- **Change role** — reassign any member's role (Admin / Developer / QA / Viewer).
- **Remove member** — permanently deletes the account. The member is signed out everywhere at once, and their open device sessions and any agents connected with their tokens are disconnected. You cannot remove yourself.
- **Reset pwd** — create a password reset link for a member. The link appears in a dialog to copy and share, and is also emailed when SMTP is configured. It works once, for 2 hours, and making a new one turns off the earlier one. The reset signs the member out everywhere.

<a id="_3-invite-your-team"></a>

## Invite teammates {#invite-teammates}

Once signed in as Admin, go to **Settings → Team** and create invite links:

1. Click **Invite member**.
2. Enter the team member's email and select a role. The role defaults to **QA**.
   - **Admin** — can do everything except remove their own account. Inviting members, changing roles, removing members, resetting passwords, workspace settings and the **Settings → Tokens** page are Admin-only.
   - **Developer**, **QA** — can add, edit and delete apps, upload builds, change a build's status, schedule build deletion and manage webhooks. The two roles have the same permissions.
   - **Viewer** — read-only. Can view builds, test them on a simulator or emulator in a QA Session, and comment. Cannot change builds or apps, and can neither see nor change webhooks.

   Commenting and starting sessions are open to every signed-in member, whatever their role. A role change applies right away to the API endpoints that check roles, without the member signing in again.
3. Click **Generate invite link**. The link appears in the dialog, and is also copied to your clipboard when the browser allows it. If SMTP is configured, the member also receives an invite email with a link to set their password. An email that already belongs to a member is refused, and the dialog says so under the email field.

When you opened the dashboard at `localhost` on the relay host, the invite link carries the relay host's LAN address. A relay inside a Docker container cannot know its LAN address, so the link uses the address in your browser's address bar. When a tunnel or `relay.url` is configured, the link uses that address. If SMTP isn't configured, copy the link shown in the dialog and share it directly; see [Configuration](/reference/configuration) to set up SMTP. What an invited teammate does next is in [For teammates](/get-started/teammates).

## Tokens

Personal access tokens (PATs) for CI/CD scripts and API access. The sidebar shows this page to **Admin** only.

- **New token** — enter a name, an **Expiration**, and a Type. Choose 7, 30, 60 or 90 days, a custom number (1–365 days), or **No expiration**; the default is 30 days. A token with no expiration stays valid until you revoke it, so keep CI tokens to 90 days or less. The list marks these tokens **No expiration** so you can find and clean them up. **API** is for CI uploads and API access (scope `view, builds:write`); **Agent** connects remote Mac agents. The token is shown once — copy it immediately.
- **Revoke** — instantly invalidates the token.

Use PATs with the `Authorization: Bearer tflw_pat_<token>` header to upload builds from CI. See [Upload from CI](/operate/ci-distribution).
