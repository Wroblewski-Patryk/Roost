# Hermes credential-source qualification v1

RF-RUNTIME-005B2, 2026-09-16. Verdict: **NOT_QUALIFIED**.
This completes the source-research atom following the
[RF-RUNTIME-005B1 preflight](hermes-private-profile-preflight-v1.md). Neither the
current stable release nor the inspected immutable upstream snapshot establishes
all five requirements. No qualified official extension replaces that missing
contract. This finding does not authorize an installation change or a fork.

The selected recommendation is **an external Worker credential-access guard**,
subject to owner acceptance and separate qualification. It is a proposal only.
Hermes remains an unmodified dependency; Roost retains task/model/permission
authority. The current pin remains **0.21.2 /
939e45c91d751fadd94dcd1b873ac3cb44846213**.

## A–D source selection

| Order | Exact source inspected | Result |
| --- | --- | --- |
| A: stable | [v2026.9.14](https://github.com/NousResearch/hermes-agent/releases/tag/v2026.9.14), published 2026-09-14 16:04:14 UTC; package **0.21.3**, tag resolved to **345cd2b057a452236de401d3534b8502a7465e8d** | NOT_QUALIFIED: credential import/recovery remains. |
| B: newer release/prerelease | [Releases API](https://api.github.com/repos/NousResearch/hermes-agent/releases?per_page=30) and [tags API](https://api.github.com/repos/NousResearch/hermes-agent/tags?per_page=30), read on 2026-09-16 | No newer published release or prerelease in the returned recent inventory; newest tag is v2026.9.14. No prerelease candidate selected. This is not a claim about unpublished artifacts. |
| C: upstream | `main` resolved once to **657ee57a99bf1c29936c8e4d5078695c911bc1b1**, [commit](https://github.com/NousResearch/hermes-agent/commit/657ee57a99bf1c29936c8e4d5078695c911bc1b1), committer time 2026-09-16 11:39:15 UTC | NOT_QUALIFIED: the same recovery branches remain, backed by explicit upstream tests. This is a source snapshot, not a released candidate. |
| D: extensions | Official provider profile, middleware and secret-source contracts at that immutable upstream snapshot; legacy-pin hook implementation as separately dated evidence | NOT_QUALIFIED for a complete profile-only auth policy. Extension mechanisms exist, but their documented controls do not replace the built-in Codex resolver or guarantee denial on failure. |

Only public metadata/source bytes were fetched; source was parsed as data, not
imported or executed. A transient HTTP 429 paused public reads; one bounded
resumption obtained the critical upstream auth/extension/test sources. A later
429 ended additional fetching. Unread current hook/egress pages are not represented
as verified. The decisive negative evidence below was obtained successfully.

## Requirements 1–5

`PARTIAL` means a supported component exists, not that Roost admission is ready.

| Requirement | Verdict | Evidence and remaining gap |
| --- | --- | --- |
| 1. Exact private home/profile | PARTIAL | Stable [hermes_constants.py:101–108](https://github.com/NousResearch/hermes-agent/blob/345cd2b057a452236de401d3534b8502a7465e8d/hermes_constants.py#L101-L108) supports explicit `HERMES_HOME`. [165–181](https://github.com/NousResearch/hermes-agent/blob/345cd2b057a452236de401d3534b8502a7465e8d/hermes_constants.py#L165-L181) separately derives a root for named profiles. Selecting a directory does not itself restrict every credential source or seal its identity. |
| 2. Exactly one profile-owned openai-codex credential source | NOT_QUALIFIED | Stable [auth_codex.py:376–417](https://github.com/NousResearch/hermes-agent/blob/345cd2b057a452236de401d3534b8502a7465e8d/hermes_cli/auth_codex.py#L376-L417) explicitly handles grants borrowed from a root store; upstream [442–518](https://github.com/NousResearch/hermes-agent/blob/657ee57a99bf1c29936c8e4d5078695c911bc1b1/hermes_cli/auth_codex.py#L442-L518) resolves singleton, CLI recovery and pool paths. There is no exact-source allowlist argument on this resolver. |
| 3. No recovery/import from default Codex home or other stores | NOT_QUALIFIED | Stable [185–196](https://github.com/NousResearch/hermes-agent/blob/345cd2b057a452236de401d3534b8502a7465e8d/hermes_cli/auth_codex.py#L185-L196) and [420–439](https://github.com/NousResearch/hermes-agent/blob/345cd2b057a452236de401d3534b8502a7465e8d/hermes_cli/auth_codex.py#L420-L439) import from `CODEX_HOME` or the account default and persist the pair. Upstream [same importer](https://github.com/NousResearch/hermes-agent/blob/657ee57a99bf1c29936c8e4d5078695c911bc1b1/hermes_cli/auth_codex.py#L420-L439) still has no profile-policy guard. |
| 4. No provider/model fallback, credential rotation or hidden reauthorization | PARTIAL / NOT_QUALIFIED overall | Explicit provider requests re-raise auth failures instead of falling through to another provider in upstream [runtime_provider.py:677–688](https://github.com/NousResearch/hermes-agent/blob/657ee57a99bf1c29936c8e4d5078695c911bc1b1/hermes_cli/runtime_provider.py#L677-L688). Empty configured model fallback chains help but do not control account selection/recovery. Stable [credential_pool.py:526–533](https://github.com/NousResearch/hermes-agent/blob/345cd2b057a452236de401d3534b8502a7465e8d/agent/credential_pool.py#L526-L533) defaults invalid/missing strategy to `fill_first`; auth recovery and automatic refresh still exist. No combined no-rotation/no-recovery mode was qualified. |
| 5. Deterministic violation detection before model start | NOT_QUALIFIED | Credential selection happens inside runtime resolution, before a provider client can enforce a transport policy. [Explicit resolver table](https://github.com/NousResearch/hermes-agent/blob/657ee57a99bf1c29936c8e4d5078695c911bc1b1/hermes_cli/runtime_provider.py#L562-L574) and [OAuth dispatch](https://github.com/NousResearch/hermes-agent/blob/657ee57a99bf1c29936c8e4d5078695c911bc1b1/hermes_cli/runtime_provider.py#L665-L688) directly call built-in auth. No public source-bound pre-model receipt or mandatory auth-policy hook was established. A YAML digest alone cannot detect which foreign grant recovery will later select. |

These are conditional recovery paths; successful starts do not necessarily import
credentials. A sole manual pool entry can use its own token pair. Neither fact
proves rejection after state corruption, expiry, another pool entry, a 401 or a
root-store change. No claim about the operator's actual credential state is made.

Upstream tests provide affirmative evidence, not merely a missing keyword:
[test_auth_codex_self_heal.py:24–53](https://github.com/NousResearch/hermes-agent/blob/657ee57a99bf1c29936c8e4d5078695c911bc1b1/tests/hermes_cli/test_auth_codex_self_heal.py#L24-L53)
expects a rejected refresh to import and persist the CLI pair;
[64–96](https://github.com/NousResearch/hermes-agent/blob/657ee57a99bf1c29936c8e4d5078695c911bc1b1/tests/hermes_cli/test_auth_codex_self_heal.py#L64-L96)
expects recovery from a separate Codex home when the Hermes singleton lacks an
access token. These tests were **read, not run**.

## Bounded changes after the retained pin

The [auth-file commit history](https://api.github.com/repos/NousResearch/hermes-agent/commits?sha=657ee57a99bf1c29936c8e4d5078695c911bc1b1&path=hermes_cli/auth_codex.py&since=2026-09-11T00:00:00Z&per_page=50)
identified concrete changes; the resulting stable/upstream functions were checked:

- [3767c2eacdde2c460dbab9b21f72169290327987](https://github.com/NousResearch/hermes-agent/commit/3767c2eacdde2c460dbab9b21f72169290327987): inherited global Codex pools in profiles.
- [6bd29f26f6631be5b02db7e7d23c75800fd3934a](https://github.com/NousResearch/hermes-agent/commit/6bd29f26f6631be5b02db7e7d23c75800fd3934a) and [66ddd5f83cd1beac797f35a574ee2e59138bf13a](https://github.com/NousResearch/hermes-agent/commit/66ddd5f83cd1beac797f35a574ee2e59138bf13a): root-store write-through and limiting it to refresh.
- [e117e792b676c93464b0e5c79d8a9c298ff00ed4](https://github.com/NousResearch/hermes-agent/commit/e117e792b676c93464b0e5c79d8a9c298ff00ed4) and [ca6b189a7c649b4753bcf0fa114b8a8f84d9e85e](https://github.com/NousResearch/hermes-agent/commit/ca6b189a7c649b4753bcf0fa114b8a8f84d9e85e): source-store transaction/lock handling prevents competing refreshes from replaying a consumed token. It does not disable cross-store recovery.
- [417b707f5967ded756562e9a85765f980f7cfd8c](https://github.com/NousResearch/hermes-agent/commit/417b707f5967ded756562e9a85765f980f7cfd8c): the usage retry refreshes the matching pool credential; upstream auth lines 473–477 add forced pool refresh. It does not add a profile-only auth policy.

An immutable SHA would make source identity reproducible but would not fix these
semantics. With no qualifying change, the churn and unreleased integration risk
provide no reason to select `main` or replace the existing stable installation.

## Why the official extension points do not qualify

The [model-provider plugin contract](https://github.com/NousResearch/hermes-agent/blob/657ee57a99bf1c29936c8e4d5078695c911bc1b1/website/docs/developer-guide/model-provider-plugin.md#L15-L24)
supports filesystem plugins and replacement of bundled provider profiles without
a fork. This is a real reusable extension point. However,
[ProviderProfile](https://github.com/NousResearch/hermes-agent/blob/657ee57a99bf1c29936c8e4d5078695c911bc1b1/providers/base.py)
exposes request/client/model helpers, not a credential-source policy callback.
The hard-coded `openai-codex` resolver remains in the runtime dispatch above.
Overriding a profile does not replace it. A different provider identity, custom
OAuth implementation or mutation of private resolver tables is not a qualified
thin integration for this contract.

The documented `create_client` override is also not a denial boundary:
[its guide, lines 146–154](https://github.com/NousResearch/hermes-agent/blob/657ee57a99bf1c29936c8e4d5078695c911bc1b1/website/docs/developer-guide/model-provider-plugin.md#L146-L154)
describes fallback to the standard client on an exception. A guard must not rely
on throwing there. The actual upstream
[middleware implementation, lines 199–211](https://github.com/NousResearch/hermes-agent/blob/657ee57a99bf1c29936c8e4d5078695c911bc1b1/hermes_cli/middleware.py#L199-L211)
continues the chain after a callback error if it has not called the next handler.
Even a deliberately short-circuiting callback runs too late to undo prior auth
resolution. These APIs must not be relabelled as a guaranteed pre-auth veto.

[Secret-source plugins](https://github.com/NousResearch/hermes-agent/blob/657ee57a99bf1c29936c8e4d5078695c911bc1b1/website/docs/developer-guide/secret-source-plugin.md#L9-L24)
supply credentials into the environment; their bootstrap re-pull is fail-open,
not an exclusion policy for existing stores. For the retained 0.21.2 pin,
[plugin hook dispatch](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/hermes_cli/plugins_dispatch.py#L166-L199)
catches callback errors; only the tool timeout path supplies a blocking directive.
That older hook evidence is not presented as a verified current-main hook contract.

The retained pin's official
[iron-proxy documentation](https://github.com/NousResearch/hermes-agent/blob/939e45c91d751fadd94dcd1b873ac3cb44846213/website/docs/user-guide/egress/iron-proxy.md#L16-L22)
explicitly excludes in-process host LLM calls. It is not a substitute for this
native Hermes auth boundary, and no Docker/WSL topology change is proposed.

## One recommended next path: external Worker guard

**Owner decision is required before the next atom.** Proposed
**RF-RUNTIME-005B3: specify and qualify a minimal native credential-access guard
outside Hermes, using synthetic credentials only**. Do not start profile/OAuth
setup as part of accepting this research result.

The guard would extend the existing Worker admission/native launch boundary,
not introduce another agent framework, a fork, a second installation, or an
OAuth/inference implementation. Its minimum proposed obligations are:

1. Bind canonical executable/source, physical private profile path, config version,
   approved credential-source identity and a secret-free policy seal to Ready and
   one attempt. Reject unknown keys, drift, reparse/alias escapes and inherited
   auth/provider/secret-source environment. Keep model/provider/reasoning from the
   packet. No secret bytes or credential fingerprints in API/logs/repository.
2. Give the child access to only the approved profile credential source. The
   default Codex home and other profiles/stores must remain inaccessible even if
   Hermes attempts recovery. Explicit child home settings alone are insufficient
   as a security boundary; they do not prohibit native tools or mutable startup
   files from accessing another store.
3. Qualify a Windows restricted-token/access-control boundary around the existing
   Job Object, with only approved file/handle access. Microsoft's
   [restricted-token contract](https://learn.microsoft.com/en-us/windows/win32/secauthz/restricted-tokens)
   supports an additional restricting-SID access check; it is a candidate mechanism,
   not proof that the existing Worker implements it. Prove process/handle/desktop
   and child inheritance behavior; fail closed if required access cannot be scoped.
   Do not modify existing credential stores or silently add a broad filesystem grant.
4. Require one owner-selected credential identity; reject alternate pool entries,
   borrowed root grants, fallback models/providers and automatic reauthorization.
   Expiry/revocation must stop the attempt. OAuth token renewal versus switching
   accounts must be specified explicitly; this proposal does not grant hidden
   refresh/rotation as an exception. The OS boundary alone does not enforce this
   semantic rule, so the synthetic contract must prove it separately or remain blocked.
5. Demonstrate pre-model denial with disposable fake stores: missing/invalid/expired
   credential, a second account, readable foreign-home decoy, ambient key, plugin
   failure, file/config change after Ready, and process restart. Keep pre-spawn
   admission and lifetime access controls distinct; a one-time hash cannot close
   the later race. No real credential or model is needed for this qualification.

This is the smallest proposed boundary that reuses the existing Worker/Windows
launcher while addressing both source selection and foreign-store access. Its
feasibility is **unproven**. It does not claim a general sandbox, network policy,
native-tool safety, budget enforcement or pilot readiness. A single credential,
an empty fallback list, relocated homes or a process-lifetime Job alone are not
reported as satisfying all five requirements. No guard was implemented here.

## Provenance and validation scope

SHA-256 of successfully fetched HTTP LF bytes (not installed-runtime attestation):

| Source | Revision | SHA-256 |
| --- | --- | --- |
| `pyproject.toml` | stable `345cd2b` | `a674c321c63c3bfd9fa099fab5957a64092416f7771680b370a4d77e992744ba` |
| `hermes_cli/auth_codex.py` | stable `345cd2b` | `cfac1743394306fdc529d62ba287beb68ca7a1efb28cd28c94eefeebbc4625b0` |
| `hermes_constants.py` | stable `345cd2b` | `e5f72a309b3689f5fa2e85065e8051f8e6f7686d1ec1741e7543cc5e56bea162` |
| `agent/credential_pool.py` | stable `345cd2b` | `24ef6c3a7b1c441da09be17cf08a61230149fe17970d23aa4a45e5a4a784d077` |
| `hermes_cli/auth_codex.py` | upstream `657ee57` | `5347c13f7209c9e65eb997ba78b17cd8cbb93aedfdba3aae80485ca6acfb52a1` |
| `tests/hermes_cli/test_auth_codex_self_heal.py` | upstream `657ee57` | `8429255b113c54353812ba39eb5d9723ad750016b964ad38366e803767044cd7` |
| `hermes_cli/runtime_provider.py` | upstream `657ee57` | `c408eb89f501c184ce231be99d3cf7423fcb2424a4c58d9af36f4e4841c57816` |
| `providers/base.py` | upstream `657ee57` | `eb4700b6a4a827993664ed38d99d8a74d730ef30f68d7d31f0d62d72afb68315` |
| `hermes_cli/middleware.py` | upstream `657ee57` | `62b1c1b6aa2e736c852ffd4dc551b9325ae4d41debafb6ece1169739fb6ce228` |
| `website/docs/developer-guide/model-provider-plugin.md` | upstream `657ee57` | `d4fc40268c4021b4c12fe511f40fe77b84a522c26edab58a6d11511998e95a11` |
| `website/docs/developer-guide/secret-source-plugin.md` | upstream `657ee57` | `3af1f24a8a077a00e715e52dc113b2ea7cfd8ae9e8894019b7404425d87f44ca` |

Only canonical documentation/ADR/planning changes belong to this atom. Both Direct
documentation validators passed; **485 local links** across eight changed documents,
**20 immutable source-link formats**, 11 SHA-256 formats, five requirement rows,
privacy checks and six false document/runtime gates passed. `git diff --check`
passed. Local legacy-hook/egress sources matched the retained Git commit objects.
No runtime code changed;
upstream tests, model/auth probes, typecheck/lint/build and native fixture suites
were not run. No credential store, actual `CODEX_HOME`, auth file, cookie or token
was read or changed. No install/update, private profile, environment change,
Docker/WSL/VPS/production operation, push or deployment occurred. The unrelated
`design-qa.md` remains unread and untouched.

implementationReady=false; executionSupported=false; pilotReady=false;
liveAdmissionAllowed=false; pilotExecutionAuthorized=false;
pilotExecutionStarted=false. RF-RUNTIME-005B3 was not started.
