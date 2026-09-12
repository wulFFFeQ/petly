# Production security notes (Node API)

## CORS

Server uses `ALLOWED_ORIGINS` (comma-separated). Default: `http://localhost:5173`.
Credentials (cookies) are enabled; never use `Access-Control-Allow-Origin: *` with credentials.

## CSRF

Cookie sessions use `SameSite=Lax`. Origin allowlist is required for cross-site POSTs.

## Rate limiting

**Production gap** — not faked. Add reverse-proxy / WAF limits before public launch.

## Secrets

- Client: only `VITE_API_BASE_URL`
- Server: `DATABASE_URL`, `SESSION_SECRET`, optional `S3_*` — never `VITE_`
- Bundle assert checks built assets for accidental secret patterns

## Document upload

Disabled until `MALWARE_SCAN_PROVIDER` is configured (`upload_disabled` / `not_configured`).
