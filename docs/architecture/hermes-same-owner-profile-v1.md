# Hermes same-owner profile v1

RF-RUNTIME-005B3, 2026-09-16. **Profile preparation and synthetic admission: DONE. Live identity qualification: BLOCKED (`owner-interaction-required`).** No Hermes/model/auth command was run.

## Accepted owner decision

Hermes on the owner laptop may reuse that same owner's existing Codex CLI authentication. This is an approved source, not an isolation violation. Separate token storage, Windows Restricted Token/ACL sandboxing and the RF005B2 external credential-access guard are not pilot prerequisites; the owner rejected that recommendation. [ADR-004 version 3](../decisions/ADR-004-native-hermes-codex-pilot.md) governs this amendment.

The [B1 preflight](hermes-private-profile-preflight-v1.md) and [B2 qualification](hermes-credential-source-qualification-v1.md) remain accurate historical findings about **full profile-only credential isolation**. They do not imply that isolation is still required. No account/provider/model switching, multi-account rotation/fallback, hidden interactive reauthorization, or secrets in Roost/evidence are accepted. Existing Windows Job lifetime/cleanup remains unchanged; it is not a credential sandbox.

Hermes remains **0.21.2 / 939e45c91d751fadd94dcd1b873ac3cb44846213**, unmodified. No install, upgrade, login/logout, token-store access or OAuth mutation occurred.

## Private configuration and source evidence

The [profile module](../../scripts/lib/agent-host-hermes-profile.mjs) renders exact secret-free JSON (a YAML subset) for a private `config.yaml`. The generated file and `worker-profile-binding.json` were created outside repositories and read back successfully. Exactly two files were retained; no existing profile was replaced and no backup was needed. The actual path is private installation data and is deliberately absent here. The running Worker's main configuration was not opened or changed.

The binding is intended for the private `executionProvider.profile` field. Its strict fields are `schemaVersion`, `hermesVersion`, `hermesCommit`, `profilePath`, `configDigest`, and `authSourceClass`. `profilePath` is the canonical physical absolute path to `config.yaml`, outside the application repository. Resolve installation redirection when provisioning; do not relax canonical-path checks. The sidecar alone does not activate or configure a running host.

- Profile version: `roost-hermes-profile-v1`.
- Auth policy: `roost-hermes-same-owner-auth-v1`; source class: `same-owner-codex-cli`.
- Exact config SHA-256: `883654f3e75f23f4b2dd273dfef690bf60285772ca42b0ec6e81ef9e2c252223`.
- Public source pin: [config defaults](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/config_defaults.py), SHA-256 `bb3926a19337d2a37db9c7152b00680db8dad947c5332e94df75e40596c316f7`.
- Public [Blank Slate setup](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/setup_quick.py#L158-L197) supports disabling memory, compression, checkpoints and smart routing. Public [tool configuration](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/tools_config.py#L551-L602) supports explicit empty CLI toolsets; [plugin discovery](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/plugins_discovery.py#L90-L99) supplies the enabled-plugin selection.

Static AST inspection checked 29 default-backed config paths, with toolsets/MCP/plugins/smart routing additionally checked in public source. No private Hermes imports or setup execution were used. The exact generated profile is a deliberately narrower Blank Slate profile: empty model/provider/fallback/toolsets/MCP/plugins/hooks; disabled memory, checkpoints, compression, smart routing, project skill discovery, inline shell, auxiliary title/background generation, curator, telemetry sharing, model catalog, updates and onboarding profile build; zero auxiliary transient retries. Skills require write approval.

These are real public keys, **not proof of effective upstream startup behavior**. No invented `cron.enabled`, `gateway.enabled`, delegation-disable or credential-rotation switch is used. CLI mode and empty tools/config do not prove absence of every native capability, implicit credential recovery, metadata network call or internal turn. Unsupported/unknown controls remain blocked at Worker admission. `hermes_sealed_config_enforcement_unproven` remains; the pure launch projection still has `configReceipt=null`. The byte audit below is narrower than an effective-Hermes-config receipt.

## Worker admission and evidence

[Input sealing](../../scripts/lib/agent-host-provider-input.mjs) binds a local opaque profile snapshot to the validated Ready revision and one-use input. Immediately before a future spawn, [launch preparation](../../scripts/lib/agent-host-provider-launch.mjs) rechecks path, exact bytes/digest, version/pin, source class, file identity and Ready binding. Relative/aliased/reparse/hardlinked paths, repository-local profiles, replacement after Ready, malformed/duplicate/unknown config and caller-provided evidence fail closed. Errors contain fixed reasons rather than supplied private values. Profile paths and local receipts do not enter model context.

A trusted future adapter may supply only nonsecret account metadata: approved source/provider, stable identity fingerprint matching the owner-approved fingerprint, one account, and no interaction/account change/rotation/fallback. Opaque observations expire after 60 seconds; serialized/config/API receipts cannot authorize anything. Identity changes after Ready are denied. Synthetic fixtures exercise this seam; they do not establish an actual account identity.

**No production nonsecret identity adapter is qualified or connected.** The production path accepts no caller auth receipt. Its audit therefore reports `identityFingerprint=null`, `ownerInteractionRequired=true`; a valid profile reaches `hermes_owner_interaction_required`, never spawn. Public metadata reports the same fixed pending status and ignores supplied identity claims. The current public auth blocker is `hermes_same_owner_identity_unverified`, replacing the old profile-isolation blocker. Token/JWT decoding, credential reads or fabricated identity values are not substitutes.

Sanitized profile audit contains only policy/profile version, Hermes version/commit, config digest, auth-source class, nullable identity fingerprint and owner-interaction state. No credentials, account identifiers, installation paths or sensitive logs are persisted in the repository.

## Validation and remaining step

Profile/admission, provider-input, provider-launch, quiet adapter, execution-provider and native Windows Job regression suites passed. API execution-provider tests passed (4/4); typecheck, lint and production build passed. Build retains warnings about unresolved static assets and large chunks. Profile tests cover valid synthetic identity reaching the pre-spawn boundary, drift/unknown controls, file replacement/aliases, account/provider changes, rotation/fallback/relogin, forged receipts and privacy. Native Job code/lifecycle was not changed. No real model/MCP/auth call was used; no live claim follows from fixture success.

Documentation contract/delivery checks, 501 local links in changed documents, changed-file privacy checks and `git diff --check` passed. All six false gates and the exact source pin were rechecked. No push/deploy is part of this atom.

Exactly one recommended next atom: **RF-RUNTIME-005B4 — owner-present qualification of nonsecret same-owner identity evidence**. One owner action is needed before any account interaction: confirm the intended Codex account in a visible account interface, without sharing tokens. That confirmation alone does not qualify an adapter or grant model execution. B4 must stop if identity cannot be established through an approved nonsecret interface; it must not read credential files or invent an identity receipt. B4 is not started here.

`implementationReady=false`; `executionSupported=false`; `pilotReady=false`; `liveAdmissionAllowed=false`; `pilotExecutionAuthorized=false`; `pilotExecutionStarted=false`.
