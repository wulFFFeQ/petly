/**
 * K56/K57/K58 — Clinical service contracts (authority boundary).
 * Not a parallel HealthRecord / access / permission / audit system.
 *
 * DEMO localStorage is never production authority.
 * K57: integer version + immutable history snapshots of the same HealthRecord.
 * K58: ClinicalEncounter container + separate encounter history ledger.
 */

import type {
  ClinicalEncounter,
  ClinicalEncounterStatus,
  ClinicalEncounterType,
  HealthRecord,
  PetDocument,
  WeightMeasurement,
} from '../../types'
import type { AuthorizeDeps } from '../security/authorize'
import type { SecurityAction, SecurityAuthority, SecurityContext } from '../security/types'

export type ClinicalAuthority = SecurityAuthority

/** Trusted actor — always resolved from SecurityContext, never from payload. */
export type TrustedActor = {
  accountId: string
}

/** Clinical resource always resolves to a Pet parent. */
export type ClinicalResource =
  | { kind: 'pet'; petId: string }
  | { kind: 'health_record'; recordId: string; petId: string }
  | { kind: 'document'; documentId: string; petId: string }
  | { kind: 'weight'; measurementId: string; petId: string }
  /**
   * K58 — encounter never grants pet access by itself.
   * bookingId / microchip / organizationId are never authorization shortcuts.
   */
  | { kind: 'encounter'; encounterId: string; petId: string }

export type ClinicalServiceAction =
  | 'read'
  | 'create'
  | 'update'
  | 'withdraw'
  | 'correct'
  | 'finalize'
  | 'sign'
  | 'admin_correct'
  | 'export'
  | 'emergency_write'
  | 'complete'
  | 'cancel'

export type ClinicalMutationKind =
  | 'create'
  | 'update'
  | 'withdraw'
  | 'correct'
  | 'complete'
  | 'cancel'

/**
 * Immutable snapshot of a HealthRecord at a specific version.
 * NOT a parallel Health SSOT — versions of the existing HealthRecord resource.
 */
export type HealthRecordVersionSnapshot = {
  recordId: string
  petId: string
  version: number
  frozenAt: string
  mutationKind: ClinicalMutationKind
  /** For corrections — which prior version this corrects. */
  correctionOfVersion?: number
  /** Internal only — never public projection. */
  correctionReason?: string
  /** Frozen clinical payload at this version. */
  record: HealthRecord
}

/**
 * K58 — immutable snapshot of a ClinicalEncounter at a specific version.
 * Encounter history ≠ HealthRecord history.
 */
export type ClinicalEncounterVersionSnapshot = {
  encounterId: string
  petId: string
  version: number
  frozenAt: string
  mutationKind: ClinicalMutationKind
  encounter: ClinicalEncounter
}

export type ClinicalRequestBase = {
  /** Trusted SecurityContext (session-bound). */
  context: SecurityContext
  /**
   * Client-claimed actor — UNTRUSTED.
   * If present and ≠ trusted actor → DENY (same as K47 forged claim).
   */
  claimedActorAccountId?: string
  claimedOrganizationId?: string
  /**
   * K57 optimistic concurrency — required for update / withdraw / correct.
   * Must match current.version or STALE_VERSION (no mutation).
   */
  expectedVersion?: number
  /**
   * Forbidden auth shortcuts — if set, service DENY (not used as access).
   */
  bookingId?: string
  microchip?: string
  encounterId?: string
}

export type ClinicalReadRequest = ClinicalRequestBase & {
  petId: string
  recordId?: string
}

export type ClinicalCreateRecordInput = {
  petId: string
  type: HealthRecord['type']
  title: string
  subtitle?: string
  date: string
  doctor?: string
  clinic?: string
  status?: HealthRecord['status']
  vaccineName?: string
  dosage?: string
  scheduleTime?: string
  reminderDays?: number
  reminderEnabled?: boolean
  notes?: string
  /** K58 — optional encounter link (not authz). */
  encounterId?: string
}

export type ClinicalUpdateRecordInput = {
  recordId: string
  updates: Partial<HealthRecord>
}

export type ClinicalWithdrawRecordInput = {
  recordId: string
}

export type ClinicalCorrectRecordInput = {
  recordId: string
  updates: Partial<HealthRecord>
  /** Optional internal reason — never public projection. */
  correctionReason?: string
  /** Defaults to expectedVersion / previous current version. */
  correctionOfVersion?: number
}

export type ClinicalCreateWeightInput = {
  petId: string
  id: string
  date: string
  weight: number
  note?: string
  /** K58 — optional encounter link (not authz). */
  encounterId?: string
}

export type ClinicalCreateEncounterInput = {
  petId: string
  encounterType: ClinicalEncounterType
  status?: ClinicalEncounterStatus
  startedAt?: string
  endedAt?: string
  professionalId?: string
  organizationId?: string
  bookingId?: string
  reason?: string
}

export type ClinicalUpdateEncounterInput = {
  encounterId: string
  updates: Partial<
    Pick<
      ClinicalEncounter,
      | 'encounterType'
      | 'status'
      | 'startedAt'
      | 'endedAt'
      | 'professionalId'
      | 'organizationId'
      | 'bookingId'
      | 'reason'
    >
  >
}

export type ClinicalMutationResult<T> = {
  ok: true
  authority: ClinicalAuthority
  data: T
  authorizationAction: SecurityAction
  previousVersion?: number
  newVersion?: number
}

export type ClinicalAuthorizationDecision = {
  allowed: boolean
  action: SecurityAction
  path?: string
}

export type ClinicalPersistence = {
  authority: ClinicalAuthority
  /** false for server stub until real backend exists. */
  wired: boolean
}

export type ClinicalServiceOptions = {
  authority: ClinicalAuthority
  adapter: import('./adapter').ClinicalPersistenceAdapter
  /** Optional authorize deps (pets store, grant loaders). */
  deps?: AuthorizeDeps
  /**
   * When true (default for DEMO), createDemoSecurityContext may be used
   * if caller passes incomplete session — prefer explicit context.
   */
  allowDemoSession?: boolean
}

export type ClinicalAudit = {
  /** K48 AuditEvent is emitted by authorize() — not a parallel audit. */
  system: 'K48_AuditEvent'
  /** Full mutate+audit atomicity requires server transaction. */
  transactionalWithMutation: boolean
}

export type {
  ClinicalEncounter,
  ClinicalEncounterStatus,
  ClinicalEncounterType,
  HealthRecord,
  PetDocument,
  WeightMeasurement,
  SecurityContext,
  SecurityAction,
}
