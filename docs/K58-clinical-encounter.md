# KROK 58 — Clinical Encounter

**Datum:** 2026-09-12  
**Typ:** IMPLEMENTACE — Clinical Encounter jako kontejner klinické epizody  
**Navazuje na:** [K47](K47-security-authorization-runtime.md), [K48](K48-security-audit-trail-runtime.md), [K50](K50-health-authorization-hardening.md), [K51](K51-clinical-record-integrity.md), [K52](K52-clinical-server-history-architecture-audit.md), [K54](K54-clinical-encounter-architecture-audit.md), [K55](K55-clinical-authority-audit.md), [K56](K56-server-clinical-vertical.md), [K57](K57-clinical-versioning-history.md)

---

## 1. Executive Summary

K58 zavádí **ClinicalEncounter** jako kontejner jedné klinické epizody nad Pet.

```
Pet → ClinicalEncounter → (optional FK) HealthRecord / PetDocument / WeightMeasurement
```

- HealthRecord / PetDocument / WeightMeasurement zůstávají SSOT.
- Encounter **není** druhý Health systém.
- Autorizace: SecurityContext → `authorize()` → ClinicalService (`health.read` / `health.write`).
- Verzování: integer `version` + `expectedVersion` CAS + immutable encounter history ledger (oddělený od HealthRecord history).
- DEMO = localStorage / in-memory; SERVER stub → `SERVER_REQUIRED`.
- Completion ≠ finalize / sign.

**Verdikt:** DONE — Clinical Encounter boundary připravena; production backend stále vyžaduje skutečnou server persistence.

---

## 2. Clinical Encounter Definition

Clinical Encounter = konkrétní klinická epizoda péče o konkrétního Pet (prevence, akutní návštěva, očkování, hospitalizace, telemedicína, emergency, …).

Obsahuje / odkazuje na klinická fakta. **Neduplikuje** diagnosis / medication / labs / documents / weights.

---

## 3. Pet Boundary

- `petId` je povinný a **immutable** po vytvoření.
- Encounter bez Pet → reject.
- Booking pet ≠ authoritative petId.
- Cross-pet: cizí `petId` + encounter → `NOT_FOUND` / `FORBIDDEN` bez leak existence.

---

## 4. Encounter Lifecycle

| Status | Povolené přechody |
|--------|-------------------|
| `scheduled` | → `in_progress`, `cancelled` |
| `in_progress` | → `completed`, `cancelled` |
| `completed` | normal update zakázán |
| `cancelled` | → completed / in_progress zakázáno |

Soft invalidate: `lifecycleStatus: withdrawn` (K51). **Žádný hard delete.**

Booking status ≠ Encounter status.

---

## 5. Encounter Types

Minimální vocabulary:

`preventive` | `acute` | `follow_up` | `vaccination` | `laboratory` | `procedure` | `hospitalization` | `telemedicine` | `emergency` | `other`

Rozšiřitelné bez paralelního SSOT.

---

## 6. Versioning

- `version: integer`, start = 1
- Client nikdy není autorita pro version
- DEMO simuluje increment; production vyžaduje atomic CAS

---

## 7. Immutability

Historické `ClinicalEncounterVersionSnapshot` jsou append-only.  
Rewrite stejné verze → `IMMUTABLE_VERSION`.  
`createdAt` / `createdByAccountId` / `petId` immutable.

---

## 8. Optimistic Locking

Mutace vyžadují `expectedVersion`.  
Mismatch → `STALE_VERSION`, žádná mutace.

---

## 9. Provenance

K51:

- `createdAt`, `createdByAccountId` — immutable, trusted actor
- `updatedAt`, `updatedByAccountId` — trusted actor
- `recordSource` — metadata only, never authz

Client forged `createdBy` / `claimedActorAccountId` → DENY.

---

## 10. Authorization

Každý read/write:

SecurityContext → `authorize()` → pet resource → `health.read` / `health.write`.

Nikdy: bookingId / professionalId / organizationId / microchip / bare encounterId jako access shortcut.

---

## 11. Professional Access

Reuse `PetProfessionalAccess` + permissions.  
Role ≠ access. Pending / revoked / expired → DENY / STALE_ACCESS.  
**Nevytvořeno:** ProfessionalEncounterAccess.

Cross-clinic: pro actor vidí jen encounters s matching attribution (viz §27–28).

---

## 12. Organization Access

Reuse `OrganizationPetAccess` + membership AND gate.  
Membership alone → DENY. Org admin alone → DENY.  
**Nevytvořeno:** OrganizationEncounterAccess.

---

## 13. Household Access

Owner / co-owner: stávající health permissions.  
Caregiver: explicit grant. Viewer: DENY.  
Longitudinal view: owner/HH vidí všechny encounters Pet napříč klinikami.

---

## 14. Booking Boundary

- `bookingId?` optional admin FK — **not authz**
- Encounter může existovat bez Booking (walk-in)
- Booking může existovat bez Encounter (no-show)
- Booking cancel ≠ delete Encounter
- Booking complete ≠ clinical complete / finalize

---

## 15. Microchip Boundary

Microchip ≠ authorization / ownership / Encounter access key.

