/**
 * K56/K57/K58/K59 — Clinical persistence adapter boundary.
 *
 * DemoClinicalPersistenceAdapter = DEMO only (local simulation).
 * ServerClinicalPersistenceAdapter = contract stub → SERVER_REQUIRED.
 *
 * Server adapter must NEVER wrap localStorage and pretend to be a server.
 *
 * K57: HealthRecord version ledger stores immutable snapshots of the SAME
 * HealthRecord resource — not a parallel Health SSOT.
 * K58: ClinicalEncounter store + separate immutable encounter version ledger.
 * K59: PetDocument store + separate immutable document version ledger
 *      (PetDocument remains Document SSOT — not ClinicalDocument).
 */

import type {
  ClinicalEncounter,
  HealthRecord,
  PetDocument,
  WeightMeasurement,
} from '../../types'
import { isProductionBackendConfigured } from '../backend/config'
import {
  ClinicalError,
  immutableVersion,
  serverRequired,
} from './errors'
import type {
  ClinicalAuthority,
  ClinicalEncounterVersionSnapshot,
  HealthRecordVersionSnapshot,
  PetDocumentVersionSnapshot,
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

  /** K59 — append-only immutable PetDocument version snapshot. */
  appendDocumentVersion(snapshot: PetDocumentVersionSnapshot): void
  listDocumentVersions(documentId: string): PetDocumentVersionSnapshot[]
  getDocumentVersion(
    documentId: string,
    version: number,
  ): PetDocumentVersionSnapshot | undefined
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
  getDocumentVersions?: () => PetDocumentVersionSnapshot[]
  setDocumentVersions?: (snapshots: PetDocumentVersionSnapshot[]) => void
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
  private memoryDocumentVersions: PetDocumentVersionSnapshot[] = []

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

  private readDocumentVersions(): PetDocumentVersionSnapshot[] {
    if (this.hooks.getDocumentVersions) {
      return this.hooks.getDocumentVersions()
    }
    return this.memoryDocumentVersions
  }

  private writeDocumentVersions(next: PetDocumentVersionSnapshot[]): void {
    if (this.hooks.setDocumentVersions) {
      this.hooks.setDocumentVersions(next)
      return
    }
    this.memoryDocumentVersions = next
  }

  appendDocumentVersion(snapshot: PetDocumentVersionSnapshot): void {
    const existing = this.readDocumentVersions()
    const clash = existing.find(
      (s) =>
        s.documentId === snapshot.documentId && s.version === snapshot.version,
    )
    if (clash) {
      throw immutableVersion(
        `Version ${snapshot.version} already exists for document ${snapshot.documentId}`,
      )
    }
    const frozen: PetDocumentVersionSnapshot = {
      ...snapshot,
      document: { ...snapshot.document },
    }
    this.writeDocumentVersions([...existing, frozen])
  }

  listDocumentVersions(documentId: string): PetDocumentVersionSnapshot[] {
    return this.readDocumentVersions()
      .filter((s) => s.documentId === documentId)
      .slice()
      .sort((a, b) => a.version - b.version)
      .map((s) => ({ ...s, document: { ...s.document } }))
  }

  getDocumentVersion(
    documentId: string,
    version: number,
  ): PetDocumentVersionSnapshot | undefined {
    const found = this.readDocumentVersions().find(
      (s) => s.documentId === documentId && s.version === version,
    )
    if (!found) return undefined
    return { ...found, document: { ...found.document } }
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
    documentVersions?: PetDocumentVersionSnapshot[]
  },
): DemoClinicalPersistenceAdapter {
  let healthRecords = [...(seed?.healthRecords ?? [])]
  let documents = [...(seed?.documents ?? [])]
  let weights = [...(seed?.weights ?? [])]
  let versions = [...(seed?.versions ?? [])]
  let encounters = [...(seed?.encounters ?? [])]
  let encounterVersions = [...(seed?.encounterVersions ?? [])]
  let documentVersions = [...(seed?.documentVersions ?? [])]
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
    getDocumentVersions: () => documentVersions,
    setDocumentVersions: (next) => {
      documentVersions = next
    },
  })
}

export type ServerClinicalPersistenceOptions = {
  /**
   * Force wired memory backend (tests / local without env).
   * Production: also true when `isProductionBackendConfigured()`.
   */
  forceWired?: boolean
}

/**
 * Production clinical persistence.
 * - Unwired (default without API env): every call → SERVER_REQUIRED (honest).
 * - Wired: in-memory SSOT mirror for ClinicalService; Edge `clinical` is network authority.
 * Never wraps localStorage and pretends to be a server.
 */
export class ServerClinicalPersistenceAdapter implements ClinicalPersistenceAdapter {
  readonly authority: ClinicalAuthority = 'server'
  readonly wired: boolean

  private healthRecords: HealthRecord[] = []
  private documents: PetDocument[] = []
  private weights: WeightMeasurement[] = []
  private healthVersions: HealthRecordVersionSnapshot[] = []
  private encounters: ClinicalEncounter[] = []
  private encounterVersions: ClinicalEncounterVersionSnapshot[] = []
  private documentVersions: PetDocumentVersionSnapshot[] = []

  constructor(options: ServerClinicalPersistenceOptions = {}) {
    this.wired = Boolean(options.forceWired || isProductionBackendConfigured())
  }

