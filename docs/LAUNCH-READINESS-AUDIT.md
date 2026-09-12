# LAUNCH READINESS AUDIT

**Product:** LOVED & KNOWN  
**Scope:** Read-only / audit-first. No feature implementation, no K64, no new architecture.  
**Source of truth:** Codebase (conflicts with docs are reported).  
**Audit date:** 2026-09-12  

---

## EXECUTIVE VERDICT

**LAUNCH STATUS: RED**

**SHORT VERDICT:** LOVED & KNOWN is a mature **browser-only DEMO product** with strong domain contracts (`authorize()`, ClinicalService, privacy allowlists, honest payment stubs) and extensive assert scripts — but it has **no production backend, no real authentication, no database, no object storage, and a failing production build**. Shipping this as a production app that stores real pet/clinical/household data would be unsafe. A clearly labeled public DEMO showcase is a different decision; even that is currently blocked by `tsc` build failure on deploy.

**Product default used in this audit:** payments/membership charging = **post-launch** (disable or keep DEMO-labeled until Stripe + webhooks). Clinical records, documents, messaging, bookings, emergency/L&F with real multi-user data = **server-required before production**.

---

## P0 — LAUNCH BLOCKERS

1. **No production authentication** — session is `localStorage` flag `lovedandknown.sessionActive`; identity fixed `owner_self`; one-click login (`src/lib/account/session.ts`, `src/pages/LoginPage.tsx`). Missing key = logged in.
2. **No backend / server authority** — no API server, no HTTP auth, no transactional authority. Client is the authority for all sensitive mutations.
3. **No production database** — all domain state in `localStorage` (+ document blobs in IndexedDB). TypeScript models ≠ DB.
4. **Authorization unenforceable in production** — `authorize()` / `SecurityContext` are excellent DEMO contracts (`authority: 'demo'`) but grants/pets/roles are client-writable; DevTools bypasses everything.
5. **Clinical / documents / emergency as real-user data** — HealthRecord, PetDocument (IDB), EmergencyCard, shares persist only in-browser; no private object storage, no signed URLs, no tamper-proof audit.
6. **Production build fails** — `npm run build` (`tsc -b && vite build`) exits **2** with many TS errors (toast `"error"`, `payment_pending` gaps, `authorize` never types, unused vars, etc.). GitHub Pages workflow runs the same build → deploy blocked.
7. **No secrets/env separation for real providers** — no `.env.example`; Stripe/server secrets designed but live path forced to DEMO (`src/lib/payments/config.ts` — `isPaymentProviderActive() === false`).

---

## P1 — BEFORE LAUNCH RECOMMENDED

1. Remove/correct **false production claims** (Help/Settings “šifrované”, SupportWidget “Zpráva odeslána”, Sidebar fake badge counts).
2. Add **Privacy Policy + Terms** routes and footer links (legal review still required).
3. Fix **messaging legacy ACL hole** — conversations without `participantAccountIds` open for non-professional contact types (`src/lib/messaging/conversations.ts`).
4. Close clinical UI soft-bypasses (blob-before-auth, medication auto-complete without ClinicalService, dual emergency helpers).
5. **CSP / security headers / robots / sitemap / meta** for public hosting.
6. Minimal **error tracking + uptime** once a server exists.
7. GDPR **export/erase** technical engines (currently `SERVER_REQUIRED` / docs-only).
8. Align incomplete call sites to `authorize()` (AppContext L&F/emergency still mixed helpers).
9. Modal **focus trap** / a11y basics for critical dialogs.

---

## P2 — POST-LAUNCH

- Real push/email/SMS notifications
- Live Stripe Connect + membership billing
- Weight measurement versioning/withdraw; Emergency Card history
- EMR / institutional clinic workflows
- Admin/moderation beyond report sinks
- Performance (virtualization, image CDN), deep a11y suite
- Community depth, concierge backend, microchip live registries

---

## APPLICATION INVENTORY

