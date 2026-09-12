# KROK 48 — Security Audit Trail Runtime

**Rozsah:** implementace audit runtime napojeného na K47 `SecurityContext` + `authorize()`.  
**Datum:** 2026-09-12  
**Navazuje na:** [K47-security-authorization-runtime.md](K47-security-authorization-runtime.md), [K45-security-audit-trail-architecture.md](K45-security-audit-trail-architecture.md), [K46-server-security-context-architecture.md](K46-server-security-context-architecture.md)

---

## Verdikt

**K48 hotový:** existuje jeden `AuditEvent` contract a jeden `AuditSink` napojený na každé authorization decision přes existující `emitAuthorizationAudit` — bez paralelního security systému, bez změny doménových modelů.

---

## Pipeline

```
authenticate → SecurityContext → resource resolution → authorize()
  → Decision ALLOW | DENY
  → emitAuthorizationAudit(payload)
  → mapAuthorizationPayloadToAuditEvent
  → scrub metadata
  → AuditSink.record(event)
  → (optional) business execution — separate from decision audit
```

Audit **nerozhoduje** o oprávnění. Audit failure **nemění** authorization result.

---

## Implementační mapa (1–31)

| # | Oblast | Implementace |
|---|--------|--------------|
| 1 | Audit event contract | `src/lib/security/audit/types.ts` — `AuditEvent` |
| 2 | Actor contract | `AuditActorType`: human / system / provider / anonymous |
| 3 | Resource contract | deterministic `resourceType` + `resourceId` (reuse K47 types) |
| 4 | Action contract | reuse `KNOWN_SECURITY_ACTIONS` — audit action ≠ permission katalog |
| 5 | Result / error contract | `allow` \| `deny` + `AuditReasonCode` mapped from `AuthorizationDenyClass` |
| 6 | Correlation ID | z `SecurityContext.correlationId` (reuse / DEMO local) |
| 7 | Timestamp | ISO 8601 UTC při emit (trusted, ne client clock) |
| 8 | AuditSink | `audit/sink.ts` — `record(event)` |
| 9 | DEMO sink | `DemoAuditSink` — localStorage, `authority: 'demo'` |
| 10 | authorize integration | `finish()` → `emitAuthorizationAudit` → `configureAuthorizationAudit` |
| 11 | ALLOW auditing | každé ALLOW emituje event |
| 12 | DENY auditing | každé DENY emituje event + reasonCode |
| 13 | Health audit | `health.read` / `health.write` metadata only |
| 14 | Microchip privacy | action ok; hodnota chipu nikdy v auditu |
| 15 | Owner PII privacy | scrubber drop ownerPhone/Email/address |
| 16 | Professional audit | identity ≠ access; professionalId na event |
| 17 | Organization audit | organizationId + membershipId + grant context |
| 18 | Cross-org protection | `ORG_SCOPE_MISMATCH` audit |
| 19 | Booking isolation | booking ≠ health; isolation → INVALID_CONTEXT |
| 20 | Payment isolation | payment ≠ health; žádné card/CVV/secrets |
| 21 | Messaging isolation | decision metadata only (no message body) |
| 22 | Public access | anonymous actorType; bez fake actorAccountId |
| 23 | System actor contract | typed human/system/provider — webhook/API keys neimplementovány |
| 24 | Append-only | žádné edit/delete API |
| 25 | Tenant isolation | org query vyžaduje organizationId |
| 26 | Retention extension | `planRetention()` — bez mazání |
| 27 | Tests | `scripts/assert-security-audit.mts` A–W |
| 28 | E2E | `scripts/e2e-security-audit.mjs` |
| 29 | Regression | K47 + HH / Pro / Org / booking / payment / … |
| 30 | Backend readiness | `ServerAuditSinkStub` — no fake persistence |
| 31 | DEMO limitations | viz tabulka |

---

## Soubory

