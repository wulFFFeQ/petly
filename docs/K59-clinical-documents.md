# KROK 59 — Clinical Documents / PetDocument Hardening

**Datum:** 2026-09-12  
**Typ:** IMPLEMENTACE — PetDocument jako Document SSOT + clinical boundary  
**Navazuje na:** [K47](K47-security-authorization-runtime.md), [K48](K48-security-audit-trail-runtime.md), [K50](K50-health-authorization-hardening.md), [K51](K51-clinical-record-integrity.md), [K52](K52-clinical-server-history-architecture-audit.md), [K54](K54-clinical-encounter-architecture-audit.md), [K55](K55-clinical-authority-audit.md), [K56](K56-server-clinical-vertical.md), [K57](K57-clinical-versioning-history.md), [K58](K58-clinical-encounter.md)

---

## 1. Executive Summary

K59 hardenuje existující **PetDocument** jako jediný Document SSOT pod ClinicalService.

```
Pet → PetDocument (SSOT) → optional ClinicalEncounter reference
```

- Žádný ClinicalDocument / DocumentAccess / DocumentPermission / DocumentAudit.
- Autorizace: SecurityContext → `authorize()` → `documents.read` / `documents.write`.
- Verzování: integer `version` + `expectedVersion` CAS + immutable `PetDocumentVersionSnapshot` ledger.
- Soft withdraw (`active` → `withdrawn`); žádný hard delete klinické historie.
- DEMO = localStorage meta + IndexedDB blobs; SERVER stub → `SERVER_REQUIRED`.
- Upload ≠ finalize / sign / export.

**Verdikt:** DONE — PetDocument clinical document boundary připravena; production blob/storage zůstává backend requirement.

---

## 2. PetDocument as Document SSOT

PetDocument je jediný document model. Encounter / HealthRecord / WeightMeasurement na něj mohou odkazovat, ale nevlastní content.

---

## 3. Clinical vs Non-Clinical Documents

Jeden model pokrývá běžné, klinické i administrativní dokumenty. Klinický context = volitelné `encounterId?` (reference only).

---

## 4. Document Types

Zachována stávající vocabulary (`PetDocumentCategory` + `documentType` via `documentCategories.ts`): identification / health / insurance / breeding / travel / other (+ typed subtypes). Žádné stovky nových typů.

---

## 5. Encounter Relationship

`PetDocument.encounterId?` = klinická reference.  
`encounterId ≠ access`. Encounter nevlastní document content. Encounter withdraw nemaže dokumenty.

---

## 6. HealthRecord Relationship

HealthRecord = clinical facts SSOT. Document může být propojen (např. lab PDF), ale není kopií HealthRecord.

---

## 7. WeightMeasurement Relationship

WeightMeasurement = measurement SSOT. Document screenshot váhy ≠ measurement record.

---

## 8. Lifecycle

`lifecycleStatus`: `active` | `withdrawn` (+ `withdrawnAt` / `withdrawnByAccountId`). Hard delete klinického dokumentu: NE.

---

## 9. Versioning

`version: integer` (start 1). Mutace vyžadují `expectedVersion`. Mismatch → `STALE_VERSION` (žádný silent overwrite).

---

## 10. Immutability

`PetDocumentVersionSnapshot` je append-only. Clash na stejnou `(documentId, version)` → `IMMUTABLE_VERSION`.

---

## 11. Corrections

`correctDocument` vytvoří novou verzi s `correctionOfVersion` / `correctionReason`. Historie se nepřepisuje.

---

## 12. Soft Withdraw

`withdrawDocument`: active → withdrawn, historie zachována. Ordinary `readDocument` → `NOT_FOUND`. History API stále dostupná authorized actorovi.

---

## 13. Provenance

Create stamps: `uploadedAt` / `uploadedByAccountId` (immutable).  
Update: `updatedAt` / `updatedByAccountId` z trusted actor.  
`recordSource` = metadata only, never authz.

---

## 14. Authorization

Každý READ/WRITE: SecurityContext → `authorize()` → pet resource → `documents.read` / `documents.write` → projection.  
Nikdy: encounterId / bookingId / professionalId / org membership / microchip → access.

---

## 15. Owner

Owner dle existujících health/document permissions (pet ownership).

---

## 16. Household

Co-owner: dle grantu. Caregiver: explicit grant only. Viewer: DENY.

---

## 17. Professional

`PetProfessionalAccess` + `viewDocuments` / `addNote`. Revoked / expired / pending → DENY. Role samotná → DENY.

---

## 18. Organization

Membership alone → DENY. `OrganizationPetAccess` + document permission → ALLOW. Org admin alone → DENY.

---

## 19. Booking Boundary

Booking ≠ document access. Cancellation / completion nevytváří ani nemaže dokumenty.

---

## 20. Encounter Boundary

Encounter existence / status ≠ document authorization. Completion ≠ document finalization.

---

## 21. Microchip Boundary

