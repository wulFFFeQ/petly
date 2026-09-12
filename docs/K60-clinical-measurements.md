# K60 — Clinical Measurements Hardening

Hardening existujícího `WeightMeasurement` v rámci `ClinicalService`.  
**Žádný** nový `ClinicalMeasurement` / `MeasurementAccess` / parallel ACL / MeasurementAudit.

---

## 1. Measurement SSOT

| Model | Role |
|-------|------|
| **WeightMeasurement** | **Jediný SSOT** pro hmotnostní historii |
| HealthRecord | Klinická fakta — **≠** measurement SSOT |
| PetDocument | Document SSOT — screenshot váhy **≠** measurement record |
| ClinicalEncounter | Context / optional `encounterId` reference only |
| Pet.weight | Denorm display current — **≠** history SSOT |
| Booking | Admin/context only — **≠** access |

Nikde se nevytváří duplicitní hmotnostní hodnota v Encounter / HealthRecord / PetDocument / ProfessionalPet / OrganizationPet / Booking.

---

## 2. Provenance

Existující pole (zachována):

- `createdAt` / `updatedAt`
- `createdByAccountId` / `updatedByAccountId`
- `recordSource` (`owner` | `co_owner` | `caregiver` | `professional` | `organization`)
- additive `version?: number` (create → `1`)

`stampWeightCreate` bere actora **pouze** z trusted `SecurityContext`.  
Klient **nesmí** určit `createdBy*` / `recordSource` / `version` přes payload.

Provenance **není** authorization.

---

## 3. Authorization

```
SecurityContext → authorize() → pet resource → health.read | health.write
```

| Actor | Pravidlo |
|-------|----------|
| OWNER | existující vlastnická klinická práva |
| CO-OWNER | household permissions (suggested `health_read`/`health_write`) |
| CAREGIVER | pouze explicitně udělené `health_*` |
| VIEWER | DENY (bez health permissions) |
| PROFESSIONAL | aktivní `PetProfessionalAccess` + `viewHealth` / `addHealthRecord` |
| ORGANIZATION | aktivní `OrganizationPetAccess` + explicit permission |
| PUBLIC | žádný clinical measurement access |

**Nepřidáno:** `measurement.access`, `clinical.measurement.*`, `measurement.admin`, `measurement.owner`.

ROLE ≠ ACCESS ≠ PERMISSION.  
Microchip ≠ authorization. Booking ≠ authorization. Encounter ≠ authorization. Membership ≠ authorization.

---

## 4. ClinicalService API (K60)

| Method | Action |
|--------|--------|
| `listWeightMeasurementsForPet` | `health.read` |
| `getWeightMeasurement` | `health.read` |
| `createWeightMeasurement` | `health.write` + numeric integrity |

Create validace: finite positive `weight`, non-empty `date`/`id`/`petId`.  
`encounterId` = FK check (same pet, not withdrawn) — **ne** authz.

Update / correct / `expectedVersion` CAS / soft withdraw — **neimplementováno** (known gaps).

---

## 5. Encounter / Booking / Microchip

- `WeightMeasurement.encounterId?` = context only
- Encounter completion ≠ measurement authz / finalization
- `bookingId` / `microchip` na requestu → `FORBIDDEN` (`isolation`)

---

## 6. Versioning / Withdraw

| Capability | Stav |
|------------|------|
| Additive `version: 1` on create | ANO |
| `expectedVersion` CAS / history ledger | **GAP** (follow-up) |
| Soft withdraw / `lifecycleStatus` | **GAP** (follow-up) |

Neobchází K57 — nepřidává paralelní versioning mechanismus. Minimální bezpečná hranice = authorized create + read + integrity. Plná K57/K59 parity = explicitní follow-up.

---

## 7. Projections

| Surface | Policy |
|---------|--------|
| Professional | po `viewHealth`; `toAuthorizedWeightView` stripne account IDs |
| Organization | po OrgPetAccess + `viewHealth`; stejný scrub |
| Public / Discover / breeder / community | `weightMeasurements` + `weight` v `PUBLIC_PAYLOAD_FORBIDDEN_KEYS` |

Professional/org role sama nestačí.

---

## 8. Audit

Pouze existující K48 `AuditEvent` (`authorization_decision` přes `authorize(health.*)`).  
Žádný `MeasurementAudit`. Audit failure ≠ authorization bypass.

---

## 9. DEMO vs Server

| Authority | Chování |
|-----------|---------|
| DEMO | `DemoClinicalPersistenceAdapter` / in-memory / localStorage — **≠** production |
| Server stub | `SERVER_REQUIRED` — žádný fake server |

UI create path jde přes `ClinicalService`. UI nesmí být zdrojem authorization.

---

## 10. Idempotence

Žádný measurement-specific idempotency systém. **K63** = jednotná idempotency vrstva — viz [`docs/K63-idempotency-gdpr.md`](K63-idempotency-gdpr.md).

---

## 11. Tests

- `scripts/assert-clinical-measurements.mts`
- `scripts/e2e-clinical-measurements.mjs`

Matrix: owner/HH/pro/org allow-deny, cross-pet, cross-clinic, shortcuts, forged actor/createdBy, invalid numeric, public/pro/org scrub.  
Tests 21–23 = documented N/A (versioning/withdraw gaps).

---

## 12. Explicit Invariants

- WeightMeasurement = jediný measurement SSOT
- HealthRecord ≠ measurement SSOT
- PetDocument ≠ measurement SSOT
- Encounter = context only
- booking ≠ access
- microchip ≠ authorization
- role ≠ access ≠ permission
- public clinical measurement exposure = forbidden
- DEMO ≠ production authority
- server backend required for production authority

---

## 13. K61 Dependency

**K61 = Clinical Share.** K60 **neimplementuje** share. Messages zůstávají canonical messaging.

---

## 14. Known Gaps

1. Full integer versioning + immutable history ledger for WeightMeasurement  
2. Soft withdraw lifecycle  
3. `Pet.weight` denorm merge/derive (K49)  
4. Explicit `unit` field (implicit kg)  
5. Wired production server persistence  
6. Unified idempotency (K63) — **done** (`docs/K63-idempotency-gdpr.md`)
