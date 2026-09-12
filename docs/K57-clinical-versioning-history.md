# KROK 57 — Clinical Versioning & Immutable History

**Datum:** 2026-09-12  
**Typ:** IMPLEMENTACE — version / clinical history ledger (ne nový Health systém)  
**Navazuje na:** [K47](K47-security-authorization-runtime.md), [K48](K48-security-audit-trail-runtime.md), [K50](K50-health-authorization-hardening.md), [K51](K51-clinical-record-integrity.md), [K52](K52-clinical-server-history-architecture-audit.md), [K54](K54-clinical-encounter-architecture-audit.md), [K55](K55-clinical-authority-audit.md), [K56](K56-server-clinical-vertical.md)

---

## 1. Executive Summary

K57 přidává **server-ready integer versioning** a **immutable history** pro existující klinický SSOT (`HealthRecord`), s kompatibilní přípravou `version` na `PetDocument` / `WeightMeasurement`.

```
request → SecurityContext → authorize()
  → expectedVersion CAS → append immutable snapshot
  → write current (version+1) → K48 audit (+ version metadata)
```

- Žádný nový Health / Access / Permission / Audit systém.
- Historie = verze **stejného** `HealthRecord`, ne paralelní SSOT.
- DEMO simuluje increment + CAS; **DEMO ≠ production concurrency**.
- Finalize / sign / admin / export zůstávají `SERVER_REQUIRED`.

**Verdikt:** DONE — versioned clinical history boundary připravena.

---

## 2. Why Versioning Exists

Bez verzí DEMO i budoucí server umožní silent overwrite při souběžných editacích. K57 zajišťuje:

- optimistic locking (`expectedVersion`)
- immutable historical snapshots
- bezpečné corrections jako nové verze
- připravenost pro finalize/sign (bez fake success)

---

## 3. SSOT

| Model | Role | K57 |
|-------|------|-----|
| `HealthRecord` | Klinický SSOT faktů | `version` + immutable version ledger |
| `PetDocument` | Dokumenty SSOT | additive `version` (full ledger = migration / K59) |
| `WeightMeasurement` | Měření SSOT | additive `version` on create |

**NEDĚLEJ:** `ClinicalRecord`, `ClinicalHistoryRecord`, paralelní Health store.

---

## 4. Version Model

- `version: integer`, start = `1`
- Každá platná mutace: `previous + 1`
- Client **nikdy** není autorita pro `version` (strip / ignore)
- DEMO: `authority: 'demo'` simuluje increment
- Production: server authority + atomic CAS

---

## 5. Current Version

Current = řádek v `healthRecords` s nejvyšší aktivní `version`.  
`getCurrentRecord` / `readRecord` vrací pouze current (withdrawn → `NOT_FOUND` na ordinary read).

---

## 6. Historical Versions

`HealthRecordVersionSnapshot`:

- `recordId`, `petId`, `version`, `frozenAt`, `mutationKind`
- optional `correctionOfVersion`, `correctionReason` (internal)
- `record`: frozen `HealthRecord` payload

Ledger přes adapter — **ne** nový Health SSOT.

---

## 7. Immutability

Zakázáno: update/delete/rewrite historical version, změna author/timestamp/version number historie.  
Chyba → nová correction version.

---

## 8. Optimistic Locking

```ts
updateRecord({ expectedVersion, input: { recordId, updates } })
```

Mismatch → `STALE_VERSION`, žádná mutace (ani partial, ani updatedAt).

---

## 9. Concurrency

Actor A čte v4; Actor B 4→5; Actor A `expectedVersion=4` → `STALE_VERSION`.  
Current zůstává 5; historie intaktní; žádná v6.

DEMO nesimuluje DB-level locking — pouze compare-and-swap v processu.

---

## 10. Provenance

Create: `createdAt`, `createdByAccountId`, `recordSource`, `version=1`.  
Update: `createdAt` / `createdByAccountId` immutable; `updatedAt` / `updatedByAccountId` trusted actor; `version++`.  
`recordSource` = metadata only — **nikdy** authz shortcut (K51).

---

## 11. Corrections

`correctRecord` → nová version s `mutationKind: 'correct'`.  
Předchozí verze zůstávají immutable.  
`correctionReason` není public projection.

`adminCorrectRecord` zůstává `SERVER_REQUIRED` (production admin path).

---

## 12. Withdraw

K51 soft withdraw + version bump: active vN → withdrawn vN+1.  
Historie zachována; **žádný hard delete**.

---

## 13. Finalization Compatibility

Invariant: finalized version cannot be silently overwritten.  
K57 **neimplementuje** fake `isFinalized=true`.  
`finalizeRecord` → authorize → `SERVER_REQUIRED`.

---

## 14. Signing Compatibility

Stejně: `signRecord` → `SERVER_REQUIRED` / owner DENY.  
Žádný client `signed=true`.

---

## 15. ClinicalService

Rozšíření K56:

| Method | Poznámka |
|--------|----------|
| `createRecord` | version 1 + snapshot |
| `updateRecord` | require `expectedVersion` |
| `correctRecord` | versioned correction |
| `withdrawRecord` | versioned soft withdraw |
| `getCurrentRecord` | current only |
| `getRecordHistory` | authorized clinical read |
| `getRecordVersion` | authorized historical read |
| finalize/sign/admin/export | `SERVER_REQUIRED` |

---

## 16. Persistence Adapter

