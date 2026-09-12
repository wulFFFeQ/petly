# LOVED & KNOWN

Digitální péče o mazlíčky — React + TypeScript + Vite SPA.

**Status:** high-fidelity **DEMO** by default (browser localStorage / IndexedDB). LAUNCH 02 Supabase foundation is in-repo; live connection requires credentials. See [docs/LAUNCH-READINESS-AUDIT.md](docs/LAUNCH-READINESS-AUDIT.md), [docs/LAUNCH-02-BACKEND-MIGRATION.md](docs/LAUNCH-02-BACKEND-MIGRATION.md), [docs/LAUNCH-02-STATUS.md](docs/LAUNCH-02-STATUS.md).

## Scripts

```bash
npm install
npm run dev          # Vite dev server
npm run build        # tsc -b && vite build
npm run lint         # oxlint
npm run preview      # preview production build
npm run test:assert  # domain assert scripts (scripts/assert-*.mts)
npm run test:e2e     # Playwright e2e (requires running app + BASE_URL)
```

### Assert tests

```bash
npm run test:assert
# or one file:
npx tsx scripts/assert-security-context.mts
npx tsx scripts/assert-launch02-backend.mts
```

### E2E prerequisites

1. `npx playwright install` (first time)
2. Start the app: `npm run dev`
3. Run: `npm run test:e2e` (default `BASE_URL=http://localhost:5173`)

## Environment

See [`.env.example`](.env.example). Public: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Server-only (never `VITE_`): `SUPABASE_SERVICE_ROLE_KEY`. Missing client env ⇒ DEMO + `PRODUCTION CONNECTION NOT CONFIGURED`.

## Hosting note

GitHub Pages is suitable for a labeled DEMO / marketing SPA only. Do not run production multi-user data on Pages. Production requires Supabase + Edge Functions (LAUNCH 02+) on real hosting.