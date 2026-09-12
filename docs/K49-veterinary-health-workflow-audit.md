# KROK 49 — Veterinary / Health Workflow Architecture Audit

**Rozsah:** pouze audit. Žádná změna aplikačního kódu, modelů, storage, routes, UI, migrací, permissions ani security.  
**Datum:** 2026-09-12  
**Navazuje na:** [K47-security-authorization-runtime.md](K47-security-authorization-runtime.md), [K48-security-audit-trail-runtime.md](K48-security-audit-trail-runtime.md), [K43-organization-scoped-pet-access-audit.md](K43-organization-scoped-pet-access-audit.md), [K40-strategic-architecture-audit.md](K40-strategic-architecture-audit.md)

**Legenda persistence:**

| Kód | Význam |
|-----|--------|
| **A** | Persistentní model (v DEMO: přežije refresh přes storage) |
| **B** | localStorage DEMO persistence |
| **C** | Pouze React / UI state |
| **D** | Mock / seed data |
| **E** | Placeholder (UI bez napojení na SSOT) |
| **F** | Type / interface / projection / helper bez vlastního store |

**Legenda stavu:** `CONFIRMED` · `GAP` · `UNKNOWN — REQUIRES REVIEW` · `EXISTUJE` · `PARTIAL` · `MOCK` · `CHYBÍ` / `MISSING`

---

## Verdikt (shrnutí)

**B) HEALTH ARCHITECTURE NEEDS HARDENING FIRST**

Klinický SSOT (`HealthRecord` + `PetDocument`) a access/projection vrstva (Household / Professional / Organization + K47/K48) jsou konzistentní a assertované. Hardening je nutný před další klinickou vrstvou: clinical UI nevolá `authorize()`, Messages health-share čte mock seed, denorm pole na Pet mohou divergovat, `deletePet` cascade je neúplný, first-class diagnosis/labs/surgery chybí. Není důvod k redesignu celého health modelu (ne **C**) — není druhý konkurenční clinical SSOT.

---

## 1. Health stack inventory

### 1.1 Klinické jádro

| Položka | Soubor(y) | Persistence | Poznámka |
|---------|-----------|-------------|----------|
| `HealthRecord` / `HealthRecordType` | `src/types/index.ts` | **F** (typ) + **B** (data) | Typy: `vaccination` \| `vet` \| `medication` \| `examination` \| `assessment` |
| Health store | `src/context/AppContext.tsx` | **B** | Key: `lovedandknown.healthRecords` |
| Seed records | `src/data/mockData.ts` → `healthRecords` | **D** | Luna/Milo/Bella |
| Health UI | `src/pages/HealthPage.tsx`, `src/components/health/*`, `src/components/pets/profile/HealthTab.tsx` | UI nad AppContext | Nevolá `authorize()` |
| Helpers | `src/lib/healthDashboard.ts`, `src/components/pets/profile/healthHelpers.ts` | **F** | Agregace / kategorie |
| Assessment | `HealthAssessmentSnapshot` + `src/lib/healthAssessment/*` + `HealthAssessmentModal.tsx` | **B** na Pet + HealthRecord `assessment` | Owner questionnaire, ne diagnóza |

### 1.2 Pet-embedded health fields

| Pole na `Pet` | Persistence | Role |
|---------------|-------------|------|
| `healthStatus`, `healthScore` | **B** (`lovedandknown.pets`) | Display / soft alert |
| `healthAssessment` | **B** | Snapshot hodnocení |
| `weight` | **B** | Scalar current weight (≠ historie) |
| `neutered` | **B** | Boolean (spay/neuter labels) |
| `lastVetVisit`, `nextVaccination` | **B** | Denorm display strings |
| `diet`, `supplements` | **B** | Lifestyle, ne prescriptions |
| `emergencyCard` | **B** | Opt-in acute text (oddělené) |
| `breeding.healthTests` | **B** | Breeding dossier (oddělené) |
| `microchip` (+ verification) | **B** | Owner-private; ≠ health grant |

### 1.3 Paralelní / related stores

| Oblast | Key / místo | Persistence |
|--------|-------------|-------------|
| Weight history | `lovedandknown.weightMeasurements` (`src/lib/badges/badgeData.ts`) | **B** + **D** seed |
| Documents | `lovedandknown.petDocuments` + IndexedDB `lovedandknown-documents` | **B** + IDB |
| Calendar | `lovedandknown.calendarEvents` | **B** |
| Timeline | seed `timelineEvents` + derived z HealthRecord + `customTimeline` | **D** + **F** + **C** |
| Daily care | `lovedandknown.dailyCare.{petId}.{day}` | **B** |
| Travel prefs | `lovedandknown.travelPrefs` | **B** |
| Privacy | `lovedandknown.privacySettings` | **B** |
| Notification prefs | `loved-known-notification-prefs` | **B** |
| Notifications inbox | `lovedandknown.notifications` | **B** |

### 1.4 Access / projection / security (health-related)

| Oblast | Soubory |
|--------|---------|
| Household | `src/lib/household/{types,permissions,access,project,storage}.ts` |
| Professional | `src/types/professional.ts`, `src/lib/professional/{access,permissions,project}.ts` |
| Organization pet | `src/lib/organization/{petAccess,petProject,petAccessStorage}.ts` |
| Ownership | `src/lib/pets/ownership.ts` |
| Privacy / public | `src/lib/privacy/project.ts`, `src/lib/discover/*` |
| Emergency | `src/types/emergencyCard.ts`, `src/lib/emergencyCard/*` |
| Lost & Found | `src/lib/lostPet/publicView.ts`, `src/lib/foundPet/publicView.ts` |
| K47 authorize | `src/lib/security/{authorize,actions,adapters/*}.ts` |
| K48 audit | `src/lib/security/audit/*`, `auditHook.ts` |

### 1.5 Professional / clinic UI