  private fail(): never {
    throw serverRequired('Clinical persistence')
  }

  private ensureWired(): void {
    if (!this.wired) this.fail()
  }

  getHealthRecords(): HealthRecord[] {
    this.ensureWired()
    return this.healthRecords
  }

  setHealthRecords(records: HealthRecord[]): void {
    this.ensureWired()
    this.healthRecords = records
  }

  findHealthRecord(recordId: string): HealthRecord | undefined {
    this.ensureWired()
    return this.healthRecords.find((r) => r.id === recordId)
  }

  getDocuments(): PetDocument[] {
    this.ensureWired()
    return this.documents
  }

  setDocuments(documents: PetDocument[]): void {
    this.ensureWired()
    this.documents = documents
  }

  findDocument(documentId: string): PetDocument | undefined {
    this.ensureWired()
    return this.documents.find((d) => d.id === documentId)
  }

  getWeightMeasurements(): WeightMeasurement[] {
    this.ensureWired()
    return this.weights
  }

  persistWeightMeasurement(entry: WeightMeasurement): void {
    this.ensureWired()
    const idx = this.weights.findIndex((w) => w.id === entry.id)
    if (idx >= 0) this.weights[idx] = entry
    else this.weights.push(entry)
  }

  appendHealthRecordVersion(snapshot: HealthRecordVersionSnapshot): void {
    this.ensureWired()
    const clash = this.healthVersions.find(
      (s) => s.recordId === snapshot.recordId && s.version === snapshot.version,
    )
    if (clash) {
      throw immutableVersion(
        `Version ${snapshot.version} already exists for record ${snapshot.recordId}`,
      )
    }
    this.healthVersions.push({ ...snapshot, record: { ...snapshot.record } })
  }

  listHealthRecordVersions(recordId: string): HealthRecordVersionSnapshot[] {
    this.ensureWired()
    return this.healthVersions
      .filter((s) => s.recordId === recordId)
      .slice()
      .sort((a, b) => a.version - b.version)
  }

  getHealthRecordVersion(
    recordId: string,
    version: number,
  ): HealthRecordVersionSnapshot | undefined {
    this.ensureWired()
    return this.healthVersions.find(
      (s) => s.recordId === recordId && s.version === version,
    )
  }

  getEncounters(): ClinicalEncounter[] {
    this.ensureWired()
    return this.encounters
  }

  setEncounters(encounters: ClinicalEncounter[]): void {
    this.ensureWired()
    this.encounters = encounters
  }

  findEncounter(encounterId: string): ClinicalEncounter | undefined {
    this.ensureWired()
    return this.encounters.find((e) => e.id === encounterId)
  }

  appendEncounterVersion(snapshot: ClinicalEncounterVersionSnapshot): void {
    this.ensureWired()
    const clash = this.encounterVersions.find(
      (s) => s.encounterId === snapshot.encounterId && s.version === snapshot.version,
    )
    if (clash) {
      throw immutableVersion(
        `Version ${snapshot.version} already exists for encounter ${snapshot.encounterId}`,
      )
    }
    this.encounterVersions.push({
      ...snapshot,
      encounter: { ...snapshot.encounter },
    })
  }

  listEncounterVersions(encounterId: string): ClinicalEncounterVersionSnapshot[] {
    this.ensureWired()
    return this.encounterVersions
      .filter((s) => s.encounterId === encounterId)
      .slice()
      .sort((a, b) => a.version - b.version)
  }

  getEncounterVersion(
    encounterId: string,
    version: number,
  ): ClinicalEncounterVersionSnapshot | undefined {
    this.ensureWired()
    return this.encounterVersions.find(
      (s) => s.encounterId === encounterId && s.version === version,
    )
  }

  appendDocumentVersion(snapshot: PetDocumentVersionSnapshot): void {
    this.ensureWired()
    const clash = this.documentVersions.find(
      (s) => s.documentId === snapshot.documentId && s.version === snapshot.version,
    )
    if (clash) {
      throw immutableVersion(
        `Version ${snapshot.version} already exists for document ${snapshot.documentId}`,
      )
    }
    this.documentVersions.push({
      ...snapshot,
      document: { ...snapshot.document },
    })
  }

  listDocumentVersions(documentId: string): PetDocumentVersionSnapshot[] {
    this.ensureWired()
    return this.documentVersions
      .filter((s) => s.documentId === documentId)
      .slice()
      .sort((a, b) => a.version - b.version)
  }

  getDocumentVersion(
    documentId: string,
    version: number,
  ): PetDocumentVersionSnapshot | undefined {
    this.ensureWired()
    return this.documentVersions.find(
      (s) => s.documentId === documentId && s.version === version,
    )
  }
}

/** Unwired stub — still SERVER_REQUIRED (default without credentials). */
export function createServerClinicalPersistenceStub(): ServerClinicalPersistenceAdapter {
  return new ServerClinicalPersistenceAdapter({ forceWired: false })
}

/** Wired server adapter for tests / configured production client mirror. */
export function createWiredServerClinicalPersistenceAdapter(): ServerClinicalPersistenceAdapter {
  return new ServerClinicalPersistenceAdapter({ forceWired: true })
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
