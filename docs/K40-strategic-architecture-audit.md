# KROK 40 — Strategic Architecture Audit (LOVED & KNOWN)

**Rozsah:** pouze audit. Žádný kód, migrace, UI ani nové modely.  
**Zdroj:** doménové typy v `src/types`, access/projection v `src/lib`, assert skripty v `scripts`.  
**Datum auditu:** 2026-09-12  
**Pokrytí:** architektura K1–K39 vs dlouhodobá vize pet-care ekosystému.

> **LAUNCH 01 doc correction:** Organizations are no longer stub-only. Source of truth is the codebase (`src/lib/organization/*` — membership, invitations, OrganizationPetAccess). Sections below that still say “org stub” are historical K40 text and should not override current code.

---

## Shrnutí verdiktu (sekce 1–20)

| # | Oblast | Verdikt |
|---|--------|---------|
| 1 | Pet jako centrální entita | **OK** |
| 2 | Identity + Account | **WARNING** (DEMO session) |
| 3 | Ownership + Access | **OK** |
| 4 | Organizations | **IMPLEMENTED (DEMO)** — membership + OrganizationPetAccess in code; K40 “stub only” claim is **stale** (see note below) |
| 5 | Professional workforce | **WARNING** (solo-ready, team-not) |
| 6 | Veterinary data | **WARNING** (consumer health, not EMR) |
| 7 | Audit trail | **WARNING** (access logs only; clinical/security MISSING) |
| 8 | QR / Emergency / L&F | **WARNING** (found/lost OK; emergency slug risk) |
| 9 | Public projections | **OK** (explicit projectors) |
| 10 | Health privacy | **OK** (boundaries enforced) |
| 11 | Booking / Payment / Membership | **OK** (contracts; DEMO execution) |
| 12 | External integrations | **WARNING** (few provider seams) |
| 13 | Data portability | **MISSING** |
| 14 | Scale / localStorage | **HIGH risk** as production DB |
| 15 | Security threats | viz sekce 15 |
| 16 | Community + Discover | **OK Discover**; community shallow |
| 17 | Admin / moderation | **MISSING** (report sinks only) |
| 18 | Failure / recovery | **PARTIAL** |
| 19 | Architectural duplicity | intentional splits; messaging 3 planes |
| 20 | Institutional use | **NOT READY** |

---

## 1. Pet jako centrální entita — **OK**

- SSOT: `Pet` v `src/types/index.ts`, store `lovedandknown.pets`.
- Ownership: jediné `Pet.ownerAccountId` (`src/lib/pets/ownership.ts`); `transferPetOwnership` vždy throws.
- Satellite entity (`HealthRecord`, docs, booking, L&F, conversations…) visí na `petId`.
- Veřejné tvary (`DiscoverPet`, `HouseholdPetView`, `ProfessionalPetView`, emergency/lost/found views) jsou **projekce**, ne paralelní writable identity.
- Mock Discover (`d1`…) vs owned ids: disjoint + dedupe v `src/lib/discover/catalog.ts`.

**WARNING (ne CRITICAL):** demo emergency `publicSlug` často = `pet.id` (`src/lib/emergencyCard/defaults.ts`).

**Paralelní identita mazlíčka:** nenalezena jako druhý writable SSOT. Riziko je pouze merge mock + owned Discover katalogu (deduplikováno podle `id`).

---

## 2. Identity + Account — **WARNING**

```
Account → Session(flag) → Pet.ownerAccountId
       → PetHouseholdAccess
       → ProfessionalProfile → PetProfessionalAccess
       → Organization(stub)
```

- Account model je backend-tvarovatelný; session je DEMO boolean (`lovedandknown.sessionActive`) + hardcode `owner_self`.
- Role ≠ pet permission je explicitní (`roleGrantsPetDataAccess(): false`).
- Professional = AccountRole **+** samostatný `ProfessionalProfile` (správně).
- Soft conflation: `AccountRole` = business type — kolize s budoucími org job roles (`receptionist`, `vet_employee`).
- Multi-organization membership / switch-org: neexistuje.
- Account není příliš svázaný s DEMO ve tvaru entity; **je** svázaný přes session/self resolution.

---

## 3. Ownership + Access — **OK**

| Actor | Vlastnictví | Health default |
|-------|-------------|----------------|
| OWNER (`ownerAccountId`) | ano | plný |
| CO-OWNER | ne | R+W (permissions authoritative) |
| CAREGIVER | ne | R only, **ne** auto write |
| VIEWER | ne | žádný health |
| PROFESSIONAL | ne | jen grantnuté `ProfessionalPermission` |