| Položka | Soubor |
|---------|--------|
| Pro pet detail | `src/pages/professional/ProfessionalPetPage.tsx` |
| Pro pets list | `src/pages/professional/ProfessionalPetsPage.tsx` |
| Pro access management | `src/pages/ProfessionalPetAccessPage.tsx` |
| Pro calendar | `src/pages/professional/ProfessionalCalendarPage.tsx` (pokud přítomna) |
| Org pages | `ProfessionalOrganizationsPage`, `ProfessionalOrganizationDetailPage` |

---

## 2. Existující model vs mock

| Funkce | Klasifikace | Evidence |
|--------|-------------|----------|
| HealthRecord CRUD (owner AppContext) | **A≈B** | localStorage DEMO |
| Seed health records | **D** | `mockData.healthRecords` |
| HealthPage / HealthTab UI | UI nad **B** | Vypadá hotově, ale bez `authorize()` |
| WeightMeasurement | **B** + **D** | Oddělený store |
| PetDocument / passport | **B** + IDB | Meta + blobs |
| Calendar health events | **B** + **D** | Mix SoT schedule / derived |
| Timeline medical | **F** derived + **D** seed + **C** custom | Custom nepřežije refresh |
| Emergency card health text | **B** (na Pet) | Parallel by design |
| Breeding health tests | **B** (na Pet) | Parallel by design |
| Professional / HH / Org projections | **F** | Derived, ne stores |
| K47 `authorize()` health | **A≈B** policy runtime | `authority: 'demo'` |
| K48 health audit | **A≈B** pokud sink configured | Default no-op dokud `configureAuthorizationAudit` |
| Settings `VET_DATA_ACCESS` toggles | **E/C** | React state; **neukládá se** v save |
| Messages health share | **D** path | Import `healthRecords` z `mockData` |
| Server clinical DB | **CHYBÍ** | Žádný Prisma/SQL/Supabase |

---

## 3. Single source of truth

```
Pet (profile + embedded fields)
  └── HealthRecord[]          ← CLINICAL SSOT (lovedandknown.healthRecords)
  └── PetDocument[] + IDB     ← DOCUMENT SSOT
  └── WeightMeasurement[]     ← weight history SSOT (oddělený)
  └── emergencyCard           ← PARALLEL (acute, opt-in)
  └── breeding.healthTests    ← PARALLEL (breeding dossier)
  └── lastVetVisit / nextVaccination / weight scalar ← DUPLICATE denorm

CalendarEvent                 ← MIXED (manual schedule SoT; med/doc reminders DERIVED)
TimelineEvent                 ← DERIVED from HealthRecord + MOCK seed + ephemeral custom
ProfessionalPetView / HouseholdPetView / OrganizationPetView ← DERIVED projections
```

| Otázka | Odpověď |
|--------|---------|
| Kde je skutečný zdroj zdravotních dat Pet? | **`HealthRecord` + relevantní Pet fields + `PetDocument`** |
| Více health modelů? | Ano: clinical `HealthRecord`, emergency free-text, breeding tests — záměrně oddělené |
| Paralelní health stores? | Ano: weight, calendar, documents — related, ne druhý clinical SSOT |
| Calendar duplikuje health? | **Částečně** — med/doc derived OK; vaccination due **ne** auto-sync do calendar; manuální `vaccination` eventy mohou existovat vedle HealthRecord |
| Timeline duplikuje health? | **DERIVED** medical rows z HealthRecord; seed medical milestones = MOCK |
| Documents = zdravotní dokumenty? | Kategorie `health` / typy (`vaccination_record`, `lab_results`, …) — **document SSOT**, soft vztah k clinical |
| Professional workspace vlastní health data? | **Ne** — write jde do stejného `lovedandknown.healthRecords` |
| Health DTO/projection paralelně? | Projections existují jako **DERIVED**, ne jako druhý store |

**Explicitní značky:**

| Vrstva | Značka |
|--------|--------|
| `HealthRecord` | **SINGLE SOURCE OF TRUTH** |
| `PetDocument` | **SINGLE SOURCE OF TRUTH** (dokumenty) |
| `WeightMeasurement` | **SINGLE SOURCE OF TRUTH** (váhová historie) |
| `Pet.lastVetVisit` / `nextVaccination` | **DUPLICATE** |
| `Pet.weight` vs WeightMeasurement | **DUPLICATE** / denorm current |
| Calendar medication/document reminders | **DERIVED** |
| Calendar manual vet/vaccination | **SINGLE SOURCE OF TRUTH** (schedule) — může se překrývat s HealthRecord |
| Timeline medical auto | **DERIVED** |
| Timeline custom | **MOCK/ephemeral** (ne persistent) |
| Emergency card | **PARALLEL BY DESIGN** |
| Breeding health tests | **PARALLEL BY DESIGN** |
| Pro/HH/Org views | **DERIVED** |
| Messages share z mockData | **GAP / MOCK PATH** |

---

## 4. Health record types

| Typ | Stav | Evidence |
|-----|------|----------|
| vaccination | **EXISTUJE** | `HealthRecordType` + store + UI |
| vet visit | **EXISTUJE** | type `vet` |
| medication | **EXISTUJE** | type `medication` + reminder fields |
| examination | **EXISTUJE** | type `examination` |
| assessment | **EXISTUJE** | type `assessment` + Pet snapshot |
| weight measurement | **EXISTUJE** | `WeightMeasurement` (oddělený model) |
| document | **EXISTUJE** | `PetDocument` |
| laboratory (typed result) | **PARTIAL** | documentType `lab_results` + calendar `lab`; ne HealthRecord type |
| surgery | **PARTIAL** | calendar `EventType: 'surgery'`; ne HealthRecord |
| diagnosis | **CHYBÍ** | pouze assessment Q / UI copy / scrub regex |
| treatment (jako entita) | **PARTIAL** | medication + notes; žádný `treatment` type |
| procedure | **CHYBÍ** | — |
| allergy (entita) | **PARTIAL** | emergency free-text + assessment answers |
| condition / chronic | **PARTIAL** | emergency `chronicConditions` free-text |
| passport | **EXISTUJE** | `documentType: 'eu_passport'` (+ travel derivation) |

