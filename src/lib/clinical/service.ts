/**
 * K56/K57 — ClinicalService authority boundary.
 *
 * request → trusted SecurityContext → actor → pet → authorize()
 *   → expectedVersion CAS → immutable history → mutate → provenance
 *   → (audit via authorize + optional version metadata)
 *
 * Uses existing HealthRecord / PetDocument / WeightMeasurement SSOT.
 * Uses existing authorize() + clinicalGate helpers — no parallel ACL.
 *
 * DEMO authority simulates versioning; DEMO ≠ production concurrency.
 */

import type { HealthRecord, Pet, WeightMeasurement } from '../../types'
import {
  clinicalCurrentVersion,
  isClinicalWithdrawn,
  stampClinicalUpdate,
  stampClinicalWithdraw,
  stampNewClinicalRecord,
  stampWeightCreate,
  stripClinicalClientUpdates,
} from '../health/clinicalProvenance'
import {
  assertAuthorized,
  type AuthorizeDeps,
} from '../security/authorize'
import { emitAuthorizationAudit } from '../security/auditHook'
import {
  buildDemoClinicalAuthorizeDeps,
  writeActionForHealthRecordType,
} from '../security/clinicalGate'
import { actorAccountId, isAuthenticatedAccount } from '../security/context'
import { isForgedActorClaim } from '../security/resolveActor'
import type { SecurityAction, SecurityContext } from '../security/types'
import {
  assertAdapterAuthority,
  type ClinicalPersistenceAdapter,
} from './adapter'
import {
  ClinicalError,
  invalidVersion,
  notImplemented,
  rethrowAsClinical,
  serverRequired,
  staleVersion,
} from './errors'
import type {
  ClinicalAuthority,
  ClinicalCorrectRecordInput,
  ClinicalCreateRecordInput,
  ClinicalCreateWeightInput,
  ClinicalMutationKind,
  ClinicalMutationResult,
  ClinicalReadRequest,
  ClinicalRequestBase,
  ClinicalServiceOptions,
  ClinicalUpdateRecordInput,
  ClinicalWithdrawRecordInput,
  HealthRecordVersionSnapshot,
} from './types'

function denyShortcuts(req: ClinicalRequestBase): void {
  if (req.bookingId?.trim()) {
    throw new ClinicalError(
      'FORBIDDEN',
      'Booking does not grant clinical access',
      'isolation',
    )
  }
  if (req.microchip?.trim()) {
    throw new ClinicalError(
      'FORBIDDEN',
      'Microchip does not grant clinical access',
      'isolation',
    )
  }
  if (req.encounterId?.trim() && !('petId' in req && (req as { petId?: string }).petId)) {
    throw new ClinicalError(
      'FORBIDDEN',
      'Encounter does not grant clinical access without pet boundary',
      'isolation',
    )
  }
}

function assertTrustedActor(ctx: SecurityContext, claimed?: string): string {
  if (isForgedActorClaim(ctx, claimed)) {
    throw new ClinicalError('FORBIDDEN', 'Actor claim rejected', 'forged_identity')
  }
  if (!isAuthenticatedAccount(ctx)) {
    throw new ClinicalError('UNAUTHENTICATED', 'Authentication required', 'unauthenticated')
  }
  const accountId = actorAccountId(ctx)
  if (!accountId) {
    throw new ClinicalError('UNAUTHENTICATED', 'Authentication required', 'unauthenticated')
  }
  return accountId
}

function authorizePetAction(
  ctx: SecurityContext,
  action: SecurityAction,
  petId: string,
  deps: AuthorizeDeps,
  claimedOrganizationId?: string,
  claimedActorAccountId?: string,
): void {
  try {
    assertAuthorized(
      ctx,
      {
        action,
        resource: { type: 'pet', id: petId },
        claimedOrganizationId,
        claimedActorAccountId,
      },
      deps,
    )
  } catch (err) {
    rethrowAsClinical(err)
  }
}

function resolvePet(petId: string, deps: AuthorizeDeps): Pet {
  const pets = deps.store?.pets
  const pet = pets?.find((p) => p.id === petId)
  if (!pet) {
    throw new ClinicalError('NOT_FOUND', 'Resource not found', 'not_found')
  }
  return pet
}

