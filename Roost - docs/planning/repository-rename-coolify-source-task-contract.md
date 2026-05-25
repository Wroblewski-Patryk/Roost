# Repository Rename And Coolify Source Task Contract

Last updated: 2026-05-24

## Task Type

Operations / source-control configuration

## Current Stage

Verification

## Deliverable For This Stage

Confirm that local Git and Coolify both point at the renamed GitHub repository.

## Goal

Update project source references after the GitHub repository rename from
`Wroblewski-Patryk/companycore` to `Wroblewski-Patryk/Roost`.

## Scope

- Local Git remote `origin`.
- Coolify application source for project `LuckySparrow`, production
  application `Roost`.
- Operations and project-state documentation that records current repository
  truth.

## Implementation Plan

1. Verify the local Git remote and update it to the renamed repository.
2. Confirm the new remote can read branch `main`.
3. Sign in to Coolify, switch to the `LuckySparrow` team, find the `Roost`
   application, and inspect `Git Source`.
4. Update only the repository field to `Wroblewski-Patryk/Roost`, preserving
   branch `main` and commit selector `HEAD`.
5. Refresh project state and operations documentation.

## Acceptance Criteria

- `git remote -v` uses `https://github.com/Wroblewski-Patryk/Roost.git`.
- `git ls-remote --heads origin main` returns the `main` branch.
- Coolify `Roost -> Git Source` shows repository
  `Wroblewski-Patryk/Roost`, branch `main`, commit selector `HEAD`.
- No manual redeploy is triggered during the rename checkpoint.
- Sensitive credentials are not copied into repository files.

## Definition Of Done

- Local and Coolify source configuration verified.
- Current source-of-truth docs updated.
- Diff hygiene check completed.
- Coolify webhook/build metadata proof completed after the next push.

## Result Report

- Local `origin` was updated to
  `https://github.com/Wroblewski-Patryk/Roost.git`.
- `git ls-remote --heads origin main` returned
  `1b9414e674e2dd76eca0fa6045ac4ce94d23259c refs/heads/main`.
- Coolify was checked under the `LuckySparrow` team. The `Roost` application
  Git Source was changed from `Wroblewski-Patryk/companycore` to
  `Wroblewski-Patryk/Roost`, keeping branch `main` and commit selector `HEAD`.
- A fresh Coolify readback confirmed the updated repository value.
- No manual redeploy was triggered.
- `git diff --check` completed with only existing line-ending warnings.
- The next normal push to `main` triggered a Coolify deployment for `Roost`.
  During rollout, public health briefly returned `503`, then recovered.
  `https://api.roost.luckysparrow.ch/health` returned `status: ok` with
  build commit `c5b9aca6d5470060344b8f83a4d3e020f24cc6b7`.