**Nezavádějí se nové typy v tomto kroku.** Výše = inventář existence.

---

## 5. Veterinářský workflow (současný stav)

```
OWNER
  → Pet (ownerAccountId)
  → Health (AppContext healthRecords — owner-centric UI)
  → Professional Access (explicit PetProfessionalAccess grant)
  → Veterinarian (professional identity / profile)
  → Health read/write (permissions na grantu + projection)
```

| Otázka | Stav |
|--------|------|
| Co veterinář vidí? | `projectPetForProfessional` — filtered profile + optional healthRecords / vaccinations / medications / documents dle permissions |
| Co může číst? | `viewHealth`, `viewVaccinations`, `viewMedications`, `viewDocuments` (vacc/med implied by `viewHealth`) |
| Co může zapisovat? | `addHealthRecord`, `addVisit`, `addVaccination`, `addNote` — oddělené od read |
| Write permission opravdu funguje? | **CONFIRMED** v domain lib + asserts; pro UI používá projection a write helpers do stejného store |
| Write oddělené od role? | **CONFIRMED** — role/profile type nenavazuje health; grant permissions jsou SSOT |
| Professional Access gateuje health? | **CONFIRMED** v projection + K47 adapter |
| Projection omezuje data? | **CONFIRMED** — bez perm → bez health polí; microchip/owner contacts forbidden |
| Owner/co-owner přístup | **CONFIRMED** v domain (owner full; co-owner defaults health R+W) |
| Caregiver/viewer | **CONFIRMED** — caregiver default `health_read` only; viewer žádný health |

**GAP:** Owner `HealthPage` / `HealthTab` neprochází `authorize()` ani household projection — předpokládají owner session nad AppContext.

---

## 6. Owner / Co-owner

Očekávané pravidlo vs runtime:

| Role | Očekávání | Runtime | Verdikt |
|------|-----------|---------|---------|
| Owner | Plný přístup | `isPetOwner` / `decideOwnerPetAccess` — ALLOW včetně health + microchip/PII | **CONFIRMED** |
| Co-owner | Plný včetně health R/W | `suggestedHouseholdPermissionsForRole('co_owner')` zahrnuje `health_read` + `health_write`; stored permissions SSOT | **CONFIRMED** |
| Caregiver | Pouze explicitní; health write neautomatický | Default: `health_read` bez `health_write` | **CONFIRMED** |
| Viewer | Žádný health access | Default: ani `health_read` ani `health_write` | **CONFIRMED** |

Evidence: `src/lib/household/permissions.ts`, asserts `assert-pet-household-access.mts`, K47 security asserts.

**GAP (UI):** Household health projection není spotřebována owner Health pages — enforcement je v libs/asserts/pro pages.

---

## 7. Professional Access

| Aspekt | Stav |
|--------|------|
| `PetProfessionalAccess` | **EXISTUJE** — petId + professionalId + permissions[] + status/expiry |
| Professional identity ≠ Access ≠ Health permission | **CONFIRMED** |
| Read-only vet access | **EXISTUJE** — grant s view\* bez add\* |
| Read/write vet access | **EXISTUJE** — `addHealthRecord` / `addVisit` / `addVaccination` / `addNote` |
| Revoked access | **EXISTUJE** — status; projection ineffective |
| Expired access | **EXISTUJE** — `expiresAt` / expire helpers |
| Audit health read/write | **PARTIAL** — K48 audituje `authorize()` decisions; domain pro view logs odděleně; UI clinical pages nevolají authorize → žádný K48 z HealthPage |

K47 mapování: `health.read` → `viewHealth`; `health.write` → `addHealthRecord`.

---

## 8. Organization Pet Access

| Otázka | Odpověď |
|--------|---------|
| Může organizace pracovat s Pet health? | **Ano v lib** — přes `OrganizationPetAccess` + explicit `ProfessionalPermission[]` |
| Organization scope | AND gate: effective OrgPetAccess + effective membership + eligibility + permissions |
| Membership samo dává health? | **Ne** — **CONFIRMED** (`permissionsForOrganizationRole` nikdy pet health) |
| Explicit Pet grant? | **Ano** — `OrganizationPetAccess` |
| Permission existuje? | Stejný Pro vocab (`viewHealth`, `addHealthRecord`, …) |
| Health projection? | `projectPetForOrganization` — **EXISTUJE** |
| Product UI používá org projection? | **GAP** — org pages nevolají `projectPetForOrganization` |

**Zachováno:** OrganizationMembership ≠ OrganizationPetAccess ≠ HealthPermission.

---

## 9. Health projection

| Surface | Health data? | Verdikt |
|---------|--------------|---------|
| Owner AppContext | Plný store | Owner-centric (bez authorize v UI) |
| Household | Pouze s `health_read`; write flag `health_write` | **CONFIRMED** projection |
| Professional | Pouze explicit grant perms | **CONFIRMED** |
| Organization | Pouze OrgPet + perms + eligibility | **CONFIRMED** (lib) |
| Public Pet | Nikdy clinical HealthRecord | **CONFIRMED** |
| Discover | Nikdy clinical; sanitize forbidden keys | **CONFIRMED** |
| Connection privacy | Může `healthStatus` / allergies / meds z emergency card pokud level `connections` | **By design** — ne Discover/public |
| Emergency public | Opt-in card fields only | **CONFIRMED** — ne HealthRecord[] |

---

## 10. Microchip / Owner PII

| Path | Health grant ⇒ chip/PII? | Verdikt |
|------|--------------------------|---------|
| Household authorize | Non-owner `microchip.read` / `ownerContacts.read` DENY | **CONFIRMED** |
| Professional projection | Forbidden keys; void microchip | **CONFIRMED** |
| Organization path | Hard DENY chip/PII | **CONFIRMED** |
| Owner | ALLOW chip/PII | **CONFIRMED** |
| Emergency public | Masked chip pouze pokud opted-in | **CONFIRMED** (oddělené) |
| Lost & Found public | Bez chip / owner PII | **CONFIRMED** |
| Local chip lookup | Vrací `{ petId, petName }` only | **CONFIRMED** |