Microchip nikdy není authorization ani document lookup proof.

---

## 22. Emergency Boundary

Emergency / finder / Lost & Found nikdy automaticky nezískají clinical documents.

---

## 23. Public Projection

`documents` in `PUBLIC_PAYLOAD_FORBIDDEN_KEYS`. Žádný public clinical document exposure.

---

## 24. Professional Projection

Authorize first. Scrub `storageKey`, `url`, account provenance IDs via `toAuthorizedDocumentView(..., 'professional')`.

---

## 25. Organization Projection

Membership + OrganizationPetAccess + permission. Same storage/PII scrub as professional.

---

## 26. File Content Security

DEMO: IndexedDB blobs + meta localStorage. Production must: MIME/size validation, malware scan, private bucket, no predictable public URL, short-lived authorized download. DEMO does **not** claim production file security.

---

## 27. Download Authorization

UI download gated by `documents.read`. DEMO object URL after authorize. No fake signed URLs in K59.

---

## 28. AuditEvent

Pouze K48 AuditEvent (+ version transition metadata). Žádný DocumentAudit.

---

## 29. Privacy

Public: omit documents / storage / provenance / encounter / clinical metadata / owner PII.

---

## 30. Cross-Pet Isolation

Document A patří Pet A. Actor s přístupem k Pet B → DENY / NOT_FOUND bez leak existence.

---

## 31. Cross-Clinic Isolation

Clinic B bez OrganizationPetAccess → DENY i při stejném pet / encounter / booking / owner.

---

## 32. Multi-Clinic

Pet může mít dokumenty z clinic A/B/C. Owner longitudinal view dle práv. Clinic A nevidí B/C bez authz.

---

## 33. Storage

| Layer | DEMO | Production |
|-------|------|------------|
| Meta | `lovedandknown.petDocuments` | server-authoritative |
| Versions | `lovedandknown.petDocumentVersions` | atomic CAS + ledger |
| Blobs | IndexedDB `lovedandknown-documents` | secure object storage |

Server adapter: `wired=false` → `SERVER_REQUIRED`. Žádný fake S3.

---

## 34. Migration

Missing `version` → 1. Missing `encounterId` → undefined. Žádná fabricated history / autoři.

---

## 35. GDPR/Retention

Contract only: retention, withdraw, legal hold, deletion policy, export, access request. GDPR engine NEIMPLEMENTOVÁN. Clinical retention ≠ random localStorage wipe.

---

## 36. Backend Requirements

Production must support: server identity, persistent file metadata, secure object storage, authz before metadata/content/mutation, server timestamps, atomic version CAS, immutable history, transactional mutation+AuditEvent, cross-pet/clinic isolation, retention/withdraw policy, backup/restore, malware/MIME/size validation, short-lived download, access logging.

---

## 37. EMR Future Integration

Připraveno na budoucí `externalDocumentId?` / `externalSource?` pouze pokud bezpečné. Žádný fake sync / scraping.

---

## 38. Error Contract

`UNAUTHENTICATED` | `FORBIDDEN` | `NOT_FOUND` | `STALE_ACCESS` | `STALE_VERSION` | `IMMUTABLE_VERSION` | `INVALID_VERSION` | `INVALID_RESOURCE` | `INVALID_DOCUMENT` | `SERVER_REQUIRED` | `NOT_IMPLEMENTED`

---

## 39. Test Matrix

`scripts/assert-clinical-documents.mts` + `scripts/e2e-clinical-documents.mjs`  
Coverage: A–BD, concurrency CAS, booking/encounter regressions, privacy scrub, no parallel SSOT.

---

## 40. K60 Dependency

K60 = Measurements. WeightMeasurement zůstává SSOT. Documents mohou obsahovat measurement-related files, ale nejsou LabMeasurement SSOT.

---

## 41. K61 Dependency

K61 = Clinical Share. K59 pouze bezpečný document resource boundary. Messages zůstávají canonical messaging.

---

## 42. Explicit Invariants

- PetDocument = jediný Document SSOT
- Žádný ClinicalDocument / DocumentAccess / DocumentPermission / DocumentAudit / DocumentChat
- encounterId ≠ authorization
- HealthRecord / WeightMeasurement SSOTs unchanged
- version integer + expectedVersion required
- soft withdraw only
- uploadedAt / uploadedBy immutable
- documents.read/write vocabulary (no clinical.document.*)
- PetProfessionalAccess / OrganizationPetAccess / Household unchanged
- K48 only audit; K57 versioning; K58 encounter boundary preserved
- localStorage ≠ production authority

---

## 43. Final Verdict

**DONE** — K59 PetDocument hardening complete under ClinicalService. Production blob storage, signed downloads, transactional audit, and GDPR engine remain backend/future work (not faked).

DEMO blob note: content replace overwrites IndexedDB blob by `storageKey`; immutable history freezes **metadata** snapshots. Production must version object storage keys separately.
