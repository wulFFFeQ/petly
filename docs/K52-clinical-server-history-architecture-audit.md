# KROK 52 — Clinical Server / History Architecture Audit

**Datum:** 2026-09-12  
**Typ:** POUZE ARCHITEKTONICKÝ AUDIT — žádný aplikační kód, žádné API, žádná DB, žádný fake server.  
**Navazuje na:** [K46](K46-server-security-context-architecture.md), [K47](K47-security-authorization-runtime.md), [K48](K48-security-audit-trail-runtime.md), [K50](K50-health-authorization-hardening.md), [K51](K51-clinical-record-integrity.md)

**Cíl:** Navrhnout produkční serverovou autoritu pro klinická data LOVED & KNOWN tak, aby DEMO/localStorage mohl být nahrazen BEZ přepisování existující doménové architektury.

**Poznámka k číslování:** Starší roadmapy (K45/K46/K49) používají „K52“ jinak (QR / veterinary workflow). Tento dokument je výslovně **clinical server / history architecture audit** dle K51 §19 BACKEND REQUIREMENTS.

---

## Absolutní zákazy (K52)

K52 **neimplementuje** a **nemění**:

- aplikační kód (`src/**`)
- backend / API / databázi / route / UI
- nový Health / Access / Permission / Auth model
- nový storage / migraci / fake production authority
- nový AuditEvent systém (K48 zůstává)
- offline sync runtime

Výstup je pouze tento dokument.

---

## 1. Current K51 architecture

### 1.1 Clinical SSOT (zachovat)

| Model | Role | DEMO storage |
|-------|------|--------------|
| `HealthRecord` | Polymorphic clinical SSOT (`vaccination` / `vet` / `medication` / `examination` / `assessment`) | `lovedandknown.healthRecords` (localStorage) |
| `PetDocument` | Document metadata + blob reference | meta LS + IndexedDB blobs |
| `WeightMeasurement` | Weight history (separate store) | `lovedandknown.weightMeasurements` |

**Žádný paralelní Health model.** Diagnosis/lab jako first-class typy zůstávají budoucí rozšíření `HealthRecordType`, ne nová entita.

### 1.2 Provenance / lifecycle (K51)

Na `HealthRecord` / `PetDocument` (a částečně weight):

- `createdAt` / `updatedAt`
- `createdByAccountId` / `updatedByAccountId` (docs: `uploadedByAccountId`)
- `recordSource?: owner | co_owner | caregiver | professional | organization` — **metadata only, never authz bypass**
- `lifecycleStatus?: active | withdrawn` + `withdrawnAt` / `withdrawnByAccountId`

**Chybí:** `version` / revision / clinical history ledger / server clock authority.

### 1.3 Hranice (SSOT access / security)

```
Session (DEMO)
  → SecurityContext(authority='demo')
  → clinicalGate → authorize()
  → Pet ownership | PetHouseholdAccess | PetProfessionalAccess | OrganizationPetAccess
  → stamp (clinicalProvenance) → mutate AppContext / LS
  → project* (HH / Pro / Org) — after ALLOW only
  → K48 AuditSink (authorization_decision only)
```

Invarianty:

- Ownership ≠ access ≠ membership ≠ role ≠ privacy settings
- Role ≠ permission
- Projection ≠ authorization
- AuditEvent ≠ clinical history
- Hard delete nahrazen soft withdraw

### 1.4 Edit policy (K51 — zachovat)

**Pet-scoped:** kdokoliv s legitimním type-mapped write (`health.write` / `vaccination.write` / `medication.write` / `labs.write` / `documents.write`) pro konkrétní Pet může upravit **aktivní** klinický záznam toho Pet. Withdrawn → reject further edits.

---

## 2. Server authority model

### 2.1 Přechod DEMO → PRODUCTION

| | DEMO | PRODUCTION |
|--|------|------------|
| `SecurityContext.authority` | `'demo'` | `'server'` |
| Session | `createDemoSecurityContext()` / `getSelfAccount()` | Authenticated server session / token |
| ACL grants | localStorage loaders | Server-side grant store |
| Timestamps | Client `Date` via stamps | Server clock |
| Authorization | Client `authorize()` (honest DEMO contract) | Server `authorize()` before every mutation/read projection |
| Persistence | localStorage / IndexedDB | Production DB + object storage |

```
DEMO:
  SecurityContext(authority='demo') → localStorage

PRODUCTION:
  SecurityContext(authority='server')
    → authenticate session/token
    → resolve actor on server
    → authorize() server-side
    → persist under server transaction
```

