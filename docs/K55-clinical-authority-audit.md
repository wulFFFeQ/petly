# KROK 55 — Clinical Authority / Permission Vocabulary Audit

**Datum:** 2026-09-12  
**Typ:** POUZE ARCHITEKTONICKÝ AUDIT + DESIGN — žádný aplikační kód, žádné API, žádná DB, žádné nové modely, žádné UI, žádná změna permission/authorization runtime.  
**Navazuje na:** [K47](K47-security-authorization-runtime.md), [K48](K48-security-audit-trail-runtime.md), [K49](K49-veterinary-health-workflow-audit.md), [K50](K50-health-authorization-hardening.md), [K51](K51-clinical-record-integrity.md), [K52](K52-clinical-server-history-architecture-audit.md), [K53](K53-veterinary-clinical-workflow-audit.md), [K54](K54-clinical-encounter-architecture-audit.md)

**Cíl:** Určit, jak má vypadat budoucí klinická autorita a minimální action vocabulary, **aniž by vznikl nový paralelní permission / access / authorization / audit systém**. Mapovat jemnější clinical actions na existující `SecurityContext` + `authorize()` + HH/Pro/Org permission lists.

---

## Absolutní zákazy (K55)

K55 **neimplementuje** a **nemění**:

- aplikační kód (`src/**`)
- SecurityContext / `authorize()` / `assertAuthorized` / clinicalGate
- existující permission model / HouseholdPetPermission / ProfessionalPermission
- HealthRecord / PetDocument / WeightMeasurement
- PetHouseholdAccess / PetProfessionalAccess / OrganizationPetAccess / OrganizationMembership
- Booking / Payment / AuditEvent / Emergency / Messages / storage / routes / UI
- nový PetAccess / ClinicalAccess / PermissionStore / Auth service / AuditEvent typ / messaging systém

Výstup je **pouze** tento dokument. GAP = budoucí kontrakt, ne implementace.

---

## 1. Executive Summary

### Verdikt

**B — CLINICAL AUTHORITY NEEDS FURTHER HARDENING**

Po K47 (`authorize()`), K48 (audit), K50 (`clinicalGate`), K51 (provenance + soft withdraw), K52–K54 (server/history/encounter design) je **authorization stack architektonicky správný**. Není důvod k redesignu (**ne C**).

Systém ale **není ready** pro produkční klinický provoz s finalize/sign/admin/export (**ne A**):

1. `health.write` je příliš hrubé — pokrývá create, update **i** withdraw; chybí finalize / sign / admin / export.
2. Authority je DEMO / `localStorage` — klient není production security boundary.
3. Owner path ALLOW je správný pro full health R/W, ale **ne** pro clinician authorship / sign.
4. Soft withdraw existuje (K51), ale je gated stejně jako běžný write.
5. Clinical Encounter ještě není (K54/K58) — vocabulary musí být připravená před Encounter runtime.

### Co je robustní (zachovat)

| Oblast | Evidence |
|--------|----------|
| Central `authorize()` | `src/lib/security/authorize.ts` — deny-by-default, single path |
| Role ≠ permission | Stored `permissions[]` na grantech; role = suggested defaults |
| Access domains oddělené | HH ≠ Pro ≠ OrgPetAccess |
| Owner full health | `adapters/ownership.ts` path `owner` |
| Co-owner full health R/W | `suggestedHouseholdPermissionsForRole('co_owner')` |
| Caregiver no auto write | default `health_read` only |
| Viewer no health | default profile/gallery only |
| Booking ≠ clinical | `adapters/booking.ts` isolation DENY |
| Microchip ≠ authz | owner-only `microchip.read`; registry ≠ ownership |
| Public ≠ clinical | `public.pet.project` + forbidden keys |
| Org membership ≠ pet health | AND gate membership + OrgPetAccess + eligibility |
| clinicalGate thin glue | K50 — ne druhý ACL |
| K48 audit | authorization_decision; ≠ clinical history |

### Kritické gap (P0/P1)

