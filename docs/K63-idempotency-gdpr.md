# K63 — Unified Idempotency + GDPR / Privacy Hardening

**Status:** DONE  
**Scope:** Unified idempotency boundary for sensitive clinical mutations + GDPR/privacy data-boundary hardening.  
**Not in scope:** K64, real backend, fake distributed idempotency, GDPR deletion engine, Stripe/S3/EMR.

**NEXT STEP:** Launch Readiness Audit (not another architecture K-series).

---

## A) Unified idempotency architecture

Single module: `src/lib/idempotency/`.

| Symbol | Role |
|--------|------|
| `IdempotencyScope` | trusted `actorAccountId` + `operation` + `resourceRef` |
| `buildRequestFingerprint` | stable hash of operation + resource + payload |
| `DemoIdempotencyStore` | localStorage / in-memory; `authority: 'demo'` |
| `ServerIdempotencyStoreStub` | every access → `SERVER_REQUIRED` |
| `executeIdempotent()` | claim → run → complete / replay / conflict / retry-after-failure |

**Flow (mandatory):**

```
trusted actor → authorize() → executeIdempotent() → mutation → AuditEvent (K48)
```

Idempotency **never** replaces `SecurityContext`, `authorize()`, or `AuditEvent`.

---

## B) Actor / operation / resource scoping

Composite storage key:

`actorAccountId | operation | resourceRef | clientKey`

- Actor A + key X ≠ Actor B + key X  
- Operation A + key X ≠ Operation B + key X  
- Resource A + key X ≠ Resource B + key X  

Client cannot obtain another actor’s stored result by reusing a client key.

---

## C) Request fingerprint

Fingerprint = hash(`operation` + `resourceRef` + normalized payload).

Actor is **not** in the fingerprint (actor isolation is via storage key).

---

## D) Deterministic replay

Same scope + same client key + same fingerprint + `completed` → return stored result.  
No second mutation.

---

## E) Conflict behavior

Same scope + same client key + **different** fingerprint → `IDEMPOTENCY_CONFLICT`.  
Never silently reuse a prior result for a different operation/payload.

Other states:

| State | Behavior |
|-------|----------|
| pending (same fingerprint) | `IDEMPOTENCY_IN_PROGRESS` (DEMO nested/concurrent) |
| failed (same fingerprint) | safe retry (re-run mutation) |
| no client key | passthrough (no store engagement) |

---

## F) DEMO vs production idempotency

| | DEMO | Production |
|--|------|------------|
| Store | `DemoIdempotencyStore` (localStorage) | Server atomic store |
| Authority flag | `authority: 'demo'` | `authority: 'server'` |
| Concurrency | Best-effort single-thread DEMO limits | Unique constraint + atomic claim |
| Guarantees | Not production-safe | Transaction-safe |

**DEMO idempotency ≠ production distributed idempotency.**

---

## G) Privacy taxonomy

Extends existing privacy SSOT (`src/lib/privacy/`) — **not** a second settings model.

Classes in `src/lib/privacy/classification.ts`:

| Class | Id |
|-------|-----|
| A public | `public` |
| B account/private | `account_private` |
| C household/private | `household_private` |
| D professional-access | `professional_access` |
| E organization-access | `organization_access` |
| F clinical | `clinical` |
| G sensitive identifiers | `sensitive_identifier` |
| H storage/internal | `storage_internal` |
| I audit/security | `audit_security` |

Anchors map to existing projections (`projectPublicPet`, professional/org projectors, scrubbers, etc.).

---

## H) Public allowlist

Public data must be **allowlisted** (`projectPublicPet`, Discover sanitize, emergency public view, lost&found public view, professional public profile).

Backstop: `PUBLIC_PAYLOAD_FORBIDDEN_KEYS` (extended in K63 with storage/PII keys).

Never: take full object and strip.

---

## I) Clinical boundary

`HealthRecord`, `WeightMeasurement`, `PetDocument`, `ClinicalEncounter`, emergency clinical fields require authorization.  
Not public merely because they hang off a `Pet` object.

---

## J) PII boundary

Protected without public allowlist: account IDs (internal), owner contacts, phone, email, address, exact location, microchip (full), provider IDs, storage keys, raw URLs, security metadata.

---

## K) Microchip boundary

Microchip is a sensitive identifier — **never** an authorization shortcut.  
Public emergency/finder surfaces use masked representation only when opted in.  
Full chip number is never public by default.

---

## L) Storage metadata boundary

Never public: `storageKey`, object path, signed URL, provider URL, provider account ID, raw document URLs.  
Enforced in document projections, clinical share attachments, `PUBLIC_PAYLOAD_FORBIDDEN_KEYS`.