| Item | Reality |
|------|---------|
| Framework | React 19 + React Router 7 + Vite 8 + Tailwind 4 + TypeScript ~6 |
| Package manager | npm (`package-lock.json`) |
| Deploy | GitHub Pages (`.github/workflows/deploy.yml`), base `/petly/` when `GITHUB_PAGES=true` |
| Docker / real API / Prisma / Stripe SDK | **Absent** |
| Context | Single `AppProvider` (`src/context/AppContext.tsx`) |
| Domains in `src/lib/` | account, clinical, security, booking, payments, messaging, notifications, organization, professional, household, privacy, lost/found, emergency, membership, verification, … |
| Persistence | `lovedandknown.*` localStorage + IndexedDB `lovedandknown-documents` |
| Tests | **42** `scripts/assert-*.mts`, **40** `scripts/e2e-*.mjs` (not wired into `package.json` scripts) |
| Docs | K40–K63 (no K42/K44); README still Vite template |

**Implemented (DEMO):** full consumer + professional UX, clinical vertical K47–K63 contracts, org membership + org pet access, booking lifecycle, DEMO payments, in-app notifications, public discover/L&F/emergency projections.

**Server-ready stubs:** Clinical/Audit/Idempotency server adapters → `SERVER_REQUIRED`; Stripe Connect class → `not_implemented`.

**Dead/orphan risks:** legacy `buildHealthShareMessage`; unused `clinical.withdraw` action path; K40 doc claims org as stub (**stale vs current code**).

---

## ROUTES

From `src/App.tsx`:

**Public (no OnboardingGate):** `/found/:token`, `/lost/:token`, `/pet/:slug/emergency`, `/login`, `/onboarding`

**Consumer (gated):** `/`, `/pets`, `/pets/:petId`, `/discover`, `/discover/:petId`, `/owners/:ownerId`, `/professionals`, `/professionals/:id`, `/professionals/:id/pets/:petId`, `/community`, `/health`, `/calendar`, `/bookings`, `/bookings/:id`, `/messages`, `/travel`, `/contacts`, `/concierge`, `/settings`, `/organization-invitations`, `/membership`, `/payment/success|cancel`, `/help`

**Professional (ProfessionalGate = role UX only):** `/professional/*` (pets, access, bookings, messages, services, availability, booking-rules, payments, organizations, calendar, records, profile)

**Guards:** SPA-only; no server middleware. Invalid IDs handled in pages (client data). Deep links exist; authorization is library-level, not network-level.

---

## AUTHENTICATION

**Status: DEMO — P0 for production**

- Login: one-click `loginSelfSession()` → sets LS flag
- Logout: clears flag + UI workspace; data remains
- No password/OAuth/JWT/HttpOnly cookies/refresh/revocation
- Actor always `owner_self`
- Policy correctly rejects forged *claim* vs session actor — but session itself is forgeable

---

## AUTHORIZATION

**Policy design: PARTIAL / strong contracts | Enforcement: DEMO-only**

- Central: `authorize()` (`src/lib/security/authorize.ts`) + adapters (owner/HH/pro/org/booking/payment/messaging)
- Role ≠ permission ≠ grant (enforced in design + asserts — 27/27 security-context asserts pass)
- **Production gap:** all grants in LS; incomplete migration of every mutation to `authorize()`; ProfessionalGate is UX not ACL

---

## CLINICAL

| SSOT | Status |
|------|--------|
| HealthRecord | DEMO via ClinicalService |
| WeightMeasurement | DEMO create/list (no versioning/withdraw) |
| PetDocument | DEMO + IDB blobs |
| Encounter | Context container DEMO |
| EmergencyCard | Pet field; `clinical.emergency.write` path |
| AuditEvent | DEMO sink; server sink no-op |
| ClinicalShare | Messages attachment workflow (not separate ACL DB) |

Permissions vocabulary exists; finalize/sign/admin/export → `SERVER_REQUIRED`. Soft withdraw uses typed `*.write`, not `clinical.withdraw`. Docs K60–K63 largely match code.

---

## DEMO VS PRODUCTION

| Surface | Class |
|---------|--------|
| localStorage pets/grants/clinical/booking/messages | **PRODUCTION BLOCKER** if real multi-user data |
| IndexedDB document blobs | **PRODUCTION BLOCKER** for document launch feature |
| DemoPaymentProvider / DemoSubscriptionProvider | **SAFE TO DEMO** (never fake `paid`) |
| Stripe Connect stub | **SAFE TO DEMO** / missing for real money |
| DEMO session | **PRODUCTION BLOCKER** |
| Privacy allowlist projectors | **SAFE** as client hygiene; not a substitute for server |
| GitHub Pages static hosting | **SAFE** for labeled demo site only |

---

