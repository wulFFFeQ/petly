# LOVED & KNOWN

Digitální péče o mazlíčky — React + TypeScript + Vite SPA.

**Status:** high-fidelity **DEMO** by default (browser localStorage / IndexedDB). Production backend target is **Node.js + PostgreSQL + Prisma** (`server/`). See [docs/NODE-PRISMA-BACKEND.md](docs/NODE-PRISMA-BACKEND.md).

## Scripts

```bash
npm install
npm run dev          # Vite SPA
npm run build
npm run lint
npm run preview
npm run test:assert
npm run test:e2e

# API (separate package)
cd server && npm install && npm run dev
```

## Environment

See [`.env.example`](.env.example) and [`server/.env.example`](server/.env.example).

- Client: `VITE_API_BASE_URL` (cookie sessions). Missing ⇒ DEMO + `PRODUCTION CONNECTION NOT CONFIGURED`.
- Server: `DATABASE_URL`, `SESSION_SECRET`, `ALLOWED_ORIGINS` — never `VITE_`.

## Hosting note

GitHub Pages is suitable for a labeled DEMO / marketing SPA only. Production requires the Node API + PostgreSQL (+ private object storage) on real hosting.