```
src/lib/security/audit/
  types.ts
  reasonCodes.ts
  scrub.ts
  mapFromDecision.ts
  sink.ts
  demoSink.ts
  serverSink.ts
  query.ts
  retention.ts
  configure.ts
  index.ts
src/lib/security/auditHook.ts          (wired via configure)
src/lib/security/authorize.ts          (enriched payload)
src/lib/security/types.ts              (AuthorizationAuditPayload + authority/professionalId/allowPath)
scripts/assert-security-audit.mts
scripts/e2e-security-audit.mjs
docs/K48-security-audit-trail-runtime.md
```

---

## Reason code mapping (reuse K47)

| AuditReasonCode | AuthorizationDenyClass |
|-----------------|------------------------|
| UNAUTHENTICATED | unauthenticated |
| UNAUTHORIZED | forbidden / deny_by_default |
| NOT_FOUND | not_found |
| NO_ACCESS | missing_grant |
| NO_PERMISSION | unknown_permission |
| REVOKED_ACCESS | revoked |
| EXPIRED_ACCESS | expired |
| ORG_SCOPE_MISMATCH | cross_organization |
| INVALID_CONTEXT | forged_identity / isolation |
| UNKNOWN_ACTION | unknown_action |

---

## Tabulka

| OBLAST | IMPLEMENTOVÁNO | AUTHORITY | DEMO LIMIT | RIZIKO |
|--------|----------------|-----------|------------|--------|
| AuditEvent contract | ano | demo / server flag | — | LOW |
| ActorType | ano | trusted context | DEMO actor = LS session | CRITICAL if treated as prod |
| Resource / Action | ano | reuse K47 | — | LOW |
| ALLOW + DENY emit | ano | authorize finish | — | LOW |
| AuditSink | ano | abstraction | — | LOW |
| DemoAuditSink | ano | `authority: demo` | localStorage writable | CRITICAL if presented as prod |
| ServerAuditSink | stub only | not wired | no fake DB | — |
| Privacy scrub | ano | key strip | no content inspection beyond keys | MEDIUM |
| Health / microchip / PII | metadata only | — | — | LOW if scrub followed |
| Professional / Org | context fields | existing grants | LS | HIGH (data still client) |
| Cross-org | reasonCode | K47 deny | — | LOW |
| Booking / Payment / Messaging | isolation audited | adapters | — | LOW |
| Correlation / timestamp | ano | emit-time | DEMO local clock | MEDIUM |
| Append-only | contract | — | LS can be wiped | CRITICAL if claimed WORM |
| Tenant isolation | query contract | DEMO filter | not server ACL | HIGH until server |
| Retention | extension only | — | no purge | — |
| Admin UI | ne | — | — | — |

---

## Testy

```bash
npx tsx scripts/assert-security-audit.mts
node scripts/e2e-security-audit.mjs
npx tsx scripts/assert-security-context.mts
```

---

## Absolutní potvrzení

- žádný nový auth/login
- žádný nový PetAccess
- žádný unified access model
- žádný nový permission katalog
- žádný nový notification systém
- žádný nový projection systém
- žádná změna PetProfessionalAccess
- žádná změna PetHouseholdAccess
- žádná změna OrganizationPetAccess
- žádná změna OrganizationMembership
- žádná změna Booking
- žádná změna Payment
- žádný health payload v auditu
- žádný microchip value v auditu
- žádný owner PII v auditu
- žádné payment secrets v auditu
- actor není client-controlled
- audit result není client-controlled
- organization scope není client-controlled (trusted context / validated claim)
- audit není authorization gate
- localStorage audit není production audit
- žádný fake server persistence

---

## DEMO limitations

- `DemoAuditSink` používá `lovedandknown.securityAuthorizationAudit` — simulace, ne WORM.
- HH/Pro domain access logy zůstávají legacy UX history — nejsou SSOT security auditu.
- `ServerAuditSinkStub.record` je no-op — budoucí backend nahradí bez změny modelů.
- Client může DevTools přepsat DEMO storage — proto `authority: 'demo'`.
