# K61 — Clinical Share Hardening

Clinical Share is a **one-shot action / workflow** over existing authorization and Messages.

It is **not** an access system, permission catalog, chat product, or clinical database.

---

## Invariants

| Rule | Status |
|------|--------|
| Clinical Share ≠ Access Grant | Confirmed |
| Clinical Share ≠ Permission Grant | Confirmed |
| Clinical Share ≠ Messaging replacement | Confirmed |
| Messages = transport/context | Confirmed |
| HealthRecord = clinical facts SSOT | Unchanged |
| WeightMeasurement = measurement SSOT | Unchanged |
| PetDocument = document SSOT | Unchanged |
| Encounter = context/container | Unchanged |
| Recipient source access = re-authorized | Confirmed |
| No public clinical sharing | Confirmed |
| No raw storage URLs / storage keys | Confirmed |
| No owner PII in share payload | Confirmed |
| No new ACL | Confirmed |
| No new audit system (K48 only) | Confirmed |
| No fake server | Confirmed |

---

## Architecture

```
SecurityContext (trusted)
  → createClinicalShare()
    → ClinicalService.read* (source authorize)
    → conversation.participantAccountIds (recipient derive)
    → safe Message.attachment (clinical_share)
    → AppNotification clinical_share_received (no clinical body)
```

**Forbidden models (not created):**

- ClinicalShareAccess / ClinicalDocumentAccess / ShareACL
- ClinicalChat / ClinicalMessaging / ClinicalAudit
- Parallel permission catalog

---

## Share ≠ Access

Creating a share:

- does **not** create `PetProfessionalAccess`
- does **not** create `OrganizationPetAccess`
- does **not** create Household Access
- does **not** grant `health.read` / `health.write` / `documents.read` / `documents.write`

Recipient may see a **safe snapshot** in the message. Opening the original ClinicalService resource requires a **fresh** `authorize()`.

---

## Supported share types

| Type | Status | Projection |
|------|--------|------------|
| HealthRecord | **SUPPORTED** | reference + title/subtitle/date/displayKind |
| WeightMeasurement | **SUPPORTED** | id + weight + date (+ optional note slice) |
| Encounter | **SUPPORTED** | type + status + startedAt (no linked facts / reason) |
| PetDocument | **SUPPORTED (metadata-only)** | name/type/date — **no** storageKey / URL / blob |

**DEFERRED / SERVER_REQUIRED**

- Recipient-scoped document blob download
- Share expiry scheduler
- Message retract / revoke lifecycle (no delete API today → **DOCUMENT GAP**)
- Production server authority for messages + clinical persistence
- Unified idempotency (**K63** — done: `docs/K63-idempotency-gdpr.md`)

Duplicate shares without `idempotencyKey`: each call creates a new message. With `idempotencyKey`: deterministic replay (one share).

---

## Source authorization

Per resource, actor must pass ClinicalService authorize for that resource:

| Share type | Permission |
|------------|------------|
| health_record | typed `health.*` / vaccination / medication / labs `.read` |
| measurement | `health.read` |
| document | `documents.read` |
| encounter | `health.read` |

“Has pet access” alone is insufficient.

---

## Recipient validation

Recipient is **derived** from `conversation.participantAccountIds` (the other participant).

Client `claimedRecipientAccountId` is ignored.

Conversations without participant ACL (community / legacy) → **DENY**.

---

## Actor paths

| Actor | Rule |
|-------|------|
| Owner | existing ownership clinical permissions |
| Co-owner | household permissions |
| Caregiver | only with explicit clinical read |
| Viewer | DENY without clinical read |
| Professional | `PetProfessionalAccess` + `viewHealth` / `viewDocuments` |
| Organization | `OrganizationPetAccess` + permission; membership alone DENY |

---

## Messages

Uses existing:

- `getOrCreateBookingConversation` / `getOrCreateProfessionalConversation`
- `sendMessage` (+ clinical_share attachment)
- participant ACL fields

Additive attachment shape:

```ts
kind: 'clinical_share'
shareType: 'health_record' | 'measurement' | 'document' | 'encounter'
sourceId, petId, title, subtitle?, occurredOn?, displayKind?
```

Privacy: allowlist validator for clinical_share; freeform messaging still bans clinical dumps.

---

## Notifications

Additive `clinical_share_received` on existing `AppNotification`.

Payload: “Byl vám sdílen klinický záznam” + conversation deep-link only.

---

## Audit

K48 `AuditEvent` via `authorize()` + scrubbed `emitAuthorizationAudit` metadata:

`{ workflow: 'clinical_share', shareType, phase }`

No ClinicalShareAudit.

---

## DEMO vs production

| Layer | DEMO | Production |
|-------|------|------------|
| Authority | localStorage Messages + ClinicalService demo | SERVER_REQUIRED |
| Document blobs | IndexedDB behind documents.read | server-authorized download |
| Share persistence | Message attachment only | server message store |

DEMO ≠ production authority.

---

## Tests

- `scripts/assert-clinical-share.mts`
- `scripts/e2e-clinical-share.mjs`

Matrix covers owner/HH/pro/org ALLOW/DENY, forgery, cross-pet, share≠access, public scrub, notification scrub, injection, audit trusted actor, duplicates, withdrawn source.

---

## K62

**K62 = CLINICAL EMERGENCY WRITE ONLY.** Not implemented in this step.

---

## Files (primary)

- `src/lib/clinical/share.ts`
- `src/lib/messaging/messages.ts`, `privacy.ts`, `session.ts`
- `src/lib/notifications/fromClinicalShare.ts`
- `src/components/messages/HealthShareMenu.tsx` (+ BookingMessageComposer / MessageThread)
- `docs/K61-clinical-share.md`
- `scripts/assert-clinical-share.mts`, `scripts/e2e-clinical-share.mjs`
