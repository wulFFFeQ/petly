# K62 — Clinical Emergency Write Hardening

`clinical.emergency.write` is a **minimal, time-bounded capability** for Emergency Card mutations.

It is **not** `health.write`, not a parallel access system, and not a public finder write path.

---

## Invariants

| Rule | Status |
|------|--------|
| `clinical.emergency.write` ≠ `health.write` | Confirmed |
| No EmergencyAccess / EmergencyACL / EmergencyAudit | Confirmed |
| Reuses HH / Pro / Org grant lifecycle | Confirmed |
| Mutation scope = `Pet.emergencyCard` only | Confirmed |
| HealthRecord / Weight / Document / Encounter untouched | Confirmed |
| Trusted actor from SecurityContext | Confirmed |
| Audit via K48 `AuditEvent` only | Confirmed |
| Public finder = READ ONLY | Confirmed |
| Microchip / booking / encounter / share ≠ authorization | Confirmed |
| DEMO authority ≠ production | Confirmed |
| No fake server | Confirmed |

---

## Architecture

```
trusted SecurityContext
  → ClinicalService.emergencyWrite()
    → denyShortcuts (booking / microchip / encounter-alone)
    → assertTrustedActor
    → scope validate (Emergency Card whitelist only)
    → authorize('clinical.emergency.write')
    → applyEmergencyWritePatch → Pet.emergencyCard
    → K48 AuditEvent (scrubbed metadata)
```

**Forbidden models (not created):**

- EmergencyAccess / EmergencyACL / EmergencyPermission system
- EmergencyAudit / EmergencyClinicalDocument / EmergencyHealthRecord
- Parallel grant store for emergency sessions

---

## Emergency write ≠ health.write

| Via `clinical.emergency.write` | Denied |
|---|---|
| Emergency Card `health.*` free-text | HealthRecord create/update/withdraw |
| Vet contact / visibility / publicSlug | WeightMeasurement |
| Print-only owner phone on card | PetDocument / medications / vaccinations / labs |
| | Encounter clinical facts |
| | Ownership / Pro / Org access grants |

Emergency Card remains a **parallel acute surface** (owner-authored text for finder opt-in). It is **not** a snapshot SSOT of clinical history. Clinical facts stay in HealthRecord.

---

## Authorization vocabulary

**Only:** `clinical.emergency.write`

Not added: `emergency.write`, `emergency.access`, `emergency.admin`, `clinical.emergency.admin`.

### Mapping

| Path | Domain permission |
|------|-------------------|
| Owner | Ownership ALLOW (Emergency Card scope only) |
| Household | `emergency_write` (never `health_write`) |
| Professional | `PetProfessionalAccess` + `emergencyWrite` |
| Organization | `OrganizationPetAccess` + `emergencyWrite` |

- Caregiver role alone → **DENY** (defaults have `emergency_read` only)
- Viewer role alone → **DENY**
- Vet / clinic role alone → **DENY**
- `PetProfessionalAccess` without `emergencyWrite` → **DENY**
- `addHealthRecord` / `health.write` alone → **DENY**
- Org membership / admin alone → **DENY**

---

## Capability / expiration / revocation

Time-bound + revoke reuse existing grants:

- `PetHouseholdAccess` (`status`, optional `expiresAt`)
- `PetProfessionalAccess` (`status`, **`expiresAt` required** when `emergencyWrite` present)
- `OrganizationPetAccess` (same)

After `expiresAt` or revoke → **DENY** (`STALE_ACCESS` / expired / revoked deny classes).

Grant-time integrity: `assertEmergencyWriteGrantHasExpiry` rejects attaching `emergencyWrite` without a valid `expiresAt` (Pro/Org).

Owner permanence for Emergency Card management is **ownership**, not a permanent clinical history write.

Client cannot set `canEmergencyWrite: true` or forge `grantedBy` / `updatedBy` / actor.

---

## Actor matrix

| Actor | Result |
|-------|--------|
| Owner | ALLOW Emergency Card management |
| Co-owner (HH `emergency_write`) | ALLOW |
| Caregiver without `emergency_write` | DENY |
| Viewer | DENY |
| Professional + grant + `emergencyWrite` + expiresAt | ALLOW |
| Organization + grant + `emergencyWrite` + expiresAt | ALLOW |
| Public / finder | DENY write |
| Microchip match | DENY |
| Booking / Encounter / Appointment | DENY (context only) |
| K61 Clinical Share recipient | DENY (share ≠ emergency capability) |

---

## Boundaries

- **Public Emergency Card** — existing projection builders; READ ONLY
- **Microchip** — identity only; never authorization
- **Booking / Encounter** — never auto-grant emergency write
- **Clinical Share (K61)** — never creates emergency capability
- **Cross-pet / cross-clinic / cross-org** — isolated via existing authorize paths

---

## Provenance / versioning / audit

- Provenance actor from SecurityContext only
- Emergency Card has **no** K57 immutable version ledger → **DOCUMENT GAP** (do not invent parallel history)
- Audit: K48 `AuditEvent` via `authorize()` + optional scrubbed `{ workflow: 'clinical_emergency_write', phase: 'mutated' }`
- Audit failure never bypasses authorization

---

## Notifications

Types:

- `clinical_emergency_access_granted`
- `clinical_emergency_access_revoked`

Helpers in `src/lib/notifications/fromClinicalEmergency.ts` — event + deep-link only; no clinical / PII / microchip payload.

---

## DEMO vs production

| | DEMO | Production |
|--|------|------------|
| Persistence | localStorage / in-memory pets | Server adapter |
| Expiration check | evaluated at authorize(`now`) | Server-authoritative clock + persistence |
| Authority flag | `authority: 'demo'` | `authority: 'server'` |

`requireDemoForMutate('emergencyWrite')` → server path **SERVER_REQUIRED** until wired.

**DEMO emergency access is not production-safe.**

---

## Known gaps

| Gap | Status |
|-----|--------|
| Production server-authoritative emergency write adapter | **SERVER_REQUIRED** |
| Emergency Card immutable history (K57-style) | **DOCUMENT GAP** |
| Encounter + minimal clinical facts under emergency | **DEFERRED** |
| Unified idempotency / GDPR hardening | **K63 only — not implemented here** |

---

## Tests

- `scripts/assert-clinical-emergency-write.mts` — attack matrix
- `scripts/assert-clinical-service.mts` — W / W2 updated
- `scripts/assert-clinical-encounter.mts` — AM updated for K62 API

---

## K63

**K63 = UNIFIED IDEMPOTENCY + GDPR/PRIVACY HARDENING ONLY.**

Not implemented in this step.
