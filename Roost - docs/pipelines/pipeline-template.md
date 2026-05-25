# Pipeline Template

Last updated: YYYY-MM-DD

## Purpose

Describe one end-to-end system flow through the real application layers.

## Trigger

- User/system trigger:
- Entry point:
- Actor and permission boundary:

## Flow

```text
trigger -> UI/API ingress -> application action -> API route -> service ->
data/event/side effect -> readback/projection -> UI/API response -> evidence
```

## Layer Map

| Layer | Files / records | Responsibility |
| --- | --- | --- |
| UI or ingress |  |  |
| Client action / adapter |  |  |
| API route / command |  |  |
| Service / domain function |  |  |
| Data model / persistence |  |  |
| Worker / event / side effect |  |  |
| Readback / projection |  |  |
| Tests |  |  |
| Docs / evidence |  |  |

## Failure Points

| Failure | Expected behavior | Evidence |
| --- | --- | --- |
| Validation failure | Safe error, no partial write. |  |
| Authorization failure | Fail closed. |  |
| Persistence failure | Transaction or retry behavior is explicit. |  |
| Provider/worker failure | Bounded retry or visible blocked state. |  |

## Current Status

- Code status:
- Proof status:
- Latest evidence:
- Known gaps:
- Next verification:

## Maintenance Rule

Update this pipeline when any linked route, function, data model, side effect,
or proof path changes.