- Household/professional **nemohou** eskalovat na ownership.
- `lost_manage` / `household_manage` opt-in (ne v co-owner defaultu).
- Asserty: `scripts/assert-pet-household-access.mts`, `scripts/assert-professional-access.mts`.

**Privilege escalation (design):** LOW v doménových pravidlech; HIGH v client-trust modelu (DevTools může přepsat localStorage).

---

## 4. Organizations — **CRITICAL gap** (neimplementováno v tomto kroku)

Existuje stub v `src/types/professional.ts`:

```ts
Organization { id, type, name, memberAccountIds[], createdAt, updatedAt }
```

Vytváří se jen pro `veterinary_clinic` | `shelter` (`ORGANIZATION_PROFESSIONAL_TYPES`). Žádné membership roles, locations, invites, org ACL, org-scoped pet access, org payment principal.

**Absence později bolí u:** klinika (více vetů), útulek, grooming salon, pet hotel, výcvik, chovná stanice jako firma, instituce.

**Dotčené systémy:** ProfessionalProfile, Services, Availability, Booking, Reviews, PetProfessionalAccess, ProfessionalPaymentAccount, verification, Discover directory.

**Co dnes chybí (pouze popis):**

| Capability | Status |
|------------|--------|
| OrganizationMembership (invite, status, role) | chybí |
| Org-level RBAC (admin, staff, receptionist…) | chybí |
| Location / branch entity | chybí |
| Org as booking/payment principal | chybí (vše na ProfessionalProfile) |
| Org-scoped pet access | chybí (jen per-profile grant) |
| Kennel as Organization | chybí (breeding dossier / breeder profile) |
| Institution type | chybí |

---

## 5. Professional workforce — **WARNING**

Solo marketplace je připravený (Profile / Access / Services / Booking / Reviews / Availability / PaymentAccount).  
Org → workers → roles → locations: **ne**. Booking/availability komentáře očekávají team member; dnes single shared schedule na profile.

---

## 6. Veterinary data — **WARNING**

`HealthRecord`: vaccination / vet / medication / examination / assessment.

| Concern | Stav |
|---------|------|
| Health record | ano (flat) |
| Diagnosis entity | **MISSING** |
| Treatment entity | partial (course length only) |
| Medication / vaccination | ano |
| Laboratory result entity | **MISSING** (doc/calendar only) |
| Examination | thin type |
| Veterinarian / organization FK | **MISSING** (free-text doctor/clinic) |
| Timestamp author | **MISSING** (no createdAt/author) |
| Document attachment on record | **MISSING** |
| History / version | **MISSING** — edits **overwrite** |

Suitable for consumer pet-care; **not** regulated clinic chart.  
Mutace: `AppContext` `updateHealthRecord` in-place; documents `replacePetDocument` same id.

---

## 7. Audit trail

| Typ | Stav |
|-----|------|
| Household access grant/revoke/role/perms | YES (append-only) |
| Professional access + some record_viewed/added | YES |
| Clinical content history | **MISSING** |
| Who opened health (owner) | **MISSING** |
| Emergency / L&F security audit | **MISSING** |
| Admin audit | **MISSING** |

Business history ≠ security audit: access logs ≠ clinical ledger.

---

## 8. QR / Emergency / Lost & Found — **WARNING**

| Channel | Identifier | Verdikt |
|---------|------------|---------|
| Found QR | opaque bearer token | OK pattern; knowledge=access |
| Lost | opaque `publicToken` | OK |
| Emergency | short `publicSlug` / fallback `pet.id` | **enumeration risk** |

- Owner PII / full chip / docs na public: blokováno (`assert-lost-found-auth`, privacy).
- SafeContact + mutual phone consent: ano.
- Institution actor: **MISSING**.

### Actor matrix (K38)

| Actor | L&F mutate | Emergency write | Public emergency/lost | Health write |
|-------|------------|-----------------|------------------------|--------------|
| Finder | reports only | no | bearer URL | no |
| Owner | yes | yes | configures | yes |
| Co-owner | only + `lost_manage` | yes (default) | via household | yes (default R/W) |
| Caregiver | no default | read yes / write no | — | read yes / write no |
| Viewer | no | no | — | no |
| Professional | no via pro access | no via pro | — | granted perms only |
| Institution | **MISSING** | **MISSING** | — | via individual pro only |

