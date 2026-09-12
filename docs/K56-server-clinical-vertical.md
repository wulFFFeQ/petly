# KROK 56 — Server Clinical Vertical

**Datum:** 2026-09-12  
**Typ:** IMPLEMENTACE — clinical service / authority boundary (ne nový klinický systém)  
**Navazuje na:** [K47](K47-security-authorization-runtime.md), [K48](K48-security-audit-trail-runtime.md), [K50](K50-health-authorization-hardening.md), [K51](K51-clinical-record-integrity.md), [K52](K52-clinical-server-history-architecture-audit.md), [K54](K54-clinical-encounter-architecture-audit.md), [K55](K55-clinical-authority-audit.md)

---

## 1. Executive Summary

K56 zavádí **ClinicalService** jako první skutečnou klinickou aplikační boundary:

```
request → trusted SecurityContext → actor → Pet → authorize() → clinical service → adapter → (K48 audit via authorize)
```

- **Žádný** nový HealthRecord / PetAccess / Permission / Audit systém.
- DEMO = `DemoClinicalPersistenceAdapter` (localStorage / in-memory) — **explicitně ne production**.
- SERVER = `ServerClinicalPersistenceAdapter` stub → `SERVER_REQUIRED` (žádný fake backend).
- Finalize / sign / admin / export / emergency write = **contract only**.

**Verdikt:** DONE — server-authority boundary připravena; production clinical stále vyžaduje K57+ skutečný backend.

---

## 2. Current Architecture

| Layer | Path | Role |
|-------|------|------|
| Identity SSOT | `Pet` | petId boundary |
| Clinical facts SSOT | `HealthRecord`, `PetDocument`, `WeightMeasurement` | unchanged |
| Authn / Authz | `SecurityContext` + `authorize()` | K47 |
| Clinical glue | `clinicalGate` | K50 |
| Provenance | `clinicalProvenance` | K51 |
| Audit | `AuditEvent` / AuditSink | K48 |
| **NEW** Service | `src/lib/clinical/` | K56 authority boundary |
| DEMO UI | AppContext → ClinicalService | mutations |

---

## 3. New Clinical Service Boundary

Soubory:

- `src/lib/clinical/types.ts` — contracts
- `src/lib/clinical/errors.ts` — structured errors
- `src/lib/clinical/adapter.ts` — DEMO + server stub
- `src/lib/clinical/service.ts` — ClinicalService
- `src/lib/clinical/index.ts` — barrel

Operace: `readRecord`, `listRecordsForPet`, `createRecord`, `updateRecord`, `withdrawRecord`, `createWeightMeasurement`, plus contract: `finalizeRecord`, `signRecord`, `adminCorrectRecord`, `exportClinicalHistory`, `emergencyWrite`.

---

## 4. Demo Authority

- `authority: 'demo'`
- Persistence přes injectables / in-memory / DEMO LS hooks
- Actor ze DEMO session (`createDemoSecurityContext` / trusted ctx)
- Stamps z K51 (client-clock DEMO — spoofable; ne production)
- Označeno v typech a dokumentaci: **localStorage ≠ production authority**

---

## 5. Server Authority

- `authority: 'server'`
- `ServerClinicalPersistenceAdapter.wired = false`
- Každá persistence → `SERVER_REQUIRED`
- Žádné fake HTTP, fake DB, fake server timestamps, fake signed/finalized success

---

## 6. Authentication Boundary

Trusted `SecurityContext.authentication` + `actor`.  
Unauthenticated → `UNAUTHENTICATED`.  
Public anonymous → clinical DENY.

---

## 7. Actor Resolution

- Actor **pouze** z SecurityContext (`actorAccountId`)
- `claimedActorAccountId` ≠ trusted → `FORBIDDEN` / `forged_identity` (K47)
- Client nesmí určovat `createdByAccountId` / `updatedByAccountId` / authority

---

## 8. Resource Resolution

- Vždy přes **petId** (record → pet)
- Zakázané auth shortcuts: `bookingId`, `microchip`, `encounterId` alone, `organizationId` alone
- Neexistující / nepřístupné → bezpečné `NOT_FOUND` / `FORBIDDEN`

---

## 9. Authorization

Jediná cesta: existující `authorize()` + HH / Pro / OrgPet / ownership adapters.

Rozšířené `SecurityAction` (K55 FUTURE):

- `clinical.finalize` | `clinical.sign` | `clinical.withdraw` | `clinical.admin` | `clinical.export` | `clinical.emergency.write`

