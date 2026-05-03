# Google Drive Owner Setup

Last updated: 2026-05-03

Use this runbook when connecting a real Google Drive account to CompanyCore.
The goal is to let CompanyCore import selected Drive folders, read Docs/Sheets
snapshots, create or update supported Docs/Sheets, and reconcile Drive changes
without storing raw Google credentials in docs or chat.

## What You Need

- Owner login for `https://companycore.luckysparrow.ch`.
- Access to the Google account or Google Workspace that owns the target Drive
  folders.
- Access to the production environment variables for the CompanyCore backend.
- A public HTTPS CompanyCore URL. Production uses:
  - web: `https://companycore.luckysparrow.ch`
  - API: `https://api.companycore.luckysparrow.ch`

## Google Cloud Setup

### 1. Open Or Create A Google Cloud Project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Select the project that should own the CompanyCore OAuth app.
3. If there is no project yet, create one named `CompanyCore` or
   `LuckySparrow CompanyCore`.

### 2. Enable Required APIs

1. In Google Cloud Console, open `APIs & Services` -> `Library`.
2. Search and enable these APIs:
   - `Google Drive API`
   - `Google Docs API`
   - `Google Sheets API`
3. Wait until each API shows as enabled before continuing.

CompanyCore uses Drive for folder/file metadata and change tracking, Docs for
document read/edit/create, and Sheets for spreadsheet read/edit/create.

### 3. Configure OAuth Consent

1. Open `APIs & Services` -> `OAuth consent screen`.
2. Choose the audience:
   - `Internal` if this is only for the LuckySparrow Google Workspace.
   - `External` if the Google account is outside the Workspace.
3. Fill the required app information:
   - App name: `CompanyCore`
   - User support email: the operator/support email
   - Developer contact email: the operator/support email
4. Add the required scopes:
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/drive.metadata.readonly`
   - `https://www.googleapis.com/auth/documents`
   - `https://www.googleapis.com/auth/spreadsheets`
5. If the consent screen is in testing mode, add the Google account that will
   connect Drive as a test user.
6. Save the consent screen.

Keep the app in testing mode if only the owner/operator account will connect
Drive. Publish or verify the app only when broader Google accounts need access.

### 4. Create OAuth Credentials

1. Open `APIs & Services` -> `Credentials`.
2. Click `Create credentials` -> `OAuth client ID`.
3. Application type: `Web application`.
4. Name: `CompanyCore production web`.
5. Add this Authorized redirect URI:

```text
https://companycore.luckysparrow.ch/settings/drive
```

6. Click `Create`.
7. Copy the `Client ID` and `Client secret`.

Do not paste the client secret into docs, chat, screenshots, or issue comments.

## CompanyCore Environment Setup

Set these backend environment variables in the production runtime, for example
in Coolify:

```text
GOOGLE_OAUTH_CLIENT_ID=<client-id-from-google>
GOOGLE_OAUTH_CLIENT_SECRET=<client-secret-from-google>
COMPANYCORE_PUBLIC_API_BASE_URL=https://api.companycore.luckysparrow.ch
```

Then redeploy or restart the CompanyCore backend so the OAuth client values are
loaded.

Required safety checks after restart:

1. `GET https://api.companycore.luckysparrow.ch/health` returns healthy JSON.
2. `GET https://api.companycore.luckysparrow.ch/v1/health` returns healthy JSON.
3. Owner can sign in at `https://companycore.luckysparrow.ch/auth/login`.

## Drive Folder Selection

Before connecting in CompanyCore, decide which folder or folders CompanyCore
may import.

To copy a folder ID:

1. Open Google Drive in the browser.
2. Open the target folder.
3. Copy the ID from the URL. In this example, the folder ID is the last path
   segment:

```text
https://drive.google.com/drive/folders/<folder-id>
```

Use folder IDs, not folder names. Names can change and are not unique.

## CompanyCore Owner UI Setup

1. Open `https://companycore.luckysparrow.ch/auth/login`.
2. Sign in as the CompanyCore workspace owner.
3. Open `Drive` in the sidebar, or go directly to:

```text
https://companycore.luckysparrow.ch/settings/drive
```

4. Confirm the `Redirect URI` field shows:

```text
https://companycore.luckysparrow.ch/settings/drive
```

5. Paste the selected Google Drive folder IDs into `Folder IDs to import`,
   separated by commas.
6. Choose an import mode:
   - `Merge and update`: normal safe mode.
   - `Only add new`: leaves already imported files unchanged.
   - `Replace selected folders`: refreshes provider-owned rows under selected
     folders.
   - `Inspect only`: checks what would happen without writing records.
7. Click `Create OAuth URL`.
8. Click `Open Google consent`.
9. In Google:
   - select the Google account that owns or can access the folders
   - accept the requested Drive/Docs/Sheets permissions
10. Google redirects back to `/settings/drive` with an authorization code in
    the URL or page flow. Copy the returned authorization code.
11. Paste the code into `Authorization code`.
12. Keep `Active` checked.
13. Click `Save OAuth connection`.
14. Click `Import folders`.
15. Click `Refresh files`.

Expected result:

- Google Drive status becomes configured and active.
- Imported files appear in the `Imported Drive files` table.
- `GET /v1/connection` shows Google Drive capabilities.
- Raw OAuth tokens are not visible in the UI or API responses.

## Change Reconciliation

After the first import, click `Reconcile changes` from the Drive settings view
to read Google Drive changes and refresh CompanyCore records.

Production smoke can also use:

```text
npm run google-drive:smoke
```

with `COMPANYCORE_BASE_URL` and `COMPANYCORE_API_KEY` set for a workspace
service key.

## Troubleshooting

- `redirect_uri_mismatch`: the redirect URI in Google Cloud must exactly match
  `https://companycore.luckysparrow.ch/settings/drive`.
- `access_denied`: the selected Google account did not grant consent, or the
  account is not allowed by the OAuth consent screen test users.
- `integration_not_configured`: the backend may not have
  `GOOGLE_OAUTH_CLIENT_ID`, or the OAuth connection has not been saved.
- `integration_invalid_token`: reconnect Drive from the owner UI; the refresh
  token may have been revoked.
- No files imported: confirm the folder IDs are correct and the Google account
  used during consent can access those folders.
- Google warning about unverified app: acceptable only for owner/testing use.
  For broader external users, complete Google's OAuth app verification flow.

## Official References

- Google OAuth consent screen:
  `https://developers.google.com/workspace/guides/configure-oauth-consent`
- Google OAuth client setup:
  `https://support.google.com/cloud/answer/6158849`
- Google Drive push notifications:
  `https://developers.google.com/workspace/drive/api/guides/push`
- Google Drive file create/reference:
  `https://developers.google.com/drive/api/reference/rest/v3/files/create`