function readActionForRecordType(type: HealthRecord['type']): SecurityAction {
  switch (type) {
    case 'vaccination':
      return 'vaccination.read'
    case 'medication':
      return 'medication.read'
    case 'examination':
      return 'labs.read'
    default:
      return 'health.read'
  }
}

function requireExpectedVersion(
  expected: number | undefined,
  currentVersion: number,
): void {
  if (expected === undefined || !Number.isInteger(expected) || expected < 1) {
    throw invalidVersion('expectedVersion is required and must be a positive integer')
  }
  if (expected !== currentVersion) {
    throw staleVersion(
      `Expected version ${expected} but current is ${currentVersion}`,
    )
  }
}

function freezeSnapshot(
  record: HealthRecord,
  mutationKind: ClinicalMutationKind,
  extras?: {
    correctionOfVersion?: number
    correctionReason?: string
  },
): HealthRecordVersionSnapshot {
  const version = clinicalCurrentVersion(record)
  return {
    recordId: record.id,
    petId: record.petId,
    version,
    frozenAt: new Date().toISOString(),
    mutationKind,
    correctionOfVersion: extras?.correctionOfVersion,
    correctionReason: extras?.correctionReason,
    record: { ...record, version },
  }
}

/**
 * Emit K48-compatible version transition metadata after successful mutation.
 * Not a parallel audit system — uses existing emitAuthorizationAudit.
 */
function emitVersionTransitionAudit(
  ctx: SecurityContext,
  action: SecurityAction,
  petId: string,
  previousVersion: number,
  newVersion: number,
): void {
  emitAuthorizationAudit({
    actorAccountId: actorAccountId(ctx),
    actorKind: ctx.actor.kind,
    resourceType: 'pet',
    resourceId: petId,
    organizationId: ctx.organization?.organizationId,
    professionalId: ctx.professional?.professionalProfileId,
    membershipId: ctx.organization?.membershipId,
    action,
    authorizationResult: 'allow',
    correlationId: ctx.correlationId,
    channel: ctx.channel,
    authority: ctx.authority,
    metadata: {
      previousVersion,
      newVersion,
    },
  })
}

export class ClinicalService {
  readonly authority: ClinicalAuthority
  private readonly adapter: ClinicalPersistenceAdapter
  private readonly baseDeps: AuthorizeDeps

  constructor(options: ClinicalServiceOptions) {
    this.authority = options.authority
    this.adapter = options.adapter
    this.baseDeps = options.deps ?? {}
    assertAdapterAuthority(options.authority, options.adapter)
  }

  private deps(pets?: Pet[]): AuthorizeDeps {
    return buildDemoClinicalAuthorizeDeps({
      pets,
      deps: this.baseDeps,
    })
  }

  private ensureDemoOrServerReady(operation: string): void {
    if (this.authority === 'server') {
      if (!this.adapter.wired) {
        throw serverRequired(operation)
      }
    }
  }

  private requireDemoForMutate(operation: string): void {
    if (this.authority === 'server') {
      throw serverRequired(operation)
    }
  }

  /** Ensure current row has a ledger snapshot for its version (migration / first mutate). */
  private ensureCurrentSnapshot(
    current: HealthRecord,
    mutationKind: ClinicalMutationKind = 'create',
  ): void {
    const version = clinicalCurrentVersion(current)
    if (!this.adapter.getHealthRecordVersion(current.id, version)) {
      this.adapter.appendHealthRecordVersion(
        freezeSnapshot({ ...current, version }, mutationKind),
      )
    }
  }

  listRecordsForPet(req: ClinicalReadRequest & { pets?: Pet[] }): ClinicalMutationResult<HealthRecord[]> {
    denyShortcuts(req)
    assertTrustedActor(req.context, req.claimedActorAccountId)
    this.ensureDemoOrServerReady('listRecordsForPet')

    const deps = this.deps(req.pets)
    resolvePet(req.petId, deps)
    authorizePetAction(
      req.context,
      'health.read',
      req.petId,
      deps,
      req.claimedOrganizationId,
      req.claimedActorAccountId,
    )

    const records = this.adapter
      .getHealthRecords()
      .filter(
        (r) =>
          r.petId === req.petId &&
          r.lifecycleStatus !== 'withdrawn',
      )

    return {
      ok: true,
      authority: this.authority,
      data: records,
      authorizationAction: 'health.read',
    }
  }

