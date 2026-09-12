/**
 * K63 — Unified idempotency boundary for sensitive mutations.
 *
 * DEMO persistence (localStorage) ≠ production distributed idempotency.
 * Authorization must happen BEFORE executeIdempotent.
 */

export type {
  IdempotencyAuthority,
  IdempotencyKeyParts,
  IdempotencyRecord,
  IdempotencyRecordState,
  IdempotencyScope,
  IdempotencyStore,
} from './types'

export {
  buildRequestFingerprint,
  hashFingerprintMaterial,
  stableSerialize,
} from './fingerprint'

export {
  IdempotencyError,
  idempotencyConflict,
  idempotencyInProgress,
  idempotencyServerRequired,
  isIdempotencyError,
  type IdempotencyErrorCode,
} from './errors'

export {
  DEMO_IDEMPOTENCY_STORAGE_KEY,
  DemoIdempotencyStore,
  buildIdempotencyStorageKey,
  createDemoIdempotencyStore,
  type DemoIdempotencyStoreOptions,
} from './store'

export {
  ServerIdempotencyStoreStub,
  createServerIdempotencyStoreStub,
} from './server'

export {
  executeIdempotent,
  type ExecuteIdempotentInput,
  type ExecuteIdempotentOutcome,
} from './execute'
