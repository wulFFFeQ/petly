/**
 * K63 — Unified idempotency contracts.
 *
 * Idempotency ≠ authorization. Callers must authorize before executeIdempotent.
 * DEMO localStorage persistence ≠ production distributed idempotency.
 */

export type IdempotencyAuthority = 'demo' | 'server'

/** Minimal state model for safe claim / replay / conflict. */
export type IdempotencyRecordState = 'pending' | 'completed' | 'failed'

/**
 * Scope — client cannot replay another actor's result with the same client key.
 * Composite identity: actor + operation + resource + clientKey.
 */
export type IdempotencyScope = {
  /** Trusted actor from SecurityContext — never client-forged. */
  actorAccountId: string
  /** e.g. clinical.createRecord, clinical.createDocument, clinical.share */
  operation: string
  /** e.g. pet:luna, conversation:c1|pet:luna */
  resourceRef: string
}

export type IdempotencyKeyParts = IdempotencyScope & {
  /** Client-supplied key (opaque). Required to engage the store. */
  clientKey: string
}

export type IdempotencyRecord<T = unknown> = {
  storageKey: string
  scope: IdempotencyScope
  clientKey: string
  fingerprint: string
  state: IdempotencyRecordState
  /** Completed outcome — must be JSON-serializable for DEMO persistence. */
  result?: T
  /** Safe failure marker only — never clinical payload. */
  errorCode?: string
  createdAt: string
  updatedAt: string
  /**
   * Explicit DEMO marker on every persisted record.
   * Production must use server-side atomic storage — not this field alone.
   */
  authority: IdempotencyAuthority
}

export type IdempotencyStore = {
  readonly authority: IdempotencyAuthority
  get(storageKey: string): IdempotencyRecord | null
  set(record: IdempotencyRecord): void
  /** Test / DEMO reset only. */
  clearForTests?(): void
}