### 2.2 Kritické pravidlo

**localStorage nikdy není production authority.**

V production je LS (pokud vůbec) pouze offline cache / UX hint. Server musí:

- ignorovat client-claimed `actorAccountId`
- ignorovat client-claimed permissions / grants
- ignorovat client-claimed `createdAt` / `updatedAt` / withdraw stamps
- ignorovat client-claimed ownership

`authority: 'demo'` zůstává explicitní značka, že runtime **není** produkční security.

---

## 3. Clinical persistence

### 3.1 Princip

Jedna tabulka / kolekce na existující doménový model. **Bez** paralelního Health systému.

Navrhovaná mapování (design only):

| Domain | Persistence unit | Blob |
|--------|------------------|------|
| `HealthRecord` | `health_records` row | — |
| `PetDocument` | `pet_documents` row (metadata) | Object storage via `storageKey` |
| `WeightMeasurement` | `weight_measurements` row | — |

### 3.2 Společná serverová pole

| Field | HealthRecord | PetDocument | WeightMeasurement | Control |
|-------|--------------|-------------|-------------------|---------|
| Primary key `id` | ano | ano | ano | SERVER-ISSUED (nebo accepted only if unused + validated on migrate) |
| `petId` | ano | ano | ano | SERVER-VALIDATED against Pet |
| `createdAt` | ano | ≈ `uploadedAt` | ano | **SERVER-CONTROLLED** |
| `createdByAccountId` / `uploadedByAccountId` | ano | ano | ano | **SERVER-CONTROLLED** |
| `updatedAt` | ano | ano | ano | **SERVER-CONTROLLED** |
| `updatedByAccountId` | ano | ano | ano | **SERVER-CONTROLLED** |
| `lifecycleStatus` | ano | ano | **production extension of existing model** (DEMO dnes nemá) | SERVER-CONTROLLED |
| `withdrawnAt` / `withdrawnByAccountId` | ano | ano | production extension | SERVER-CONTROLLED |
| `recordSource` | ano | ano | ano | SERVER-DERIVED metadata (from access path), not client authority |
| `version` (integer) | ano | ano | ano | **SERVER-CONTROLLED** — new production field on existing models |

### 3.3 CLIENT-SUPPLIED vs SERVER-CONTROLLED

**CLIENT-SUPPLIED** (po validaci):

- Clinical content: `type`, `title`, `subtitle`, `date` (clinical event date display), `doctor`, `clinic`, `status` (workflow), vaccine/med fields, `notes`
- Document meta content: `name`, `category`, `documentType`, `fileName`, mime/size claims (server re-measures on upload), `issuedAt` / `expiresAt`, `notes`
- Weight: `date`, `weight`, `note`
- Optional change reason for history (string, capped)

**SERVER-CONTROLLED** (client nesmí autoritativně nastavit):

- `id` (create: server assigns or validates uniqueness)
- `petId` binding after create
- `createdAt`, `updatedAt`, actor account IDs
- `lifecycleStatus`, withdraw stamps
- `recordSource` derivation
- `version`
- ownership of Pet
- access grants / permissions
- authorization result
- `storageKey` assignment for blobs
- `isPublic` forced false for clinical docs

### 3.4 Weight DEMO gap

DEMO `WeightMeasurement` nemá `lifecycleStatus`. Production **rozšíří stejný model** o lifecycle pole (jako K51 u Health/Docs) — ne novou entitu.

---

## 4. Provenance (server timestamps)

### 4.1 Pravidla

| Field | Rule |
|-------|------|
| `createdAt` | Server-generated on INSERT; immutable thereafter |
| `updatedAt` | Server-generated on every successful mutation / withdraw / restore |
| `createdByAccountId` | From authenticated actor at create; immutable |
| `updatedByAccountId` | From authenticated actor on mutation |
| Withdraw stamps | Server-generated; only via withdraw path |

### 4.2 Klient nesmí být autorita pro

- `createdAt` / `updatedAt`
- `actorAccountId` / `*ByAccountId`
- ownership (`Pet.ownerAccountId`)
- access grants
- authorization result
- `version`
- `lifecycleStatus` (kromě request intent „withdraw“ / „restore“, které server rozhodne)

Client `Partial` musí být stripován stejně jako DEMO `stripClinicalClientUpdates` — na serveru povinně.

---

## 5. Versioning / optimistic concurrency

### 5.1 Porovnání

