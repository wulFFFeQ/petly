# LAUNCH 03 STATUS

## SUPABASE PRODUCTION PATH — ABANDONED

Do **not** configure Supabase Auth / PostgREST / Edge Functions / Prisma-via-Supabase as production.

Cutover target: **Node.js server API + PostgreSQL + Prisma** (`docs/NODE-PRISMA-BACKEND.md`).

| Previous (frozen) | Replacement |
|-------------------|-------------|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | `VITE_API_BASE_URL` |
| Supabase Auth JWT | HTTP-only cookie sessions |
| Edge Functions | Fastify `/api/*` routes |
| Supabase Storage | S3-compatible private bucket + signed URLs |
| `auth.users` FK | Application-owned `accounts` + `credentials` |

## ENVIRONMENT
- `PRODUCTION CONNECTION NOT CONFIGURED` until client API base URL and server DB are set
- Missing client env ⇒ DEMO path (unchanged honesty rule)
- No fake production infrastructure; no live cloud credentials required for foundation work

## DEFERRED (unchanged)
- Stripe live / Connect
- Push / email / SMS
- Malware scanner (document upload stays disabled until configured)
- Auto DEMO localStorage → DB clinical import
- finalize/sign/admin clinical flows

## FINAL VERDICT

**Supabase cutover cancelled.** Proceed with Node + Prisma backend only.