## BACKEND

**BACKEND: NOT PRESENT**

Needed before production: authenticated API, server `authorize()`, persistence adapters replacing DEMO, idempotency store, webhook endpoints, file upload auth, notification fan-out, rate limits.

---

## DATABASE

**DATABASE: NOT PRESENT**

No schema/migrations/indexes/FKs/tenant isolation/backups. Frontend TypeScript types only.

---

## SERVER AUTHORITY

All listed sensitive ops (account, ownership, HH/pro/org, clinical, docs, shares, emergency write, bookings, payments, membership, notifications, messages) are **client-authoritative today**. Client must be treated as untrusted for launch.

---

## DOCUMENT STORAGE

**DEMO only:** metadata LS + blobs IDB; `URL.createObjectURL`; no private bucket, no server signed URLs, no malware scan, no retention engine.

**If documents are a launch feature for real users → P0.** If documents stay demo-only / disabled → defer.

---

## PAYMENTS

Honest DEMO: never charges; never invents checkout URLs; success page does not set `paid`; `isPaymentProviderActive() === false`.

**Audit decision: payments = post-launch (B).** For first production: disable charging UI or keep clearly DEMO-labeled; real Stripe + webhooks + Connect = later P0 when money goes live.

---

## BOOKING

DEMO localStorage. Lifecycle UX exists (create, confirm/decline, cancel, reschedule, complete, no-show). Manual confirm only; slot/conflict math browser-local; timezone is browser-local in DEMO. Payment on booking uses Demo provider. Reminders draft-only (`delivered: false`).

---

## MESSAGING

DEMO localStorage. Participant ACL for booking/pro threads. **Legacy hole:** conversations without `participantAccountIds` stay open for non-professional contact types (`canAccessConversation`). `bookingId` alone does not grant access. Clinical share uses safe projection + participant check (still client-side).

---

## NOTIFICATIONS

In-app `AppNotification` only (localStorage). No FCM/email/SMS. Builders sanitize payment/messaging payloads. No server recipient authority. Push/email/SMS = deferred (P2) once in-app authorization is server-backed.

---

## PROFESSIONAL

Profiles, catalog, services, availability, bookings, access grants, public projection — DEMO localStorage. Dashboard gate = role UX only (`canAccessProfessionalDashboard`). Pet data still needs grant via `authorize`. DEMO verification never qualifies as a real verified badge.

---

## ORGANIZATION

Models + DEMO storage implemented (membership, owner/admin/member, OrganizationPetAccess, last-owner protection patterns). Membership alone does not grant clinical access. Cross-org isolation in policy layer. **Docs conflict:** `docs/K40-strategic-architecture-audit.md` still says organizations are stub-only — **codebase is source of truth** (org membership + OrganizationPetAccess exist).

---

## PUBLIC PRIVACY

Allowlist projectors + `PUBLIC_PAYLOAD_FORBIDDEN_KEYS` — strong DEMO hygiene (assert-privacy 15/15). Residual intentional exposures: emergency opt-in health/vet phone, coarse L&F GPS, pro public contacts. No server gate.

---

## SECURITY

- No `dangerouslySetInnerHTML` / `eval` found
- Client-controlled session/grants = dominant risk
- No API keys bundled for Stripe live path
- Audit scrub helpers exist (`src/lib/security/audit/scrub.ts`)
- No CSP/security headers on Pages deploy
- Lost/found tokens are opaque URL bearers resolved client-side

---

## DEPENDENCIES

Lean runtime: react, router, leaflet, recharts, jspdf, qrcode, lucide. No Stripe/Prisma/Sentry. Playwright is **devDependency** (e2e scripts). Lint passes with warnings only. Recommend `npm audit` before launch without auto-upgrade.

---

## ENVIRONMENT / SECRETS

No `.env*` in repo. Client reads `BASE_URL`, `DEV`, optional `VITE_MICROCHIP_MOCK`, payment provider env (forced DEMO). Documented server secret names not loaded in client — good. Risk is future accidental `VITE_` exposure of secrets.

---

## BUILD / TYPE / LINT

| Check | Result |
|-------|--------|
| `npm run build` | **FAIL** (exit 2) — many TS errors |
| `npm run lint` | **PASS** (exit 0, many warnings) |
| Sample asserts | security-context 27/27, privacy 15/15, payments 23/23 **PASS** |
| Unit/integration in CI | Assert/e2e **not** in package.json or deploy workflow |

