# KROK 50 — Health Authorization Hardening

**Datum:** 2026-09-12  
**Navazuje na:** [K49-veterinary-health-workflow-audit.md](K49-veterinary-health-workflow-audit.md), [K47-security-authorization-runtime.md](K47-security-authorization-runtime.md), [K48-security-audit-trail-runtime.md](K48-security-audit-trail-runtime.md)

**Rozsah:** hardening existujícího Health workflow přes centrální `SecurityContext` + `authorize()`. Žádný nový Health / Access / Permission / Security / Messaging / Audit systém.

---

## 1. Files changed

| Oblast | Soubory |
|--------|---------|
| Clinical gate | `src/lib/security/clinicalGate.ts`, `src/lib/security/index.ts`, `src/lib/security/adapters/project.ts`, `src/lib/security/useAuthorizedHealthScope.ts` |
| Write boundary | `src/context/AppContext.tsx`, `src/components/health/WeightChart.tsx`, `src/components/pets/profile/usePetProfileTabState.ts` |
| Clinical UI | `src/pages/HealthPage.tsx`, `src/components/health/HealthSummary.tsx`, `src/components/health/HealthCategoryPanel.tsx`, `src/components/pets/profile/HealthTab.tsx`, `src/components/pets/profile/DocumentsTab.tsx`, `src/components/pets/HealthAssessmentModal.tsx` |
| Professional | `src/pages/professional/ProfessionalPetPage.tsx`, `src/pages/ProfessionalPetAccessPage.tsx` |
| Messages | `src/components/messages/MessagesPageContent.tsx`, `HealthShareMenu.tsx`, `MessageComposer.tsx`, `ChatThread.tsx` |
| Tests | `scripts/assert-health-authorization.mts`, `scripts/e2e-health-authorization.mjs` |
| Docs | `docs/K50-health-authorization-hardening.md` |

---

## 2. Health read paths hardened

- Owner Health dashboard filtruje pets/records přes `authorize('health.read')` (`useAuthorizedHealthScope`).
- HealthTab / DocumentsTab: deny UI + empty clinical/document sets bez grantu.
- Professional pet pages: `authorizePetClinical('health.read')` **před** `projectPetForProfessional`.
- `projectAfterAuthorize` předává `healthRecords` / `documents` do doménových projektorů.
- Deny-by-default: žádný fallback na mock seed.

---

## 3. Health write paths hardened

Runtime gate v `AppContext` **před** mutací:

- `addHealthRecord` / `updateHealthRecord` / `deleteHealthRecord` → type-mapped `health|vaccination|medication|labs.write`
- Document CRUD → `documents.write`
- Medication reminder toggles → `medication.write`
- Weight persist (WeightChart / HealthTab) → `health.write`

UI hide/disable je doplněk, ne security boundary.

---

## 4. Clinical UI paths hardened

HealthPage, HealthSummary, HealthCategoryPanel, HealthRecordsList, WeightChart, HealthTab, DocumentsTab, HealthAssessmentModal — všechny volají existující authorize boundary (přímo nebo přes hook / AppContext).

---

## 5. Professional health access

```
Professional identity + PetProfessionalAccess + explicit health permission
→ authorize() → projectPetForProfessional → SSOT
```

Role sama o sobě nestačí. Domain `assertCanAdd*` zůstává sekundární check **za** `authorize()`.

---

## 6. Household health access

Zachováno přes existující HH adapter:

| Role | Health |
|------|--------|
| Owner / Co-owner | full R/W |
| Caregiver | pouze explicit `health_read` / `health_write` |
| Viewer | DENY |

---

## 7. Organization health access

```
OrganizationMembership ≠ OrganizationPetAccess ≠ health permission
```

Membership-only DENY; Pet access bez health DENY; Pet access + health ALLOW (assert matrix).

---

## 8. Public / Finder protection