**Leakage residual (záměrné / DEMO):**

- Connection privacy může sdílet chip/health na level `connections` (ne public).
- DEMO localStorage = client-writable authority (**CRITICAL** pro produkci, viz §29).
- Owner free-text v emergency/lost instructions může obsahovat klinické informace — model neredačuje medicínský jazyk.

---

## 11. Documents / passports

| Aspekt | Stav |
|--------|------|
| Model | `PetDocument` — category, documentType, expiry, storageKey, isPublic |
| Storage | LS meta + IndexedDB blobs |
| Health-related types | `eu_passport`, `vaccination_record`, `health_report`, `lab_results`, `exam_results`, `vet_report`, `breeding_health_tests`, … |
| Owner R/W | AppContext / documentStorage |
| Household | `documents_read` / `documents_write` |
| Professional / Org | `viewDocuments` |
| Projection | Filtered v Pro/HH/Org views |
| Sensitive content | Blobs v IDB; metadata v LS; Discover forbids documents |
| Pro access auto ⇒ documents? | **Ne** — potřebuje `viewDocuments` (ne implikováno samotným `viewHealth` v typickém grantu — **VERIFY** při konkrétním grant UI) |
| Document access ≠ health access | **CONFIRMED** oddělená permissions |
| Hard FK HealthRecord → document | **CHYBÍ** — soft link jen breeding `documentIds` |
| `isPublic` publish | Existuje pole; normalize/upload force `false` — veřejné publish **neaktivní** |

---

## 12. Vaccinations

| Aspekt | Stav |
|--------|------|
| Data model | `HealthRecord` type `vaccination` |
| Datum | `date` |
| Typ / název | `vaccineName`, `title` |
| Platnost / next due | `nextDueDate` |
| Reminder | Notifications z `buildHealthNotificationDrafts` (preferují HealthRecord) |
| Evidence / document | Odděleně `PetDocument` (`vaccination_record`); žádný hard link |
| Vet record | Stejný HealthRecord + optional `doctor` / `clinic` |
| Calendar integration | Manuální/seed `CalendarEvent` type `vaccination` **ne** auto z `nextDueDate` (**DUPLICATE risk**) |
| Pet denorm | `Pet.nextVaccination` string — **DUPLICATE** |

**Faktický health record** = HealthRecord.  
**Derived calendar/reminder** = notification drafts; calendar vaccination event ≠ auto-derived z due date.

---

## 13. Medications

| Aspekt | Stav |
|--------|------|
| Model | `HealthRecord` type `medication` |
| Dávkování | `dosage` |
| Interval / course | `reminderDays`, `scheduleTime` |
| Start/end | `date` + reminderDays (course); `status` active/completed/scheduled |
| Reminders | `reminderEnabled` → derived calendar series (`sourceRecordId`) + notifications |
| History | Seznam HealthRecords filtrovaný type/petId |
| Active/inactive | `status` |

**Leakage checklist:**

| Surface | Leak? |
|---------|-------|
| Public profile / Discover | **Ne** (forbidden / sanitize) — **CONFIRMED** |
| Pro projection bez permission | **Ne** |
| Org projection bez grant | **Ne** |
| Notifications | **Ano payload risk** — title/message mohou obsahovat pet name + lék (ne scrub jako K48 audit) |
| Audit K48 | Metadata only; scrub clinical keys — **CONFIRMED** když authorize volán |
| Messages health share | **GAP** — mock seed + clinical summary v message body |

---

## 14. Diagnosis / labs / examinations

| Typ | Stav |
|-----|------|
| examination | **EXISTUJE** (HealthRecord) |
| laboratory result entity | **MISSING** jako HealthRecord; **PARTIAL** jako document + calendar |
| diagnosis | **MISSING** |
| treatment entity | **MISSING** / **PARTIAL** přes medication + notes |
| surgery | **MOCK/PARTIAL** (calendar EventType only) |
| procedure | **MISSING** |

---

## 15. Clinical timeline

| Aspekt | Stav |
|--------|------|
| Persistentní? | Medical auto: **derived** (ne vlastní store). Custom: **C** ephemeral. Seed: **D** |
| Derived? | Ano — `buildPetTimeline` / `healthRecordToTimelineEvent` |
| Obsahuje health events? | Ano — category `medical`, source health_record/vaccination/medication/vet |
| Rozlišení health vs milestone? | Ano přes `category` / `source` |
| Vhodná pro klinickou historii? | **Částečně** — UI timeline ≠ clinical SoT; chybí audit změn timeline |
| Professional vidí historii? | Timeline **není** v ProfessionalPetView — pro vidí HealthRecords |
| Audit změn timeline? | Custom timeline nepersistentní; HealthRecord změny bez K48 z owner UI |

**Timeline ≠ Health Record.** Vztah: Timeline medical rows jsou **DERIVED view** nad HealthRecord + mock/ephemeral layers.

---

## 16. Calendar

| Health concept | Calendar role |
|----------------|---------------|
| Vaccination due | Prefer HealthRecord `nextDueDate` → notifications; calendar event **optional/manual** |
| Vet appointment | Manual calendar / booking-derived `booking` |
| Medication reminder | **DERIVED** z HealthRecord (`medicationReminders.ts`, `sourceRecordId`) |
| Document expiry | **DERIVED** (`documentReminders.ts`, `sourceDocumentId`) |
| Surgery / lab / dental | Calendar EventTypes — **schedule vocabulary**, ne clinical SSOT |

**Duplicita:** HealthRecord + CalendarEvent + Pet denorm mohou reprezentovat tutéž skutečnost bez sync.

---

## 17. Notifications