---

## 9. Public data / projections — **OK** (rizika identifikována)

| Layer | Explicit projector | Leak risk (design) |
|-------|-------------------|--------------------|
| Public / Discover Pet | ano | low if path followed; raw Pet in LS = client threat |
| Professional public | ano | low; optional public contacts |
| Professional pet access | ano | medium when health granted (by design) |
| Breeding public | ano (via Discover) | low |
| Emergency | ano | medium (opt-in health) |
| Lost & Found | ano | low–medium (approx location) |
| Household | ano | medium (granted scopes) |
| Booking | ano (id+name) | low |
| Payment public | ano | low |

Kde UI filtruje raw data místo projekce: hlavně pokud by stránka četla `Pet` přímo bez projectoru — assert skripty a komentáře v profesional/household pages to zakazují. Accidental leak = obejití projectoru nebo DevTools na LS.

---

## 10. Health privacy — **OK**

| Boundary | Mechanism |
|----------|-----------|
| Public | `ViewerRole` + forbidden keys; health/docs/chip never public |
| Household | `HouseholdPetPermission` |
| Professional | `ProfessionalPermission` |
| Emergency | separate card + visibility flags (not full dossier) |
| Institution | **MISSING** as boundary |

Checklist:

- public nevidí health / documents / microchip / owner PII — **met**
- Professional jen granted permissions — **met**
- Co-owner plný přístup dle K37 defaults — **met** (lost/household manage opt-in)
- Caregiver nemá auto health write — **met**
- Viewer nemá health — **met**

---

## 11. Booking / Payment / Membership — **OK**

Owner payment → platform fee → professional → payout modeled; membership samostatné (`SubscriptionProvider` ≠ `PaymentProvider`). Stripe nepřipojen (DEMO providers). **Neměnit oddělení.**

---

## 12. External integrations — připravenost

| Integration | Abstraction | Stav |
|-------------|-------------|------|
| Payments / Connect | provider registry | DEMO-ready contracts |
| Membership billing | SubscriptionProvider | DEMO |
| Microchip registries | MicrochipRegistryProvider | unconfigured / optional mock |
| Maps / geocode | thin helpers (Leaflet/Photon) | live-ish |
| Voice proxy | stub | disabled |
| Email / SMS / push | prefs UI only | no delivery |
| Vet software / FHIR | none | — |
| Insurance | document category only | — |
| Government / institution | none | — |

Doménové modely nejsou sémanticky vázané na localStorage API, ale **persistují přímo** přes ad-hoc load/save — backend migration bolí u většiny domén.

---

## 13. Data portability — **MISSING**

Budoucí export pet / medical / documents / ownership-access history / import: **neexistuje**. Documents = LS meta + IndexedDB blobs (složitější balíček).

---

## 14. Scale / localStorage

**A — vysoké riziko migrace:** pets, petPhotos, healthRecords, petDocuments+IDB, calendarEvents, inboxConversations, lostPet*, bookings+services+availability, payments/connect/payouts, accounts/profiles/organizations, petProfessionalAccess, petHouseholdAccess.

**B — střední:** posts, notifications, privacySettings, verifications, subscription, reviews, importantContacts, foundPetMessages.

**C — snadné:** discoverEngagement, filters (session), prefs, onboarding/session flags, UI workspace, drafts, demo flags.

Session-only: `uiWorkspace`, `discoverFilters`, connect drafts.  
Demo-only: DEMO payment provider, verification `local_demo`, demo household accounts (ne loginovatelné).

---

## 15. Security threats (audit)

| Threat | Severity |
|--------|----------|
| Account takeover (XSS / LS) | **CRITICAL** (production) / accepted DEMO |
| Client privilege escalation | **HIGH** (no server ACL) |
| Emergency slug enumeration | **HIGH** |
| Health / document / owner PII leakage via wrong surface | **LOW–MEDIUM** (projections good) |
| Unauthorized professional access (role-only) | **LOW** (denied by design) |
| Malicious household member | **MEDIUM** (co-owner health write by design) |
| Fake professional / fake org | **HIGH** (verification DEMO; org stub) |
| QR bearer abuse | **MEDIUM** |
| Scraping Discover | **MEDIUM** (no rate limit / server) |
| Message abuse | **MEDIUM** (no moderation) |
| Lost & Found abuse | **MEDIUM** |
| ID enumeration (emergency/pet ids) | **HIGH** |

