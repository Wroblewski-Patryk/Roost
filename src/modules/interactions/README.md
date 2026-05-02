# Interactions Module

The interactions module exposes the workspace-scoped v1 CRM timeline API for
service clients such as Paperclip and Jarvis.

Implemented routes:

- `GET /v1/interactions`
- `POST /v1/interactions`
- root compatibility aliases under `/interactions`

Use interactions for client-facing activity such as email replies, calls,
meetings, and lead follow-up events. Use notes for durable context and
agent logs for adapter execution traces.