| Typ | Stav |
|-----|------|
| Medication reminder | **EXISTUJE** (derived drafts) |
| Vaccination / vet / health | **EXISTUJE** (`buildHealthNotificationDrafts`) |
| Appointment / calendar | **EXISTUJE** (`buildCalendarNotificationDrafts`; med-derived rows skipped to avoid double-bell) |
| Prefs gate generation? | **GAP** — `notificationPrefs` UI **není wired** na draft builders |
| Privacy payload | Inbox může obsahovat pet name + drug/vax labels; K48 scrub **neaplikuje** na AppNotification |

---

## 18. Security / authorize / audit (analyticky K47/K48)

Reprezentovatelný pipeline:

```
SecurityContext → authorize() → health permission mapping → projection → emitAuthorizationAudit
```

| Action | Policy | Enforcement dnes |
|--------|--------|------------------|
| ALLOW `health.read` | Owner; HH `health_read`; Pro `viewHealth`; OrgPet+viewHealth | **CONFIRMED** v authorize + asserts |
| ALLOW `health.write` | Owner; HH `health_write`; Pro `addHealthRecord`; OrgPet+add | **CONFIRMED** v authorize + asserts |
| DENY `health.read` / `health.write` | Viewer; caregiver write; no grant; revoked/expired; wrong mode | **CONFIRMED** v asserts |

**Kde se skutečně enforceuje:**

| Layer | Enforcement |
|-------|-------------|
| Domain projections (Pro pet page) | **Ano** |
| K47 authorize + scripts/e2e | **Ano** |
| Owner HealthPage / HealthTab | **Ne** (`authorize` neimportován v `src/pages`) |
| Household consumer pages for health | **GAP** — projection existuje, Health UI ji nepoužívá |
| Emergency write na `updatePet` | Domain check `canWritePetEmergency` v AppContext |

---

## 19. Audit trail (K48 relevance)

Existující security actions relevantní pro health stack:

| Action | Relevantní? | Audituje se když? |
|--------|-------------|-------------------|
| `health.read` / `health.write` | Ano | Každé `authorize()` finish → AuditSink (pokud configured) |
| `medication.*` / `vaccination.*` / `labs.*` / `documents.*` | Ano v K47 action map | Stejně přes authorize |
| `microchip.read` | Ano (oddělené od health) | Authorize; hodnota chipu nikdy v auditu |
| Domain pro access logs | Oddělené od K48 | Grant lifecycle / view metadata |

**Nepřidávat nové actions** jen kvůli auditu.  
**GAP:** Owner clinical UI nevolá authorize → žádný K48 event z HealthPage read/write.

---

## 20. Clinic workspace

| Aspekt | Stav |
|--------|------|
| Veterinář má Pet detail | **Ano** — `ProfessionalPetPage` |
| Vidí Health | **Ano** — přes projection + perms |
| Může zapisovat | **Ano** — při write perms do stejného HealthRecord store |
| Návštěva veterináře | Jako `HealthRecord.type === 'vet'` — **ne** samostatná VetVisit entita |
| Klinická historie | Seznam HealthRecords ve view |
| Patient workflow | **PARTIAL** — access + pet detail; žádný plný clinic intake/SOAP workflow |
| Multi-staff | Org membership + OrgPetAccess v lib |
| Organization context v UI | Org pages existují; **health org projection unused in UI** |

---

## 21. Multi-staff

Architektura **umožňuje**:

```
Clinic (Organization)
  → Membership (Veterinarian A / B / Nurse)
  → OrganizationPetAccess (explicit pet grant + permissions)
  → HealthPermission (viewHealth / addHealthRecord / …)
```

Bez automatického přístupu ke všem Pets přes membership samotné — **CONFIRMED**.

| Oddělení | Stav |
|----------|------|
| OrganizationMembership ≠ OrganizationPetAccess | **CONFIRMED** |
| OrganizationPetAccess ≠ HealthPermission | **CONFIRMED** (perms na grantu) |
| Product UI multi-staff patient list | **GAP** (lib-ready, UI incomplete) |

---

## 22. Emergency vs clinical health

| | Emergency Card | Clinical Health Record |
|--|----------------|------------------------|
| Storage | `Pet.emergencyCard` | `healthRecords` |
| Content | Short owner-authored acute text | Structured visits/vaccines/meds/exams |
| Auth | `emergency_read` / `emergency_write` | `health_read` / `health_write` / Pro view/add |
| Public | Opt-in visibility (default OFF) | Never on Discover/public |
| Finder | Pouze public emergency allowlist | Ne |

**CONFIRMED:** Emergency access **nezpřístupňuje** celou clinical historii.

---

## 23. Lost & Found

| Surface | Health? |
|---------|---------|
| Lost public view | Safe public projection — **bez** HealthRecords / meds / docs / chip |
| Found QR contact | Notifications / messages — bez health payload |
| Emergency attach | Oddělená opt-in karta |

**Expected:** Lost & Found → safe public; Health → private. **CONFIRMED** pro structured clinical data.  
**Residual:** free-text instructions mohou zmínit medicínu (owner-authored).

---

## 24. Public Pet / Discover

| Surface | Health excluded? |
|---------|------------------|
| `projectPublicPet` | **Ano** |
| Discover sanitize / forbidden keys | **Ano** |
| Community / public owner / public professional | Bez clinical HealthRecord v public projections (dle privacy/org project) |
| Connection viewer | Může limited health fields — **ne** Discover |

Leakage paths k review: connection privacy settings; owner free-text; DEMO LS tampering.

---

## 25. Breeding health tests

| Aspekt | Stav |
|--------|------|
| Model | `BreedingHealthTest` na `Pet.breeding.healthTests` |
| Private | **Ano** — dossier na Pet |
| Public Discover / showcase | **Explicitně omítá** `healthTests` |
| Professional-only clinical sync | **Ne** — žádný sync s HealthRecord; pro projection neexponuje breeding tests jako clinical |
| Breeding ≠ full clinical | **CONFIRMED by design** |

