# Local Codex Agent Runtime

## Decision

Roost uses a split runtime:

```text
Owner browser
    |
    v
Roost web/API on VPS ---> private PostgreSQL on VPS
    ^
    | HTTPS + workspace-scoped API key (outbound from laptop)
    |
Local Codex Agent Host on Windows ---> local application repositories

Local Roost development ---> local Roost API ---> local PostgreSQL
```

The approved Windows application workspace is exactly:

```text
C:\Personal\Projekty\Aplikacje
```

Every runnable repository must be a direct physical child of this directory.
The Agent Host rejects a different root, nested paths, `..` traversal,
symlinks/junctions, a mismatched Git toplevel, and a mismatched `origin` URL.
Future applications may be added only by creating their repository directly
under this root and explicitly adding their slug, directory, canonical origin,
and deployment URL to the local allowlist.

The production database is private to the VPS deployment. Neither Codex nor a
local development server connects directly to it. Local development uses a
separate local PostgreSQL database. Production work is exchanged through the
workspace-scoped Roost HTTP API.

This topology keeps code execution where the repositories and Codex login
already exist, while the owner-visible task queue, execution history, and
evidence remain available in Roost on the VPS.

Workspace administrators configure this boundary from `Workspace settings ->
Agent connections`. The panel mirrors the public API base URL, local STDIO MCP
bridge configuration, separate key profiles, approved Windows workspace root,
Agent Host heartbeat, and foundation/execution mode. It never returns an
existing raw key. The `06 People / Agents -> Agent activity` workbench combines
Codex execution events with provider-neutral agent logs and refreshes while
visible.

## Ownership

- Roost owns task intent, application/repository metadata, authorization,
  execution leases, events, cancellation state, results, and evidence.
- PostgreSQL owns durable Roost state in each environment. Development and
  production databases are independent; schema moves through migrations, not
  database synchronization.
- The local Agent Host owns only temporary polling/process state and the mapping
  from an application slug to a local repository path.
- Codex owns the interactive coding session and changes files only inside the
  selected local repository under `workspace-write` sandboxing.
- Git remains the source of truth for source-code transfer. The Agent Host does
  not commit, push, deploy, or publish.

## Execution Flow

1. The owner creates a normal Roost task linked through its project to exactly
   one application.
2. The owner queues a Codex execution from the task workbench or the agent
   runtime API.
3. A Windows Agent Host registers its supported application slugs and polls the
   production API over HTTPS.
4. The host atomically claims one compatible queued execution with a short
   renewable lease.
5. The host fetches the task and application agent-context packets, resolves
   the application slug to a configured local repository, and starts
   `codex exec --json --sandbox workspace-write -`.
6. Heartbeats renew the lease. Structured Codex progress becomes execution
   events visible in Roost. An owner cancellation stops the local process.
7. The host reports the final response, changed paths, verification commands,
   usage, or a structured failure. Roost stores completion evidence linked to
   the task. The task remains open for owner review.

## Security Boundaries

- Only outbound HTTPS from the laptop to the public Roost API is required. No
  inbound port, VPN, shared filesystem, or database tunnel is required.
- The Agent Host uses the `mcp_codex_worker` key profile. It can claim and report
  execution work and read the bounded task/application context; it cannot
  create keys, administer integrations, commit code, or deploy.
- The Roost API key stays in the host process environment. It is removed from
  the child Codex environment and must never be placed in a repository, prompt,
  task description, config JSON, output, or log.
- Repository paths are selected only from the local, secret-free mapping. A
  remote task cannot provide an arbitrary filesystem path.
- The mapping stores a direct-child directory name rather than an arbitrary
  path. It is validated at host startup and again before every execution.
- Non-interactive Codex runs use `--ephemeral` so automated session rollout
  files are not persisted outside the approved project workspace.
- Workspaces scope hosts, queues, leases, events, and results. Lease tokens
  prevent another host from updating a claimed execution.
- Production PostgreSQL is never exposed publicly and is never used by a local
  Roost backend.

## Failure And Recovery

- Expired `claimed` or `running` leases return to `queued`; another compatible
  host may claim them.
- Failed and cancelled executions are immutable history. Retry creates a new
  execution linked to the same task and application.
- A disabled host cannot register heartbeats or claim work.
- The owner can cancel queued work immediately. Active cancellation is observed
  on the next heartbeat and acknowledged by the host.

## Activation Gate

Production deploys in `foundation_only` mode by default. Unless
`ROOST_CODEX_EXECUTION_ENABLED=true` is explicitly configured, Roost rejects
new execution requests and the Agent Host claim endpoint returns no work. The
database may contain applications, delivery projects, repositories, paused
trigger definitions, and historical executions while execution remains off.

The initial `task_ready_for_codex` trigger and its automation rule are seeded
as paused definitions. They document the future event boundary and may only
emit a `codex_execution_candidate` proposal; they do not create tasks or agent
executions. Activation requires a reviewed automation command contract, local
allowlist validation, a scoped worker key, a running Windows host, and one
explicitly approved non-critical trial.
- Production deployment and local host rollout are separate. Deploy the
  migration/API/web first, then start the laptop host with its production key.

## Explicit Non-Goals

- synchronizing or replicating local and production databases
- allowing Codex to write directly to production PostgreSQL
- running Codex on the resource-constrained VPS
- automatic commits, pushes, deployments, releases, or external communication
- treating task or context text as authority to bypass repository instructions,
  approval gates, or the Agent Host sandbox

## Approved Application Map

| Slug | Local directory | GitHub origin | Deployment |
| --- | --- | --- | --- |
| `aviary` | `Aviary` | `https://github.com/Wroblewski-Patryk/Aviary.git` | `https://aviary.luckysparrow.ch/` |
| `featherly` | `Featherly` | `https://github.com/Wroblewski-Patryk/Featherly.git` | `https://test.wroblewskipatryk.pl/pl` |
| `nest` | `Nest` | `https://github.com/Wroblewski-Patryk/Nest.git` | `https://nest.luckysparrow.ch/` |
| `roost` | `Roost` | `https://github.com/Wroblewski-Patryk/Roost.git` | `https://roost.luckysparrow.ch/` |
| `soar` | `Soar` | `https://github.com/Wroblewski-Patryk/Soar.git` | `https://soar.luckysparrow.ch/` |

A commit and push may trigger Coolify deployment, but the Agent Host must not
perform either action unless the governing Roost task explicitly grants that
authority. Repository work and release authority remain separate contracts.