| Varianta | Pros | Cons |
|----------|------|------|
| **A) Integer `version`** | Jednoznačné, collate-friendly, standard optimistic lock (`WHERE id=? AND version=?`), snadný `If-Match` | Vyžaduje nové pole |
| B) „Revision number“ | Stejné jako A pod jiným jménem | Ambiguous naming vs clinical history revision |
| C) `updatedAt` comparison | Bez nového pole | Clock skew / equal timestamps / precision races; slabší pro concurrent edits |

### 5.2 Doporučení (commit)

**A) Integer `version`.**

- Start `1` on create
- Increment by 1 on every successful update / withdraw / restore
- Client sends expected `version` (header `If-Match` nebo body)
- Mismatch → `stale_version` (HTTP 409)
- **NEIMPLEMENTOVÁNO v K52** — pouze požadavek pro production

`updatedAt` zůstává audit/display stamp, **ne** concurrency token.

---

## 6. Clinical history

### 6.1 Tři oddělené koncepty

| Layer | Otázka | Store |
|-------|--------|-------|
| **A) Current record** | Jaký je aktuální stav klinického záznamu? | `health_records` / `pet_documents` / `weight_measurements` |
| **B) Clinical history** | Kdo změnil jakou hodnotu z A na B a kdy? | Append-only clinical history store |
| **C) Authorization audit** | Dostal actor ALLOW/DENY pro action Y? | K48 `AuditEvent` / `AuditSink` |

**Tyto tři věci NESMÍ být zaměněny.**

`AuditEvent` z K48 **není** automaticky klinická historie. K48 neobsahuje clinical payloads (by design).

### 6.2 Clinical history entry (design)

Append-only záznam (logická struktura, ne runtime typ v app):

- `historyId`
- `recordKind`: `health_record` | `pet_document` | `weight_measurement`
- `recordId`, `petId`
- `changedAt` (server)
- `changedByAccountId` (server)
- `mutation`: `create` | `update` | `withdraw` | `restore` | `replace_blob`
- `versionBefore` / `versionAfter`
- `before` / `after` — field-level diff nebo snapshot subset klinického obsahu (ne microchip/owner PII)
- `reason?` — optional client-supplied, validated length
- `correlationId` / `requestId`

### 6.3 Co history umožní zjistit později

- původní hodnotu
- kdo ji změnil
- kdy ji změnil
- novou hodnotu
- důvod změny, pokud byl dodán

### 6.4 Co history NENÍ

- Náhrada za `authorize()` rozhodnutí
- Náhrada za access logs UI
- Event-sourcing jako jediný SSOT current state (current record zůstává SSOT; history je append-only audit trail hodnot)

---

## 7. Withdraw

### 7.1 Význam

`lifecycleStatus = 'withdrawn'` = soft retire. Záznam **zůstává fyzicky v DB**. Není hard delete. Není „never existed“.

### 7.2 Kdo může withdraw

Stejná pet-scoped write permission jako edit (type-mapped write / `documents.write`).  
Owner + Co-owner (full health), Caregiver/Professional/Organization pouze s explicitním grant + permission.

Role sama o sobě nestačí.

### 7.3 Viditelnost

| Audience | Vidí withdrawn? |
|----------|-----------------|
| Běžné UI / default list projections | Ne (filter `lifecycleStatus !== 'withdrawn'`) |
| Privileged clinical / compliance query | Ano, po zvláštní authorize action (např. `health.history.read` / admin — **budoucí permission, ne nový access model v K52**; do té doby owner-only restore/view withdrawn) |
| Public / Discover | Nikdy |

### 7.4 Obnova (restore)

- Možná: `withdrawn` → `active`, `version++`, clinical history `restore`, K48 audit na authorize
- Kdo: pet-scoped write (stejná politika) — nebo užší owner-only politika v production legal review
- Clear withdraw stamps or retain last withdraw for history (prefer retain history row; current row clears `withdrawnAt` on restore)

### 7.5 Auditovatelnost

- Clinical history: povinná (`withdraw` / `restore`)
- K48: authorize decision na withdraw action
- Data zůstávají v DB pro retention / legal hold (**LEGAL REVIEW REQUIRED**)

---

## 8. Edit policy (K51 zachováno)

Pet-scoped permission. **Nevymýšlet nový access model.**

| Actor | Health access |
|-------|---------------|
| Owner | Full |
| Co-owner | Full (`health_read` + `health_write` defaults) |
| Caregiver | Explicit permission only |
| Professional | `PetProfessionalAccess` + explicit health permission |
| Organization | `OrganizationPetAccess` + membership eligibility + explicit health permission |
| Viewer | No health (unless explicit grant — defaults deny) |