**Nevytvořeno:** `clinical.write`, `clinical.document.*`, `clinical.measurement.write`.

---

## 10. Owner

| Action | Result |
|--------|--------|
| health.read / health.write | ALLOW |
| clinical.sign | **DENY** (nesmí spoofovat clinician) |
| clinical.emergency.write | **DENY** (≠ permanent health.write) |
| clinical.export / finalize / admin / withdraw (vocab) | authorize ALLOW owner-class; service finalize/export/admin → SERVER_REQUIRED |

---

## 11. Co-owner

Stejně jako owner pro běžné HealthRecord R/W (explicit HH `health_*`).  
Nemůže `clinical.sign`.  
Nemůže odebrat původního ownera (stávající ownership invariant; server lock = P1).

---

## 12. Caregiver

K55 variant A zachována: suggested `health_read`, **bez** auto `health_write`.  
Bez explicitního grantu → DENY.  
Žádný implicit clinical write.

---

## 13. Viewer

Clinical access = DENY (petId / recordId / documentId / future encounterId).

---

## 14. Professional

ALLOW pouze: effective `PetProfessionalAccess` + explicit `permissions[]` + valid state.  
Pending / Revoked / Expired / Wrong pet / Wrong professional → DENY.  
Role samotná nestačí.  
`clinical.sign` / finalize / admin **ne** mapovány na `addHealthRecord` (žádný fake clinician).

---

## 15. Organization

`OrganizationMembership` ≠ clinical access.  
`OrganizationPetAccess` ≠ automatický clinical write.  
Org owner/admin ≠ auto clinical.  
ALLOW IF membership + OrgPetAccess + permission (+ eligibility).

---

## 16. Booking Boundary

Booking **nikdy** negrantuje clinical.  
Service: `bookingId` na requestu → FORBIDDEN.  
`authorize(health.*, booking resource)` → isolation DENY.

---

## 17. Microchip Boundary

Microchip identifikuje Pet — **ne** authorization.  
Service: `microchip` na requestu → FORBIDDEN.  
`microchip.read` zůstává owner-only.

---

## 18. Emergency Boundary

`clinical.emergency.write` ≠ `health.write`.  
Owner auto DENY pro emergency action.  
Service `emergencyWrite` → FORBIDDEN / NOT_IMPLEMENTED (time-bound grant = budoucí K63).  
Žádný permanentní emergency clinical access.

---

## 19. Clinical Actions

| Operace | DEMO | Auth action | Runtime |
|---------|------|-------------|---------|
| read | yes | health.read / typed | implemented |
| create / update | yes | typed write | implemented |
| withdraw | soft (K51) | typed write | implemented |
| finalize | — | clinical.finalize | SERVER_REQUIRED |
| sign | — | clinical.sign | FORBIDDEN / SERVER_REQUIRED (no fake) |
| admin correct | — | clinical.admin | SERVER_REQUIRED |
| export | — | clinical.export | SERVER_REQUIRED |
| emergency write | — | clinical.emergency.write | FORBIDDEN / NOT_IMPLEMENTED |

---

## 20. Persistence Adapter

```
ClinicalPersistenceAdapter
├── DemoClinicalPersistenceAdapter  (authority:'demo', wired:true)
└── ServerClinicalPersistenceAdapter (authority:'server', wired:false → SERVER_REQUIRED)
```

Server adapter **není** localStorage wrapper.

---

## 21. Provenance

K51 zachováno:

- `createdAt` immutable on update
- `updatedAt` / `updatedByAccountId` na změně
- `recordSource` metadata only
- soft withdraw: `lifecycleStatus = 'withdrawn'`
- client Partial strip provenance keys

Production timestamps = server (budoucí).

---

## 22. Audit

K48 `AuditEvent` zůstává jediný audit systém.  
Každé `authorize()` rozhodnutí emituje audit.  
Audit failure nemění authorization decision.  
Atomicita mutate+audit = **server transaction requirement** (DEMO LS ≠ transakce).

---

## 23. Transaction Boundary

Budoucí server:

```
authorize + clinical mutation + provenance + version check + audit
```

v jedné transakci dle potřeby.  
Client localStorage se za transakci **nevydává**.

---

## 24. Error Contract

| Code | Meaning |
|------|---------|
| UNAUTHENTICATED | no session |
| FORBIDDEN | not authorized / forged / isolation |
| NOT_FOUND | safe absence |
| STALE_ACCESS | revoked / expired |
| INVALID_RESOURCE | bad input |
| SERVER_REQUIRED | needs real backend |
| NOT_IMPLEMENTED | contract only |

