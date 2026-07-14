# LUC-1007 Google Drive Route Readback

## Purpose

Provide the smallest durable documentation link for the protected
`src/app.ts#/google-drive` mount after the focused proof packet verified the
existing route family. This readback records the route chain without adding new
runtime behavior or provider-side activity.

## Route Chain

- `src/app.ts` mounts `googleDriveRouter` at protected path `/google-drive`.
- `src/modules/google-drive/google-drive.routes.ts` serves the mounted route
  family under `/v1/google-drive` in the protected API flow.

## Mounted Endpoints

- `GET /v1/google-drive/files`
- `GET /v1/google-drive/files/:id/content`
- `PATCH /v1/google-drive/files/:id/scope`
- `PATCH /v1/google-drive/files/:id/description`
- `PATCH /v1/google-drive/files/:id/text-content`
- `POST /v1/google-drive/docs`
- `PATCH /v1/google-drive/docs/:id`
- `POST /v1/google-drive/sheets`
- `PUT /v1/google-drive/sheets/:id/values`

## Proof Pairing

- Proof artifact: `docs/planning/luc-1007-google-drive-route-proof.md`
- Executed local verification: `npm run test:api:local`
- Exercised implementation surface: `src/tests/api.test.ts` `CompanyCore v1
  protected API flow`

## Result

The `/google-drive` protected app mount now has both:

- focused local proof evidence via the paired `test` artifact
- focused route readback evidence via this `document` artifact