---

## M) Notification privacy

Safe pattern:

- event: `clinical_share_received`  
- message: generic (“Byl vám sdílen klinický záznam”)  
- deep-link: `/messages/...`  

Never: medication, diagnosis, document content, lab result, weight, microchip, owner PII, storage keys.

---

## N) Audit privacy

`AuditEvent` = security metadata (K48 only).  
May include: trusted actor, action, resource type/ref, result, timestamp, safe reason/workflow keys.  
Must **not** store full clinical payload.  
`scrubAuditMetadata` strips forbidden keys.

---

## O) Data minimization

Persistent models keep only fields needed for their purpose.  
K63 does not add unused clinical copies into notifications, audit, or shares.  
Does not delete existing fields for cosmetic refactor.

---

## P) Retention

Documented classes (`RETENTION_CLASS_NOTES`): clinical records, documents, audit/security, messages, notifications, access grants, idempotency records, account data.

**No fake automatic deletion scheduler.**  
Production retention = server-side policy.

---

## Q) Erasure

No blind `DELETE FROM EVERYTHING`.  
Distinguish account/public/messages/clinical/documents/audit/legal retention.  
Clinical/audit history may have legal retention constraints.  
If deletion engine absent → **SERVER_REQUIRED / DOCUMENTED GAP**.

---

## R) Export

Production export must respect authorization.  
Clinical export requires `clinical.export` (already on `exportClinicalHistory` → `SERVER_REQUIRED`).  
Export must not include storage keys, provider credentials, auth internals, other users’ PII, unrelated pets/orgs.  
**Not faked** without server.

---

## S) Account deletion

Production workflow must consider pets, household, professional profile, org memberships, bookings, messages, reviews, clinical records, audit — **without** cascading deletes that destroy clinical/audit/other-user/org integrity.  
Documented gap until server governance.

---

## T) Cross-tenant isolation

Enforce via existing `authorize()` + adapters:

account / pet / professional / organization / clinic / household isolation;  
public → private clinical DENY.

---

## U) Serialization / logging / analytics

- Prefer allowlist projections over blacklist-only.  
- Sensitive clinical payloads must not appear in console/debug/analytics/URL.  
- Analytics: **not added** in K63; if introduced later, clinical/PII/microchip forbidden in tracking payloads.

---

## V) Production GDPR requirements + legal review

Technical boundaries for: access, rectification, erasure, restriction, portability, objection (where relevant), consent/withdrawal (where relevant).

**K63 is not a legal compliance engine.**  
Legal implementation must be verified before production launch.

---

## Idempotency wired mutations

After `authorize()` only:

| Mutation | Operation id |
|----------|----------------|
| `createRecord` | `clinical.createRecord` |
| `createDocument` | `clinical.createDocument` |
| `createWeightMeasurement` | `clinical.createWeightMeasurement` |
| `createClinicalShare` | `clinical.createShare` |
| `emergencyWrite` | `clinical.emergencyWrite` |

Versioned update/withdraw/correct rely on `expectedVersion` CAS — not mass-wrapped.

Optional request field: `idempotencyKey` on `ClinicalRequestBase` / `CreateClinicalShareInput`.

---

## Production idempotency contract

Server must provide:

- server-side storage  
- unique constraint on scoped key  
- atomic claim  
- request fingerprint  
- actor / operation / resource scope  
- deterministic replay  
- conflict detection  
- transaction boundary with mutation + audit  
- concurrency handling  

localStorage does **not** provide these guarantees.

---

## Tests

- `scripts/assert-idempotency.mts` — replay, conflict, actor/op/resource isolation, duplicate mutations, auth bypass deny, failure retry, DEMO concurrency  
- `scripts/assert-privacy-gdpr.mts` — public/clinical/PII/storage/notification/audit/export/isolation/SEO  

---

## Known gaps / post-launch

| Gap | Notes |
|-----|-------|
| Production idempotency store | SERVER_REQUIRED |
| GDPR erasure / retention engine | SERVER_REQUIRED + legal review |
| Account deletion cascade policy | Documented; no auto cascade |
| Clinical export body | `clinical.export` + SERVER_REQUIRED |
| Analytics pipeline | Not present; do not add clinical to tracking |

---

## Invariants

- No K64  
- No parallel auth / audit / privacy taxonomy  
- Booking natural-key dedup left alone (domain-specific)  
- K59–K62 authorization architecture unchanged  
- DEMO ≠ production authority  

**NEXT STEP MUST BE: Launch Readiness Audit**
