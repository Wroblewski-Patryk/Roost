# Roost Code To Docs Atlas

Updated: 2026-05-31

## Canonical Inputs

| Input | Status | Role |
| --- | --- | --- |
| [[architecture/registry/nodes.csv|nodes.csv]] | present | Feature/page/API/service/data/test/doc registry. |
| [[architecture/chains/chains.csv|chains.csv]] | present | End-to-end function chains. |
| [[architecture/indices/user-action-index.csv|user-action-index.csv]] | missing | User-visible action proof map. |
| [[architecture/indices/function-chain-evidence-index.csv|function-chain-evidence-index.csv]] | missing | Generated function evidence index. |

## Feature Atlas

| Feature | Nodes | Chains | Actions |
| --- | --- | --- | --- |
| example | 1 | 0 | not generated |

## Navigation Rule

Before changing behavior, identify the owning feature, route/page, API route, backend function, data model, tests, docs, and proof path. If a project does not yet have a user-action index, do not pretend it has action-level proof; add that as cleanup work.
