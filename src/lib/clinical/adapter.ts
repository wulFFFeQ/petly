/**
 * K56 — Clinical persistence adapter boundary.
 *
 * DemoClinicalPersistenceAdapter = DEMO only (local simulation).
 * ServerClinicalPersistenceAdapter = contract stub → SERVER_REQUIRED.
 *
 * Server adapter must NEVER wrap localStorage and pretend to be a server.
 */

import type { HealthRecord, PetDocument, WeightMeasurement } from '../../types'
import { ClinicalError, serverRequired } from './errors'
import type { ClinicalAuthority } from './types'

export type ClinicalPersistenceAdapter = {
  readonly authority: ClinicalAuthority
  /** false until a real backend is wired. */
  readonly wired: boolean

  getHealthRecords(): HealthRecord[]
  setHealthRecords(records: HealthRecord[]): void
  findHealthRecord(recordId: string): HealthRecord | undefined

  getDocuments(): PetDocument[]
  setDocuments(documents: PetDocument[]): void
  findDocument(documentId: string): PetDocument | undefined

  getWeightMeasurements(): WeightMeasurement[]
  persistWeightMeasurement(entry: WeightMeasurement): void
}

export type DemoClinicalStoreHooks = {
  getHealthRecords: () => HealthRecord[]
  setHealthRecords: (records: HealthRecord[]) => void
  getDocuments?: () => PetDocument[]
  setDocuments?: (documents: PetDocument[]) => void
  getWeightMeasurements?: () => WeightMeasurement[]
  persistWeightMeasurement?: (entry: WeightMeasurement) => void
}

/**
 * DEMO persistence — in-memory / React-state / localStorage via hooks.
 * Explicitly NOT production authority.
 */
export class DemoClinicalPersistenceAdapter implements ClinicalPersistenceAdapter {
  readonly authority: ClinicalAuthority = 'demo'
  readonly wired = true as const

  private readonly hooks: DemoClinicalStoreHooks

  constructor(hooks: DemoClinicalStoreHooks) {
    this.hooks = hooks
  }

  getHealthRecords(): HealthRecord[] {
    return this.hooks.getHealthRecords()
  }

  setHealthRecords(records: HealthRecord[]): void {
    this.hooks.setHealthRecords(records)
  }

  findHealthRecord(recordId: string): HealthRecord | undefined {
    return this.getHealthRecords().find((r) => r.id === recordId)
  }

  getDocuments(): PetDocument[] {
    return this.hooks.getDocuments?.() ?? []
  }

  setDocuments(documents: PetDocument[]): void {
    this.hooks.setDocuments?.(documents)
  }

  findDocument(documentId: string): PetDocument | undefined {
    return this.getDocuments().find((d) => d.id === documentId)
  }

  getWeightMeasurements(): WeightMeasurement[] {
    return this.hooks.getWeightMeasurements?.() ?? []
  }

  persistWeightMeasurement(entry: WeightMeasurement): void {
    if (this.hooks.persistWeightMeasurement) {
      this.hooks.persistWeightMeasurement(entry)
      return
    }
    // Optional in-memory-only callers may omit weight hooks.
  }
}

/**
 * In-memory DEMO store for asserts — still authority:'demo'.
 */
export function createInMemoryDemoClinicalAdapter(
  seed?: {
    healthRecords?: HealthRecord[]
    documents?: PetDocument[]
    weights?: WeightMeasurement[]
  },
): DemoClinicalPersistenceAdapter {
  let healthRecords = [...(seed?.healthRecords ?? [])]
  let documents = [...(seed?.documents ?? [])]
  let weights = [...(seed?.weights ?? [])]
  return new DemoClinicalPersistenceAdapter({
    getHealthRecords: () => healthRecords,
    setHealthRecords: (next) => {
      healthRecords = next
    },
    getDocuments: () => documents,
    setDocuments: (next) => {
      documents = next
    },
    getWeightMeasurements: () => weights,
    persistWeightMeasurement: (entry) => {
      weights = [...weights.filter((w) => w.id !== entry.id), entry]
    },
  })
}

/**
 * Server contract stub — no fake DB, no fake HTTP, no LS wrapper.
 * Every persistence call fails with SERVER_REQUIRED.
 */
export class ServerClinicalPersistenceAdapter implements ClinicalPersistenceAdapter {
  readonly authority: ClinicalAuthority = 'server'
  readonly wired = false as const

  private fail(): never {
    throw serverRequired('Clinical persistence')
  }

  getHealthRecords(): HealthRecord[] {
    this.fail()
  }

  setHealthRecords(_records: HealthRecord[]): void {
    this.fail()
  }

  findHealthRecord(_recordId: string): HealthRecord | undefined {
    this.fail()
  }

  getDocuments(): PetDocument[] {
    this.fail()
  }

  setDocuments(_documents: PetDocument[]): void {
    this.fail()
  }

  findDocument(_documentId: string): PetDocument | undefined {
    this.fail()
  }

  getWeightMeasurements(): WeightMeasurement[] {
    this.fail()
  }

  persistWeightMeasurement(_entry: WeightMeasurement): void {
    this.fail()
  }
}

export function createServerClinicalPersistenceStub(): ServerClinicalPersistenceAdapter {
  return new ServerClinicalPersistenceAdapter()
}

/** Assert adapter matches declared service authority. */
export function assertAdapterAuthority(
  expected: ClinicalAuthority,
  adapter: ClinicalPersistenceAdapter,
): void {
  if (adapter.authority !== expected) {
    throw new ClinicalError(
      'INVALID_RESOURCE',
      'Clinical adapter authority mismatch',
    )
  }
}
