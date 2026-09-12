/**
 * K63 — Production idempotency store.
 *
 * Unwired (no API / forceWired false): get/set → SERVER_REQUIRED.
 * Wired: atomic in-process map (ClinicalService sync path).
 * Node API owns the Postgres `idempotency_records` table as network authority.
 * Never wraps DEMO localStorage and pretends to be production.
 */

import { isProductionBackendConfigured } from '../backend/config'
import { idempotencyServerRequired } from './errors'
import type { IdempotencyRecord, IdempotencyStore } from './types'

export type ServerIdempotencyStoreOptions = {
  forceWired?: boolean
}

/**
 * Server idempotency stub — every get/set → SERVER_REQUIRED.
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

/**
 * Wired server idempotency store for ClinicalService when adapter is ready.
 */
export class ServerIdempotencyStore implements IdempotencyStore {
  readonly authority = 'server' as const
  readonly wired: boolean
  private readonly map = new Map<string, IdempotencyRecord>()

  constructor(options: ServerIdempotencyStoreOptions = {}) {
    this.wired = Boolean(options.forceWired || isProductionBackendConfigured())
  }

  get(storageKey: string): IdempotencyRecord | null {
    if (!this.wired) throw idempotencyServerRequired('ServerIdempotencyStore.get')
    return this.map.get(storageKey) ?? null
  }

  set(record: IdempotencyRecord): void {
    if (!this.wired) throw idempotencyServerRequired('ServerIdempotencyStore.set')
    this.map.set(record.storageKey, {
      ...record,
      authority: 'server',
      updatedAt: new Date().toISOString(),
    })
  }

  clearForTests(): void {
    this.map.clear()
  }
}

export function createServerIdempotencyStore(
  options: ServerIdempotencyStoreOptions = {},
): ServerIdempotencyStore {
  return new ServerIdempotencyStore(options)
}
