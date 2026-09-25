# Truth and evidence

## Claim ladder

Never collapse these levels:

1. **Specified** — accepted requirement or contract exists.
2. **Implemented in source** — inspected production-path code exists.
3. **Statically verified** — applicable lint, typecheck or build passed.
4. **Test verified** — named automated tests passed against their stated
   boundary; mocked or synthetic tests remain labelled as such.
5. **Native verified** — the real local process, database, Worker, Hermes or
   provider path ran successfully with recorded identities and configuration.
6. **Deployed** — the exact accepted commit or artifact was deployed to the
   recorded target.
7. **Production verified** — post-deploy health and the required real behavior
   were observed against a baseline, with rollback readiness recorded.

Report only the highest demonstrated level. A later level implies earlier
levels only when their evidence is present and compatible.

## Completion rules

- The active gate text in `docs/implementation.md` defines completion.
- Source-only contracts, passing unit tests, commits and documentation are
  supporting evidence, not substitutes for a required real round trip.
- A process exit code proves only that process invocation unless its output and
  side effects are read back.
- A resolved database call is not durable-write proof when transport or commit
  acknowledgement is uncertain; read back authoritative state.
- An agent or subagent statement is not evidence. Inspect artifacts and rerun
  material checks.
- Unknown, unrun and unavailable are valid states. Never turn them into pass,
  zero risk or an estimated percentage.

## Progress reports

Use gate states: `unmet`, `in_progress`, `met`, `blocked` or
`explicitly_deferred`. A blocker exists only for a true owner dependency from
`docs/implementation.md`; ordinary engineering failure remains work to solve.

Every material report includes:

- gate and claim level reached;
- exact commands or manual flows run and their results;
- task/run, commit, configuration, provider/model and deployment identities
  when applicable;
- changed files and canonical documentation updated;
- residual limitations and checks not run;
- the exact owner action needed only when genuinely blocked.

Do not say "done", "ready", "working" or "production-safe" without naming the
evidence level that supports the statement.