  readRecord(
    req: ClinicalReadRequest & { pets?: Pet[]; recordId: string },
  ): ClinicalMutationResult<HealthRecord> {
    denyShortcuts(req)
    assertTrustedActor(req.context, req.claimedActorAccountId)
    this.ensureDemoOrServerReady('readRecord')

    const deps = this.deps(req.pets)
    const record = this.adapter.findHealthRecord(req.recordId)
    if (!record || record.petId !== req.petId) {
      throw new ClinicalError('NOT_FOUND', 'Resource not found', 'not_found')
    }

    resolvePet(req.petId, deps)
    const action = readActionForRecordType(record.type)
    authorizePetAction(
      req.context,
      action,
      req.petId,
      deps,
      req.claimedOrganizationId,
      req.claimedActorAccountId,
    )

    if (isClinicalWithdrawn(record)) {
      throw new ClinicalError('NOT_FOUND', 'Resource not found', 'not_found')
    }

    return {
      ok: true,
      authority: this.authority,
      data: { ...record, version: clinicalCurrentVersion(record) },
      authorizationAction: action,
    }
  }

  /** Current version only — same authz as readRecord. */
  getCurrentRecord(
    req: ClinicalReadRequest & { pets?: Pet[]; recordId: string },
  ): ClinicalMutationResult<HealthRecord> {
    return this.readRecord(req)
  }

  /**
   * Authorized clinical history — not public, not booking/microchip.
   * Professional access still requires authorize() + permission (role ≠ access).
   */
  getRecordHistory(
    req: ClinicalRequestBase & { petId: string; recordId: string; pets?: Pet[] },
  ): ClinicalMutationResult<HealthRecordVersionSnapshot[]> {
    denyShortcuts(req)
    assertTrustedActor(req.context, req.claimedActorAccountId)
    this.ensureDemoOrServerReady('getRecordHistory')

    const deps = this.deps(req.pets)
    const current = this.adapter.findHealthRecord(req.recordId)
    if (!current || current.petId !== req.petId) {
      throw new ClinicalError('NOT_FOUND', 'Resource not found', 'not_found')
    }

    resolvePet(req.petId, deps)
    const action = readActionForRecordType(current.type)
    authorizePetAction(
      req.context,
      action,
      req.petId,
      deps,
      req.claimedOrganizationId,
      req.claimedActorAccountId,
    )

    this.ensureCurrentSnapshot(current)
    const history = this.adapter.listHealthRecordVersions(req.recordId)

    return {
      ok: true,
      authority: this.authority,
      data: history,
      authorizationAction: action,
    }
  }

  getRecordVersion(
    req: ClinicalRequestBase & {
      petId: string
      recordId: string
      version: number
      pets?: Pet[]
    },
  ): ClinicalMutationResult<HealthRecordVersionSnapshot> {
    denyShortcuts(req)
    assertTrustedActor(req.context, req.claimedActorAccountId)
    this.ensureDemoOrServerReady('getRecordVersion')

    if (!Number.isInteger(req.version) || req.version < 1) {
      throw invalidVersion('version must be a positive integer')
    }

    const deps = this.deps(req.pets)
    const current = this.adapter.findHealthRecord(req.recordId)
    if (!current || current.petId !== req.petId) {
      throw new ClinicalError('NOT_FOUND', 'Resource not found', 'not_found')
    }

    resolvePet(req.petId, deps)
    const action = readActionForRecordType(current.type)
    authorizePetAction(
      req.context,
      action,
      req.petId,
      deps,
      req.claimedOrganizationId,
      req.claimedActorAccountId,
    )

    this.ensureCurrentSnapshot(current)
    const snap = this.adapter.getHealthRecordVersion(req.recordId, req.version)
    if (!snap) {
      throw new ClinicalError('NOT_FOUND', 'Resource not found', 'not_found')
    }

    return {
      ok: true,
      authority: this.authority,
      data: snap,
      authorizationAction: action,
    }
  }