---

## TEST COVERAGE

| Area | Coverage |
|------|----------|
| authorize / privacy / clinical / booking / payments / org / messaging | Strong assert scripts |
| Real auth / DB / Stripe live / upload malware / E2E CI gate | Untested / absent |
| UX fake claims / build | Not gated |

**Many passing asserts ≠ production readiness.**

---

## DATA MIGRATION

**MISSING** for demo→production DB. Only in-app LS shape migrations. K52 documents untrusted DEMO import plan; no runnable tooling.

---

## OBSERVABILITY

None implemented (no Sentry/Datadog/analytics in deps or app source).

| Need | Class |
|------|-------|
| Structured logs + error tracking at first server launch | P1 |
| Metrics, uptime, payment webhook alerts, failed jobs | P2 |

---

## BACKUP / DISASTER RECOVERY

Not implemented. Once real data exists: DB backup, object-storage backup, restore test, RPO/RTO = **P0**. Today: report gap only (browser data is not recoverable as a product).

---

## LEGAL / PRIVACY

| Item | Mark |
|------|------|
| Privacy taxonomy / public projectors | TECHNICAL READY (DEMO) |
| Privacy Policy / Terms / cookies UI | TECHNICAL GAP |
| GDPR export/erase/retention engines | TECHNICAL GAP |
| DPA / subprocessors / controller roles | LEGAL REVIEW REQUIRED |

This is not legal approval.

---

## PRODUCTION CONFIGURATION

Pages static deploy only. Gaps: HTTPS is platform-default; no app CSP, CORS API N/A, no robots/sitemap, thin meta, no rate limits/upload limits (no server). Source maps: Vite prod default off (not overridden).

---

## UX

Critical first-run flows exist (landing/dashboard, DEMO login, onboarding, pets, health, calendar, discover, community, messages, pro profile, booking, membership, emergency, L&F, settings, logout).

Issues:

- DEMO labels on login/membership/payments mostly honest
- Fake claims: support send toast (“Zpráva odeslána”), encryption copy in Help/Settings, decorative Sidebar badge counts
- Notification preference checkboxes mostly cosmetic (community partially wired)

---

## RESPONSIVE

BottomNav (`lg:hidden`) + Sidebar (`hidden lg:flex`). Heavy `sm:` / `lg:` usage. Primary nav breakpoint ≈ `lg`. No automated viewport audit run; no known single critical layout failure identified from code inspection alone.

---

## ACCESSIBILITY

| Finding | Class |
|---------|-------|
| Dialogs often lack focus trap / restore focus | P1 |
| Some Settings checkboxes lack proper labels | P2 |
| `lang="cs"`, many `aria-*` present | DONE (partial) |

---

## PERFORMANCE

Large localStorage payloads, breed JPG assets under `public/breeds`, lists without virtualization, PDF/canvas tooling in bundle — P2 risks. Not profiled in this audit.

---

## ERROR HANDLING

Toast union missing `"error"` (build failure contributor). Clinical maps `SERVER_REQUIRED`. Payment/booking paths generally avoid elevating DEMO to success. No server error envelopes yet. Stack traces not systematically exposed in UI; sensitive IDs can appear in client state/URLs for public tokens by design (L&F).

---

## SECURITY BOUNDARY TABLE

| RESOURCE | READ AUTHORITY | WRITE AUTHORITY | PUBLIC? | PRODUCTION SERVER REQUIRED? |
|----------|----------------|-----------------|---------|-----------------------------|
| Pet | owner / HH grant / pro-org grant | owner (+ limited HH) | allowlist Discover | YES |
| HealthRecord | health.read paths | health.write / typed | No | YES |
| WeightMeasurement | health.read | health.write | No | YES |
| PetDocument | documents.read | documents.write | No | YES |
| Encounter | health.read | health.write | No | YES |
| EmergencyCard | owner / emergency perms; public projection | clinical.emergency.write | Opt-in projection | YES |
| ClinicalShare | participants + source authorize | share workflow | No | YES |
| Booking | owner or assigned pro | same | No | YES |
| Message | participants | sender participant | No | YES |
| Notification | recipient account (soft) | emitters | No | YES |
| ProfessionalProfile | public projector / owner | account | Public fields allowlist | YES |
| Organization | members | owner/admin | Limited | YES |
| Membership | self | DEMO provider | No | YES (when paid) |
| Payment | owner/pro payment ACL | provider+webhook | No | YES (when paid) |
| Review | public strip | completed booking rules | Allowlist | YES |