---

## 16. Emergency Boundary

`encounterType=emergency` je stále clinical data.  
`clinical.emergency.write` zůstává `NOT_IMPLEMENTED` / separate — ≠ permanent `health.write`.

---

## 17. HealthRecord Relationship

`HealthRecord.encounterId?` — reference only.  
HealthRecord zůstává SSOT faktů.

---

## 18. Document Relationship

`PetDocument.encounterId?` — reference only.  
Encounter neukládá binary/content. K59 = document storage flow.

---

## 19. Measurement Relationship

`WeightMeasurement.encounterId?` — reference only.  
WeightMeasurement zůstává measurement SSOT. K60 = measurement flow.

---

## 20. Encounter History

`getEncounterHistory(encounterId)` / `getEncounterVersion`.  
Clinical data — authorize first. Not public / booking / microchip.

---

## 21. HealthRecord History Distinction

| Ledger | Říká |
|--------|------|
| Encounter history | jak se měnil kontejner epizody |
| HealthRecord history (K57) | jak se měnil konkrétní klinický fakt |

Nemíchat.

---

## 22. AuditEvent

K48 `AuditEvent` zůstává jediný audit systém.  
Mutace emitují version metadata (`previousVersion` / `newVersion`) přes existující audit hook.  
Žádný ClinicalAudit.

---

## 23. Public Projection

ClinicalEncounter nikdy není public profile data.  
Forbidden keys rozšířeny o `clinicalEncounters`, `encounterId`, `reason`, `bookingId`, …  
Discover / Lost & Found / Emergency public card beze změny leak path.

---

## 24. Professional Projection

Authorize → load → project.  
Cross-clinic filter: org/pro facet vidí jen matching `organizationId` / attribution.

---

## 25. Privacy

`reason`, authorship, version, org/pro/booking ids — never public.  
Žádný microchip / owner PII leak přes Encounter.

---

## 26. Cross-Pet Isolation

Encounter A patří Pet A. Actor nesmí přes Encounter ID načíst Pet B data.  
Wrong pet → `NOT_FOUND` / `FORBIDDEN`.

---

## 27. Cross-Clinic Isolation

Clinic A nevidí automaticky Encounter Clinic B (stejný Pet).  
Explicit grant + attribution filter.

---

## 28. Multi-Clinic

Pet může mít Encounter z více klinik — validní longitudinal model.  
Žádná „owner clinic“.

---

## 29. Error Contract

`UNAUTHENTICATED` | `FORBIDDEN` | `NOT_FOUND` | `STALE_ACCESS` | `STALE_VERSION` | `IMMUTABLE_VERSION` | `INVALID_VERSION` | `INVALID_RESOURCE` | **`INVALID_ENCOUNTER_TRANSITION`** | `SERVER_REQUIRED` | `NOT_IMPLEMENTED`

---

## 30. Demo Authority

`DemoClinicalPersistenceAdapter` + AppContext localStorage keys:

- `lovedandknown.clinicalEncounters`
- `lovedandknown.clinicalEncounterVersions`

**localStorage ≠ production authority.** DEMO ID/clock limitation explicit.

---

## 31. Server Authority

`ServerClinicalPersistenceAdapter.wired = false` → `SERVER_REQUIRED`.  
Žádný fake HTTP / DB / EMR sync.

---

## 32. Backend Requirements

Production musí podporovat: server identity, timestamps, atomic CAS, immutable history, trusted actor, transactional mutate+audit, cross-pet/clinic isolation, migration, backup/restore, retention, future EMR.

K58 **nepředstírá** production backend.

---

## 33. EMR Future Integration

Čistá domain boundary Pet ↔ Encounter ↔ facts.  
Žádná integrace / connector / scraping v K58.

---

## 34. Migration

Additive fields (`encounterId?`, Encounter store).  
Existující HealthRecord bez encounterId zůstávají validní.

---

## 35. Retention

Hard delete zakázán. Soft withdraw + history ledger. Legal retention = out of scope.

---

## 36. Test Matrix

`scripts/assert-clinical-encounter.mts` — A–AX + concurrency + booking regression.  
`scripts/e2e-clinical-encounter.mjs` — wrapper.

---

## 37. K59 Dependency

Clinical Documents: PetDocument + optional `encounterId` + version/provenance + authorize.  
**NESMÍ** vytvořit ClinicalDocument SSOT.

---

## 38. K60 Dependency

Measurements: WeightMeasurement zůstává SSOT; Encounter = context/reference.

---

## 39. K61 Dependency

Clinical Share: Encounter + HealthRecord + authorize + existing Messages.  
**NESMÍ** nový chat.

---

## 40. Explicit Invariants

1. Encounter = container, ne Health SSOT  
2. Pet = authoritative parent  
3. Booking ≠ Encounter ≠ access  
4. version integer + expectedVersion required  
5. completion ≠ finalize ≠ sign  
6. no hard delete / no fake server / no parallel ACL/audit/messaging  

---

## 41. Final Verdict

**DONE** — Clinical Encounter container under ClinicalService authority boundary, with DEMO persistence and SERVER_REQUIRED stub, preserving K47–K57 invariants.
