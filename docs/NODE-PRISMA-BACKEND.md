# Node + PostgreSQL + Prisma backend

**Product:** LOVED & KNOWN  
**Rule:** Existing TypeScript domain + K47–K63 contracts are SSOT. No parallel models / authorize systems.

## Architecture

```
Browser ──cookie──► Node API (Fastify)
Node API ──authorize()──► PostgreSQL (Prisma)
Node API ──after authorize──► Private S3-compatible storage (docs)
```

- Missing `VITE_API_BASE_URL` ⇒ DEMO (localStorage / IndexedDB).
- Never invent a fake backend. Never put server secrets behind `VITE_`.
- `accounts.id` is application-owned UUID (not Supabase `auth.users`).

## Local server

```bash
cd server
cp .env.example .env   # set DATABASE_URL, SESSION_SECRET, ALLOWED_ORIGINS
npm install
npx prisma migrate dev
npm run dev
```

Client: set `VITE_API_BASE_URL=http://localhost:3001` in `.env.local`.

## Auth

- Register/login/logout → `credentials` + `sessions` tables
- Cookie: HTTP-only, SameSite=Lax, path `/`
- Trusted actor from session only; body `actorId` ignored / forged claims rejected

## Object storage

- Private bucket; signed upload/download after `authorize`
- Upload remains **disabled** until malware scanner is configured (`MALWARE_SCAN_PROVIDER`)

## Supabase

Historical only under `supabase/`. Do not deploy or extend for production.