  createRecord(
    req: ClinicalRequestBase & {
      input: ClinicalCreateRecordInput
      pets?: Pet[]
      recordId?: string
    },
  ): ClinicalMutationResult<HealthRecord> {
    denyShortcuts(req)
    assertTrustedActor(req.context, req.claimedActorAccountId)
    this.requireDemoForMutate('createRecord')

    const { input } = req
    if (!input.petId?.trim() || !input.title?.trim() || !input.date) {
      throw new ClinicalError('INVALID_RESOURCE', 'Invalid clinical record input')
    }

    const deps = this.deps(req.pets)
    const pet = resolvePet(input.petId, deps)
    const writeAction = writeActionForHealthRecordType(input.type)
    authorizePetAction(
      req.context,
      writeAction,
      input.petId,
      deps,
      req.claimedOrganizationId,
      req.claimedActorAccountId,
    )

    const provenance = stampNewClinicalRecord(req.context, pet)
    const typeTitle: Record<HealthRecord['type'], string> = {
      vaccination: 'Očkování',
      vet: 'Návštěva veterináře',
      medication: 'Léky',
      examination: 'Vyšetření',
      assessment: 'Zdravotní přehled',
    }

    const record: HealthRecord = {
      id: req.recordId ?? `hr_${Date.now()}`,
      petId: input.petId,
      type: input.type,
      title: typeTitle[input.type],
      subtitle: input.subtitle?.trim() || input.title.trim(),
      date: input.date,
      doctor: input.doctor?.trim() || undefined,
      clinic: input.clinic?.trim() || undefined,
      status: input.status,
      vaccineName: input.vaccineName,
      dosage: input.dosage,
      scheduleTime: input.scheduleTime,
      reminderDays: input.reminderDays,
      reminderEnabled: input.reminderEnabled,
      notes: input.notes,
      ...provenance,
      version: 1,
    }

    this.adapter.setHealthRecords([record, ...this.adapter.getHealthRecords()])
    this.adapter.appendHealthRecordVersion(freezeSnapshot(record, 'create'))
    emitVersionTransitionAudit(req.context, writeAction, input.petId, 0, 1)

    return {
      ok: true,
      authority: this.authority,
      data: record,
      authorizationAction: writeAction,
      previousVersion: 0,
      newVersion: 1,
    }
  }

  updateRecord(
    req: ClinicalRequestBase & {
      input: ClinicalUpdateRecordInput
      pets?: Pet[]
    },
  ): ClinicalMutationResult<HealthRecord> {
    return this.mutateVersioned(req, 'update', {
      recordId: req.input.recordId,
      updates: req.input.updates,
    })
  }

  correctRecord(
    req: ClinicalRequestBase & {
      input: ClinicalCorrectRecordInput
      pets?: Pet[]
    },
  ): ClinicalMutationResult<HealthRecord> {
    return this.mutateVersioned(req, 'correct', {
      recordId: req.input.recordId,
      updates: req.input.updates,
      correctionReason: req.input.correctionReason,
      correctionOfVersion: req.input.correctionOfVersion,
    })
  }

