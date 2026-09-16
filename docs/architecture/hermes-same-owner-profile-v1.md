# Hermes same-owner profile v1

RF-RUNTIME-005B4, 2026-09-16. **Same-owner qualification: DONE via explicit owner attestation.** No safe CLI status surface was qualified; no technical account identity or logged-in status is claimed. The owner confirmed the currently signed-in local Codex account without providing account data. This supersedes B3's identity-fingerprint prerequisite and owner-interaction blocker. All six execution gates remain false.

Historical B3 prepared the profile and synthetic admission while identity remained blocked. B4 changes the accepted evidence, not the Hermes pin or Windows Job backend.

## Accepted owner decision

Hermes on the owner laptop may reuse that same owner's existing Codex CLI authentication. This is an approved source, not an isolation violation. Separate token storage, Windows Restricted Token/ACL sandboxing and the RF005B2 external credential-access guard are not pilot prerequisites; the owner rejected that recommendation. [ADR-004 version 4](../decisions/ADR-004-native-hermes-codex-pilot.md) governs this amendment.

The [B1 preflight](hermes-private-profile-preflight-v1.md) and [B2 qualification](hermes-credential-source-qualification-v1.md) remain accurate historical findings about **full profile-only credential isolation**. They do not imply that isolation is still required. No account/provider/model switching, multi-account rotation/fallback, hidden interactive reauthorization, or secrets in Roost/evidence are accepted. Existing Windows Job lifetime/cleanup remains unchanged; it is not a credential sandbox.

Hermes remains **0.21.2 / 939e45c91d751fadd94dcd1b873ac3cb44846213**, unmodified. No install, upgrade, login/logout, token-store access or OAuth mutation occurred.

## Private configuration and source evidence

The [profile module](../../scripts/lib/agent-host-hermes-profile.mjs) renders exact secret-free JSON (a YAML subset) for a private `config.yaml`. The generated file and `worker-profile-binding.json` were created outside repositories and read back successfully. B3 retained two files. B4 adds `owner-attestation.json` and updates only the private profile binding. One bounded backup of that binding was removed after successful readback; the existing config was preserved. Three private files remain. The actual path is private installation data and is deliberately absent here. The running Worker's main configuration was not opened or changed.

The binding is intended for the private `executionProvider.profile` field. Its strict fields are `schemaVersion`, `hermesVersion`, `hermesCommit`, `profilePath`, `configDigest`, `authSourceClass`, and the optional-but-required-for-auth `ownerAttestation` binding (`id`, `digest`). `profilePath` is the canonical physical absolute path to `config.yaml`, outside the application repository. Resolve installation redirection when provisioning; do not relax canonical-path checks. The sidecar alone does not activate or configure a running host.

