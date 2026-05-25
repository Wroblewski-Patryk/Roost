# ACF-MAINT-001 - Large File Modularization

## Task Type

Maintainability refactor.

## Current Stage

Verification complete.

## Deliverable For This Stage

Extract the vanilla relationship workbench from `public/app.js` into a dedicated browser module without changing runtime behavior.

## Goal

Reduce the highest-risk owner-console hotspot incrementally so future UX and V2 shell work can change relationship UI behavior without editing the monolithic vanilla app file.

## Scope

- `public/app.js`
- `public/index.html`
- `public/relationship-workbench.js`
- source-of-truth task and confidence files

## Implementation Plan

1. Extract relationship graph/filter/render helpers from `public/app.js`.
2. Load the new browser module before `public/app.js`.
3. Wire `renderRelationshipCenter()` through the extracted workbench.
4. Run syntax, build, tests, and a relationship route smoke.
5. Update task board, module confidence, risk, and system health evidence.

## Acceptance Criteria

- `public/app.js` no longer owns the relationship workbench implementation.
- Relationship route behavior remains backed by the same state, filters, graph API data, and assignment controls.
- Build and tests pass.
- `/relationships` renders without console errors or failed requests.
- No API, auth, schema, or relationship graph contract changes are introduced.

## Definition of Done

- `node --check public/app.js` passes.
- `node --check public/relationship-workbench.js` passes.
- `npm run build` passes.
- `npm test` passes against disposable PostgreSQL.
- Browser smoke for `/relationships` passes.
- Source-of-truth docs and state files record the result and remaining hotspot risk.

## Result Report

Extracted the vanilla relationship workbench from `public/app.js` into
`public/relationship-workbench.js` and loaded it before `public/app.js` from
`public/index.html`.

The main vanilla app now delegates `renderRelationshipCenter()` to the extracted
workbench. `public/app.js` dropped from 6527 lines to 6224 lines, and the new
relationship workbench module is 353 lines.

Validation:

- `node --check public/app.js`: passed.
- `node --check public/relationship-workbench.js`: passed.
- `npm run build`: passed.
- `npm test`: passed against disposable PostgreSQL on `localhost:55464`.
- Playwright fallback on `http://127.0.0.1:3113/relationships`: passed,
  verifying the extracted module is loaded, relationship graph markers render,
  no horizontal overflow, no console issues, and no failed requests.