**Neexistuje druhý clinical health model** — breeding je oddělený dossier.

---

## 26. Data lifecycle

| Event | Health chování |
|-------|----------------|
| Pet create | Owner set; health/docs empty |
| Ownership change | **Žádné transfer API** — pouze resolve/assert owner |
| Co-owner / pro / org grant | Explicit access records + perms + expiry |
| Revoke / expire | Grant ineffective → projection empty / DENY |
| Pet deletion | Cascade: photos, documents+blobs, healthRecords, calendar (by pet), badges. **Nečistí:** pro/org/HH grants, weightMeasurements, notifications, lost announcements, bookings |
| Logout | Session/UI clear; **Pets/health/docs zůstávají** na device |

**CONFIRMED:** Health data vázaná na **`petId`**, ne na session.  
**GAP:** incomplete delete cascade; logout neodstraní citlivá data z zařízení.

---

## 27. Backend readiness

| Prvek | DEMO dnes | Přenositelnost |
|-------|-----------|----------------|
| ID | string ids | **BACKEND-READY** (potřeba server-issued) |
| Timestamps | ISO strings (partial) | Částečně |
| Ownership | `ownerAccountId` | **BACKEND-READY** koncept |
| Access grants | HH / Pro / OrgPet LS | **BACKEND-READY** model; potřeba server authority |
| Permissions | Explicit arrays | **BACKEND-READY** |
| Projections | Pure functions | **BACKEND-READY** |
| Audit | K48 sink stub + demo | Contract ready; server sink stub |
| Relationships | petId FKs soft | OK pro API |

**Verdikt:** Doménová logika (access ≠ membership ≠ health perm; projections) je **částečně BACKEND-READY**. Persistence je DEMO LS/IDB — **ne production-ready**. Veřejná doménová logika lze přesunout bez nutnosti měnit sémantiku grantů, pokud UI začne respektovat authorize.

---

## 28. External integrations

| Cíl | BACKEND-READY | INTEGRATION-READY |
|-----|---------------|-------------------|
| Veterinary clinic systems | Částečně (HealthRecord shape) | **Ne** |
| Laboratory systems | Ne (chybí lab entity) | **Ne** |
| Vaccination records exchange | Částečně | **Ne** |
| Pet passport | Document type + travel derive | **Ne** (žádný registry API) |
| Microchip registries | Verification service + unconfigured/mock modes | **Částečně** (lookup only) |
| Insurance | Document category only | **Ne** |
| External document providers | IDB local blobs | **Ne** |

Žádné fake API v tomto auditu. **INTEGRATION-READY = ne** pro clinic/lab/passport exchange.

---

## 29. Regulatory / clinical risk (architektonicky)

| Riziko | Úroveň | Proč |
|--------|--------|------|
| Health data na klientu (LS writable) | **CRITICAL** | DEMO authority; není server enforcement |
| Auditability clinical UI | **HIGH** | HealthPage mimo authorize/K48 |
| Unauthorized access (policy) | **MEDIUM** | Policy OK; UI gaps |
| Organization tenant isolation | **MEDIUM** | Lib OK; UI org health unused; DEMO LS |
| Professional identity confusion | **LOW** | Role ≠ Access **CONFIRMED** |
| Write traceability | **HIGH** | Pro write existuje; owner UI bez audit |
| Document integrity | **MEDIUM** | Žádný hash/sign; soft links |
| Deletion / history | **MEDIUM** | Incomplete cascade; no append-only clinical history |
| Server authority | **CRITICAL** | `authority: 'server'` reserved, neimplementováno |

---

## 30. Duplicity audit

| Model A | Model B | Vztah | Doporučení |
|---------|---------|-------|------------|
| HealthRecord | — | Clinical SSOT | **KEEP** |
| PetDocument | HealthRecord | Soft related | **KEEP** (oba) |
| CalendarEvent | HealthRecord | Mix derived + parallel schedule | **KEEP** calendar; sync rules **MERGE LATER** |
| TimelineEvent | HealthRecord | Derived + mock + ephemeral | **KEEP** derived; custom persist **UNKNOWN** |
| Pet.lastVetVisit / nextVaccination | HealthRecord | Stale denorm | **DEPRECATE LATER** (derive) |
| Pet.weight | WeightMeasurement | Denorm current | **MERGE LATER** / derive |
| EmergencyCardHealth | HealthRecord | Parallel by design | **KEEP** |
| BreedingHealthTest | HealthRecord | Parallel by design | **KEEP** |
| ProfessionalPetView | HealthRecord | Projection | **KEEP** |
| OrganizationPetView | HealthRecord | Projection | **KEEP** |
| mockData.healthRecords in Messages | AppContext store | Bypass SSOT | **DEPRECATE LATER** (fix path) |
| VetVisit / MedicalRecord / ClinicalRecord entity | — | **Neexistuje** jako samostatný model | Nevyvářet duplicitně — extend HealthRecord later if needed |

---

## 31. Verdikt

### **B) HEALTH ARCHITECTURE NEEDS HARDENING FIRST**

| Alternativa | Proč ne |
|-------------|---------|
| A — Ready for next clinical layer | UI enforcement + lifecycle + denorm + missing clinical types + DEMO authority |
| C — Duplication / redesign | Jeden clinical SSOT; paralelní Emergency/Breeding záměrné; calendar mixed — hardening stačí |
| D — Insufficient evidence | Evidence dostatečná z types, stores, projections, asserts, UI imports |

---

## 32. Priority gaps

