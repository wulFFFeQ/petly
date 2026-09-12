# KROK 51 — Clinical Record Integrity & Provenance

**Datum:** 2026-09-12  
**Navazuje na:** [K50-health-authorization-hardening.md](K50-health-authorization-hardening.md), [K48-security-audit-trail-runtime.md](K48-security-audit-trail-runtime.md)

**Rozsah:** provenience a bezpečný lifecycle existujících klinických záznamů. Žádný nový Health / Access / Permission / Security / Audit / Messaging systém.

---

## 1. Files changed

| Oblast | Soubory |
|--------|---------|
| Types | `src/types/index.ts` — optional provenance + lifecycle fields |
| Helper | `src/lib/health/clinicalProvenance.ts` |
| Mutations | `src/context/AppContext.tsx` — stamp create/update; withdraw instead of hard delete |
| Filters | `src/lib/security/clinicalGate.ts`, HH/Pro/Org projectors, `usePetProfileTabState.ts` |
| Weight | `src/components/health/WeightChart.tsx`, `usePetProfileTabState.ts` |
| Privacy | `src/lib/privacy/fields.ts` — forbidden provenance keys |
| UI | `HealthRecordDetailBody.tsx`, `DocumentDeleteConfirm.tsx` |
| Tests | `scripts/assert-clinical-integrity.mts`, `scripts/e2e-clinical-integrity.mjs` |
| Docs | `docs/K51-clinical-record-integrity.md` |

---

## 2. Existing health models audited

| Model | Role |
|-------|------|
| `HealthRecord` | Polymorphic SSOT (`vaccination` / `vet` / `medication` / `examination` / `assessment`) |
| `PetDocument` | Separate document meta + IndexedDB blobs |
| `WeightMeasurement` | Separate weight store |
| Diagnosis / lab entity | **Missing** as first-class HealthRecord types (lab ≈ document type) |

---

## 3. Clinical provenance state

Added optional fields on existing models (no new Health model):

- `createdAt` / `updatedAt`
- `createdByAccountId` / `updatedByAccountId` (HealthRecord)
- `uploadedByAccountId` / `updatedByAccountId` (PetDocument)
- `recordSource?: owner | co_owner | caregiver | professional | organization` — **metadata only**
- `lifecycleStatus?: active | withdrawn` + `withdrawnAt` / `withdrawnByAccountId`

Legacy/seed rows get timestamp backfill without inventing fake actors.

---

## 4. Author / actor handling

- Actor from `actorAccountId(SecurityContext)` via `createDemoSecurityContext()` after clinicalGate ALLOW
- Prefer account ID; never display name / email as identity
- `recordSource` resolved best-effort from ownership / HH role / pro / org facet
- Client `Partial` updates strip provenance / ownership / microchip keys

---

## 5. createdAt / updatedAt handling

- Create: both set to ISO now
- Update: `createdAt` / `createdByAccountId` preserved; `updatedAt` / `updatedByAccountId` refreshed
- Withdraw: preserves create stamps; sets withdraw stamps + `updatedAt`

---

## 6. Edit policy

**Pet-scoped (K50 preserved):** any actor with type-mapped write on the Pet may edit any active record for that Pet. Always stamp updater.

Withdrawn records reject further edits.

Path: UI → `tryAssertPetClinical` → `authorize()` → stamp → mutation. Never UI → localStorage without gate.

---

## 7. Delete policy

Hard delete replaced with **soft withdraw** (`lifecycleStatus: 'withdrawn'`). Row retained in SSOT; filtered from default UI / projections.

Not a full immutable ledger.

---

## 8–11. Role behavior

| Actor | Behavior |
|-------|----------|
| Owner / Co-owner | Full health R/W (K50); stamps as `owner` / `co_owner` |
| Caregiver | Explicit `health_write` only; source metadata `caregiver` |
| Professional | Existing ProfessionalAccess + write perm; stamps `professional` |
| Organization | Membership ≠ PetAccess ≠ health perm; stamps `organization` |
| Viewer / Public | DENY |

Professional/org health mutations cannot change ownership / access grants (stripped from Partial).

---

## 12. Public projection

`PUBLIC_PAYLOAD_FORBIDDEN_KEYS` extended with provenance actor keys. Public Discover still has no clinical arrays. Assert **R** verifies no provenance on public payload.

---

## 13. Microchip / PII protection

Stamps never include microchip / owner contacts. Non-owner `microchip.read` / `ownerContacts.read` remain DENY (K50 regression).

---

## 14. Messages health-share result

**Unchanged DEMO / placeholder** (`HealthShareMenu` + `messages-health-share-demo`). No new health-share model. Messaging isolation still DENY `health.*` on conversation.

---

## 15. Audit integration

K48 `AuditEvent` / `AuditSink` only — authorization decisions via `authorize()`. No second audit / clinical ledger. Assert **S** confirms health.write still emits K48 event.

---

## 16. Tests

`scripts/assert-clinical-integrity.mts` — matrix **A–S** + withdraw / strip / labels (24 PASS).

Negative LS bypass: **UNKNOWN — REQUIRES SERVER TEST** (not PASS).

---

## 17. E2E

`scripts/e2e-clinical-integrity.mjs` — assert matrix + optional UI smoke (A Health, I Discover keys, J Messages DEMO). Create/edit deny paths covered by assert; DEMO session ≈ owner for multi-actor UI.

---

## 18. Regression

PASS: K47 SecurityContext, K48 Audit, K50 Health Authorization, privacy, household, professional, organization pet access.

---

## 19. UNKNOWN / BACKEND REQUIREMENTS

| Item | Status |
|------|--------|
| Concurrent edits / optimistic locking / `version` | **BACKEND REQUIREMENT** — not faked in DEMO |
| Server timestamps as authority | **BACKEND REQUIREMENT** |
| Full field-level history / event-sourcing | **BACKEND REQUIREMENT / FUTURE K52** |
| Raw localStorage / ungated UI mutation | **UNKNOWN — REQUIRES SERVER TEST** |
| Multi-actor UI session switch (co-owner/pro in browser) | LIMITED in DEMO (`getSelfAccount` ≈ owner); policy covered in assert |

---

## 20. Explicitly what was NOT recreated

- No new Health / Access / Permission / Auth / SecurityContext / authorize() / clinicalGate rewrite
- No new Audit / Messaging / PetAccess / Organization / Professional / projection system
- No immutable clinical ledger / event-sourcing
- HealthRecord architecture extended only with optional fields + stamps + soft withdraw