  private mutateVersioned(
    req: ClinicalRequestBase & { pets?: Pet[] },
    mutationKind: 'update' | 'correct',
    input: {
      recordId: string
      updates: Partial<HealthRecord>
      correctionReason?: string
      correctionOfVersion?: number
    },
  ): ClinicalMutationResult<HealthRecord> {
    denyShortcuts(req)
    assertTrustedActor(req.context, req.claimedActorAccountId)
    this.requireDemoForMutate(mutationKind === 'correct' ? 'correctRecord' : 'updateRecord')

    const existing = this.adapter.findHealthRecord(input.recordId)
    if (!existing) {
      throw new ClinicalError('NOT_FOUND', 'Resource not found', 'not_found')
    }

    const deps = this.deps(req.pets)
    resolvePet(existing.petId, deps)
    const writeAction = writeActionForHealthRecordType(
      input.updates.type ?? existing.type,
    )
    authorizePetAction(
      req.context,
      writeAction,
      existing.petId,
      deps,
      req.claimedOrganizationId,
      req.claimedActorAccountId,
    )

    if (isClinicalWithdrawn(existing)) {
      throw new ClinicalError('FORBIDDEN', 'Withdrawn record cannot be updated', 'forbidden')
    }

    const previousVersion = clinicalCurrentVersion(existing)
    requireExpectedVersion(req.expectedVersion, previousVersion)
    this.ensureCurrentSnapshot(existing)

    const stamp = stampClinicalUpdate(existing, req.context)
    const safe = stripClinicalClientUpdates(
      input.updates as Record<string, unknown>,
    )
    const newVersion = previousVersion + 1
    const updated: HealthRecord = {
      ...existing,
      ...(safe as Partial<HealthRecord>),
      id: existing.id,
      petId: existing.petId,
      createdAt: existing.createdAt ?? stamp.createdAt,
      createdByAccountId: existing.createdByAccountId,
      recordSource: existing.recordSource,
      lifecycleStatus: existing.lifecycleStatus ?? 'active',
      updatedAt: stamp.updatedAt,
      updatedByAccountId: stamp.updatedByAccountId,
      version: newVersion,
    }

    this.adapter.setHealthRecords(
      this.adapter.getHealthRecords().map((r) => (r.id === updated.id ? updated : r)),
    )
    this.adapter.appendHealthRecordVersion(
      freezeSnapshot(updated, mutationKind, {
        correctionOfVersion:
          mutationKind === 'correct'
            ? input.correctionOfVersion ?? previousVersion
            : undefined,
        correctionReason:
          mutationKind === 'correct' ? input.correctionReason : undefined,
      }),
    )
    emitVersionTransitionAudit(
      req.context,
      writeAction,
      existing.petId,
      previousVersion,
      newVersion,
    )

    return {
      ok: true,
      authority: this.authority,
      data: updated,
      authorizationAction: writeAction,
      previousVersion,
      newVersion,
    }
  }

  withdrawRecord(
    req: ClinicalRequestBase & {
      input: ClinicalWithdrawRecordInput
      pets?: Pet[]
    },
  ): ClinicalMutationResult<HealthRecord> {
    denyShortcuts(req)
    assertTrustedActor(req.context, req.claimedActorAccountId)
    this.requireDemoForMutate('withdrawRecord')

    const existing = this.adapter.findHealthRecord(req.input.recordId)
    if (!existing) {
      throw new ClinicalError('NOT_FOUND', 'Resource not found', 'not_found')
    }

    const deps = this.deps(req.pets)
    resolvePet(existing.petId, deps)
    const writeAction = writeActionForHealthRecordType(existing.type)
    authorizePetAction(
      req.context,
      writeAction,
      existing.petId,
      deps,
      req.claimedOrganizationId,
      req.claimedActorAccountId,
    )

    if (isClinicalWithdrawn(existing)) {
      throw new ClinicalError('FORBIDDEN', 'Record already withdrawn', 'forbidden')
    }

    const previousVersion = clinicalCurrentVersion(existing)
    requireExpectedVersion(req.expectedVersion, previousVersion)
    this.ensureCurrentSnapshot(existing)

    const withdraw = stampClinicalWithdraw(existing, req.context)
    const newVersion = previousVersion + 1
    const updated: HealthRecord = {
      ...existing,
      ...withdraw,
      createdAt: existing.createdAt ?? withdraw.createdAt,
      createdByAccountId: existing.createdByAccountId,
      version: newVersion,
    }

    this.adapter.setHealthRecords(
      this.adapter.getHealthRecords().map((r) => (r.id === updated.id ? updated : r)),
    )
    this.adapter.appendHealthRecordVersion(freezeSnapshot(updated, 'withdraw'))

    if (!this.adapter.findHealthRecord(updated.id)) {
      throw new ClinicalError('INVALID_RESOURCE', 'Withdraw must retain history row')
    }

    emitVersionTransitionAudit(
      req.context,
      writeAction,
      existing.petId,
      previousVersion,
      newVersion,
    )

    return {
      ok: true,
      authority: this.authority,
      data: updated,
      authorizationAction: writeAction,
      previousVersion,
      newVersion,
    }
  }