- DEMO: in-memory / LS hooks (`lovedandknown.healthRecordVersions`)
- Append-only; overwrite same `(recordId, version)` → `IMMUTABLE_VERSION`
- Server stub: všechny history metody → `SERVER_REQUIRED`

---

## 17. Authorization

Jediná cesta: `SecurityContext` → `authorize()` (+ clinicalGate).  
History není public, není booking/microchip, není automatic role grant.  
Professional/Org: effective access + explicit permission.  
Role ≠ permission. OrganizationMembership ≠ clinical access.

---

## 18. AuditEvent

K48 zůstává jediný audit systém (`authorization_decision`).  
Po successful mutation: metadata `{ previousVersion, newVersion }` (čísla).  
Žádný ClinicalAudit.

---

## 19. Audit vs Clinical History

| Layer | Otázka |
|-------|--------|
| Clinical history | Jaký byl klinický obsah verze N? |
| AuditEvent | Kdo dostal ALLOW/DENY a s jakým version transition metadata? |

Nemíchat.

---

## 20. Encounter Compatibility

K58: `Pet → ClinicalEncounter → versioned HealthRecord`.  
Encounter nesmí být druhá historie HealthRecord ani auth shortcut.

---

## 21. Booking Boundary

`bookingId` v requestu → `FORBIDDEN` (isolation). Booking ≠ clinical access.

---

## 22. Microchip Boundary

`microchip` v requestu → `FORBIDDEN`. Microchip ≠ authorization.

---

## 23. Public Projection

Žádný HealthRecord, history, version, diagnosis, medication, documents, weight history, provenance, correction metadata.  
`PUBLIC_PAYLOAD_FORBIDDEN_KEYS` rozšířen o `version`, `mutationKind`, `correctionOfVersion`, `correctionReason`.

---

## 24. Professional Projection

Authorize first → current/history selection → projection.  
Historical access není automaticky širší než current read.

---

## 25. Organization

Membership ≠ OrgPetAccess ≠ clinical history access.  
Každý history/mutate request přes `authorize()`.

---

## 26. Household

Owner/co-owner: `health.read` / `health.write` dle K55.  
Historical versions stále immutable — owner nesmí přepsat starou verzi.

---

## 27. Error Contract

Existující + nové:

- `STALE_VERSION`
- `IMMUTABLE_VERSION`
- `INVALID_VERSION`

Plus: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `STALE_ACCESS`, `INVALID_RESOURCE`, `SERVER_REQUIRED`, `NOT_IMPLEMENTED`.

---

## 28. Demo Limitations

- `authority: 'demo'`
- localStorage / in-memory ≠ production authority
- Žádná skutečná DB transaction
- Žádná falešná concurrency guarantee napříč procesy/taby
- Client clock stamps (K51 DEMO)

**DEMO ≠ production authority.**

---

## 29. Server Requirements

Production backend MUST provide:

- server-authoritative version
- atomic compare-and-swap
- immutable history persistence
- server timestamps + trusted actor
- transactional mutation + history (+ audit reliability boundary)
- authorization before mutation
- concurrent overwrite protection
- migration / retention / backup strategy

NEIMPLEMENTOVÁNO jako fake client functionality.

---

## 30. Migration

Existing current record bez `version` → `version = 1` (+ jeden snapshot při první mutaci/history read).  
Nesmí: ztráta dat, změna `createdAt`/authorship, falešná multi-verze historie.

PetDocument / WeightMeasurement: additive `version`; full history ledger = documented migration (K59 / later).

---

## 31. GDPR / Retention Considerations

Clinical history retention ≠ audit retention.  
Deletion/anonymization musí respektovat legal retention, clinical integrity, audit integrity, GDPR, backup lifecycle.  
**LEGAL REVIEW REQUIRED** — K57 nevymýšlí konkrétní zákonné lhůty.

---

## 32. Threat Model

| Threat | Mitigation |
|--------|------------|
| Silent overwrite | `expectedVersion` CAS |
| History rewrite | append-only + `IMMUTABLE_VERSION` |
| Forged actor / version | strip + forged claim DENY |
| Auth via booking/chip | isolation DENY |
| Public leak of history | forbidden keys + no public clinical |
| Fake finalize/sign | `SERVER_REQUIRED` |
| Parallel ACL/audit | reuse authorize + K48 only |

---

## 33. Test Matrix

`scripts/assert-clinical-versioning.mts` — A–AJ + concurrency + correction.  
`scripts/e2e-clinical-versioning.mjs` — spouští assert.

---

## 34. K58 Dependency

K58 Clinical Encounter musí použít versioned `HealthRecord`.  
Encounter ≠ Health SSOT; Booking ≠ health access.

---

## 35. K59 Dependency

K59 Clinical Documents Storage: `PetDocument` + versioning/provenance + authorize.  
Nesmí vytvořit `ClinicalDocument` SSOT.

---

## 36. Explicit Invariants

1. HealthRecord zůstává SSOT  
2. Version je integer, ne client-authoritative  
3. Historie immutable  
4. STALE_VERSION → no mutation  
5. createdAt/createdBy immutable on update  
6. updatedBy = trusted actor  
7. Correction = new version  
8. Withdraw = soft + versioned  
9. No fake finalize/sign  
10. AuditEvent ≠ clinical history  
11. SecurityContext + authorize() jediná authz cesta  
12. DEMO ≠ production  

---

## 37. Final Verdict

**DONE** — K57 versioned clinical history ledger na existující ClinicalService boundary.  
Production stále vyžaduje skutečný server transaction + CAS + persistent history před finalize/sign.