**Role ≠ permission.** Stored `permissions[]` decide.

---

## 9. Authorization order

Přesný serverový pořadník:

1. **authenticate** — session/token; reject anonymous for clinical mutations  
2. **resolve actor** — server-only `actorAccountId`; discard client claims  
3. **resolve Pet** — by `petId`; `pet_not_found` if missing  
4. **resolve access** — ownership + load effective HH/Pro/Org grant for activeMode (no privilege UNION)  
5. **authorize** — existing `authorize()` semantics / actions  
6. **validate mutation** — schema, strip forbidden keys, withdrawn reject, content limits  
7. **concurrency check** — `version` match  
8. **persist mutation** — update current record  
9. **clinical history** — append history row (same transaction as 8)  
10. **audit** — K48 authorization_decision (reliability boundary může být oddělená)  
11. **projection / response** — re-verify access; return allowlisted view  

### 9.1 Bezpečnost pořadníku

Pořadník je bezpečný, pokud:

- kroky 1–5 před jakýmkoli write
- krok 7 před persist
- 8+9 atomicky
- 11 nikdy nevrací raw DB row bez re-check
- DENY v 5 ukončí pipeline před persist

---

## 10. Transaction boundaries

### 10.1 Atomické

**Musí být v jedné DB transakci:**

- clinical mutation (INSERT/UPDATE current record + `version`)
- clinical history append

Nesmí vzniknout stav: mutated current bez history, nebo history bez current (kromě čistého rollbacku obojího).

### 10.2 Audit (K48) reliability

Audit **může** mít jinou reliability boundary (outbox / async retry).

Při výpadku auditu po úspěšném clinical commit:

- clinical write **zůstává** committed
- authorize rozhodnutí se **nemění** (ALLOW zůstává ALLOW)
- audit se doplní retry/outbox
- monitoring alert na missing audit

Audit failure **nesmí** rollbacknout úspěšnou klinickou mutaci ani flipnout security decision.

---

## 11. Projection

Zachovat existující projekce:

- `household/project.ts` → `HouseholdPetView`
- `professional/project.ts`
- `organization/petProject.ts`
- privacy `projectForViewer` / public forbidden keys

### 11.1 Server pravidlo

```
NEVER:
  DB query by petId → raw HealthRecord → client

ALWAYS:
  authenticate → authorize(action on pet/record)
    → load rows
    → filter withdrawn (default)
    → project allowlist for path
    → respond
```

Před návratem znovu ověřit: actor, Pet, access, permission (nebo použít decision z téhož request scope, který už prošel authorize — nikdy trust client cache).

Denied fields = **absent**, not UI-hidden with values present.

---

## 12. Household

| Role | Server check |
|------|--------------|
| Owner | `isPetOwner` — full health |
| Co-owner | effective `PetHouseholdAccess` + `health_read` / `health_write` |
| Caregiver | effective grant + **explicit** permissions |
| Viewer | no health by default |

Server kontroluje skutečný grant (`status`, expiry, revoke), **ne** client-side roli.

---

## 13. Professional

```
Professional identity (profile)
  → PetProfessionalAccess (effective)
  → explicit health permission (viewHealth / addHealthRecord / …)
  → authorize()
  → clinical projection
```

**Professional role sama o sobě nestačí.**  
Žádný `viewMicrochip` / `viewOwnerContacts` ve vocab — microchip/PII zůstává owner-only.

---

## 14. Organization

```
OrganizationMembership
  ≠ OrganizationPetAccess
  ≠ health permission
```

AND gate (zachovat):

1. Effective `OrganizationPetAccess`
2. Effective membership
3. Member eligible (`assigned_only` / `role_eligible`)
4. Permission present on grant

Organizační zaměstnanec **nesmí** získat klinická data pouze členstvím.

---

## 15. Audit vs clinical history

| | AuditEvent (K48) | Clinical history |
|--|------------------|------------------|
| Význam | „Actor X dostal ALLOW/DENY pro action Y.“ | „Actor X změnil hodnotu Y z A na B.“ |
| Payload | Metadata rozhodnutí; **bez** clinical body | Field diffs / snapshots clinical content |
| Sink | `AuditSink` | Separate append-only clinical history store |
| Failure semantics | Nesmí měnit authz outcome | Atomické s mutation |

**Systémy se nesmí sloučit.** Použít K48 jako authorization audit beze změny kontraktu.

---

