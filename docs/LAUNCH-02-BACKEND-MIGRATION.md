# LAUNCH 02 — Backend Migration (HISTORICAL)

> **Superseded.** Production backend is Node + PostgreSQL + Prisma — see [NODE-PRISMA-BACKEND.md](./NODE-PRISMA-BACKEND.md).
> This document remains as the domain entity→table mapping reference used for the Prisma schema.

**Product:** LOVED & KNOWN  
**Original scope (abandoned):** Supabase Auth + PostgreSQL + Storage + Edge Functions  
**Rule:** Existing TypeScript domain + K47–K63 contracts are SSOT. No parallel models.

**Environment status:** `PRODUCTION CONNECTION NOT CONFIGURED` until `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (client) and server secrets are present. Missing credentials ⇒ DEMO path remains; no fake backend.

---

## A) Current DEMO persistence model

### localStorage (`lovedandknown.*`)

| Key | Domain |
|-----|--------|
| `pets`, `petPhotos` | Pet SSOT + photos |
| `healthRecords`, `healthRecordVersions` | Clinical HealthRecord + K57 ledger |
| `clinicalEncounters`, `clinicalEncounterVersions` | K58 |
| `petDocuments`, `petDocumentVersions` | K59 metadata (+ IDB blobs) |
| `weightMeasurements` | K60 |
| `calendarEvents` | Calendar |
| `bookings`, `professionalServices`, availability/*, booking policies | Booking |
| `accounts`, `professionalProfiles`, `petProfessionalAccess`, logs | Account / pro access |
| `organizations`, `organizationMemberships`, `organizationPetAccess` | Org |
| `petHouseholdAccess`, `petHouseholdAccessLogs` | Household grants |
| `payments`, payouts, provider events, connect accounts | Payments (DEMO) |
| `notifications` | In-app notifications |
| `inboxConversations` | Messages |
| `subscription` | Membership / entitlements |
| `professionalReviews` | Reviews |
| `demoIdempotency` | K63 DEMO store |
| `securityAuthorizationAudit` | K48 DEMO sink |
| `sessionActive`, `onboardingCompleted` | DEMO session |
| Plus: privacy, verification, community, lost/found, travel, daily care, prefs | Supporting DEMO |

### IndexedDB

| DB | Store | Role |
|----|-------|------|
| `lovedandknown-documents` | `blobs` | PetDocument binary (meta in LS) |

### Persistence adapters

| Adapter | Authority | Behavior |
|---------|-----------|----------|
| `DemoClinicalPersistenceAdapter` | demo | Hook/LS backed |
| `ServerClinicalPersistenceAdapter` | server | Was stub → `SERVER_REQUIRED`; LAUNCH 02 wires when configured |
| `DemoIdempotencyStore` | demo | LS |
| `ServerIdempotencyStoreStub` → `ServerIdempotencyStore` | server | Postgres when configured |
| `DemoAuditSink` | demo | LS |
| `ServerAuditSink` | server | Postgres when configured |
| Domain `*/storage.ts` | demo | Direct LS load/save |

### DEMO session

- Actor: fixed `owner_self` (`SELF_OWNER_ID`)
- Flag: `lovedandknown.sessionActive` (missing key = active)
- `SecurityContext.authority: 'demo'`
- Client is mutation authority; DevTools can forge LS grants

---

## B) Target production model

```
Browser ──Auth──► Supabase Auth (email/password)
Browser ──JWT──► Edge Functions (server authority)
Edge Functions ──authorize()──► Postgres (load grants, mutate)
Edge Functions ──after authorize──► Private Storage (docs)
RLS ──defense-in-depth──► authenticated reads / public projections
```

- `accounts.id` = `auth.users.id` (UUID). Never email as identity key.
- Trusted actor from JWT only. Body `actorId` / `ownerId` / `permission` / `role` ignored.
- Application `authorize()` + RLS both required. Role ≠ permission ≠ grant.
- GitHub Pages stays DEMO/marketing. Production app is not hosted on Pages.
- No automatic localStorage → DB clinical import.

---

## C) Mapping: frontend/domain entity → PostgreSQL table

| Domain type | Table | Notes |
|-------------|-------|-------|
| `Account` | `accounts` | PK = `auth.users.id` |
| `Pet` | `pets` | `owner_account_id`; emergency card JSONB |
| `PetHouseholdAccess` | `pet_household_access` | No separate Household aggregate |
| `PetHouseholdAccessLog` | `pet_household_access_logs` | |
| `Organization` | `organizations` | |
| `OrganizationMembership` | `organization_memberships` | |
| `OrganizationPetAccess` | `organization_pet_access` | |
| `ProfessionalProfile` | `professional_profiles` | |
| `ProfessionalService` | `professional_services` | |
| Availability / exceptions / policies | `professional_availability`, `professional_availability_exceptions`, `professional_booking_policies` | |
| `PetProfessionalAccess` | `pet_professional_access` | |
| `ProfessionalAccessLog` | `professional_access_logs` | |
| `Booking` | `bookings` | |
| `Conversation` | `conversations` | `participant_account_ids uuid[]` required |
| `Message` | `messages` | attachments JSONB (incl. clinical share) |
| `AppNotification` | `notifications` | `recipient_account_id` server-set |
| `SubscriptionRecord` | `subscription_records` | |
| `Payment` | `payments` | DEMO provider rows; no fake paid |
| `ProfessionalReview` | `professional_reviews` | |
| `HealthRecord` | `health_records` | SSOT |
| K57 snapshots | `health_record_versions` | immutable |
| `WeightMeasurement` | `weight_measurements` | |
| `PetDocument` | `pet_documents` | metadata; blob in Storage |
| K59 snapshots | `pet_document_versions` | |
| `ClinicalEncounter` | `clinical_encounters` | |
| K58 snapshots | `clinical_encounter_versions` | |
| `EmergencyCardSettings` | `pets.emergency_card` JSONB | not separate ACL |
| `ClinicalShareAttachment` | `messages.attachment` | transport only, not ACL |
| `AuditEvent` | `audit_events` | K48 |
| Idempotency record | `idempotency_records` | K63 |

**Checklist aliases:** “household / household_members” ⇒ `pet_household_access` (domain has no Household entity). “clinical_shares” ⇒ message attachment, not a grant table.

---

## D) Mapping: DEMO adapter → production adapter

| DEMO | Production |
|------|------------|
| `DemoClinicalPersistenceAdapter` | `ServerClinicalPersistenceAdapter` → Edge `clinical` |
| `DemoIdempotencyStore` | `ServerIdempotencyStore` → `idempotency_records` |
| `DemoAuditSink` | `ServerAuditSink` → `audit_events` |
| `createDemoSecurityContext` | `createServerSecurityContextFromSession` |
| `loginSelfSession` / `owner_self` | Supabase Auth email+password |
| `documentStorage` IDB | Storage bucket `pet-documents` + `pet_documents` |
| `*/storage.ts` LS | Dual-mode: DEMO LS \| production API client |
| `DemoPaymentProvider` | Kept; payment **records** in DB |
| `DemoSubscriptionProvider` | Kept; membership **state** in DB |

---

## E) Sensitive server mutations

Must be server-authoritative (Edge Function after `authorize`):

- Pet ownership create/update
- Household / professional / organization pet access grants
- Health / medication / vaccination / lab writes
- Document create/metadata/upload/download
- Clinical share (via Messages after authorize)
- Emergency card write
- Encounter mutations
- Booking lifecycle + conflict checks
- Message creation
- Server-generated notifications
- Payment state, membership state, reviews

None of the above may be production-authoritative via localStorage alone.

---

## F) Remaining `SERVER_REQUIRED` / deferred

| Item | Status |
|------|--------|
| `finalizeRecord` / `signRecord` / `adminCorrectRecord` | Still SERVER_REQUIRED |
| `exportClinicalHistory` | Still SERVER_REQUIRED |
| GDPR erase/export engines | Deferred |
| Live Stripe / Stripe Connect | Deferred (DEMO providers only) |
| Push / email / SMS | Deferred |
| Malware scanning provider | Gap documented; hook only |
| Social login / MFA / passwordless | Deferred |
| Auto DEMO LS → DB migration | Explicitly not in LAUNCH 02 |

---

## G) Migration strategy

1. Inventory + schema migrations + RLS (this doc + `supabase/migrations`).
2. Auth + `accounts` trigger (`auth.users` → `accounts`).
3. Edge Functions + shared server `authorize`.
4. Wire production adapters behind `isProductionBackendConfigured()`.
5. New accounts start empty in DB. **No** trusted auto-import of DEMO clinical data.
6. GitHub Pages continues DEMO until separate production hosting.
7. Optional future migration utility = separate LAUNCH step after risk mapping.

---

## H) Security boundary

| Layer | Role |
|-------|------|
| Supabase Auth JWT | Proves authenticated account id |
| Edge Function + `authorize()` | Application authority (fail closed) |
| Postgres RLS | Defense-in-depth; never sole gate for sensitive writes |
| Service role key | Server runtime only — never `VITE_`, never browser, never logs |
| Anon key | Public client key only |
| Public endpoints | Allowlist projections only (no microchip full, owner contacts, health history, storage keys, audit) |
| Idempotency | Atomic actor\|operation\|resource\|clientKey + fingerprint |
| Audit | K48 sink; audit failure must not flip ALLOW |

**CORS / CSRF / rate limits:** Edge Functions use Supabase JWT validation. Rate limiting and full CSRF strategy for cookie-based flows are **production gaps** until hosting is finalized (document honestly; do not fake).

**Upload:** authorize(`documents.write`) → validate MIME/extension/size/filename → upload → metadata transaction. Never upload-then-authorize.