---

## 16. Community + Discover — **OK Discover** / shallow community

- Discover + connection ranking + one inbox for connect: **OK**; groups/discussions/reactions: not yet — extend Conversation, don’t invent 2nd social graph / 2nd messaging system.
- Messaging planes: inbox + SafeContact/L&F + foundPetMessages (**intentional triplicity** — document before unifying).

---

## 17. Admin / moderation — **MISSING**

Report sinks (community/reviews/lost flags) exist. Blocking, moderation queue, verification decisions UI, administrative audit: **MISSING**.

---

## 18. Failure / recovery — **PARTIAL**

| Scenario | Readiness |
|----------|-----------|
| Session expires | DEMO flag; no real revoke tokens |
| Professional / household access revoked | domain status machines exist |
| Professional account disabled | partial (no global disable bus) |
| QR scanned offline | needs local pet data; production needs server |
| Booking cancelled / payment unavailable | status machines + DEMO providers |
| Notification fails | in-app only; no delivery retry |
| Document unavailable | IDB/orphan edge cases |
| QuotaExceeded | often silent — durability risk |
| Multi-device recovery | **NONE** |

---

## 19. Architectural duplicity (report only)

Intentional: Pet vs projections; household vs professional ACL; privacy levels vs ACL; booking vs payment vs membership.  
Watch: 3 messaging stores; mock+owned Discover; AccountRole = business type; storage helper duplication.  
**Neslučovat** v tomto kroku.

---

## 20. Institutional readiness — **NOT READY**

Brání: no OrganizationMembership/RBAC, no org-scoped pet custody, no institutional audit, no Location, access only per ProfessionalProfile, emergency/L&F bez institution actor.

---

## 21. Priority legend

- **CRITICAL** — před dalšími velkými org/clinic/prod funkcemi
- **HIGH** — před backend/production
- **MEDIUM** — může počkat
- **LOW** — future enhancement

---

# Finální verdikt A–N

### A. Co je architektonicky správně

- Pet SSOT + singular ownership
- Role ≠ permission; ownership ≠ household ≠ professional access
- Explicit deny-by-default projections + assert scripts
- Booking ≠ PetProfessionalAccess; Payment ≠ Membership; Connect account off profile
- SafeContact / opaque found+lost tokens
- Provider-shaped payments/billing/microchip

### B. CRITICAL issues

1. Organization je stub — blokuje clinic/shelter/team vizi
2. Client-side trust jako „security“ — nelze shipnout jako produkční privacy/ACL
3. Žádný klinický version/author audit — blokuje seriózní veterinary EMR / compliance

### C. HIGH issues

- DEMO session / `owner_self`
- Emergency slug enumeration
- localStorage jako DB (PII/PHI, quota silent fail)
- Fake pro/org (verification DEMO)
- Chybí data portability
- Admin/moderation infrastruktura
- AccountRole conflation s org job roles

### D. MEDIUM issues

- Health model incomplete (diagnosis/lab/treatment/FK)
- Messaging triplicity
- Community shallow (no groups)
- External delivery (email/SMS/push) fiction
- Malicious co-owner / L&F abuse / scraping

### E. LOW issues

- Mock Discover parallel catalog
- Soft UI naming OWNER vs internal types
- Gamification / badge stores

### F. Organization readiness

**NOT READY** — stub only; solo ProfessionalProfile-centric.

### G. Veterinary readiness

**Consumer-ready / Clinic-NOT-READY** — records exist; no EMR semantics, no org authorship, overwrite edits.

### H. Institutional readiness

**NOT READY** — no org identity lifecycle, members/roles/permissions/pet access/audit for police/municipality/clinic-as-org.

### I. Security readiness

**DEMO-strong / Production-weak** — projection discipline excellent; enforcement not server-backed; emergency identifier weak.

### J. Backend migration readiness

**Contracts good, plumbing hard** — A-risk stores dominate; seams exist mainly for money/microchip. Need repository ports before API.

### K. Největší rizika současného návrhu

1. Postavit další velké org/clinic features na ProfessionalProfile-as-org
2. Shipnout public emergency/lost/Discover proti client stores
3. Přepsat Pet/ownership/projection jádro „kvůli org“ místo layering
4. Slít membership s marketplace payments
5. Udělat z co-owner ownership

### L. Co rozhodně NEMĚNIT

