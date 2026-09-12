/**
 * K56/K57 — Clinical persistence adapter boundary.
 *
 * DemoClinicalPersistenceAdapter = DEMO only (local simulation).
 * ServerClinicalPersistenceAdapter = contract stub → SERVER_REQUIRED.
 *
 * Server adapter must NEVER wrap localStorage and pretend to be a server.
 *
 * K57: HealthRecord version ledger stores immutable snapshots of the SAME
 * HealthRecord resource — not a parallel Health SSOT.
 */

import type { HealthRecord, PetDocument, WeightMeasurement } from '../../types'
import {
  ClinicalError,
  immutableVersion,
  serverRequired,
} from './errors'
import type {
  ClinicalAuthority,
  HealthRecordVersionSnapshot,
} from './types'

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

  /** K57 — append-only immutable HealthRecord version snapshot. */
  appendHealthRecordVersion(snapshot: HealthRecordVersionSnapshot): void
  listHealthRecordVersions(recordId: string): HealthRecordVersionSnapshot[]
  getHealthRecordVersion(
    recordId: string,
    version: number,
  ): HealthRecordVersionSnapshot | undefined
}

export type DemoClinicalStoreHooks = {
  getHealthRecords: () => HealthRecord[]
  setHealthRecords: (records: HealthRecord[]) => void
  getDocuments?: () => PetDocument[]
  setDocuments?: (documents: PetDocument[]) => void
  getWeightMeasurements?: () => WeightMeasurement[]
  persistWeightMeasurement?: (entry: WeightMeasurement) => void
  getHealthRecordVersions?: () => HealthRecordVersionSnapshot[]
  setHealthRecordVersions?: (snapshots: HealthRecordVersionSnapshot[]) => void
}

/**
 * DEMO persistence — in-memory / React-state / localStorage via hooks.
 * Explicitly NOT production authority.
 * Version ledger simulates immutable history; DEMO ≠ production concurrency.
 */
export class DemoClinicalPersistenceAdapter implements ClinicalPersistenceAdapter {
  readonly authority: ClinicalAuthority = 'demo'
  readonly wired = true as const

  private readonly hooks: DemoClinicalStoreHooks
  private memoryVersions: HealthRecordVersionSnapshot[] = []

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
  }

  private readVersions(): HealthRecordVersionSnapshot[] {
    if (this.hooks.getHealthRecordVersions) {
      return this.hooks.getHealthRecordVersions()
    }
    return this.memoryVersions
  }

  private writeVersions(next: HealthRecordVersionSnapshot[]): void {
    if (this.hooks.setHealthRecordVersions) {
      this.hooks.setHealthRecordVersions(next)
      return
    }
    this.memoryVersions = next
  }

  appendHealthRecordVersion(snapshot: HealthRecordVersionSnapshot): void {
    const existing = this.readVersions()
    const clash = existing.find(
      (s) => s.recordId === snapshot.recordId && s.version === snapshot.version,
    )
    if (clash) {
      throw immutableVersion(
        `Version ${snapshot.version} already exists for record ${snapshot.recordId}`,
      )
    }
    // Deep-freeze payload copy — historical row must not share mutable refs.
    const frozen: HealthRecordVersionSnapshot = {
      ...snapshot,
      record: { ...snapshot.record },
    }
    this.writeVersions([...existing, frozen])
  }

  listHealthRecordVersions(recordId: string): HealthRecordVersionSnapshot[] {
    return this.readVersions()
      .filter((s) => s.recordId === recordId)
      .slice()
      .sort((a, b) => a.version - b.version)
  }

  getHealthRecordVersion(
    recordId: string,
    version: number,
  ): HealthRecordVersionSnapshot | undefined {
    return this.readVersions().find(
      (s) => s.recordId === recordId && s.version === version,
    )
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
    versions?: HealthRecordVersionSnapshot[]
  },
): DemoClinicalPersistenceAdapter {
  let healthRecords = [...(seed?.healthRecords ?? [])]
  let documents = [...(seed?.documents ?? [])]
  let weights = [...(seed?.weights ?? [])]
  let versions = [...(seed?.versions ?? [])]
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
    getHealthRecordVersions: () => versions,
    setHealthRecordVersions: (next) => {
      versions = next
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

  appendHealthRecordVersion(_snapshot: HealthRecordVersionSnapshot): void {
    this.fail()
  }

  listHealthRecordVersions(_recordId: string): HealthRecordVersionSnapshot[] {
    this.fail()
  }

  getHealthRecordVersion(
    _recordId: string,
    _version: number,
  ): HealthRecordVersionSnapshot | undefined {
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
