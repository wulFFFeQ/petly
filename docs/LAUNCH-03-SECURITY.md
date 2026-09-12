# LAUNCH 03 — Hosting security & rate-limit gaps

## CORS
Edge Functions use `ALLOWED_ORIGINS` (comma-separated). Default: `http://localhost:5173`.
**No wildcard** `Access-Control-Allow-Origin: *` for authenticated APIs.

## Headers (hosting checklist — apply on reverse proxy / CDN)
- HTTPS only (HSTS)
- `Content-Security-Policy` — restrict script/connect to app + Supabase origins
- `X-Frame-Options: DENY` / CSP `frame-ancestors 'none'`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Content-Type-Options: nosniff`

GitHub Pages remains DEMO/marketing only — not production app hosting.

## CSRF
SPA uses Bearer JWT in `Authorization` (not cookie session for API). Classic cookie CSRF is lower risk.
If cookie-based auth is added later, require CSRF tokens / SameSite.

## Rate limiting — PRODUCTION GAP
Supabase Edge Functions do **not** provide production-grade per-IP rate limits out of the box.
Sensitive surfaces: auth abuse, public token lookup, message/booking create, document upload, emergency/public.

**Not faked.** Requires external gateway (Cloudflare / API gateway / Upstash) — deferred.
Documented as remaining blocker for public production traffic.

## Secrets
- Client: only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Server: `SUPABASE_SERVICE_ROLE_KEY` only in Edge runtime
- Bundle assert: `scripts/assert-launch03-cutover.mts` checks built assets for service_role leakage patterns
