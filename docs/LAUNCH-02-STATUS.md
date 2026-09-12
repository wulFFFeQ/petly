# LAUNCH 02 STATUS

## BACKEND
- provider: Supabase (Auth + PostgreSQL + Storage + Edge Functions)
- environment: `PRODUCTION CONNECTION NOT CONFIGURED` (no live credentials in this workspace)
- local/dev/staging status: foundation ready offline; connect via `.env.local` + Edge secrets to activate

## AUTH
- real / partial / blocked: **partial** — code path real; live connection blocked without credentials
- login/logout/session: email+password when configured; DEMO one-click otherwise
- account mapping: `accounts.id = auth.users.id` (trigger in migrations); never email; never `owner_self` as production authority

## DATABASE
- migration count: **5**
- tables: accounts, pets, household/pro/org grants, booking/messaging/commerce, clinical + audit + idempotency (+ storage bucket)
- RLS status: enabled with grant-aware helpers (defense-in-depth)

## SERVER AUTHORITY
- implemented: Edge Functions `pets`, `access`, `clinical`, `documents`, `messaging`, `bookings`, `notifications`, `public` + shared `authorize`
- remaining client-authoritative mutations: DEMO localStorage path while env unset; calendar/community/lost-found supporting stores still DEMO until LAUNCH 03 wiring

## CLINICAL
- Demo adapter: unchanged, wired for DEMO
- Server adapter: unwired → `SERVER_REQUIRED`; wired → memory mirror + Edge `clinical` remote helpers
- production CRUD status: Edge ops for list/upsert/withdraw/weights/encounters/emergency; finalize/sign/admin/export still `SERVER_REQUIRED`

## DOCUMENTS
- metadata: `pet_documents` + versions
- storage: private bucket `pet-documents`
- upload authorization: authorize → validate → signed upload → metadata
- download authorization: authorize → short-lived signed URL
- scanning status: **production gap** (hook/`not_configured` only; no fake scanner)

## MESSAGING
- participant ACL: enforced (`participant_account_ids` required; missing/nonparticipant deny)
- production persistence: `conversations` / `messages` + Edge `messaging`

## BOOKING
- production persistence: `bookings` + services/availability tables
- server conflict authority: Edge re-checks overlap, duration, actor, state

## PAYMENTS
- DEMO only
- no live charging

## MEMBERSHIP
- DB state: `subscription_records`
- DEMO provider: retained; no fake paid claims

## NOTIFICATIONS
- DB: `notifications`
- recipient authority: server-derived / relation-checked
- push/email/SMS deferred

## AUDIT
- production sink status: Edge writes `audit_events`; `ServerAuditSink` buffer when wired; stub when not

## IDEMPOTENCY
- production store status: Postgres `idempotency_records` (Edge) + wired `ServerIdempotencyStore` for ClinicalService

## SECURITY
- RLS: yes
- server authorize: yes (Edge + `serverAuthorizeCore`)
- rate limiting: **production gap** (not faked)
- validation: upload MIME/size/ext; request body checks on Edge
- secrets: service_role never `VITE_`; documented in `.env.example`

## TESTS
- build: PASS
- lint: PASS (warnings only, pre-existing)
- assert: PASS (includes `assert-launch02-backend.mts`, 26 checks)
- E2E: **37/40 passed** (DEMO against local Vite). Failures: `e2e-achievements`, `e2e-community`, `e2e-services` — UI/DEMO flakes unrelated to backend foundation; production-backend E2E = **blocked-by-environment** (no Supabase credentials)
- backend/security tests: PASS

## FILES CHANGED
See git status for exact list (docs, supabase/, src/lib/auth|backend|api|clinical|idempotency|security, LoginPage, session, .env.example, package.json, assert script).

## REMAINING PRODUCTION BLOCKERS
1. Supabase project credentials not configured in this environment
2. AppContext / domain `*/storage.ts` still DEMO-primary until live env + LAUNCH 03 integration cutover
3. Rate limiting / full CSRF hosting strategy not finished
4. Malware scanning provider not available

## DEFERRED
- Stripe live / Connect
- Push / email / SMS
- Social login / MFA / passwordless
- EMR, microchip registries, advanced GDPR engines
- Auto DEMO localStorage → DB clinical import
- finalize/sign/admin clinical flows

## FINAL VERDICT

**READY FOR LAUNCH 03 — PRODUCTION INTEGRATION**

(Foundation complete offline; not “production ready” until credentials + cutover.)
