# CC-08-001 Assets Resource System Spec

Last updated: 2026-05-16

## Purpose

`08 Assets` is CompanyCore's organizational memory: files, documents, knowledge,
prompts, architecture, assets, repositories, and company materials. It must be
usable by humans through responsive web UI and by AI agents through API/MCP as
external clients.

This spec defines the first Assets board over existing Drive/resource/knowledge
foundations. It does not introduce a new storage provider or duplicate Google
Drive.

## Current Foundation

| Area | Current support | Source |
| --- | --- | --- |
| Google Drive index | Files/folders, selected-scope import, folder hierarchy metadata, content snapshots, descriptions, area scope. | `src/modules/google-drive/google-drive.routes.ts`, Google Drive integration modules, Prisma models |
| Resource table | Generic resource records with type, provider, external id, name, url, metadata, owner role, access level, project/process links, dependency links. | `prisma/schema.prisma` |
| Area knowledge view | Department knowledge depth panel filters Drive files/folders, descriptions, stale/review states, and knowledge records. | `web/src/main.tsx` |
| Data evidence browser | `/data` can show table records, operating-area ownership, and Drive/source evidence. | `web/src/main.tsx` |
| Agent compatibility | MCP/Google Drive read access and selected folder import are already production-proven in project state. | state docs/module confidence |

## Resource Type Standard

Use the owner target resource types as the user-facing taxonomy:

| Type | Examples | First source |
| --- | --- | --- |
| `document` | Google Docs, Word docs, PDFs | Drive file metadata/content snapshot |
| `markdown` | Obsidian or repo markdown | Drive/repository future adapter |
| `spreadsheet` | Google Sheets, Excel | Drive file metadata/content snapshot |
| `image` | Brand assets, screenshots | Drive file metadata |
| `video` | recordings, tutorials | Drive file metadata |
| `prompt` | agent prompts, reusable instructions | Resource record or markdown/doc |
| `architecture_doc` | architecture and ADR docs | repo docs/Drive |
| `repository` | GitHub/repo link | Resource record/future GitHub adapter |
| `api_reference` | API docs | Resource record/repo docs |
| `deployment_doc` | ops docs | repo docs/Drive |
| `knowledge_note` | Notion/Obsidian-like notes | Resource/Drive |
| `contract` | legal/commercial contract | Drive/Resource |
| `brand_asset` | logos, palettes, copy blocks | Drive/Resource |

## Assets Board V1

The first `08 Assets` board should answer:

- What knowledge is available now?
- Which folders/files are unassigned or stale?
- Which resources are ready for AI/API/MCP context?
- Which resources are linked to active tasks, projects, pipelines, clients, or agents?
- What needs owner cleanup before agents can rely on it?

### Desktop Layout

| Zone | Content |
| --- | --- |
| Header | Area name, health status, total resources, AI-ready count, unassigned/stale count. |
| Command toolbar | Refresh, scope filter, type filter, status filter, owner/department filter, search. |
| Folder/resource split | Folder tree or folder list on the left; resource table/list on the right. |
| Resource detail | Metadata, description/summary, source, relations, content snapshot status, AI readiness, blocked actions. |
| Knowledge graph preview | Small relation map or relation list using existing relation/graph direction. |

### Tablet Layout

- Two-panel layout: folder/resource list and detail drawer.
- Filters collapse into toolbar controls.
- Tables may remain horizontally scrollable for dense metadata.

### Mobile Layout

- Queue-first list: `Needs cleanup`, `AI-ready`, `Unassigned`, `Recently updated`.
- Folder tree opens as a drawer.
- Resource detail is a full-screen panel.
- Primary action is inspect/update metadata, not provider mutation.

## AI-Readiness Labels

| Label | Meaning |
| --- | --- |
| `not_indexed` | The resource exists but content/metadata is not available for context. |
| `metadata_ready` | Name, type, scope, owner, and description are available. |
| `content_ready` | Content snapshot or extracted text exists and is current enough. |
| `summary_ready` | A human/API-readable summary is available. |
| `relation_ready` | Links to tasks/projects/pipelines/clients/agents are available. |
| `ai_context_ready` | Minimum metadata, content/summary, visibility, and relations are safe for agent context. |

These labels describe compatibility for external AI clients. They do not mean
CompanyCore runs embedded AI.

## Blocked Actions

The first board must block or defer:

- autonomous deletion, move, share, or provider permission changes
- autonomous legal/commercial document edits
- unapproved sync scope expansion
- agent use of private/restricted resources without permission evidence
- provider writes outside existing Google Drive command contracts

## Agent Packet

The `08 Assets` read packet should expose:

- resource/folder identity and source
- type, department, visibility, status, tags
- current AI readiness label
- summary/description when available
- relations to tasks, projects, pipelines, clients, and agents when available
- allowed actions: read metadata, read content snapshot, inspect relations,
  propose metadata cleanup, propose task follow-up
- blocked actions: delete/move/share, edit contract, expand sync scope,
  execute provider writes without explicit command

## Next Runtime Task

`CC-08-002 Assets context read API` should create a protected read-only packet
over current Google Drive files, content snapshots, Resource records, operating
areas, and existing relation evidence. The first web task should consume that
packet with the shared `CcDataTable`, `CcStatePanel`, `CcBadge`, and
`CcToolbar` primitives.
