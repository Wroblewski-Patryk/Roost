# Agents Module

The agents module exposes the workspace-scoped v1 agent registry for service
clients such as Paperclip, Jarvis, Jarvan, and Aviary.

Implemented routes:

- `GET /v1/agents`
- `POST /v1/agents`
- root compatibility aliases under `/agents`

Agent logs should attach to an agent through `agentId` when an adapter has a
durable identity record.