- Profile version: `roost-hermes-profile-v1`.
- Auth policy: `roost-hermes-same-owner-auth-v2`; source class: `same-owner-codex-cli`.
- Exact config SHA-256: `883654f3e75f23f4b2dd273dfef690bf60285772ca42b0ec6e81ef9e2c252223`.
- Public source pin: [config defaults](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/config_defaults.py), SHA-256 `bb3926a19337d2a37db9c7152b00680db8dad947c5332e94df75e40596c316f7`.
- Public [Blank Slate setup](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/setup_quick.py#L158-L197) supports disabling memory, compression, checkpoints and smart routing. Public [tool configuration](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/tools_config.py#L551-L602) supports explicit empty CLI toolsets; [plugin discovery](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/plugins_discovery.py#L90-L99) supplies the enabled-plugin selection.

Static AST inspection checked 29 default-backed config paths, with toolsets/MCP/plugins/smart routing additionally checked in public source. No private Hermes imports or setup execution were used. The exact generated profile is a deliberately narrower Blank Slate profile: empty model/provider/fallback/toolsets/MCP/plugins/hooks; disabled memory, checkpoints, compression, smart routing, project skill discovery, inline shell, auxiliary title/background generation, curator, telemetry sharing, model catalog, updates and onboarding profile build; zero auxiliary transient retries. Skills require write approval.

These are real public keys, **not proof of effective upstream startup behavior**. No invented `cron.enabled`, `gateway.enabled`, delegation-disable or credential-rotation switch is used. CLI mode and empty tools/config do not prove absence of every native capability, implicit credential recovery, metadata network call or internal turn. Unsupported/unknown controls remain blocked at Worker admission. `hermes_sealed_config_enforcement_unproven` remains; the pure launch projection still has `configReceipt=null`. The byte audit below is narrower than an effective-Hermes-config receipt.

## Worker admission and evidence

[Input sealing](../../scripts/lib/agent-host-provider-input.mjs) binds a local opaque profile snapshot to the validated Ready revision and one-use input. Immediately before a future spawn, [launch preparation](../../scripts/lib/agent-host-provider-launch.mjs) rechecks path, exact bytes/digest, version/pin, source class, file identity and Ready binding. Relative/aliased/reparse/hardlinked paths, repository-local profiles, replacement after Ready, malformed/duplicate/unknown config and caller-provided evidence fail closed. Errors contain fixed reasons rather than supplied private values. Profile paths and local receipts do not enter model context.

## Authoritative owner attestation

The [owner-auth module](../../scripts/lib/agent-host-hermes-owner-auth.mjs) reads only the fixed sibling `owner-attestation.json`, never credential stores. Its versioned strict record contains a random attestation id (not an account id), `state=confirmed`, confirmation/expiry timestamps, policy version, source class, a digest of the exact profile binding and the fixed status policy `owner_attestation_only_no_qualified_cli_status`. Canonical bytes are SHA-256-bound into the private Worker profile binding. No PII, tokens, token-derived fingerprint, account fingerprint or raw command output is stored. The digest proves integrity relative to trusted private configuration; it is not a signature or tamper protection against the trusted machine owner.

The owner confirmation is authoritative for this single-owner pilot. No stable account id is required. The record lasts at most **90 days** from explicit confirmation, with no automatic renewal. The private operator must revoke it immediately on withdrawal, known account/source change, session loss or relogin requirement. Profile/config/version/policy/source changes require a new explicit confirmation and fresh Ready admission. Expiry also requires explicit renewal, without initiating login or daily prompts. This bounded policy extends the existing rule that expired/changed authority cannot be silently renewed; it is not an upstream Codex authentication lifetime.

Worker reads and validates the record at input sealing and again at final pre-spawn admission. Missing/revoked/expired/future/overlong, malformed, unknown-field or digest/profile drift fails closed. A changed/renewed attestation cannot reuse a prior Ready/input snapshot. Symlinks/reparse paths and hardlinks are rejected. No runtime/config/API path calls the provisioning factory to auto-confirm authority.

Runtime **auth** receipts contain only `authSourceClass`, `status`, `attestationId`, `attestationDigest`, `policyVersion`, `ownerInteractionRequired`. This installation's readback has `status=unavailable_not_qualified`, `ownerInteractionRequired=false`. The containing profile audit separately carries the config digest and Hermes/profile versions. Neither is model context. A fresh opaque receipt tied to the same profile/Ready may discharge only `hermes_owner_attestation_required` locally; it is reread on use and expires in-process after 60 seconds. Forged/serialized receipts and stale/revoked evidence cannot discharge it. Final preparation still unconditionally rejects the remaining public launch contract before spawn.

Public API projection is conservative: without a locally verified receipt it returns null attestation identifiers and `ownerInteractionRequired=true` and ignores claimed auth fields. Registry qualification describes the implemented policy, not every installation's state. No global readiness flag is promoted.

## Installed CLI qualification and residual risk

Only these public, nonsensitive commands were executed on installed **Codex CLI 0.154.0-alpha.6.2**:

- `codex --version`
- `codex --help`
- `codex login --help`
- `codex login status --help`

The status help describes displaying login status but does **not** establish a secret-free output contract or a stable account identifier. Therefore **`codex login status` was not run**. No debug/verbose, login/logout, OAuth callback, browser, model, Hermes chat or MCP was used. No credential file/store was opened, decoded or modified. No account data is inferred from usage tools or application internals. No web or newer-version contract substitutes for installed help.

Under the explicit B4 fallback, absent a qualified safe status command, owner attestation alone qualifies this auth boundary. `unavailable_not_qualified` means deliberately unobserved, never logged-in or an unknown-status fallback. The trusted in-process observation seam has synthetic tests for a future qualified source: `logged-in` is accepted; `logged-out`, `relogin-required`, `unknown`, foreign source, raw output, extra account/token fields and observer errors block. This seam has no production CLI runner. A supplied observation cannot be silently dropped or downgraded after Ready.

**Residual risk:** Roost cannot technically detect a silent switch to another Codex account from this attestation. The owner confirmation is authoritative for the pilot. Without a qualified status probe, it also cannot automatically discover session loss/relogin requirements; only a trusted future status observation or owner report can trigger the corresponding denial/revocation. Source-class/config changes are detectable now. Owner-reported session/account changes require revocation before the next attempt. There is no claim of continuous account monitoring, account isolation or live authentication availability.

## Validation and remaining step

B4 tests cover confirmed current attestation with synthetic logged-in status; the attestation-only route with no account ID; missing/revoked/expired/drifting/renewed records; expiry after Ready; raw/secret-like output rejection; profile/version/source changes; and conditional discharge of only the auth blocker. Validation passed: 48 profile/attestation tests, 23 lifecycle tests, provider/input/launch/quiet/execution-provider and native Windows Job regressions, 4 API tests, typecheck, lint, build, both documentation validators, 496 changed-document local links, privacy and diff checks. The Windows reparse fixture uses a directory junction because file-symlink creation needs unavailable privileges; the corrected fixture passed. Build retains static-asset and large-chunk warnings. Actual private readback succeeds without a status command; native Job implementation/lifecycle is unchanged. No task fixture directories or native fixture processes remain.

Subsequent [RF-RUNTIME-005B5 effective-config qualification](hermes-effective-config-qualification-v1.md)
returned BLOCKED. An exact-pin loader observed the synthetic copy's explicit values,
but intercepted reads/imports and unqualified startup/tool/rotation consumers prevent
full qualification. The B4 auth decision remains valid. Subsequent
[B6 source analysis](hermes-minimal-startup-contract-v1.md) is complete with
NOT_SUPPORTED for strict minimal startup on the pinned public CLI. It distinguishes
same-owner refresh/recovery from multi-account rotation without reinstating an
identity-fingerprint requirement. B7 subsequently accepts those enumerated local
startup effects and implements the source-backed startup receipt. Private profile
v2 and the attestation binding were migrated without changing the attestation ID,
original confirmation or expiry. B3 bytes/B5 negative evidence remain historical;
the sole next recommendation is B8's internal-loop/budget source qualification.

`implementationReady=false`; `executionSupported=false`; `pilotReady=false`; `liveAdmissionAllowed=false`; `pilotExecutionAuthorized=false`; `pilotExecutionStarted=false`.