| ID | Gap | Priority |
|----|-----|----------|
| G1 | localStorage / DEMO = client authority | P0 |
| G2 | `health.write` = create/update/**withdraw**; no finalize/sign/admin/export | P1 |
| G3 | Client-side provenance stamps spoofable | P0 |
| G4 | No version ledger → post-finalize overwrite risk | P0 (blocks safe finalize) |
| G5 | Co-owner cannot remove owner — partial only (server invariant needed) | P1 |
| G6 | Pro typed writes partially collapse to `addHealthRecord` | P1 |
| G7 | Travel/export without dedicated `clinical.export` | P2→P1 before scale |

### Jednověté shrnutí

Rozšířit **existující** `SecurityAction` + mapování na HH/Pro permission lists uvnitř `authorize()` — nepřidávat paralelní permission framework; oddělit finalize / sign / withdraw / admin / export / emergency od hrubého `health.write`.

---

## 2. Current Permission Model

### SecurityAction (authorize API)

Zdroj: `src/lib/security/types.ts`, `src/lib/security/actions.ts`.

**Pet / clinical:**

`health.read` | `health.write` | `medication.read` | `medication.write` | `documents.read` | `documents.write` | `labs.read` | `labs.write` | `vaccination.read` | `vaccination.write` | `microchip.read` | `ownerContacts.read` | `pet.profile.read` | `pet.profile.write` | `organization.pet.access`

**Non-clinical (isolated):**

`booking.*` | `payment.*` | `messaging.*` | `public.pet.project` | `organization.ops`

### HouseholdPetPermission (domain SSOT)

`pet_profile_read/write` | `health_read/write` | `documents_read/write` | `calendar_*` | `gallery_*` | `timeline_*` | `emergency_read/write` | `lost_manage` | `household_manage`

### ProfessionalPermission (Pro + OrgPet reuse)

`viewHealth` | `viewVaccinations` | `viewMedications` | `viewDocuments` | `addVisit` | `addVaccination` | `addHealthRecord` | `addNote`

### Mapping (runtime)

| SecurityAction | HH permission | Pro/Org permission |
|----------------|---------------|-------------------|
| health/medication/labs/vaccination **read** | `health_read` | view* (+ viewHealth implies meds/vax reads) |
| health/medication/labs/vaccination **write** | `health_write` (all fold) | `addHealthRecord` (except vax→`addVaccination`) |
| documents.read/write | documents_* | viewDocuments / **addNote** |
| microchip / ownerContacts | (owner path only) | hard DENY |

### Role defaults (HH) — role ≠ permission

| Role | Suggested health | Notes |
|------|------------------|-------|
| co_owner | health_read + health_write | `household_manage` **omitted** by default |
| caregiver | health_read only | no health_write |
| viewer | none | profile + gallery only |

Owner není HH role — žije na `Pet.ownerAccountId`.

### Organization

- `OrganizationRole`: owner | admin | professional | staff | viewer — **org ops**, ne pet clinical.
- `OrganizationPermission`: organization_manage / members / settings — **never** pet health.
- Clinical via `OrganizationPetAccess.permissions: ProfessionalPermission[]` + membership + eligibility.

---

## 3. Current Authorization Flow

```
request
  → DEMO session adapter (getSelfAccount / isSessionActive)
  → SecurityContext(authority: 'demo')
  → authorize(ctx, { action, resource })
       → forged actor claim? DENY
       → known action?
       → public path OR authenticated account
       → resolveResource (pet/booking/…)
       → isolation: booking/payment/messaging ≠ health
       → pet path:
            1. Owner? → ALLOW path owner (full pet-data)
            2. else selectPetPath(activeMode): household | professional | organization
               (NO privilege UNION)
            3. load grant → effective? → map action → permissions[] contains?
       → emitAuthorizationAudit (K48)
  → clinicalGate = thin DEMO glue over authorize (K50)
  → projection only after ALLOW (projectAfterAuthorize)
```

**Evidence:** `authorize.ts`, `clinicalGate.ts`, adapters under `src/lib/security/adapters/`.

**UI `canPetClinical` ≠ security boundary** — pouze UX; mutace musí jít přes `assertPetClinical` / `tryAssertPetClinical`.

---

## 4. health.write Audit

### Co dnes `health.write` (a typed writes) znamená

| Operace | Runtime gate | Poznámka |
|---------|--------------|----------|
| Číst klinická data | `health.read` (+ typed reads) | OK |
| Vytvořit záznam | type-mapped write | OK jako draft/active |
| Upravit active záznam | type-mapped write | Pet-scoped; any writer s write |
| Upravit draft | N/A (no draft status) | Lifecycle jen active\|withdrawn |
| Finalizovat | **MISSING** | — |
| Podepsat | **MISSING** | — |
| Soft withdraw | **stejná write action** | `deleteHealthRecord` → `writeActionForHealthRecordType` |
| Admin correction | **MISSING** | overwrite possible |
| Export historie | **MISSING** jako action | Travel pack owner UX |
| Dokument R/W | documents.* | Oddělené — dobře |
| Measurement write | health.write (WeightChart) | Provenance metadata only |
| Emergency write | HH emergency_* **není** mapováno z health.* | Isolace OK; clinical.emergency chybí |

### Závěr: nutná granularita

**Nutné oddělit** (bezpečnost):

1. draft/active mutate (`health.write` / typed writes)  
2. `clinical.finalize`  
3. `clinical.sign`  
4. `clinical.withdraw`  
5. `clinical.admin` (correction)  
6. `clinical.export`  
7. `clinical.emergency.write` (time-bounded)

**Není nutné** jako nové permissions:

- clinical.document.* → `documents.*`
- clinical.measurement.write → `health.write` + provenance
- clinical.medication/vaccination.write → už existují typed SecurityActions
- `clinical.write` alias → **nezavádět** (synonym confusion)

---

## 5. Owner

### Neměnné rozhodnutí

OWNER má:

- full health read
- full health write (draft/active mutate)
- přístup ke klinické historii
- nesmí být omezen professional/organization workflow (ownership path má prioritu)

### Současný model

`decideOwnerPetAccess` → ALLOW pro všechny pet-data actions včetně microchip/ownerContacts.

**Vyjádřitelné bez hacku:** ano — ownership path.

### Hranice authorship (kritická)

Owner **NESMÍ** automaticky:

- `clinical.sign` veterinárního záznamu
- vydávat clinician-authored record jménem veterináře
- měnit clinician authorship
- impersonate professional

Owner **SMÍ**:

- owner-entered records (`recordSource: owner`)
- finalize/withdraw **owner-entered** home care (budoucí policy)
- export vlastní klinické historie (`clinical.export`)

---

## 6. Co-owner

### Neměnné rozhodnutí

CO-OWNER má:

- full health read
- full health write
- stejný klinický datový přístup jako owner k existující historii
- **NESMÍ** odebrat původního ownera z ownership modelu

### Současný model

- Role `co_owner` suggested: health_read + health_write (+ docs, emergency, …)
- Owner **není** uložen na `PetHouseholdAccess` — ownership SSOT = `Pet.ownerAccountId`
- `household_manage` default **omitted** — Owner musí grantnout explicitně

**Vyjádřitelné bez hacku pro health R/W:** ano — explicitní permissions na grantu.

**Ochrana „nesmí odebrat ownera“:** částečná (struktura modelu).  
**P1 production requirement:** server invariant — ownership transfer / `ownerAccountId` change pouze owner nebo platform; `household_manage` nikdy nesmí přepsat ownership.

### Authorship

Stejná hranice jako owner: co-owner ≠ clinician signer.

---

## 7. Caregiver

Caregiver:

- není owner / co-owner
- **nemá** automatický health.write

### Varianty (audit)

| Variant | Popis | Verdikt |
|---------|-------|---------|
| A | health.read explicitně (default) | **DOPORUČENO** |
| B | health.write explicitně | Jen pokud Owner grantne — ne default |
| C | žádný health access | Příliš restriktivní vs současné defaults |
| D | future scoped permissions | Optional later (home-care notes); ne teď |

### Doporučení

**A** — default `health_read`; write pouze explicitní `health_write` na grantu.  
Žádný auto clinic finalize. Žádný export default.

---

## 8. Viewer

Viewer: **žádný clinical health access**.

### Ověření

| Layer | Stav |
|-------|------|
| Suggested perms | pet_profile_read, gallery_read only |
| authorize() | health.* → requires health_read/write → DENY |
| Projection | HH projector filters by permission |
| UI | clinicalGate / useAuthorizedHealthScope deny-by-default |
| Direct storage | DEMO gap — LS mutation possible (P0 production) |

**Invariant:** znalost `petId` nebo budoucího `encounterId` **nesmí** stačit. Viewer NESMÍ získat health data bez explicitního grantu (který viewer defaultně nemá).

---

## 9. Professional

### ProfessionalAccess zůstává samostatný

`PetProfessionalAccess` — statuses pending | active | revoked | expired.

Profesionál může mít health.read / health.write **pouze** přes effective grant + `permissions[]`.

### Role ≠ permission

Professional profile type / „veterinarian“ label **≠** přístup ke všem Pet.

### Scénáře (authorization contract)

| Scenario | Decision |
|----------|----------|
| revoked / expired / pending | DENY |
| wrong professionalProfileId | DENY (context mismatch) |
| wrong petId | DENY (no grant) |
| wrong organization claim | DENY (org path) |
| effective + viewHealth | ALLOW health.read |
| effective + addHealthRecord | ALLOW health.write (draft) |
| effective + addVaccination | ALLOW vaccination.write |
| finalize clinician record | future `clinical.finalize` + authorship policy |
| sign | future `clinical.sign` — clinician path only |

Authorization vždy z **aktuálního effective access**, ne ze stale client cache.

---

## 10. Organization

### Tři vrstvy

```
OrganizationMembership (workforce)
  ≠ OrganizationPetAccess (pet grant + ProfessionalPermission[])
  ≠ clinical SecurityAction ALLOW
```

### Scénáře

| Actor | Booking | Clinical read | Clinical write | Finalize | Notes |
|-------|---------|---------------|----------------|----------|-------|
| Reception / staff (membership only) | Possible via booking path | DENY | DENY | DENY | No OrgPetAccess |
| Org clinician (eligible + grant + view*) | — | ALLOW IF | — | — | |
| Org clinician (+ add*) | — | — | ALLOW draft IF | — | |
| Org clinician + finalize policy | — | — | — | ALLOW IF clinical.finalize | |
| Vet tech (limited perms) | — | IF view | IF measurement/write perms | DENY finalize | Use typed writes |
| Org admin (membership admin) | org ops | DENY auto | DENY auto | DENY | Admin ≠ clinical |
| Former employee (suspended/removed) | DENY | DENY | DENY | DENY | Membership not effective |

**Organization owner/admin NESMÍ** automaticky číst/upravovat/podepisovat klinická data všech Pet.

---

## 11. Clinical Action Vocabulary

### Minimální bezpečná sada (doporučení)

#### Zachovat (existující)

| Action | Význam (budoucí kontrakt) |
|--------|---------------------------|
| `health.read` | Číst clinical projection / historii (non-export) |
| `health.write` | Create/update **active/draft** clinical facts only |
| `medication.read` / `medication.write` | Typed medication |
| `vaccination.read` / `vaccination.write` | Typed vaccination |
| `labs.read` / `labs.write` | Examination / labs |
| `documents.read` / `documents.write` | PetDocument |
| `microchip.read` | Owner-only identity |
| `ownerContacts.read` | Owner-only PII |

#### Přidat (budoucí SecurityActions — mapovat na existující domain perms)

| Action | Účel | Proč oddělit |
|--------|------|--------------|
| `clinical.finalize` | Uzavření záznamu/epizody | No silent overwrite after |
| `clinical.sign` | Profesionální odpovědnost | ≠ finalize; never owner |
| `clinical.withdraw` | Soft withdraw | ≠ edit |
| `clinical.admin` | Correction + reason + version | ≠ health.write |
| `clinical.export` | Bulk export | ≠ read |
| `clinical.emergency.write` | Time-bounded ER write | ≠ permanent health.write |

#### Nezavádět (zbytečná granularita)

| Navrhované | Důvod odmítnutí |
|------------|-----------------|
| `clinical.write` alias | Synonym confusion; držet `health.write` |
| `clinical.document.read/write` | Použít `documents.*` |
| `clinical.measurement.write` | `health.write` + provenance |
| `clinical.medication.write` / `clinical.vaccination.write` | Už existují typed actions |
| Desítky org-role-specific actions | Role = context; perms na grantu |

### Future domain mapping (design — ne implementace)

| SecurityAction | HH map (design) | Pro/Org map (design) |
|----------------|-----------------|----------------------|
| clinical.finalize | Owner-entered: health_write; clinician-authored: **DENY HH** | Write-capable + authorship policy; prefer future `finalizeRecord` extension |
| clinical.sign | **DENY** | Clinician path only; extension point until dedicated perm |
| clinical.withdraw | health_write (owner/co-owner/caregiver-with-write) | addHealthRecord / typed write |
| clinical.admin | DENY default; owner only for owner-entered OR explicit future | Dedicated / elevated; never silent |
| clinical.export | Owner path ALLOW; co-owner health_read+ (treat as owner-class data); caregiver DENY | DENY unless explicit future export perm |
| clinical.emergency.write | Map toward `emergency_write` (not health_write) | Time-bounded emergency grant |

**Zásada:** rozšířit `SecurityAction` + `householdPermissionForAction` / `professionalPermissionForAction` — **ne** nový PermissionStore.

---

## 12. Finalize

### P1

Draft → finalize → (optional) sign.

### Může `health.write` bezpečně znamenat finalizaci?

**Ne.**

Důvody:

1. Po finalizaci nesmí běžný editor přepsat záznam.
2. Dnes `health.write` = mutate active including soft-withdraw path.
3. Booking `completed` ≠ clinical finalized (K54).
4. Bez version ledger (K57) je finalize bez historie nebezpečný.

### Kontrakt

| Stav | Mutace health.write | clinical.finalize | clinical.admin |
|------|---------------------|-------------------|----------------|
| active (pre-finalize) | ALLOW IF write | — | — |
| finalized | DENY silent overwrite | already done | correction path |
| withdrawn | DENY edit | DENY | limited restore? future |

Finalize vyžaduje: server authority (K56) + version/history (K57) před Encounter scale (K58).

---

## 13. Sign

### finalized ≠ signed

| Concept | Význam |
|---------|--------|
| finalized | Klinicky uzavřeno; no silent overwrite |
| signed | Profesionální / právní odpovědnost za obsah |

### Posouzení

- Sign **patří** do authorization vocabulary jako `clinical.sign`.
- Sign je **future extension point** — nemusí být povinný pro všechny jurisdiction / record types.
- Sign **nikdy** pro owner/co-owner/caregiver/viewer na clinician-authored obsahu.
- Sign **není** totéž co AuditEvent.

---

## 14. Correction

Klinická chyba ≠ běžná editace.

Scénář: 39.2 kg místo 29.2 kg po finalizaci → **hard overwrite zakázán**.

### Budoucí kontrakt (K52/K51 aligned)

```
clinical.admin ALLOW
  → reason (required)
  → new version / correction record
  → actor (server-stamped)
  → clinical history ledger entry (≠ AuditEvent body)
  → AuditEvent authorization_decision metadata
```

Původní hodnota zůstává v historii. Public projection nevidí clinical correction detail.

---

## 15. Withdraw

Withdraw ≠ delete (K51 soft withdraw už existuje).

### Kdo (budoucí authority)

| Actor | Withdraw owner-entered | Withdraw clinician-authored |
|-------|------------------------|----------------------------|
| Owner | ALLOW IF clinical.withdraw | Policy: request/flag; not silent destroy of clinic authorship — prefer clinic withdraw or admin |
| Co-owner | Same as owner for shared health data | Same caution |
| Caregiver | Only IF explicit write + withdraw policy | DENY default |
| Viewer | DENY | DENY |
| Professional | IF grant + withdraw action | Own clinic records IF policy |
| Org clinician | IF OrgPetAccess + withdraw | Same |
| Org admin (ops only) | DENY clinical withdraw auto | DENY |

### Historie / projection

| Audience | Sees withdrawn? |
|----------|-----------------|
| Public | Never |
| Owner / co-owner | Soft-hidden or marked withdrawn in private UI; history retained |
| Clinical user with access | Retained for audit/clinical continuity; filtered from default lists |
| AuditEvent | Authz metadata only |

---

## 16. Export

`clinical.read` ≠ `clinical.export`.

| Actor | read | export |
|-------|------|--------|
| Owner | ALLOW | ALLOW |
| Co-owner | ALLOW | ALLOW (same data class) |
| Caregiver | IF health_read | DENY default |
| Viewer | DENY | DENY |
| Professional | IF view* | DENY unless explicit export grant |
| Org staff | IF grant | DENY unless explicit |
| Public | DENY | DENY |

Travel package PDF dnes = owner UX approximation — **není** production clinical.export authorization.

---

## 17. Documents

- `PetDocument` gated `documents.read` / `documents.write`.
- Budoucí Encounter-attached docs: stejné documents.* + pet/encounter resource resolution.
- Pro: `documents.write` → `addNote` (hrubé — P2 cleanup, ne nový systém).
- Public → **never** document access.
- Booking → **never** document access.

`document.read` ≠ full clinical timeline read — documents permission může existovat bez health_read (HH allows separate bits).

---

## 18. Measurements

`WeightMeasurement` zůstává.

| Source | Authority | Provenance |
|--------|-----------|------------|
| Owner home weight | health.write (owner/co-owner) | recordSource owner/co_owner |
| Clinic measurement | health.write via Pro/Org grant | professional/organization |

**Ne** nový measurement permission systém. Future: provenance fields distinguish home vs clinic; Encounter may link measurement (K54/K60) bez nové ACL.

---

## 19. Medication

| Entry | Action | Authorship |
|-------|--------|------------|
| Owner home meds | medication.write | owner/co_owner |
| Clinician meds | medication.write via Pro/Org | professional/organization |
| Correction after finalize | clinical.admin | not medication.write alone |

`health.write` **nedává** stejnou sémantiku jako typed `medication.write` na Pro path (mapování: medication.write → addHealthRecord) — HH folds to health_write. Minimální budoucí rozlišení: **ponechat typed SecurityActions**; oddělit admin correction.

---

## 20. Vaccination

| Entry | Action |
|-------|--------|
| History entry / admin by clinician | vaccination.write → addVaccination (Pro) |
| Owner-reported history | vaccination.write via ownership/HH health_write |
| Administration event (clinic) | vaccination.write + future Encounter context |
| Correction | clinical.admin |

Pro už odděluje `addVaccination` — zachovat. HH fold under health_write je akceptovatelné pro household; clinic path musí zůstat explicitní.

---

## 21. Emergency

`clinical.emergency.write` **NESMÍ** znamenat permanentní full `health.write`.

### Future flow

```
Emergency authorization (time-bounded grant / session)
  → clinical.emergency.write
  → create/update Encounter + minimal clinical facts
  → AuditEvent
  → end of emergency → authority ends (revoke/expire)
```

HH `emergency_read` / `emergency_write` zůstávají oddělené od health_* (správně). Mapovat emergency clinical write na emergency vocabulary / time-bounded grant — **ne** na trvalý health_write.

Emergency card public view ≠ clinical health dump.

---

## 22. Booking Boundary

**KRITICKÉ:** Booking nikdy auto-grant:

- clinical.read
- clinical.write / health.write
- clinical.finalize

Booking = scheduling/business context only.

### Privilege escalation

`bookingId` → `petId` → clinical data = **DENY** without explicit clinical authorization.

Evidence: `adapters/booking.ts` isolation; `projectPetForBooking` → `{ petId, petName }` only.

---

## 23. Microchip Boundary

Microchip = identity / recovery mechanism — **NE** authorization.

| Flow | Result |
|------|--------|
| microchip lookup → Pet identification | OK (identity) |
| microchip match → health.read | **NEVER** |
| microchipDoesNotProveOwnership | true (verification rules) |

---

## 24. Public Projection

Public:

- žádná klinická data
- žádné dokumenty
- žádné medication / vaccination history
- žádná clinical timeline
- žádné owner PII

`authorize(..., public.pet.project)` **před** projection.  
Znalost petId nestačí k clinical leak přes public adapter.

---

## 25. Authorization Order

### Budoucí bezpečný pořad

```
request
  → trusted SecurityContext (server session in production)
  → actor resolution (never client-claimed authority)
  → resource resolution (pet | encounter | document | …)
  → ownership / access resolution (effective grants only)
  → permission resolution (permissions[] on grant)
  → action authorization (SecurityAction)
  → projection / write
  → audit (K48) + clinical history (K52/K57, separate)
```

### K47/K48 podpora

**Ano** — pipeline už existuje. clinicalGate je DEMO glue.

### GAPs / bypass

| Bypass | Priority |
|--------|----------|
| localStorage grant/session forge | P0 |
| Client provenance stamps | P0 |
| UI-only checks without authorize | Mitigated K50; regression risk P1 |
| Direct LS mutation of HealthRecord | P0 |
| Travel export without clinical.export | P2 |

---

## 26. Server Authority

| ACTION | DEMO AUTHORITY | PRODUCTION AUTHORITY | CLIENT TRUSTED? | SERVER REQUIRED? | RISK |
|--------|----------------|----------------------|-----------------|------------------|------|
| clinical.read (health.read) | LS + authorize | Server session + grants | No | Yes | P0 leak |
| clinical.write (health.write) | LS + clinicalGate | Server mutate + stamps | No | Yes | P0 forge |
| clinical.finalize | N/A | Server + version lock | No | Yes | P0 fake finalize |
| clinical.sign | N/A | Server + clinician identity | No | Yes | P0 forged signature |
| clinical.withdraw | write-gated soft withdraw | Server withdraw + reason | No | Yes | P1 over-withdraw |
| clinical.admin | N/A | Server correction + history | No | Yes | P0 silent rewrite |
| clinical.export | Travel UX approx | Server export + audit | No | Yes | P1 over-export |
| clinical.document.read | documents.read | Server | No | Yes | P0 doc leak |
| clinical.document.write | documents.write | Server | No | Yes | P0 |
| clinical.measurement.write | health.write + stamp | Server + provenance | No | Yes | P0 |
| clinical.medication.write | medication.write | Server | No | Yes | P0 |
| clinical.vaccination.write | vaccination.write | Server | No | Yes | P0 |
| clinical.emergency.write | emergency_* (partial) | Time-bounded server grant | No | Yes | P0 permanent escalate |

DEMO: localStorage **pouze simuluje**. Production: server **musí** být authority.

---

## 27. Threat Model

| # | THREAT | IMPACT | CURRENT PROTECTION | PRODUCTION REQUIREMENT | PRIORITY |
|---|--------|--------|--------------------|------------------------|----------|
| 1 | forged actorAccountId | Impersonation | forged_identity DENY vs session | Server session binding | P0 |
| 2 | forged petId | Cross-pet access | grant/ownership check | Server resource ACL | P0 |
| 3 | forged encounterId | Future cross-episode | N/A (no encounter) | Resolve encounter→pet + ACL | P0 |
| 4 | forged permission | Escalation | permissions from grant store | Server grant SSOT | P0 |
| 5 | forged professionalId | Wrong pro access | resolveProfessionalContext | Trusted pro binding | P0 |
| 6 | forged organizationId | Cross-org | claim mismatch DENY | Trusted org context | P0 |
| 7 | stale access | Access after expire | isEffective checks (DEMO clock) | Server now + expire job | P0 |
| 8 | revoked access | Access after revoke | status revoked | Server revoke immediate | P0 |
| 9 | caregiver escalation | Unwanted write | default no health_write | Enforce defaults + audit | P1 |
| 10 | viewer escalation | Health leak | no health perms | Deny-by-default projections | P0 |
| 11 | booking escalation | Clinical via booking | isolation DENY | Keep isolation forever | P0 |
| 12 | emergency escalation | Permanent full write | emergency ≠ health map | Time-bound clinical.emergency.write | P0 |
| 13 | microchip escalation | health via chip | microchip ≠ authz | Keep invariant | P0 |
| 14 | public projection leak | Clinical in public | forbidden keys + authorize | Server project allowlist | P0 |
| 15 | document leak | Sensitive files | documents perms; public deny | Blob ACL server-side | P0 |
| 16 | export escalation | Bulk exfil | no clinical.export yet | Separate action + audit | P1 |
| 17 | cross-clinic read | Wrong org data | OrgPetAccess AND gate | Server multi-tenant isolation | P0 |
| 18 | cross-clinic write | Wrong org mutate | same | same | P0 |
| 19 | post-finalization overwrite | Clinical integrity loss | No finalize yet; LWW DEMO | finalize + version + admin | P0 |
| 20 | direct localStorage mutation | Full bypass | None (DEMO) | No clinical SSOT in LS | P0 |

---

## 28. Projection Matrix

Hodnoty: DENY | ALLOW | ALLOW IF (explicit effective access + permission). Role alone never ALLOW.

| ACTOR | PET | HEALTH | DOCUMENTS | MICROCHIP | OWNER PII | CLINICAL WRITE | EXPORT |
|-------|-----|--------|-----------|-----------|-----------|----------------|--------|
| public | limited public | DENY | DENY | DENY | DENY | DENY | DENY |
| owner | full | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW (not sign clinician) | ALLOW |
| co-owner | shared | ALLOW IF health_* | ALLOW IF docs_* | DENY | DENY | ALLOW IF health_write | ALLOW IF (owner-class; default yes with health) |
| caregiver | limited | ALLOW IF health_read | ALLOW IF docs_read | DENY | DENY | ALLOW IF explicit health_write | DENY |
| viewer | profile | DENY | DENY | DENY | DENY | DENY | DENY |
| professional | IF grant | ALLOW IF view* | ALLOW IF viewDocuments | DENY | DENY | ALLOW IF add* | DENY unless explicit |
| organization clinician | IF memb+grant+elig | ALLOW IF view* | ALLOW IF viewDocuments | DENY | DENY | ALLOW IF add* | DENY unless explicit |
| organization staff | IF assigned+perms | usually DENY | usually DENY | DENY | DENY | DENY | DENY |
| emergency actor | limited | emergency projection | DENY default | masked IF policy | DENY | clinical.emergency.write time-bound | DENY |

---

## 29. Permission Matrix

PROFESSIONAL / ORG = **ALLOW IF EXPLICIT ACCESS + PERMISSION** or DENY. Nikdy auto z role.

| ACTION | OWNER | CO-OWNER | CAREGIVER | VIEWER | PROFESSIONAL | ORG CLINICIAN | ORG STAFF | EMERGENCY |
|--------|-------|----------|-----------|--------|--------------|---------------|-----------|-----------|
| health.read | ALLOW | ALLOW IF | ALLOW IF read | DENY | ALLOW IF | ALLOW IF | ALLOW IF | limited IF |
| health.write | ALLOW | ALLOW IF | ALLOW IF write | DENY | ALLOW IF | ALLOW IF | DENY default | DENY (use emergency) |
| clinical.finalize | owner-entered IF | owner-entered IF | DENY default | DENY | ALLOW IF + authorship | ALLOW IF + authorship | DENY | DENY |
| clinical.sign | DENY | DENY | DENY | DENY | ALLOW IF clinician | ALLOW IF clinician | DENY | DENY |
| clinical.withdraw | ALLOW IF | ALLOW IF | ALLOW IF write | DENY | ALLOW IF | ALLOW IF | DENY | DENY |
| clinical.admin | owner-entered IF | limited IF | DENY | DENY | ALLOW IF elevated | ALLOW IF elevated | DENY | DENY |
| clinical.export | ALLOW | ALLOW IF | DENY | DENY | DENY unless explicit | DENY unless explicit | DENY | DENY |
| documents.read | ALLOW | ALLOW IF | ALLOW IF | DENY | ALLOW IF | ALLOW IF | ALLOW IF | DENY |
| documents.write | ALLOW | ALLOW IF | ALLOW IF write | DENY | ALLOW IF | ALLOW IF | DENY default | DENY |
| medication.write | ALLOW | ALLOW IF | ALLOW IF write | DENY | ALLOW IF | ALLOW IF | DENY default | emergency IF |
| vaccination.write | ALLOW | ALLOW IF | ALLOW IF write | DENY | ALLOW IF addVaccination | ALLOW IF | DENY default | emergency IF |
| clinical.emergency.write | N/A / owner context | N/A | DENY | DENY | time-bound IF | time-bound IF | DENY | ALLOW time-bound |

ALLOW IF = explicit effective grant + matching permission (+ eligibility for org).

---

## 30. Data Classification

| Class | Examples |
|-------|----------|
| PUBLIC | Discover-safe pet projection (name/photo policy) |
| PRIVATE | Non-shared pet profile fields |
| HOUSEHOLD | HH-shared calendar/gallery/timeline per perms |
| PROFESSIONAL | Pro projection of pet card (granted fields) |
| CLINICAL | HealthRecord active facts, meds, vax, measurements, encounter notes |
| CLINICAL_HIGH_SENSITIVITY | Diagnosis detail, full history export, signed records, corrections |
| IDENTIFIER | Microchip, external registry ids |
| OWNER_PII | Owner contacts, address, phone |
| AUDIT | AuditEvent authorization metadata (scrubbed) |

### Placement

| Data | Class |
|------|-------|
| Pet basic (public fields) | PUBLIC / PRIVATE |
| HealthRecord | CLINICAL |
| medication / vaccination | CLINICAL |
| document | CLINICAL (+ file = high sensitivity) |
| measurement | CLINICAL |
| diagnosis | CLINICAL_HIGH_SENSITIVITY |
| microchip | IDENTIFIER |
| owner contact | OWNER_PII |
| encounter (future) | CLINICAL |
| AuditEvent | AUDIT (≠ clinical history) |

---

## 31. Future Encounter Compatibility

K58 Encounter **použije** stávající authorize — ne nový ACL.

### Pattern

```
authorize(ctx, {
  action: 'clinical.finalize' | 'health.read' | …,
  resource: { type: 'encounter', id: encounterId }
})
```

### Resolution

| Concern | Rule |
|---------|------|
| resource | Encounter entity (future ResourceType) |
| parent resource | Always resolve → Pet |
| pet boundary | Same ownership / HH / Pro / OrgPetAccess as today |
| organization boundary | Org context + OrgPetAccess for that pet |
| professional boundary | ProfessionalProfile + PetProfessionalAccess |
| booking | Optional 1:1 link — **never** authority |

Encounter create/update draft → `health.write` (or typed).  
Encounter finalize → `clinical.finalize`.  
Never: bookingId alone → clinical ALLOW.

---

## 32. Backend Contract

```
request
  → authenticated actor (server session)
  → trusted resource load
  → authorize(action, resource)
  → action handler
  → transaction (mutate + clinical history + stamps)
  → audit (authorization_decision)
```

| Concern | Rule |
|---------|------|
| Server-side | Authn, authz, stamps, version, finalize/sign/withdraw/admin/export |
| Client-side UX only | Disable buttons via can*; never security |
| Atomic | Mutation + history row + authz audit metadata |
| Idempotent | finalize/sign/withdraw retries safe (K52/K64) |
| Versioned | Integer version; optimistic concurrency; no LWW after finalize |

**Neimplementovat API v K55.**

---

## 33. Risk Matrix

| AREA | CURRENT STATE | GAP | RISK | PRIORITY | PRODUCTION REQUIREMENT |
|------|---------------|-----|------|----------|------------------------|
| Central authorize | Implemented K47 | DEMO authority | Client forge | P0 | authority:'server' |
| clinicalGate | K50 glue | DEMO session | Bypass via LS | P0 | Server gate |
| health.write coarseness | Typed + HH fold | No finalize/sign/admin/export/withdraw split | Over-broad edits | P1 | Extend SecurityAction map |
| Soft withdraw | K51 | Gated as write | Inappropriate withdraw | P1 | clinical.withdraw |
| Finalize/sign | Missing | No lock | Integrity | P0 w/ clinic scale | K56+K57+actions |
| Version/history | Missing | LWW | Silent overwrite | P0 | K57 ledger |
| Owner/co-owner health | Correct defaults | Ownership transfer invariant soft | Co-owner removes owner | P1 | Server ownership lock |
| Caregiver | Correct defaults | Explicit write possible | Over-grant by owner | P2 | UX warnings + audit |
| Viewer | Deny health | LS bypass DEMO | Leak | P0 | Server ACL |
| Pro access | Effective checks | Stale client cache | Stale allow | P0 | Server grants |
| Org AND gate | Correct | Ops role confusion | Admin clinical peek | P1 | Keep membership ≠ clinical |
| Booking isolation | Correct | Regression risk | Escalation | P0 | Keep forever |
| Emergency | Separate HH perms | No clinical.emergency.write | Permanent escalate | P0 | Time-bound action |
| Export | Travel approx | No action | Over-export | P1 | clinical.export |
| Authorship | Client stamps | Spoofable | Fake clinician | P0 | Server stamps |
| Encounter | Design only K54 | No runtime | Wrong container | P1 | K58 after K55–57 |
| Parallel systems | Avoided | Temptation to fork | Dual ACL | P0 | Map into authorize only |

---

## 34. Recommended Architecture

### Principles

1. **One authorize()** — extend actions, don't fork.
2. **Existing access domains** — HH / Pro / OrgPetAccess / ownership.
3. **Existing permission lists** — extend mapping; optional future Pro perm bits only if mapping insufficient (still same lists, not new store).
4. **health.write = draft/active mutate only.**
5. **Owner/co-owner full health data access; never clinician sign.**
6. **Caregiver A; Viewer DENY.**
7. **Booking / microchip / public / emergency isolation preserved.**
8. **AuditEvent ≠ clinical history.**
9. **Server authority before production clinical.**

### Mapping strategy (future implementation hint — not K55 code)

```
SecurityAction (extended)
  → householdPermissionForAction / professionalPermissionForAction
  → existing permissions[] on grant
  → ownership short-circuit for owner-class data actions
  → authorship policy layer for finalize/sign (server)
```

### No parallel system checklist

| Forbidden new system | Status |
|----------------------|--------|
| PetAccess | Not recommended |
| ClinicalAccess | Not recommended |
| PermissionStore | Not recommended |
| Auth service (parallel) | Not recommended — extend SecurityContext |
| New AuditEvent kind replacing K48 | Not recommended |
| New messaging for authz | Not recommended |

---

## 35. K56+

### Pořadí (K54 confirmed; K55 reinforces)

| Step | Type | Focus | Depends | Forbidden |
|------|------|-------|---------|-----------|
| **K55** | Audit | This vocabulary contract | K50, K54 | Runtime changes |
| **K56** | Implementation | Server clinical vertical + authoritative stamps | K55 decisions | Fake LS backend; new access model |
| **K57** | Implementation | version + clinical history ledger | K52, K56 | Using AuditEvent as clinical history |
| **K58** | Implementation | Clinical Encounter runtime | K55–K57 | Encounter before authority/history |
| **K59** | Implementation | Docs attachment / ACL polish | K56+ | Public/booking doc leak |
| **K60** | Implementation | Measurements provenance clinic vs home | K56 | New measurement ACL system |
| **K61** | Implementation | Meds/vax clinic workflows | K55 typed actions | Collapsing back to health.write only for clinic |
| **K62** | Implementation | Share / export (`clinical.export`) | K55, K56 | Export=read |
| **K63** | Implementation | Emergency clinical time-bound | K55 emergency action | Permanent health.write |
| **K64** | Implementation | Idempotency / GDPR | K56–K57 | Skipping audit scrub |

### Proč nepřeskočit

- Finalize bez K57 version = unsafe overwrite surface.  
- Encounter (K58) bez K55 vocabulary = over-broad health.write na epizodě.  
- Server (K56) před Encounter — client LS nesmí být SSOT.

**Pořadí K55 → K56 → K57 → K58 se nemění.**

---

## 36. Explicit Decisions

1. Verdikt **B** — harden vocabulary + server; not redesign (**not C**), not ready (**not A**).
2. Owner = full health read/write (data); not clinician sign.
3. Co-owner = full health read/write; cannot remove owner (server invariant P1).
4. Caregiver = **variant A** (explicit health.read default; no auto write).
5. Viewer = no health access.
6. Keep existing typed SecurityActions; add minimal clinical.* for finalize/sign/withdraw/admin/export/emergency.
7. Do **not** add `clinical.write` alias.
8. Do **not** add clinical.document.* or clinical.measurement.write as separate perms.
9. Map new actions onto existing HH/Pro permission lists inside authorize().
10. Professional / Org = ALLOW IF explicit access + permission only.
11. Booking / microchip / public never grant clinical.
12. Emergency write time-bounded ≠ permanent health.write.
13. Withdraw authority ≠ health.write (future split).
14. Export authority ≠ read.
15. Finalize requires server + version before production use.
16. Sign = optional extension; clinician-only.
17. Correction = clinical.admin + reason + version + history.
18. No parallel PetAccess / PermissionStore / Auth / Audit / Messaging systems.
19. Future Encounter authorizes via same stack with pet parent boundary.
20. K56 → K57 → K58 order locked.

---

## 37. Final Verdict

### **B — CLINICAL AUTHORITY NEEDS FURTHER HARDENING**

**Proč ne A:** Chybí finalize/sign/admin/export/withdraw split v runtime; DEMO localStorage authority; no version ledger; authorship spoofable; Encounter not implemented.

**Proč ne C:** `SecurityContext` + `authorize()` + oddělené access domains + explicit `permissions[]` + clinicalGate + K48 audit + K51 provenance jsou **správný základ**. Potřeba je **rozšířit** SecurityAction vocabulary a mapování — ne postavit paralelní authorization systém.

---

## Absolutní invarianty (K55 potvrzuje)

- Pet = identity SSOT.
- Pet ownership ≠ access.
- Household ≠ Professional ≠ Organization access.
- Role ≠ permission.
- Role ≠ access.
- Professional role ≠ clinical access.
- Organization membership ≠ clinical access.
- Booking ≠ clinical access.
- Booking ≠ clinical write.
- Microchip ≠ authorization.
- Emergency ≠ permanent access.
- Public ≠ clinical.
- AuditEvent ≠ clinical history.
- Owner = full health read/write.
- Co-owner = full health read/write.
- Co-owner nemůže odebrat původního ownera.
- Caregiver nemá automatický health write.
- Viewer nemá health access.
- Clinical authorship nesmí být spoofovatelná klientem.
- Finalized clinical data nesmí být hard-overwritten.
- Production authorization musí být server-authoritative.
- localStorage ≠ production authority.
- Client-side permission checks ≠ security boundary.
- žádný booking auto-grant.
- žádný organization auto-grant.
- žádný microchip auto-grant.
- žádný public clinical leak.
- žádný nový paralelní access systém.
- žádný nový paralelní permission systém.
- žádný nový paralelní authorization systém.
- žádný nový paralelní audit systém.

---

## K55 deliverable confirmation

| Item | Status |
|------|--------|
| Runtime code changed | **No** |
| New models / storage / routes / UI | **No** |
| Permissions / authorization / Health / Access changed | **No** |
| Only deliverable | `docs/K55-clinical-authority-audit.md` |

**K55 JE ČISTĚ ARCHITEKTONICKÝ AUDIT. ŽÁDNÝ NÁVRH Z TOHOTO DOKUMENTU NEBYL IMPLEMENTOVÁN.**