- Public `health.read` DENY
- Discover / public pet projections bez clinical arrays (stávající)
- Finder: emergency-safe `buildEmergencyCardPublicView` ALLOW; clinical HealthRecord DENY

---

## 9. Microchip / PII protection

- Non-owner `microchip.read` / `ownerContacts.read` DENY i při health ALLOW
- HH/Pro/Org projections nesmí obsahovat microchip / owner contacts (assert)

---

## 10. Messages health-share result

**DEMO / placeholder only.**

- Odstraněn import `mockData.healthRecords`
- UI: explicitní DEMO copy + `data-testid="messages-health-share-demo"`
- Není produkční klinický share; messaging isolation stále DENY `health.*` na conversation

---

## 11. authorize() integration

Thin glue: `clinicalGate.ts` → `createDemoSecurityContext` → `authorize` / `assertAuthorized` → optional `projectAfterAuthorize`.

`authority: 'demo'` zachováno. Žádný fake server authority.

---

## 12. Audit integration

Každé `authorize()` rozhodnutí dál emituje K48 `emitAuthorizationAudit`. Žádné nové action types. Failure ≠ execution success (mutace se neprovede).

---

## 13. Tests

`scripts/assert-health-authorization.mts` — 27 scénářů (owner/co-owner/caregiver/viewer/pro/org/public/finder/revoked/expired/wrong pet/org/microchip/PII/messages isolation/clinicalGate).

---

## 14. E2E

`scripts/e2e-health-authorization.mjs` — spouští assert matrix + UI smoke (Owner Health OK; Messages DEMO když dostupný toggle).

---

## 15. Regression

| Suite | Result |
|-------|--------|
| assert-security-context (K47) | PASS |
| assert-security-audit (K48) | PASS |
| assert-pet-household-access | PASS |
| assert-professional-access | PASS |
| assert-organization-pet-access | PASS |
| assert-health-authorization (K50) | PASS |
| e2e-health-authorization | PASS |
| assert-privacy / messaging / lost-found | run with suite |

**K50 failures:** none.  
**Pre-existing technical debt:** `tsc -b` stále hlásí staré chyby mimo K50 (booking `payment_pending`, toast `"error"`, authorize deny typing, atd.) — **neopraveno** (mimo scope).

---

## 16. Remaining UNKNOWN

| Item | Status |
|------|--------|
| Server-authority enforcement of clinical mutations | UNKNOWN — REQUIRES BACKEND TEST |
| Org multi-staff clinical product UI | UNKNOWN — REQUIRES BACKEND TEST (lib policy covered) |
| Full Playwright matrix for caregiver/viewer/pro sessions as alternate DEMO self | LIMITED — DEMO `getSelfAccount()` is always `SELF_OWNER_ID`; non-owner covered via `authorize()` asserts |

---

## 17. Backend limitations

- Persistence zůstává DEMO localStorage (`authority: 'demo'`).
- Domain boundary (`authorize` → projection → audit) je backend-ready bez změny veřejné sémantiky grantů.
- Přechod na `authority: 'server'` vyžaduje server resource resolution + grant store (K46 track).

---

## 18. Explicit confirmation — NOT recreated

- žádný nový Health model
- žádný nový Access / PetAccess model
- žádný nový Permission systém / catalog
- žádný nový SecurityContext / authorize()
- žádný nový Messaging / chat systém
- žádný nový Audit systém
- PetProfessionalAccess / PetHouseholdAccess / OrganizationPetAccess / OrganizationMembership **nepřepsány** (pouze spotřebovány)
- K49 P1 (`deletePet` cascade, denorm lastVetVisit) **mimo scope** tohoto kroku

---

## Hotovo když

- [x] clinical reads authorization-gated
- [x] clinical writes authorization-gated
- [x] owner/co-owner full health
- [x] caregiver/viewer správně omezeni
- [x] professional/org vyžaduje grant + permission
- [x] public/finder neunikají clinical data
- [x] Messages health-share neobchází authorization
- [x] testy + E2E + regression PASS
