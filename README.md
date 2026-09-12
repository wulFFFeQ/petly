# LOVED & KNOWN

Digitální péče o mazlíčky — React + TypeScript + Vite SPA.

**Status:** high-fidelity **DEMO** (browser localStorage / IndexedDB). Not a production multi-user backend. See [docs/LAUNCH-READINESS-AUDIT.md](docs/LAUNCH-READINESS-AUDIT.md).

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
```

### E2E prerequisites

1. `npx playwright install` (first time)
2. Start the app: `npm run dev`
3. Run: `npm run test:e2e` (default `BASE_URL=http://localhost:5173`)

## Environment

See [`.env.example`](.env.example). No secrets in the client. Server-only variables are documented for LAUNCH 02.

## Hosting note

GitHub Pages is suitable for a labeled DEMO / marketing SPA only. Production multi-user data requires a real auth + API + database stack (LAUNCH 02).