  createWeightMeasurement(
    req: ClinicalRequestBase & {
      input: ClinicalCreateWeightInput
      pets?: Pet[]
    },
  ): ClinicalMutationResult<WeightMeasurement> {
    denyShortcuts(req)
    assertTrustedActor(req.context, req.claimedActorAccountId)
    this.requireDemoForMutate('createWeightMeasurement')

    const deps = this.deps(req.pets)
    const pet = resolvePet(req.input.petId, deps)
    authorizePetAction(
      req.context,
      'health.write',
      req.input.petId,
      deps,
      req.claimedOrganizationId,
      req.claimedActorAccountId,
    )

    const entry = stampWeightCreate(req.context, pet, {
      id: req.input.id,
      petId: req.input.petId,
      date: req.input.date,
      weight: req.input.weight,
      note: req.input.note,
    })

    this.adapter.persistWeightMeasurement(entry)

    return {
      ok: true,
      authority: this.authority,
      data: entry,
      authorizationAction: 'health.write',
      previousVersion: 0,
      newVersion: 1,
    }
  }

  /** Contract only — never fake finalize success. */
  finalizeRecord(req: ClinicalRequestBase & { petId: string; recordId: string; pets?: Pet[] }): never {
    denyShortcuts(req)
    assertTrustedActor(req.context, req.claimedActorAccountId)
    const deps = this.deps(req.pets)
    resolvePet(req.petId, deps)
    authorizePetAction(
      req.context,
      'clinical.finalize',
      req.petId,
      deps,
      req.claimedOrganizationId,
      req.claimedActorAccountId,
    )
    throw serverRequired('finalizeRecord')
  }

  /** Contract only — never boolean signed=true. */
  signRecord(req: ClinicalRequestBase & { petId: string; recordId: string; pets?: Pet[] }): never {
    denyShortcuts(req)
    assertTrustedActor(req.context, req.claimedActorAccountId)
    const deps = this.deps(req.pets)
    resolvePet(req.petId, deps)
    authorizePetAction(
      req.context,
      'clinical.sign',
      req.petId,
      deps,
      req.claimedOrganizationId,
      req.claimedActorAccountId,
    )
    throw serverRequired('signRecord')
  }

  /** Contract only — no hard overwrite of finalized clinical data. */
  adminCorrectRecord(
    req: ClinicalRequestBase & { petId: string; recordId: string; pets?: Pet[] },
  ): never {
    denyShortcuts(req)
    assertTrustedActor(req.context, req.claimedActorAccountId)
    const deps = this.deps(req.pets)
    resolvePet(req.petId, deps)
    authorizePetAction(
      req.context,
      'clinical.admin',
      req.petId,
      deps,
      req.claimedOrganizationId,
      req.claimedActorAccountId,
    )
    throw serverRequired('adminCorrectRecord')
  }

  /** Export ≠ read — server-only. */
  exportClinicalHistory(req: ClinicalRequestBase & { petId: string; pets?: Pet[] }): never {
    denyShortcuts(req)
    assertTrustedActor(req.context, req.claimedActorAccountId)
    const deps = this.deps(req.pets)
    resolvePet(req.petId, deps)
    authorizePetAction(
      req.context,
      'clinical.export',
      req.petId,
      deps,
      req.claimedOrganizationId,
      req.claimedActorAccountId,
    )
    throw serverRequired('exportClinicalHistory')
  }

  /**
   * Emergency clinical write — time-bounded future action.
   * Must never become permanent health.write.
   */
  emergencyWrite(req: ClinicalRequestBase & { petId: string; pets?: Pet[] }): never {
    denyShortcuts(req)
    assertTrustedActor(req.context, req.claimedActorAccountId)
    const deps = this.deps(req.pets)
    resolvePet(req.petId, deps)
    authorizePetAction(
      req.context,
      'clinical.emergency.write',
      req.petId,
      deps,
      req.claimedOrganizationId,
      req.claimedActorAccountId,
    )
    throw notImplemented('emergencyWrite')
  }
}

export function createClinicalService(options: ClinicalServiceOptions): ClinicalService {
  return new ClinicalService(options)
}

export function createDemoClinicalService(
  adapter: ClinicalPersistenceAdapter,
  deps?: AuthorizeDeps,
): ClinicalService {
  return createClinicalService({
    authority: 'demo',
    adapter,
    deps,
  })
}

export function createServerClinicalServiceStub(
  adapter: ClinicalPersistenceAdapter,
  deps?: AuthorizeDeps,
): ClinicalService {
  return createClinicalService({
    authority: 'server',
    adapter,
    deps,
  })
}
