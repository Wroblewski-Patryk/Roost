# Ignored Evidence Retention Guardrail

Roost producers may write local evidence beneath only these ignored roots:

- `C:/Personal/Projekty/Aplikacje/Roost/.tmp`
- `C:/Personal/Projekty/Aplikacje/Roost/tmp`

The retention guardrail inventories filesystem metadata so ignored evidence
cannot accumulate silently. It does not delete, move, upload, or print evidence
content. It reads only the bounded `.retention.json` control manifest described
below; all other files are inspected with directory entries and `lstat`
metadata. A symbolic link, junction, redirected entry, unsupported entry type,
or enumeration error makes the inventory fail closed before traversal.

## Producer contract

Group related evidence in a top-level bundle directory beneath one of the two
roots. Put one `.retention.json` file directly in that bundle:

~~~json
{
  "owner": "Roost Project Manager",
  "issueId": "LUC-2729",
  "state": "quarantine",
  "expiresAt": "2026-08-21T12:00:00.000Z"
}
~~~

`state` must be `quarantine` when evidence awaits a governed disposition or
`retain` when an accountable issue requires it until the expiry. The manifest
is limited to 16 KiB. Loose files and bundles without a valid manifest are
reported with missing owner, issue, state, and expiry findings.

The manifest records accountability; it does not authorize cleanup. Deletion
or movement still requires the separate operator confirmation governing the
evidence.

## Run and interpret

From the repository root:

~~~powershell
npm run evidence:retention:check
~~~

Defaults are seven days maximum age, 1 GiB total bytes per root, and 10,000
files per root. CI or a bounded operator check can tighten them:

~~~powershell
node scripts/ignored-evidence-retention-guardrail.mjs --max-age-hours 24 --max-total-bytes 104857600 --max-files 1000
~~~

The command emits deterministic JSON and uses these exit codes:

- `0`: inventory completed with no retention findings;
- `2`: inventory completed and emitted an age, size, count, accountability,
  state, or expiry signal;
- `1`: inventory failed closed because configuration or filesystem metadata
  could not be trusted.

For exit `2`, the output names the affected bundle, accountable owner when
present, issue, expiry, state, and next action. The operator reviews the named
issue and obtains governed cleanup confirmation before any deletion or move.
For exit `1`, resolve the enumeration or reparse-point error first and do not
treat the inventory as complete.

## Focused verification

The fixture suite uses isolated temporary directories and does not inspect or
mutate either live ignored root:

~~~powershell
npm run test:evidence-retention
~~~

It covers deterministic age/size/count results, accountability and explicit
retention state, absent roots, and junction or symbolic-link refusal where the
platform permits creating the fixture.