## 16. Idempotency

### 16.1 Potřeba

Clinical writes **potřebují** idempotency kvůli:

- retry po network timeout
- mobile reconnect
- duplicate submit

### 16.2 Návrh (neimplementovat)

| Mechanism | Use |
|-----------|-----|
| `Idempotency-Key` (client-generated UUID) | Required on **POST create** |
| Same key + same actor + same body hash | Return original result (200/201), no second row |
| Mutation / request ID | Correlate logs + history + audit |
| PATCH / WITHDRAW | Key recommended; natural idempotency also via `version` (second withdraw on withdrawn → `withdrawn_record`) |

Server ukládá idempotency records s TTL. **NEIMPLEMENTOVÁNO v K52.**

---

## 17. Offline / mobile

Budoucí mobilní klient **nesmí**:

| Abuse | Server control |
|-------|----------------|
| Přepsat novější data | Require matching `version`; reject `stale_version` |
| Obejít permission | Re-authorize every mutation; ignore cached grants |
| Vytvořit duplicitní záznam | `Idempotency-Key` on create |
| Vytvořit falešný timestamp | Ignore client clocks; server `createdAt`/`updatedAt` |

Offline queue smí držet **intent** (draft mutation + expected version + idempotency key).  
Commit vždy server-side. **NEIMPLEMENTOVAT offline sync v K52.**

---

## 18. Clinical documents (`PetDocument`)

### 18.1 Oddělení

| Layer | Content |
|-------|---------|
| DB metadata | Existing `PetDocument` fields + `version` + lifecycle |
| Object storage | File bytes keyed by server `storageKey` |
| Clinical JSON | **Nikdy** neukládat file bytes do clinical JSON modelu |

### 18.2 Flows (design)

| Flow | Policy |
|------|--------|
| Upload | authorize `documents.write` → server assigns `storageKey` → store bytes → persist meta + history |
| Metadata PATCH | same write + version |
| Replace blob | write + version++; history `replace_blob`; old object retention policy (**LEGAL REVIEW**) |
| Withdraw | soft withdraw meta; bytes retained until retention job |
| Download | authorize `documents.read` → short-lived signed URL **or** gated stream; never public bucket listing |
| Deletion | physical purge only under retention/legal — separate from withdraw |

---

## 19. Security threat model

Pro každou hrozbu: **THREAT → SERVER CONTROL → CURRENT DEMO LIMITATION → PRODUCTION REQUIREMENT**

### 19.1 Modified client

- **THREAT:** Upravený frontend obchází UI gate.  
- **SERVER CONTROL:** Veškerá authz + validace na serveru.  
- **DEMO LIMITATION:** Client `authorize()` + LS jsou obcházelné.  
- **PRODUCTION:** No trust client; API-only mutations.

### 19.2 Forged `petId`

- **THREAT:** Zápis do cizího Pet.  
- **SERVER CONTROL:** Resolve Pet + authorize on that Pet; IDOR tests.  
- **DEMO:** LS array trust.  
- **PRODUCTION:** Deny unless ownership/grant.

### 19.3 Forged `actorAccountId`

- **THREAT:** Claim cizí identity.  
- **SERVER CONTROL:** Actor only from session; discard body claims (K46/K47).  
- **DEMO:** Adapter voids claimed actor but session is DEMO.  
- **PRODUCTION:** Real authn session store.

### 19.4 Modified permission

- **THREAT:** Client přidá `health_write` do grant JSON.  
- **SERVER CONTROL:** Grants only from server DB.  
- **DEMO:** Grants in LS.  
- **PRODUCTION:** Server is SSOT for grants.

### 19.5 Modified localStorage

- **THREAT:** Přímá editace klinických řádků / stamps.  
- **SERVER CONTROL:** LS not authority.  
- **DEMO:** UNKNOWN — REQUIRES SERVER TEST (K51).  
- **PRODUCTION:** Server DB; client cache invalidated.

### 19.6 Replay request

- **THREAT:** Znovupřehrání starého authenticated requestu.  
- **SERVER CONTROL:** Short-lived tokens; idempotency; version checks; optional request nonce.  
- **DEMO:** N/A network.  
- **PRODUCTION:** TLS + token expiry + idempotency store.

### 19.7 Duplicate mutation

- **THREAT:** Dvojí create po timeoutu.  
- **SERVER CONTROL:** Idempotency-Key.  
- **DEMO:** Possible duplicate rows.  
- **PRODUCTION:** Required on POST.

### 19.8 Stale mutation

