export type MicrochipRegistryStatus =
  | 'found'
  | 'not_found'
  | 'unavailable'
  | 'error'

export type MicrochipVerificationMode = 'live' | 'dev_mock' | 'unconfigured'

export type MicrochipAggregateStatus = 'found' | 'not_found' | 'unavailable'

export interface MicrochipRegistryResult {
  id: string
  label: string
  status: MicrochipRegistryStatus
  /** Safe public note only — never owner PII. */
  note?: string
}

export interface MicrochipVerificationResult {
  chipNumber: string
  checkedAt: string
  mode: MicrochipVerificationMode
  registries: MicrochipRegistryResult[]
  aggregate: MicrochipAggregateStatus
}

/** Persisted on the owner's pet profile after a verification attempt. */
export interface PetMicrochipVerification {
  status: MicrochipAggregateStatus
  verifiedAt: string
  registryLabel?: string
  mode: MicrochipVerificationMode
  chipNumber: string
}

/** Safe local match — never includes owner contact details. */
export interface LovedKnownMicrochipMatch {
  petId: string
  petName: string
}

export interface MicrochipRegistryProvider {
  id: string
  label: string
  verify(chipNumber: string): Promise<MicrochipRegistryResult>
}
