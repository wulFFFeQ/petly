/**
 * K56 — ClinicalService authority boundary.
 *
 * request → trusted SecurityContext → actor → pet → authorize() → mutate → provenance → (audit via authorize)
 *
 * Uses existing HealthRecord / PetDocument / WeightMeasurement SSOT.
 * Uses existing authorize() + clinicalGate helpers — no parallel ACL.
 */

import type { HealthRecord, Pet, WeightMeasurement } from '../../types'
import {
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
  notImplemented,
  rethrowAsClinical,
  serverRequired,
} from './errors'
import type {
  ClinicalAuthority,
  ClinicalCreateRecordInput,
  ClinicalCreateWeightInput,
  ClinicalMutationResult,
  ClinicalReadRequest,
  ClinicalRequestBase,
  ClinicalServiceOptions,
  ClinicalUpdateRecordInput,
  ClinicalWithdrawRecordInput,
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
  // encounterId alone is never an auth shortcut (K58 will resolve encounter → pet).
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
    // Safe not-found — do not leak whether pet exists via other channels.
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
      // Withdrawn stays in history; ordinary read projection excludes it.
      throw new ClinicalError('NOT_FOUND', 'Resource not found', 'not_found')
    }

    return {
      ok: true,
      authority: this.authority,
      data: record,
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
    }

    this.adapter.setHealthRecords([record, ...this.adapter.getHealthRecords()])

    return {
      ok: true,
      authority: this.authority,
      data: record,
      authorizationAction: writeAction,
    }
  }

  updateRecord(
    req: ClinicalRequestBase & {
      input: ClinicalUpdateRecordInput
      pets?: Pet[]
    },
  ): ClinicalMutationResult<HealthRecord> {
    denyShortcuts(req)
    assertTrustedActor(req.context, req.claimedActorAccountId)
    this.requireDemoForMutate('updateRecord')

    const existing = this.adapter.findHealthRecord(req.input.recordId)
    if (!existing) {
      throw new ClinicalError('NOT_FOUND', 'Resource not found', 'not_found')
    }

    const deps = this.deps(req.pets)
    resolvePet(existing.petId, deps)
    const writeAction = writeActionForHealthRecordType(
      req.input.updates.type ?? existing.type,
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

    const stamp = stampClinicalUpdate(existing, req.context)
    const safe = stripClinicalClientUpdates(
      req.input.updates as Record<string, unknown>,
    )
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
    }

    this.adapter.setHealthRecords(
      this.adapter.getHealthRecords().map((r) => (r.id === updated.id ? updated : r)),
    )

    return {
      ok: true,
      authority: this.authority,
      data: updated,
      authorizationAction: writeAction,
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
    // K50/K51: soft withdraw gated as typed write (clinical.withdraw vocab ready for later split).
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

    const withdraw = stampClinicalWithdraw(existing, req.context)
    const updated: HealthRecord = {
      ...existing,
      ...withdraw,
      createdAt: existing.createdAt ?? withdraw.createdAt,
      createdByAccountId: existing.createdByAccountId,
      // Soft withdraw — never hard-delete from adapter.
    }

    this.adapter.setHealthRecords(
      this.adapter.getHealthRecords().map((r) => (r.id === updated.id ? updated : r)),
    )

    // Prove hard-delete did not happen.
    if (!this.adapter.findHealthRecord(updated.id)) {
      throw new ClinicalError('INVALID_RESOURCE', 'Withdraw must retain history row')
    }

    return {
      ok: true,
      authority: this.authority,
      data: updated,
      authorizationAction: writeAction,
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
    }
  }

  /** Contract only — requires K57 version/history. */
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