- **THREAT:** Lost update / overwrite newer edit.  
- **SERVER CONTROL:** Integer `version`.  
- **DEMO:** Last write wins.  
- **PRODUCTION:** 409 `stale_version`.

### 19.9 Unauthorized document download

- **THREAT:** Hádaný `storageKey` / URL.  
- **SERVER CONTROL:** Re-authz + signed URL / gated stream; non-guessable keys.  
- **DEMO:** IndexedDB local.  
- **PRODUCTION:** Private bucket + authz gate.

### 19.10 IDOR

- **THREAT:** `/records/{id}` bez Pet access check.  
- **SERVER CONTROL:** Load by id → resolve petId → authorize.  
- **DEMO:** Client filters.  
- **PRODUCTION:** Mandatory server check.

### 19.11 Privilege escalation

- **THREAT:** Role cast na owner / admin.  
- **SERVER CONTROL:** Role ≠ permission; evaluate stored permissions.  
- **DEMO:** Contract only.  
- **PRODUCTION:** Server grant evaluation.

### 19.12 Organization scope escape

- **THREAT:** Membership ⇒ všechny org pets.  
- **SERVER CONTROL:** Org AND gate.  
- **DEMO:** Enforced in libs if called.  
- **PRODUCTION:** Same gate server-side always.

### 19.13 Professional scope escape

- **THREAT:** Libovolný pro profil čte všechny pets.  
- **SERVER CONTROL:** Effective `PetProfessionalAccess` + permission.  
- **DEMO:** Same if gated.  
- **PRODUCTION:** Server enforce.

### 19.14 Household scope escape

- **THREAT:** Caregiver bez `health_write` edituje.  
- **SERVER CONTROL:** Explicit permission check.  
- **DEMO:** clinicalGate + assert matrix.  
- **PRODUCTION:** Server enforce + tests.

---

## 20. GDPR / data governance

Pouze architektonické oblasti — **žádné právní závěry.**

| Area | Architectural note | Flag |
|------|---------------------|------|
| Data retention | Retention schedules for current records, history, audit, blobs | **LEGAL REVIEW REQUIRED** |
| Deletion requests | Soft withdraw ≠ erasure; erasure needs purge pipeline + history/audit policy | **LEGAL REVIEW REQUIRED** |
| Correction | PATCH + clinical history (before/after) supports correction trail | **LEGAL REVIEW REQUIRED** |
| Export | Owner export of Pet clinical current + history subset | **LEGAL REVIEW REQUIRED** |
| Access logs | K48 authz audit + optional domain access logs (separate) | **LEGAL REVIEW REQUIRED** |
| Clinical history retention | May exceed current-record retention for liability | **LEGAL REVIEW REQUIRED** |
| Organization access | Minimize; grant-scoped; revoke/expiry | **LEGAL REVIEW REQUIRED** |
| Professional access | Same; no chip/PII via health | **LEGAL REVIEW REQUIRED** |
| Data minimization | Projections strip; health ≠ microchip/ownerContacts | **LEGAL REVIEW REQUIRED** |

---

## 21. Backup / disaster recovery

Production requirements only (**NEIMPLEMENTOVÁNO**):

| Requirement | Note |
|-------------|------|
| Backups | Encrypted backups of clinical DB + object storage |
| Restore | Documented restore runbooks; tested periodically |
| Point-in-time recovery | Required for clinical DB (PITR) |
| Audit retention | K48 sink durable retention separate from app DB wipe |
| Clinical history retention | Included in PITR + retention policy |
| Disaster recovery | RPO/RTO targets; failover plan; **LEGAL REVIEW** for cross-border |

---

## 22. Server API contract (backend-ready design)

Minimální contract. Existující doménové pojmy. **Žádné nové klientské modely. Nepřidáno do aplikace.**

Společné failure codes: viz §23.

### 22.1 GET clinical record

- **Actor:** authenticated account  
- **Pet:** from record.petId  
- **Access:** ownership or effective grant for activeMode  
- **Permission:** type-mapped read (`health.read` / `vaccination.read` / …) or `documents.read`  
- **Validation:** record exists; default hide withdrawn unless privileged flag  
- **Concurrency:** n/a (return `version`)  
- **Audit:** K48 on authorize  
- **Response:** projected clinical view (allowlist), includes `version`  
- **Failures:** `unauthenticated`, `unauthorized`, `pet_not_found`, `access_revoked`, `access_expired`, `missing_health_permission`, `withdrawn_record` (if not privileged)

### 22.2 POST clinical record

