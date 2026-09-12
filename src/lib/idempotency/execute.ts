/**
 * K63 — executeIdempotent boundary.
 *
 * MUST be called only AFTER authorization.
 * Idempotency never grants access and never returns another actor's result.
 */

import {
  idempotencyConflict,
  idempotencyInProgress,
  IdempotencyError,
  isIdempotencyError,
} from './errors'
import { buildRequestFingerprint } from './fingerprint'
import { buildIdempotencyStorageKey } from './store'
import type { IdempotencyRecord, IdempotencyScope, IdempotencyStore } from './types'

export type ExecuteIdempotentInput<T> = {
  store: IdempotencyStore
  scope: IdempotencyScope
  /** When absent/blank — passthrough (no store engagement). */
  clientKey?: string
  /** Payload included in fingerprint (operation/resource already in scope). */
  fingerprintPayload: unknown
  run: () => T
}

export type ExecuteIdempotentOutcome<T> = {
  value: T
  replayed: boolean
}

function nowIso(): string {
  return new Date().toISOString()
}

function assertValidClientKey(clientKey: string): void {
  const trimmed = clientKey.trim()
  if (!trimmed || trimmed.length > 256) {
    throw new IdempotencyError('INVALID_KEY', 'Invalid idempotency key')
  }
}

/**
 * Claim → run → complete, or replay / conflict / in-progress / retry-after-failure.
 *
 * Without clientKey: runs mutation once (no persistence).
 * With clientKey: DEMO store provides best-effort single-flight within DEMO limits.
 */
export function executeIdempotent<T>(
  input: ExecuteIdempotentInput<T>,
): ExecuteIdempotentOutcome<T> {
  const clientKey = input.clientKey?.trim()
  if (!clientKey) {
    return { value: input.run(), replayed: false }
  }

  assertValidClientKey(clientKey)

  const fingerprint = buildRequestFingerprint({
    operation: input.scope.operation,
    resourceRef: input.scope.resourceRef,
    payload: input.fingerprintPayload,
  })

  const storageKey = buildIdempotencyStorageKey(input.scope, clientKey)
  const existing = input.store.get(storageKey)

  if (existing) {
    if (existing.fingerprint !== fingerprint) {
      throw idempotencyConflict()
    }
    if (existing.state === 'completed') {
      return { value: existing.result as T, replayed: true }
    }
    if (existing.state === 'pending') {
      // DEMO single-threaded: nested/concurrent claim with same fingerprint.
      throw idempotencyInProgress()
    }
    // failed + same fingerprint → safe retry (fall through and re-claim)
  }

  const stamp = nowIso()
  const pending: IdempotencyRecord = {
    storageKey,
    scope: { ...input.scope },
    clientKey,
    fingerprint,
    state: 'pending',
    createdAt: existing?.createdAt ?? stamp,
    updatedAt: stamp,
    authority: input.store.authority,
  }
  input.store.set(pending)

  try {
    const value = input.run()
    const completed: IdempotencyRecord<T> = {
      ...pending,
      state: 'completed',
      result: value,
      updatedAt: nowIso(),
      errorCode: undefined,
    }
    input.store.set(completed)
    return { value, replayed: false }
  } catch (err) {
    const failed: IdempotencyRecord = {
      ...pending,
      state: 'failed',
      updatedAt: nowIso(),
      errorCode: isIdempotencyError(err)
        ? err.code
        : err instanceof Error
          ? err.name
          : 'error',
      result: undefined,
    }
    input.store.set(failed)
    throw err
  }
}

export { buildRequestFingerprint, isIdempotencyError }
