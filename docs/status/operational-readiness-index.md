# Operational Readiness Index

Generated: 2026-07-02T15:25:35.182Z
Project: Roost
Status: ready_for_repair_flow

| Gate | Status | Required for |
| --- | --- | --- |
| architecture_exports | present | cross-layer ownership and dependency tracing |
| app_completion_index | present | user-flow works/fails/unknown classification |
| event_chain_index | covered | backend/frontend/worker impact analysis |
| runtime_error_index | covered | agent-owned bug discovery and repair routing |
| public_runtime_probe | pass | production parity with local behavior |