- **Actor:** authenticated  
- **Pet:** body `petId` server-validated  
- **Access + permission:** type-mapped write / `documents.write`  
- **Validation:** content schema; strip server-controlled fields; `Idempotency-Key` required  
- **Concurrency:** create `version=1`  
- **Audit:** K48  
- **History:** `create` entry  
- **Response:** projected created record  
- **Failures:** as above + `validation_error`

### 22.3 PATCH clinical record

- **Actor:** authenticated  
- **Pet:** from existing record  
- **Access + permission:** type-mapped write  
- **Validation:** strip provenance/ownership/microchip; reject if withdrawn  
- **Concurrency:** require expected `version`; increment on success  
- **Audit:** K48  
- **History:** `update` with before/after  
- **Response:** projected record + new `version`  
- **Failures:** + `stale_version`, `withdrawn_record`, `validation_error`

### 22.4 WITHDRAW clinical record

- **Actor:** authenticated  
- **Pet:** from record  
- **Access + permission:** same write as edit  
- **Validation:** not already withdrawn  
- **Concurrency:** expected `version`  
- **Audit:** K48  
- **History:** `withdraw`  
- **Response:** confirmation / projected withdrawn (or 204)  
- **Failures:** + `stale_version`, `withdrawn_record`

### 22.5 GET clinical history

- **Actor:** authenticated  
- **Pet:** from record  
- **Access + permission:** read on record type; history may require same read or stricter owner policy (**LEGAL REVIEW**)  
- **Validation:** record exists  
- **Concurrency:** n/a  
- **Audit:** K48 on authorize  
- **Response:** append-only history entries (no authz-decision merge)  
- **Failures:** standard deny / not found

---

## 23. Error contract

Strukturované chyby (design only — **nepřidávat do aplikace v K52**):

| Code | When |
|------|------|
| `unauthenticated` | Missing/invalid session |
| `unauthorized` | Authenticated but DENY (generic) |
| `pet_not_found` | Unknown / inaccessible Pet (avoid existence leak where required) |
| `access_revoked` | Grant revoked |
| `access_expired` | Grant past `expiresAt` |
| `missing_health_permission` | Effective grant without required health/docs permission |
| `stale_version` | Optimistic lock failure |
| `withdrawn_record` | Mutation on withdrawn / duplicate withdraw |
| `validation_error` | Schema / strip / content validation |

Doporučený shape: `{ code, message, correlationId, details? }` — bez leaking PII / clinical secrets in `details`.

---

## 24. Migration DEMO → production DB

### 24.1 Strategie

1. Export DEMO LS keys (`healthRecords`, `petDocuments`, weight, pets).  
2. Import rows preserving **IDs** where unique.  
3. Map blobs IndexedDB → object storage; rewrite `storageKey`.  
4. Set server `version=1` (or migrate if later added).  
5. Preserve `lifecycleStatus='withdrawn'` and withdraw stamps if present.  
6. Dual-run: API authority; LS demoted to cache.  
7. Cut over: disable client ACL as authority.

### 24.2 Zachovat pokud možné

- Pet IDs, HealthRecord IDs, Document IDs  
- `createdAt` / `createdBy*` / `updatedAt` / withdrawn state **as historical claims**

### 24.3 NELZE důvěryhodně migrovat z DEMO

| Data | Reason |
|------|--------|
| Actor authenticity | DEMO session / forgeable LS |
| Timestamp authority | Client clock |
| Permission/grant truth | Client-writable LS |
| K48 audit WORM | DEMO sink wipeable |
| Blob integrity / chain of custody | Local IndexedDB |
| Client-forged provenance | Optional fields writable pre-gate |
| Concurrent edit history | Never existed in DEMO |

Marked imports: `migratedFrom='demo'` + `trustLevel='unverified'` (operational flags — not a new clinical domain model in the app today).

---

## 25. Test strategy

| Area | CURRENT DEMO TESTABLE | REQUIRES SERVER |
|------|----------------------|-----------------|
| Authorization matrix (A–S style) | ano (`assert-clinical-integrity`) | ano (HTTP + real session) |
| IDOR | limited | **required** |
| Ownership | ano (libs) | **required** |
| Household / Pro / Org | ano | **required** |
| Concurrency / `version` | ne | **required** |
| Audit K48 emission | ano (in-process) | **required** durable sink |
| Clinical history | ne | **required** |
| Documents download authz | limited | **required** |
| Privacy / microchip / PII | ano (projections) | **required** API leak tests |
| Replay / idempotency | ne | **required** |
| LS bypass | UNKNOWN | **required** (must FAIL closed) |