- `Pet.ownerAccountId` jako jediné vlastnictví
- Oddělení household vs professional access + explicit permissions
- Projection pattern (omit fields, forbidden keys)
- Booking / Payment / Membership / Connect separation
- Found/lost opaque tokens + SafeContact model
- `roleGrantsPetDataAccess === false`
- Hard-block ownership transfer until designed

### M. Co musíme vyřešit PŘED dalšími velkými funkcemi

Záleží na směru:

- **Další consumer/Discover/community UX:** lze pokračovat (neměnit jádro).
- **Clinic / shelter / multi-worker / institution:** nejdřív Organization membership + RBAC + pet access model (design), bez přepisu Pet SSOT.
- **Production / real users / real money:** nejdřív auth+server authority + storage migration plan + emergency identifier hardening.
- **Seriózní veterinary chart:** nejdřív clinical append/version + author model (design), ne další UI na overwrite HealthRecord.

### N. Doporučené pořadí dalších KROKŮ

1. **K41 — Organization domain design** (membership, roles, locations, org vs profile principal) — design only pokud pokračuje vize klinik
2. **K42 — Auth & actor resolution design** (nahradit `owner_self` session; zachovat Account/Profile/Access)
3. **K43 — Repository / backend boundary** za existujícími projectory
4. **K44 — Emergency public identifier hardening** (slug ≠ pet.id; rate-limitable server resolve)
5. **K45 — Clinical record versioning design** (append-only / author) před clinic write UX
6. **K46 — Security audit bus** (access + sensitive mutations)
7. **K47 — Admin/moderation MVP**
8. **K48 — Data portability export**
9. Teprve pak: org workforce UI, institutional flows, live Stripe, groups na stejném messaging modelu

---

## Tabulka

| OBLAST | STAV | RIZIKO | PRIORITA | DOPORUČENÍ |
|--------|------|--------|----------|------------|
| Pet SSOT | OK | Low | — | Neměnit; držet hub-and-spoke |
| Ownership | OK | Low | — | Žádný transfer bez designu |
| Household/Pro access | OK | Low–Med | — | Držet role≠permission |
| Account/Session | WARNING | High | HIGH | Nahradit DEMO session před prod |
| Organization | CRITICAL gap | Critical | CRITICAL | Design membership/RBAC před clinic features |
| Workforce/Locations | WARNING | High | HIGH | Po Organization designu |
| Health/EMR | WARNING | High | HIGH | Version+author před clinic chart |
| Audit trail | MISSING (clinical/security) | High | HIGH | Oddělit access log vs security/clinical |
| QR Found/Lost | OK | Med | MEDIUM | Bearer OK; server resolve later |
| Emergency slug | WARNING | High | HIGH | Opaque id; ne pet.id |
| Projections/Privacy | OK | Low | — | Neměnit pattern |
| Booking/Payment/Membership | OK | Low | — | Neměnit oddělení |
| Integrations | WARNING | Med | MEDIUM | Rozšířit provider ports |
| Portability | MISSING | Med | MEDIUM | Export pack před growth |
| localStorage scale | HIGH risk | High | HIGH | Backend/IDB; ne růst photos v LS |
| Community/Discover | OK / shallow | Med | MEDIUM | Groups na stejném Conversation |
| Admin/moderation | MISSING | High | HIGH | Queue+block před scale |
| Institutional | NOT READY | Critical | CRITICAL | Závisí na Organization+audit |
| Security (prod) | Weak | Critical | CRITICAL | Server ACL před real users |

---

## Explicitní odpověď

**Ano — současná architektura je dostatečně zdravá pro pokračování dalšími funkcemi v rámci consumer / Discover / household / solo-professional / booking DEMO linie, aniž by se muselo zásadně přepisovat Pet jádro, ownership nebo projection model.**

**Ne — není připravená nést další velké funkce směrem ke klinikám, útulkům, multi-worker organizacím, institucím, produkčnímu EMR nebo reálným uživatelům s citlivými daty, dokud se nevyřeší Organization model, serverová autorita (auth+ACL) a klinický/security audit trail.**

Zásadní přepracování jádra (Pet SSOT, ownership≠access, projections, payment separation) **není potřeba a bylo by škodlivé**. Potřeba je **doplnit chybějící vrstvy** (Organization, auth/backend, clinical versioning), ne demolovat to, co K1–K39 správně položilo.

---

*Konec auditu KROK 40. Žádný aplikační kód nebyl v tomto kroku změněn.*
