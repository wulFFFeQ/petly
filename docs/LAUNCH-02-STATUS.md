# LAUNCH 02 STATUS

## BACKEND
- provider: **ABANDONED — Supabase production path frozen**
- target: Node.js API + PostgreSQL + Prisma (see `docs/NODE-PRISMA-BACKEND.md`)
- environment: `PRODUCTION CONNECTION NOT CONFIGURED` until `VITE_API_BASE_URL` + server `DATABASE_URL` are present
- `supabase/` tree is historical reference only — do not extend Edge Functions or Supabase migrations

## AUTH
- previous: Supabase Auth (`accounts.id = auth.users.id`) — **stopped**
- target: HTTP-only cookie sessions + `credentials` / `sessions` tables; application-owned `accounts.id`

## DATABASE
- previous: Supabase SQL migrations (historical under `supabase/migrations/`)
- target: Prisma Migrate under `server/prisma/`

## SERVER AUTHORITY
- previous: Deno Edge Functions — **frozen / not extended**
- target: Fastify routes under `server/src/routes/` with K47 `authorize()`

## FINAL VERDICT

**SUPERSEDED** — production backend is Node + PostgreSQL + Prisma. Supabase is not the production architecture.
