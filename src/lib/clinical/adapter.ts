/**
 * K56/K57/K58 — Clinical persistence adapter boundary.
 *
 * DemoClinicalPersistenceAdapter = DEMO only (local simulation).
 * ServerClinicalPersistenceAdapter = contract stub → SERVER_REQUIRED.
 *
 * Server adapter must NEVER wrap localStorage and pretend to be a server.
 *
 * K57: HealthRecord version ledger stores immutable snapshots of the SAME
 * HealthRecord resource — not a parallel Health SSOT.
 * K58: ClinicalEncounter store + separate immutable encounter version ledger.
 */

import type {
  ClinicalEncounter,
  HealthRecord,
  PetDocument,
  WeightMeasurement,
} from '../../types'
import {
  ClinicalError,
  immutableVersion,
  serverRequired,
} from './errors'
import type {
  ClinicalAuthority,
  ClinicalEncounterVersionSnapshot,
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

  /** K58 — ClinicalEncounter current rows. */
  getEncounters(): ClinicalEncounter[]
  setEncounters(encounters: ClinicalEncounter[]): void
  findEncounter(encounterId: string): ClinicalEncounter | undefined

  /** K58 — append-only immutable Encounter version snapshot. */
  appendEncounterVersion(snapshot: ClinicalEncounterVersionSnapshot): void
  listEncounterVersions(encounterId: string): ClinicalEncounterVersionSnapshot[]
  getEncounterVersion(
    encounterId: string,
    version: number,
  ): ClinicalEncounterVersionSnapshot | undefined
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
  getEncounters?: () => ClinicalEncounter[]
  setEncounters?: (encounters: ClinicalEncounter[]) => void
  getEncounterVersions?: () => ClinicalEncounterVersionSnapshot[]
  setEncounterVersions?: (snapshots: ClinicalEncounterVersionSnapshot[]) => void
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
  private memoryEncounters: ClinicalEncounter[] = []
  private memoryEncounterVersions: ClinicalEncounterVersionSnapshot[] = []

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

  getEncounters(): ClinicalEncounter[] {
    if (this.hooks.getEncounters) {
      return this.hooks.getEncounters()
    }
    return this.memoryEncounters
  }

  setEncounters(encounters: ClinicalEncounter[]): void {
    if (this.hooks.setEncounters) {
      this.hooks.setEncounters(encounters)
      return
    }
    this.memoryEncounters = encounters
  }

  findEncounter(encounterId: string): ClinicalEncounter | undefined {
    return this.getEncounters().find((e) => e.id === encounterId)
  }

  private readEncounterVersions(): ClinicalEncounterVersionSnapshot[] {
    if (this.hooks.getEncounterVersions) {
      return this.hooks.getEncounterVersions()
    }
    return this.memoryEncounterVersions
  }

  private writeEncounterVersions(next: ClinicalEncounterVersionSnapshot[]): void {
    if (this.hooks.setEncounterVersions) {
      this.hooks.setEncounterVersions(next)
      return
    }
    this.memoryEncounterVersions = next
  }

  appendEncounterVersion(snapshot: ClinicalEncounterVersionSnapshot): void {
    const existing = this.readEncounterVersions()
    const clash = existing.find(
      (s) =>
        s.encounterId === snapshot.encounterId && s.version === snapshot.version,
    )
    if (clash) {
      throw immutableVersion(
        `Version ${snapshot.version} already exists for encounter ${snapshot.encounterId}`,
      )
    }
    const frozen: ClinicalEncounterVersionSnapshot = {
      ...snapshot,
      encounter: { ...snapshot.encounter },
    }
    this.writeEncounterVersions([...existing, frozen])
  }

  listEncounterVersions(encounterId: string): ClinicalEncounterVersionSnapshot[] {
    return this.readEncounterVersions()
      .filter((s) => s.encounterId === encounterId)
      .slice()
      .sort((a, b) => a.version - b.version)
      .map((s) => ({ ...s, encounter: { ...s.encounter } }))
  }

  getEncounterVersion(
    encounterId: string,
    version: number,
  ): ClinicalEncounterVersionSnapshot | undefined {
    const found = this.readEncounterVersions().find(
      (s) => s.encounterId === encounterId && s.version === version,
    )
    if (!found) return undefined
    return { ...found, encounter: { ...found.encounter } }
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
    encounters?: ClinicalEncounter[]
    encounterVersions?: ClinicalEncounterVersionSnapshot[]
  },
): DemoClinicalPersistenceAdapter {
  let healthRecords = [...(seed?.healthRecords ?? [])]
  let documents = [...(seed?.documents ?? [])]
  let weights = [...(seed?.weights ?? [])]
  let versions = [...(seed?.versions ?? [])]
  let encounters = [...(seed?.encounters ?? [])]
  let encounterVersions = [...(seed?.encounterVersions ?? [])]
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
    getEncounters: () => encounters,
    setEncounters: (next) => {
      encounters = next
    },
    getEncounterVersions: () => encounterVersions,
    setEncounterVersions: (next) => {
      encounterVersions = next
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

  getEncounters(): ClinicalEncounter[] {
    this.fail()
  }

  setEncounters(_encounters: ClinicalEncounter[]): void {
    this.fail()
  }

  findEncounter(_encounterId: string): ClinicalEncounter | undefined {
    this.fail()
  }

  appendEncounterVersion(_snapshot: ClinicalEncounterVersionSnapshot): void {
    this.fail()
  }

  listEncounterVersions(_encounterId: string): ClinicalEncounterVersionSnapshot[] {
    this.fail()
  }

  getEncounterVersion(
    _encounterId: string,
    _version: number,
  ): ClinicalEncounterVersionSnapshot | undefined {
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