| GAP | CURRENT STATE | WHY IT MATTERS | RISK | PRIORITY | REQUIRES NEW MODEL? | REQUIRES NEW ACCESS? | REQUIRES BACKEND? | RECOMMENDED KROK |
|-----|---------------|----------------|------|----------|---------------------|----------------------|-------------------|------------------|
| Clinical UI nevolá `authorize()` / K48 | HealthPage/HealthTab → AppContext | Žádný central enforce + audit trail | HIGH | **P0** | Ne | Ne | Ne (DEMO); ano pro prod | **K50** |
| Messages health share čte mock seed | `MessagesPageContent` import `mockData.healthRecords` | Bypass SSOT; špatná/stale data | MEDIUM | **P0** | Ne | Ne | Ne | **K50** |
| Pet denorm `lastVetVisit` / `nextVaccination` | Strings na Pet | Drift vs HealthRecord | MEDIUM | **P1** | Ne | Ne | Ne | **K50** |
| `deletePet` incomplete cascade | Grants/weights/notifications zůstávají | Orphan access + residual health meta | MEDIUM | **P1** | Ne | Ne | Ne | **K50** |
| Server authority chybí | `authority: 'demo'` | Client-writable clinical data | CRITICAL | **P1** | Ne | Ne | **Ano** | Backend track |
| Org multi-staff health UI | Lib only | Clinic workflow nepoužitelný end-to-end | MEDIUM | **P2** | Ne | Ne | Ne | **K54** |
| Chybí diagnosis/labs/surgery first-class | Calendar/docs/free-text | Klinická historie neúplná | HIGH (clinical product) | **P2** | **Ano** (extend) | Ne | Preferováno | **K51** |
| Document ↔ HealthRecord link | Soft / žádný | Evidence integrity | MEDIUM | **P2** | Částečně | Ne | Preferováno | **K53** |
| Timeline custom ephemeral | React state | Ztráta dat | LOW | **P3** | Ne | Ne | Ne | K50 nebo později |
| Notification prefs unwired | Cosmetic toggles | Privacy/UX | LOW | **P3** | Ne | Ne | Ne | později |
| External clinic/lab integrations | Žádné | Vize produktu | — | **P3** | Ne teď | Ne | **Ano** | po backend |

---

## 33. Navazující kroky (max 5)

Odvozeno pouze z auditu:

1. **K50 — Health domain hardening**  
   Wire clinical UI na `authorize()` + projections; Messages → AppContext SSOT; denorm derive/deprecate; deletePet cascade; timeline persist decision.

2. **K51 — Clinical record model**  
   Pouze pokud po K50 stále potřeba typed diagnosis / laboratory result / surgery / procedure jako first-class (extend `HealthRecordType` nebo related entities — **ne** druhý paralelní clinical store).

3. **K52 — Veterinary workflow**  
   Pro write UX, visit flow, permission-gated clinic actions nad existujícím grant modelem.

4. **K53 — Document integrity**  
   Link HealthRecord ↔ PetDocument; integrity metadata; projection scoping.

5. **K54 — Clinic organization workflow**  
   Product UI nad `OrganizationPetAccess` / `projectPetForOrganization` (multi-staff bez auto-access všech Pets).

---

## 34. Co nesmíme vytvořit znovu

Existující systémy — **neduplikovat**:

| Systém | Proč KEEP |
|--------|-----------|
| Pet + ownership (`ownerAccountId`) | Canonical pet identity |
| PetHouseholdAccess | Household grants + health_read/write |
| PetProfessionalAccess | Pro grants |
| OrganizationPetAccess | Org→Pet grants |
| OrganizationMembership | Org ops — **≠** pet health |
| SecurityContext + `authorize()` | K47 single policy path |
| AuditEvent / AuditSink / `emitAuthorizationAudit` | K48 |
| Projections (public/HH/Pro/Org/Discover/emergency/lost) | Derived views |
| Documents (`PetDocument` + IDB) | Document SSOT |
| Calendar | Schedule + derived reminders |
| Timeline (as derived UI) | Not clinical SSOT |
| Notifications | Inbox + drafts |
| Messaging | Separate channel |
| Booking / Payment | Isolation from health |
| Lost & Found | Safe public |
| Emergency card | Parallel acute surface |
| Discover / Membership / Verification | Existing product systems |
| HealthRecord store | **Clinical SSOT** |

---

## 35. Finální tabulka

| OBLAST | CURRENT STATE | SOURCE OF TRUTH | ACCESS | PROJECTION | AUDIT | BACKEND READY | RISK | GAP |
|--------|---------------|-----------------|--------|------------|-------|---------------|------|-----|
| Pet health | DEMO LS HealthRecord + Pet fields | HealthRecord (+ Pet embed) | Owner full; HH/Pro/Org gated | HH/Pro/Org yes; public no | K48 if authorize | Partial | HIGH | UI bez authorize |
| Vaccination | HealthRecord type | HealthRecord | Same | Same | Same | Partial | MEDIUM | Denorm + calendar desync |
| Medication | HealthRecord + reminders | HealthRecord | Same | Same | Same | Partial | MEDIUM | Notif payload |
| Vet visits | HealthRecord `vet` | HealthRecord | Same | Same | Same | Partial | MEDIUM | No VetVisit entity (OK) |
| Examinations | HealthRecord | HealthRecord | Same | Same | Same | Partial | LOW | — |
| Laboratory | Docs + calendar | Document / schedule | viewDocuments / calendar | Partial | Partial | Low | HIGH | No lab entity |
| Diagnosis | Missing | — | — | — | — | No | HIGH | MISSING |
| Treatment | Partial via meds/notes | HealthRecord | Same | Same | Same | Low | MEDIUM | No treatment type |
| Procedures | Missing | — | — | — | — | No | MEDIUM | MISSING |
| Surgery | Calendar only | Calendar (schedule) | Calendar access | — | — | Low | MEDIUM | PARTIAL |
| Weight | WeightMeasurement + Pet.weight | WeightMeasurement | Owner-centric | Limited | Weak | Partial | LOW | Denorm Pet.weight |
| Allergies | Emergency free-text | Emergency card | emergency_* / privacy | Public opt-in | Weak | Partial | MEDIUM | No allergy entity |
| Documents | PetDocument + IDB | PetDocument | documents_*/viewDocuments | Yes | via authorize docs.* | Partial | MEDIUM | No HR link |
| Passport | eu_passport doc + travel derive | PetDocument | Same | Travel package derived | Weak | Partial | LOW | No registry |
| Timeline | Derived + mock + ephemeral | HealthRecord (medical) | Owner UI | Not in Pro view | No | Low | LOW | Custom not persisted |
| Calendar | LS events | Mixed SoT/derived | Owner/pro calendar | Filters | Weak | Partial | MEDIUM | Vacc due desync |
| Emergency | Pet.emergencyCard | Emergency card | emergency_read/write | Public opt-in | Partial (updatePet gate) | Partial | MEDIUM | Free-text clinical |
| Lost & Found | Public safe views | Announcement / tokens | Public | Safe projection | N/A | Partial | LOW | Free-text residual |
| Professional | Access + ProPetPage | Same HealthRecord | Grant perms | projectPetForProfessional | Domain + K48 if authz | Partial | MEDIUM | Richer visit UX |
| Household | Access + projection | Same | health_read/write | projectPetForHousehold | K48 if authz | Partial | MEDIUM | Health UI unused |
| Organization | OrgPet + projection lib | Same | OrgPet perms | projectPetForOrganization | K48 if authz | Partial | MEDIUM | No product UI |
| Public/Discover | Sanitized | No clinical | public.pet.project | Excludes health | Yes path | Partial | LOW | Connection ≠ public |
| Breeding health tests | On Pet.breeding | Breeding dossier | Owner breeding UI | Public omits tests | Weak | Partial | LOW | No clinical sync |