Žádné „something went wrong“ jako auth boundary.  
Žádný leak existence cizích pet/record.

---

## 25. Projection Boundary

Public projection oddělena (`public.pet.project` / `projectPublicPet`).  
ClinicalService nepřijme anonymous clinical read.  
Public nesmí obsahovat HealthRecord / meds / vax / docs / weight / diagnosis / encounter / owner PII / microchip.

---

## 26. Production Requirements

| OPERACE | DEMO | SERVER | CLIENT TRUSTED? | SERVER REQUIRED? |
|---------|------|--------|-----------------|------------------|
| read | yes | contract | no | yes (prod) |
| create | yes | contract | no | yes (prod) |
| update | yes | contract | no | yes (prod) |
| withdraw | soft yes | contract | no | yes (prod) |
| finalize | SERVER_REQUIRED | yes | no | **yes** (+K57) |
| sign | no fake | yes | no | **yes** |
| admin correction | SERVER_REQUIRED | yes | no | **yes** (+K57) |
| export | SERVER_REQUIRED | yes | no | **yes** |
| emergency write | not permanent | time-bound | no | **yes** (K63) |

---

## 27. Test Matrix

`scripts/assert-clinical-service.mts` + `scripts/e2e-clinical-service.mjs`

A–X: owner/co-owner R/W; caregiver/viewer deny; pro active/revoked/expired; org membership deny / grant allow; forged actor/pet; booking/microchip deny; public deny; soft-withdraw; createdAt/updatedBy; finalize/sign/export SERVER_REQUIRED/FORBIDDEN; emergency ≠ health.write; no parallel model.

Regrese: K47, K48, K50, K51 — PASS.

---

## 28. Threat Model

| Threat | Mitigation |
|--------|------------|
| Forged actor | claimedActor ≠ trusted → DENY |
| Client authorship spoof | strip + service stamps |
| Booking escalation | isolation + service shortcut DENY |
| Microchip escalation | never authz |
| Org membership peek | AND gate |
| Fake finalize/sign | SERVER_REQUIRED / no boolean |
| Hard delete history | soft withdraw only |
| LS as production | authority:'demo' explicit |
| Parallel ACL temptation | extend authorize only |

---

## 29. K57 Dependency

K57 musí dodat **VERSION / CLINICAL HISTORY LEDGER**:

- integer `version`
- optimistic locking
- immutable history rows
- correction versions
- finalization state
- server timestamps
- historical reads

K56 **nepředbíhá** K57 (žádný fake optimistic lock).

---

## 30. K58 Dependency

K58 = Clinical Encounter runtime.

K56 resource boundary je kompatibilní: Pet + (future) Encounter + HealthRecord.  
Encounter **nesmí** získat přístup jen přes `bookingId`.  
Authorize přes pet parent + stejný stack.

---

## 31. Limitations

- DEMO stamps spoofable (client clock)
- Document blob path stále AppContext + clinicalGate (authorize zachován; plná service migrace docs = K59)
- Finalize/sign/admin/export/emergency unimplemented on purpose
- No real HTTP backend
- Weight soft-withdraw parity = budoucí

---

## 32. Explicit Invariants

- Pet = SSOT identity
- HealthRecord = SSOT clinical facts
- Ownership ≠ access; Role ≠ access; Role ≠ permission
- Household ≠ Professional ≠ Organization
- OrganizationMembership ≠ clinical access
- Booking ≠ clinical access; Payment ≠ clinical access
- Microchip ≠ authorization
- Emergency ≠ permanent access
- Public ≠ clinical
- AuditEvent ≠ clinical history
- localStorage ≠ production authority
- Client-side checks ≠ security boundary
- No fake server / signed / finalized state
- No hard delete clinical history
- No parallel access / permission / authorization / audit systems
- SecurityContext + authorize() = jediná centrální authz cesta
- K51 provenance zachována; K48 audit zachován

---

## 33. Final Verdict

### **DONE — K56 SERVER CLINICAL VERTICAL BOUNDARY**

Implementována konzervativní ClinicalService boundary nad existujícím Health domainem.  
Production clinical authority stále vyžaduje skutečný server + K57 version/history před finalize a K58 Encounter.

**K56 JE SERVER-AUTHORITY BOUNDARY, NE NOVÝ KLINICKÝ SYSTÉM.**