---

## LAUNCH BLOCKER TABLE

| ID | Severity | Area | Finding | Why it blocks launch | Required before launch | Post-launch alternative |
|----|----------|------|---------|----------------------|------------------------|-------------------------|
| B1 | P0 | Auth | DEMO session / owner_self | Anyone can impersonate | Real auth + server session | Soft demo site only |
| B2 | P0 | Backend | No API/server | No enforceable ACL | Server + authorize | N/A |
| B3 | P0 | Database | No DB | Data loss / no multi-device | Managed DB + migrations | N/A |
| B4 | P0 | Clinical/Docs | Browser persistence | PHI/PII forgeable/lost | Server clinical + private object storage | Disable clinical/docs |
| B5 | P0 | Build | `tsc` fails | Cannot ship artifact | Fix type errors | N/A |
| B6 | P0 | Authority | Client-writable grants | IDOR/self-grant | Server-backed grants | N/A |

---

## RECOMMENDED IMPLEMENTATION ORDER

**PHASE A — MUST FIX BEFORE ANY PRODUCTION:** Fix production build; decide feature kill-switch set (disable clinical/docs/payments charging or entire app until backend); remove false trust claims.

**PHASE B — PRODUCTION INFRASTRUCTURE:** Auth provider; API; Postgres (or equivalent); replace DEMO adapters; object storage for documents; server `authorize` + audit sink; backups.

**PHASE C — SECURITY / E2E:** IDOR tests against API; wire assert suite into CI; privacy projection server-side; fix messaging legacy ACL; GDPR export/erase MVP.

**PHASE D — DEPLOYMENT:** Non-Pages app host (or Pages only for marketing); HTTPS, headers, env separation, monitoring, staging.

**PHASE E — POST-LAUNCH:** Stripe live + webhooks; push/email; advanced clinical; EMR; performance/a11y depth.

Effort estimates intentionally omitted (insufficient evidence to invent hours).

---

## FEATURES SAFE TO LAUNCH

**Only as clearly labeled DEMO / marketing SPA (after build fix):** Discover browsing UX, breed imagery, static help content, DEMO membership switcher (already labeled), payment UX that never charges.

**Not safe as production multi-user:** anything persisting real ownership, clinical, documents, messages, bookings across users.

---

## FEATURES THAT MUST BE DISABLED

(for real-user production)

- Real clinical write/read as authoritative medical record
- Document upload as durable private storage
- Real payments/membership charging
- Any “verified” professional badge without real verification
- Support “message sent” without backend
- Claims of encryption-at-rest

---

## FEATURES THAT CAN REMAIN DEMO

- DemoPaymentProvider surfaces (if labeled + no paid claim)
- Demo subscription plan switcher
- Seed booking/messaging fixtures in non-prod
- Microchip mock when `VITE_MICROCHIP_MOCK` (dev only)

---

## POST-LAUNCH BACKLOG

Stripe Connect live, push notifications, weight history CAS, emergency card versioning, clinic EMR, admin moderation, community depth, concierge, live microchip registries, PWA, deep a11y, perf virtualization.

---

## DOCUMENTATION GAPS

- README is Vite template (not product/runbook)
- No launch playbook / runbook / RPO-RTO (this document is the launch readiness audit, not an ops runbook)
- K40 org “stub” section **stale vs code**
- No `.env.example`
- Assert/e2e not documented as CI gate in package scripts

---

## FINAL RECOMMENDATION

**Do not launch LOVED & KNOWN as a production application for real user data yet.**

Treat current codebase as a **high-fidelity DEMO + architecture blueprint**. Next real work is infrastructure (auth, API, DB, storage, server authorize) plus unblocking `npm run build` — not new feature work (K64+). If a public demo remains online, fix the build, label it DEMO everywhere, and disable or clearly demote clinical/documents/payments trust surfaces.

**What is actually required to launch safely:** production auth, server authority for all sensitive domains, real database + backups, private document storage with signed retrieval, privacy/legal pages + GDPR technical rights, CI-passing production build, and kill-switches so DEMO providers cannot be mistaken for live money/medicine.