---

## 26. Architectural decision (verdikt)

### 26.1 Lze K51 model zachovat při přechodu na server?

**ANO.** `HealthRecord` + `PetDocument` + `WeightMeasurement` + stávající access hranice + `authorize()` + projekce + K48 jsou production-ready **doménový kontrakt**. Chybí trusted server runtime, ne přepis domény.

### 26.2 Minimální pole server potřebuje

Existující K51 provenance/lifecycle **plus**:

- integer **`version`**
- server-owned stamps (same fields, trusted writer)
- production lifecycle na weight (extension of existing model)

### 26.3 Je potřeba version/revision?

**Ano — integer `version`.** (Ne `updatedAt` comparison.)

### 26.4 Je potřeba clinical history?

**Ano** pro production correction / accountability hodnot. Odděleně od K48.

### 26.5 Zůstává AuditEvent samostatný?

**Ano.** K48 = authorization audit only.

### 26.6 Co je production-safe vs pouze DEMO

| Production-safe (domain) | Pouze DEMO (runtime) |
|--------------------------|----------------------|
| Model shapes & SSOT split | `authority: 'demo'` + localStorage |
| Ownership / HH / Pro / Org vocabs | Client grant loaders as authority |
| `authorize()` decision paths | Client clock stamps |
| clinicalGate action mapping | In-place overwrite without version |
| Soft withdraw semantics | No clinical history ledger |
| Projection allowlists & PII strip | IndexedDB as sole blob store |
| K48 event shape & scrub rules | DemoAuditSink / wipeable LS audit |
| Pet-scoped edit policy | Messages health-share placeholder |

---

## 27. Production blockers

1. No server authentication / `authority: 'server'` wired for clinical path  
2. localStorage still writable authority in DEMO  
3. No integer `version` / optimistic locking  
4. No clinical history store  
5. No durable WORM-capable audit sink for production  
6. No idempotency layer for clinical writes  
7. Document download not server-gated  
8. Weight lifecycle incomplete vs Health/Docs  
9. Legal retention / erasure policy undefined (**LEGAL REVIEW REQUIRED**)  
10. Backup/PITR/DR not specified operationally  

---

## 28. Recommended K53+

| Step | Focus | Must not |
|------|-------|----------|
| **K53** | Server authority vertical for clinical mutations (session → authorize → persist) using existing models | New access model / fake LS backend |
| **K54** | Integer `version` + clinical history append + withdraw/restore API contract | Merge history into AuditSink |
| **K55** | Document object storage + download authz | Bytes inside clinical JSON |
| **K56** | Idempotency + mobile/offline intent queue contract | Client-trusted offline commit |
| **K57** | GDPR retention/erasure export runbooks | Legal conclusions in code |
| Earlier roadmap “K52 QR / vet workflow” | Re-number when scheduled | Confuse with this audit |

---

## 29. Explicit list of things NOT implemented (K52)

K52 **neimplementovalo**:

- žádný aplikační kód
- žádný backend / API / route / UI
- žádnou databázi / migraci / storage service
- žádný nový Health / Access / Permission / Auth model
- žádný nový AuditEvent systém
- žádný fake server / fake production authority
- žádný offline sync
- žádný transaction runtime
- žádné error codes v aplikaci
- žádné změny `src/**`, scripts, package.json

K52 je **pouze** návrh produkční serverové autority pro již existující klinickou architekturu (K47–K51).

---

## 30. Final report index

1. Current K51 architecture — §1  
2. Server authority model — §2  
3. Clinical persistence — §3  
4. Provenance — §4  
5. Versioning — §5  
6. Clinical history — §6  
7. Withdraw — §7  
8. Authorization order — §9 (edit policy §8)  
9. Transaction boundaries — §10  
10. Projection — §11  
11. Household — §12  
12. Professional — §13  
13. Organization — §14  
14. Documents — §18  
15. Audit vs history — §15  
16. Idempotency — §16  
17. Offline/mobile — §17  
18. Threat model — §19  
19. GDPR/data governance — §20  
20. Backup/DR — §21  
21. API contract — §22  
22. Error contract — §23  
23. Migration — §24  
24. Test strategy — §25  
25. Production blockers — §27  
26. Recommended K53+ — §28  
27. Explicit NOT implemented — §29  

**Kritická podmínka splněna:** K52 nemění aplikaci; navrhuje serverovou autoritu nad stávající klinickou doménou.