---

## 36. Absolutní zákazy (K49)

Během K49 **nebylo** a **nesmí být** vytvořeno:

- aplikační kód · model · storage · route · UI · migrace  
- nový permission · nový access model · nový auth · nový notification systém · nový projection systém  
- změna Health / Pet / Professional / Organization / Booking / Payment  
- změna SecurityContext / `authorize()` / AuditSink  

**K49 = AUDIT → DOKUMENT.** Tento soubor je jediný deliverable.

---

## 37. Finální report

1. **Files inspected** — viz §1; klíčové: `src/types/index.ts`, `AppContext.tsx`, `mockData.ts`, household/professional/organization libs, `privacy/project.ts`, emergency/lost public views, `security/*`, Health UI pages, `MessagesPageContent.tsx`, assert scripts K47/K48/HH/Pro/Org.
2. **Existing health models** — `HealthRecord`, Pet health fields, `WeightMeasurement`, emergency health content, `BreedingHealthTest`.
3. **Existing health storage** — `lovedandknown.healthRecords`, pets, weightMeasurements, documents+IDB, calendar, dailyCare, privacy, notifications.
4. **Existing health UI** — HealthPage, HealthTab, health components, assessment modal, Pro pet health sections, dashboard attention.
5. **Existing vet workflow** — Professional access grant → projection → optional write do stejného store; visit = HealthRecord `vet`.
6. **Existing household health access** — `health_read` / `health_write`; role defaults CONFIRMED.
7. **Existing professional health access** — view*/add* permissions; role ≠ access ≠ health perm CONFIRMED.
8. **Existing organization health access** — OrgPetAccess AND gate; membership ≠ pet access CONFIRMED; UI GAP.
9. **Existing projections** — public/Discover/HH/Pro/Org/emergency/lost/connection.
10. **Existing documents** — PetDocument categories včetně health/passport.
11. **Existing timeline** — derived medical + mock + ephemeral custom.
12. **Existing calendar** — mixed SoT schedule + derived med/doc reminders.
13. **Existing notifications** — health/med/vax/calendar drafts; prefs unwired.
14. **Existing audit integration** — K48 na authorize decisions; clinical UI mimo.
15. **Existing emergency separation** — CONFIRMED.
16. **Existing Lost & Found separation** — CONFIRMED for structured clinical.
17. **Existing breeding health separation** — CONFIRMED; public omits tests.
18. **Single source of truth** — HealthRecord (+ PetDocument for files; WeightMeasurement for weight history).
19. **Duplication findings** — Pet denorm, calendar overlap, Messages mock path, timeline layers.
20. **Security findings** — Policy sound; UI enforcement GAP; DEMO authority CRITICAL for prod.
21. **Privacy findings** — Public/Discover clean; connection-scoped sharing by design; notif/message payload risk.
22. **Clinical workflow findings** — Basic pro pet health R/W; no full clinic/SOAP; org UI incomplete.
23. **Backend readiness** — Domain models partial BACKEND-READY; persistence not.
24. **External integration readiness** — Not INTEGRATION-READY.
25. **Priority gaps** — §32 (P0: authorize UI + Messages SSOT).
26. **Recommended next KROKs** — K50 → K51 → K52 → K53 → K54 (§33).
27. **Final verdict** — **B) HEALTH ARCHITECTURE NEEDS HARDENING FIRST**.

---

### Nejistoty

| Položka | Označení |
|---------|----------|
| Přesné defaultní suggested permissions v grant UI vs uložené permissions po editaci uživatelem | Uloženo permissions[] je SSOT; UI hints — **CONFIRMED** pattern; konkrétní historická data v LS uživatelů **UNKNOWN — REQUIRES REVIEW** |
| Zda nějaká stránka mimo scripts volá `authorize()` nepřímo přes barrel | `src/pages` import authorize nenalezen — **CONFIRMED GAP**; jiné entrypointy mimo pages **UNKNOWN — REQUIRES REVIEW** pokud existují dynamické importy |
| Spotřeba legacy `weightData` chart seed | UI preferuje WeightMeasurement — legacy seed **UNKNOWN — REQUIRES REVIEW** (pravděpodobně dead) |
| `petTravelPackages` seed vs `buildPetTravelPackage` | UI builder — seed package **pravděpodobně unused**; **UNKNOWN — REQUIRES REVIEW** pokud existuje skrytý consumer |

---

**K49 hotový** vytvořením tohoto dokumentu. Žádná změna aplikačního kódu.
