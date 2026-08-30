# Workspace Human Access

## Decision

LuckySparrow production uses one canonical workspace. Humans join that
workspace through expiring invitations; public registration and authenticated
creation of additional workspaces are disabled in production unless
`ROOST_ALLOW_WORKSPACE_CREATION=true` is explicitly configured.

## Roles

| Role | Authority |
| --- | --- |
| `owner` | Full workspace authority, owner-role changes, ownership transfer, administrators, integrations and service credentials. |
| `admin` | Workspace identity, integrations, service credentials, invitations for members/viewers, and non-owner member administration. |
| `member` | Read and write company operating records, without workspace security, integration or service-key administration. |
| `viewer` | Read-only access to company operating records. |

Every protected human request resolves the current membership from the token's
workspace and enforces the role from the database. A stale token never carries
durable role authority. Cross-workspace access fails closed.

## Invitations

- Administrators invite `member` or `viewer`; owners may also invite `admin`.
- An invitation is scoped to one workspace and email address, expires after
  seven days, and may be revoked or reissued.
- Only a SHA-256 digest is stored. The raw invitation token is shown once.
- Existing users confirm their password; new users create a password with at
  least 12 characters. Acceptance creates the membership and human workforce
  record without creating another workspace.
- Membership, role, invitation and ownership changes write audit evidence.

## Ownership Safety

The primary owner is recorded by `workspaces.owner_user_id`. That member cannot
be removed or demoted. Ownership transfer promotes the selected member to
`owner`, changes the previous primary owner to `admin`, and updates the
workspace atomically. A user cannot remove themselves or change their own role
through the member editor.

Removing a non-owner member from either Workspace settings or the linked
People / Agents directory atomically removes the workspace membership and its
`source=user` workforce profile. It does not delete the person's global Roost
login, so another workspace membership or a later invitation remains safe.
Members with direct reports must have those reports reassigned first.

## Agent Access

Agents remain separate from human memberships. They use individually named,
workspace-scoped API keys with explicit capability profiles. Raw keys are shown
once; administrators can inspect safe prefixes/scopes, last use, and revoke or
enable a credential. Agent credentials never create human sessions.

The workforce editor may assign several governed company roles and several
departments to one human or agent. The first selected role and department are
the primary working role and accountable department retained in the legacy
scalar fields; the full selection is stored through organizational role scopes
and department relations.
