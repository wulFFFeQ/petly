/**
 * K63 — Production idempotency contract stub.
 *
 * Never fakes distributed unique constraints or atomic claims.
 * Callers with authority: 'server' must wire a real server store later.
 */

import { idempotencyServerRequired } from './errors'
import type { IdempotencyRecord, IdempotencyStore } from './types'

/**
 * Server idempotency stub — every get/set → SERVER_REQUIRED.
 * Production needs: unique constraint, atomic claim, fingerprint, actor/operation/resource
 * scope, deterministic replay, conflict detection, transaction boundary, concurrency handling.
 */
export class ServerIdempotencyStoreStub implements IdempotencyStore {
  readonly authority = 'server' as const
  readonly wired = false

  get(_storageKey: string): IdempotencyRecord | null {
    throw idempotencyServerRequired('ServerIdempotencyStore.get')
  }

  set(_record: IdempotencyRecord): void {
    throw idempotencyServerRequired('ServerIdempotencyStore.set')
  }
}

export function createServerIdempotencyStoreStub(): ServerIdempotencyStoreStub {
  return new ServerIdempotencyStoreStub()
}
