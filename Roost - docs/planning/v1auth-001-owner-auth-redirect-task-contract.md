# V1AUTH-001 Owner Auth Redirect Flow

## Task Type

Implementation

## Current Stage

Post-release

## Deliverable For This Stage

Record the implemented owner-auth redirect repair, validation evidence, and
production rollout state.

## Goal

Make private owner web routes recover cleanly from missing or stale owner
sessions by redirecting users to login instead of showing a dead-end "sign in
again" panel or stale dashboard error.

## Scope

- `web/src/react-route-kit.tsx`
- `web/src/main.tsx`
- `public/app.js`
- `public/react/*` generated build assets
- Deployment and source-of-truth documentation

## Implementation Plan

1. Add a shared owner-login redirect helper that preserves the requested private
   route and clears invalid owner tokens.
2. Replace React signed-out panels on private routes with the shared redirect
   behavior.
3. Treat invalid API/session errors from dashboard bootstrap as signed-out
   session state instead of a dashboard load failure.
4. Align login/register post-auth navigation with the React shell by using a
   full-page redirect for React-owned routes.
5. Validate locally and in production with missing-session and stale-token
   browser proofs.

## Acceptance Criteria

- Missing owner session on `/` or `/dashboard` redirects to `/auth/login`.
- Stale or invalid `companycoreOwnerToken` is removed from local storage.
- Invalid-session dashboard bootstrap does not show the generic dashboard error
  panel.
- Login/register preserves the pending private route and opens React-owned
  routes through the React shell after authentication.
- Production health reports the deployed commit and public browser smoke proves
  the redirect behavior.

## Definition Of Done

- `npm run validate` passes.
- `git diff --check` passes before commit.
- Local Playwright proof covers missing-session or stale-token redirect.
- Production smoke covers public health, root assets, and signed-out/stale-token
  redirects.
- Project state, task board, system health, post-deploy smoke, and rollback
  pointer are updated.

## Result Report

- Status: done.
- Commit deployed: `c62d662`.
- Production image:
  `rnqqkhl3o3dut4qv56mlxly2_backend:c62d662`.
- Running production backend:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-c62d662`.
- Rollback backend retained stopped:
  `backend-rnqqkhl3o3dut4qv56mlxly2-manual-e69919b-previous-c62d662`.
- Validation:
  - `npm run validate`: passed.
  - `git diff --check`: passed before commit.
  - Local Playwright stale-token proof: redirected to `/auth/login`, preserved
    pending `/dashboard`, removed the invalid token, and did not render the
    dashboard load error.
  - Local Playwright post-login pending-route proof: authenticated login
    redirected to `/`, stored the owner token, loaded React root assets, and
    did not fall back to old public shell copy.
  - Production Playwright proof:
    `noSession.path="/auth/login"`, `noSession.pending="/"`,
    `staleResult.path="/auth/login"`, `staleResult.pending="/dashboard"`,
    `staleResult.token=null`, and `dashboardError=false`.

