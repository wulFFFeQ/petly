# KROK 47 — Security Context + Central Authorization Runtime

**Rozsah:** implementace server-ready SecurityContext + centrální `authorize()`.  
**Datum:** 2026-09-12  
**Navazuje na:** [K46-server-security-context-architecture.md](K46-server-security-context-architecture.md)

---

## Verdikt

**K47 hotový:** existuje jeden jasný `SecurityContext` a jeden centrální `authorize()` entry point v [`src/lib/security/`](../src/lib/security/), napojený na existující domain boundaries bez přepisu access modelů.

---

## Implementační mapa

| # | Oblast | Implementace |
|---|--------|--------------|
| 1 | SecurityContext | `src/lib/security/types.ts` + `context.ts` (`authority: 'demo' \| 'server'`) |
| 2 | Authentication adapter | `demoSessionAdapter.ts` nad `account/session.ts` |
| 3 | Actor resolution | `resolveActor.ts` — pouze ze contextu; forge claim → DENY |
| 4 | Resource resolution | `resolveResource.ts` — load by id; miss → not_found |
| 5 | Central authorize() | `authorize.ts` — jediný entry + `assertAuthorized` |
| 6 | Ownership | `adapters/ownership.ts` → `isPetOwner` / `resolvePetOwnerAccountId` |
| 7 | Household | `adapters/household.ts` → `actorHasHouseholdPermission` |
| 8 | Professional | `adapters/professional.ts` → `hasPermission` / effective grant |
| 9 | Organization | `adapters/organizationPet.ts` → AND gate + membership validate |
| 10 | Permission resolution | `actions.ts` mapuje logical actions → existující vocabs (bez nového katalogu) |
| 11 | Health authorization | `health.*` / `medication.*` / `documents.*` / `labs.*` / `vaccination.*` |
| 12 | Microchip boundary | `microchip.read` → owner only; non-owner DENY by default |
| 13 | Owner PII boundary | `ownerContacts.read` → owner only; non-owner DENY |
| 14 | Projection integration | `adapters/project.ts` — authorize → project*; projection ≠ authz |
| 15 | Booking isolation | `adapters/booking.ts` — booking ≠ health |
| 16 | Payment isolation | `adapters/payment.ts` — payment ≠ health / membership / pet |
| 17 | Messaging isolation | `adapters/messaging.ts` — participants only; legacy open → DENY |
| 18 | Public access | anonymous + `public.pet.project` + existing `projectPublicPet` |
| 19 | Deny-by-default | unknown action/resource/permission → DENY |
| 20 | Error contract | `unauthenticated` / `unauthorized` / `not_found` + `AuthorizationError` |
| 21 | Audit extension point | `auditHook.ts` — observer; K48 wires `AuditSink` via `configureAuthorizationAudit` |
| 22 | System actors | `createSystemActorContext` / `createProviderActorContext` — typed; not DEMO-client-forgeable |
| 23 | LocalStorage separation | `authority: 'demo'` explicit; UX workspace ≠ security |
| 24 | Integration strategy | barrel export; no plošná migrace call sites |
| 25 | Tests | `scripts/assert-security-context.mts` (A–T) |
| 26 | E2E | `scripts/e2e-security-context.mjs` (bezpečnostní scénáře) |
| 27 | Regression | stávající assert skripty HH / Pro / Org / booking / payments / … |
| 28 | Backend readiness | kontrakty připravené na HTTP/session/DB bez rewrite modelů |
| 29 | DEMO limitations | viz tabulka níže |

---

## Tabulka

| OBLAST | IMPLEMENTOVÁNO | AUTHORITY | DEMO LIMIT | RIZIKO |
|--------|----------------|-----------|------------|--------|
| SecurityContext | ano | demo / server flag | demo = localStorage session | CRITICAL pokud považováno za prod |
| Authentication | DEMO adapter | session boolean | žádné credentials / revoke | CRITICAL |
| Actor | ze session | trusted-in-demo only | client může přepsat LS | CRITICAL |
| authorize() | ano, single-path | policy runtime | data stále z LS | HIGH |
| Ownership | adapter | Pet.ownerAccountId | LS writable | HIGH |
| Household | adapter | grant + perms | LS | HIGH |
| Professional | adapter | grant + perms | LS; grant owner gap = K50 | CRITICAL |
| Organization | adapter + validate claim | membership + OrgPet AND | LS | CRITICAL |
| Health | mapped actions | existing vocabs | client enforce | CRITICAL |
| Microchip | deny-by-default | owner only | no explicit perm yet | HIGH |
| Owner PII | deny-by-default | owner only | SafeContact odděleně | HIGH |
| Projections | after authorize | allowlist | client | MEDIUM |
| Booking / Payment / Messaging | izolované adapters | vlastní ACL | client | MEDIUM–HIGH |
| Audit | K48 AuditSink | demo sink / server stub | localStorage ≠ prod audit | CRITICAL pokud považováno za prod |
| System/provider | typed contract | server reserved | not implemented | HIGH if forged |

---

## Absolutní potvrzení

- žádný nový auth/login systém
- žádný nový PetAccess / unified access model
- žádný nový permission katalog
- žádný nový audit storage / event systém *(K47: pouze hook; storage = K48)*
- žádný nový notification systém
- žádný nový projection systém
- žádná změna PetProfessionalAccess / PetHouseholdAccess / OrganizationPetAccess / OrganizationMembership modelů
- žádná změna Booking / Payment modelů
- žádný microchip leak přes authorize result (non-owner DENY)
- žádný owner PII leak přes authorize result (non-owner DENY)
- localStorage **není** označen jako production authority (`authority: 'demo'`)

**K48 navazuje:** [K48-security-audit-trail-runtime.md](K48-security-audit-trail-runtime.md) — `AuditEvent` + `AuditSink` na `emitAuthorizationAudit`.

---

## Pipeline

```
request → DEMO/session adapter → SecurityContext
  → authorize(ctx, { action, resource })
  → resolve actor (ignore payload claim)
  → resolve resource
  → single path: owner | household | professional | organization | booking | payment | messaging | public
  → Decision ALLOW | DENY
  → audit observer → K48 AuditSink (configureAuthorizationAudit)
  → (optional) existing project* after ALLOW
```

## Testy

```bash
npx tsx scripts/assert-security-context.mts
node scripts/e2e-security-context.mjs
```
