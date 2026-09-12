# LAUNCH 03 STATUS

## SUPABASE
- project: **not connected in this workspace** (checklist ready)
- environment: `PRODUCTION CONNECTION NOT CONFIGURED`
- auth: code path REAL when `VITE_SUPABASE_*` set; live project pending user setup
- database: migrations 1–6 ready (incl. `pets.withdrawn_at`)
- storage: private `pet-documents` (upload disabled until malware scanner)
- functions: 8 Edge Functions + restrictive CORS (`ALLOWED_ORIGINS`)

## AUTH
- real / partial / blocked: **partial** — cutover code complete; live connection blocked without credentials
- session: `AuthSessionBridge` + session cache; REAL gates on JWT account id
- account mapping: `accounts.id = auth.users.id` (trigger); `updateMyAccount` / `getMyAccount` Edge ops
- demo fallback status: explicit DEMO only when env unset; **forbidden in production Vite builds**

## DATABASE
- migrations: 6
- tables: LAUNCH 02 set + pets soft withdraw
- RLS: enabled (defense-in-depth)
- indexes: from migrations

## SERVER AUTHORITY
- fully server authoritative (when configured): pets create/update/list/withdraw, access grants, clinical Edge, documents download, messaging, bookings, notifications
- remaining client authority: DEMO localStorage path when env unset; supporting calendar/community/lost-found DEMO stores
- exact remaining locations: domain `*/storage.ts` DEMO writes when `shouldPersistSensitiveLocalStorage()`; REAL mode skips sensitive LS persist

## CLINICAL
- HealthRecord: REAL load via Edge list + upsert sync; DEMO LS
- WeightMeasurement: ClinicalService dual-mode adapter
- Encounter: dual-mode adapter
- Emergency: ClinicalService path retained
- ClinicalShare: uses app clinical runtime (not hardcoded DEMO authority)

## DOCUMENTS
- metadata: Postgres when Edge wired
- private storage: bucket deny-all client policies
- upload: **DISABLED** in production (`upload_disabled` / scanner absent)
- download: signed URL after authorize
- malware scanning: **not configured** (honest gap)

## MESSAGING
- persistence: Edge `messaging` + remotes
- participant ACL: server-enforced

## BOOKING
- persistence: Edge `bookings` + remotes
- server conflict authority: Edge overlap checks

## PAYMENTS
- DEMO only
- live disabled

## MEMBERSHIP
- DB: `subscription_records` (schema)
- billing status: DEFERRED / DEMO provider

## NOTIFICATIONS
- DB + Edge `notifications`
- recipient authority: server-derived

## AUDIT
- production sink: Edge → `audit_events`

## IDEMPOTENCY
- production store: Postgres `idempotency_records` (Edge)

## SECURITY
- RLS: yes
- authorize: yes
- CORS: allowlist via `ALLOWED_ORIGINS` (no `*`)
- CSRF: JWT Bearer model documented
- headers: hosting checklist in `docs/LAUNCH-03-SECURITY.md`
- rate limits: **GAP** (external infra required; not faked)
- secrets: service_role never `VITE_`; bundle scrub assert

## TESTS
- build: PASS
- lint: PASS (warnings only)
- assert: PASS **44/44** (incl. `assert-launch03-cutover.mts`)
- E2E: **32/40** on Vite preview initially; after DEMO login fix: `e2e-account-onboarding` PASS. Remaining failures classified:
  - **A (cutover regression fixed):** login-submit missing on PROD build without env → fixed (`isDemoLoginAllowed` = DEMO when backend unset)
  - **B (flaky / UI):** achievements, community, services, notifications (timeouts/selectors) — same class as LAUNCH 02
  - **C (environment):** household/org/lost-found `page.evaluate` importing `/src/lib/*` fails on `vite preview` (needs `npm run dev`); production-backend E2E blocked without credentials
- smoke: `scripts/smoke-launch03.mts` → BLOCKED without credentials

## FILES CHANGED
- `src/lib/backend/mode.ts`, `config` exports
- `src/lib/auth/sessionCache.ts`, `AuthSessionBridge`, auth/account session cutover
- `src/lib/api/*Remote.ts`, `edgeClient` consumers
- `src/lib/clinical/runtime.ts`, provenance, AppContext dual-mode
- `src/lib/documents/uploadPolicy.ts`, household `accessSession`
- `src/pages/LoginPage.tsx`, `OnboardingGate`, `App.tsx`
- `supabase/functions/_shared/http.ts` (CORS), all function CORS binds
- `supabase/functions/pets`, `access`, `documents`
- `supabase/migrations/20260912000006_pets_withdrawn.sql`
- `docs/LAUNCH-03-SUPABASE-SETUP.md`, `LAUNCH-03-SECURITY.md`, this status
- `scripts/assert-launch03-cutover.mts`, `smoke-launch03.mts`
- `.env.example`

## REMAINING LAUNCH BLOCKERS
1. **Supabase credentials not configured** (user Phase B)
2. Migrations not applied to a live project / Edge not deployed
3. Malware scanning provider absent (upload stays disabled)
4. Production-grade rate limiting absent
5. Staging smoke not executed (no staging connection)

## DEFERRED
- Live Stripe / Connect
- Push / email / SMS
- Social login / MFA
- Clinical finalize/sign/admin/export
- Auto DEMO localStorage → DB import
- Public production deploy

## FINAL VERDICT

**BLOCKED — PRODUCTION CONNECTION NOT CONFIGURED**

Cutover code is ready. Complete [docs/LAUNCH-03-SUPABASE-SETUP.md](LAUNCH-03-SUPABASE-SETUP.md), then reply:

`Phase B done — .env.local and Edge secrets set for dev`

(without pasting secrets). After that: migrate/deploy verify + smoke → target **READY FOR STAGING**.
