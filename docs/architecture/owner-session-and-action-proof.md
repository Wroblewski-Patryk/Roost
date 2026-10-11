# Owner session and exact-action proof

G10 implements RF-SEC-013 without changing the ordinary browser persistence decision reserved by OPEN-AUTH-001.

## Normal human session

Login, registration and invitation acceptance issue the existing signed bearer token. It expires after 12 hours and the owner console keeps it in `sessionStorage`. Selecting or creating a workspace issues a token for that workspace while carrying forward the original password-authentication time and the current user authentication version. A normal read does not require authentication within the last five minutes.

Every human bearer request verifies the signature, expiry, live workspace membership, current `users.auth_version`, and the session hash against `auth_session_revocations`. Login starts a random session ID, and workspace selection retains it across newly minted tokens. `POST /v1/auth/logout` records its SHA-256 hash before the browser clears the token, invalidating every workspace token from that session. A password change increments `auth_version`, invalidating all previously issued user tokens, and returns a new token to the current browser. Existing v1 tokens without a version are treated as version zero. For a legacy token without a session ID, the token hash becomes the session ID carried across a workspace switch. Neither token nor password is stored in the revocation table.

If logout cannot reach the server, the console leaves the session available and shows an error. Clearing local storage alone is not reported as server revocation.

## Sensitive action reauthentication

A human owner or admin whose ordinary bearer session is still valid may call `POST /v1/auth/reauth` with a password and the prepared action's POST method, exact allowlisted path and SHA-256 digest of its JSON body. The endpoint returns a random one-use proof valid for 90 seconds. The browser keeps the proof only for the immediate retry; it is never stored in `sessionStorage`. The database stores only its SHA-256 hash, original bearer hash, actor, workspace, method, path, body digest, authentication time, expiry and use time.

The protected-request middleware atomically consumes a matching unused proof before forwarding the request. A different token, actor, workspace, method, path or body, an expired proof and a replay fail. On a match it exposes the new password-authentication time for that request alone. It does not refresh the ordinary bearer token, extend its lifetime, or override the operation's own approval, expected version, request ID, permission or expiry checks. Existing fresh-owner rules remain in the service layer. A credential command with a stale authentication time now returns `owner_reauth_required` before any write.

Expired proof rows are removed when a new proof is issued. Revoked-session rows are retained; the current runtime does not automatically prune them. This also keeps a token minted by a request that was already in flight at logout revoked. A later retention policy must account for that race before deleting revocation rows.

The Agent identities editor keeps the exact serialized body and request ID when it receives `owner_reauth_required`. It freezes the prepared fields, asks for the password, and submits that one body with the proof. A transport retry keeps the same request ID, and the credential service's durable idempotency record prevents a second write or a second disclosure of the secret.

API keys, bound agent identities, MCP and Worker credentials do not carry a human bearer session. They cannot call reauthentication successfully or present a usable action proof. A session or proof never substitutes for the separately scoped task, release, ticket or worker authority.
