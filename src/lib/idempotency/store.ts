/**
 * K63 — Idempotency persistence.
 *
 * DEMO: localStorage / in-memory — explicitly NOT production concurrency-safe.
 * Production: unique constraint + atomic claim + transaction (see server stub).
 */

import type { IdempotencyRecord, IdempotencyScope, IdempotencyStore } from './types'

/** DEMO storage key — never pretend this is a distributed idempotency store. */
export const DEMO_IDEMPOTENCY_STORAGE_KEY = 'lovedandknown.demoIdempotency'

export type DemoIdempotencyStoreOptions = {
  storageKey?: string
  storage?: Pick<Storage, 'getItem' | 'setItem'>
}

function readAll(
  storage: Pick<Storage, 'getItem'>,
  key: string,
): Record<string, IdempotencyRecord> {
  try {
    const raw = storage.getItem(key)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as Record<string, IdempotencyRecord>
  } catch {
    return {}
  }
}

/**
 * Build composite storage key.
 * actor A + key X must never resolve actor B + key X.
 */
export function buildIdempotencyStorageKey(
  scope: IdempotencyScope,
  clientKey: string,
): string {
  return [
    scope.actorAccountId.trim(),
    scope.operation.trim(),
    scope.resourceRef.trim(),
    clientKey.trim(),
  ].join('|')
}

/**
 * DEMO idempotency store.
 * authority is always 'demo'. localStorage ≠ production atomic claim.
 */
export class DemoIdempotencyStore implements IdempotencyStore {
  readonly authority = 'demo' as const
  readonly storageKey: string
  private readonly storage: Pick<Storage, 'getItem' | 'setItem'>

  constructor(options?: DemoIdempotencyStoreOptions) {
    this.storageKey = options?.storageKey ?? DEMO_IDEMPOTENCY_STORAGE_KEY
    this.storage =
      options?.storage ??
      (typeof localStorage !== 'undefined'
        ? localStorage
        : {
            getItem: () => null,
            setItem: () => {
              /* no-op without storage */
            },
          })
  }

  get(storageKey: string): IdempotencyRecord | null {
    const all = readAll(this.storage, this.storageKey)
    return all[storageKey] ?? null
  }

  set(record: IdempotencyRecord): void {
    const all = readAll(this.storage, this.storageKey)
    all[record.storageKey] = { ...record, authority: 'demo' }
    this.storage.setItem(this.storageKey, JSON.stringify(all))
  }

  clearForTests(): void {
    this.storage.setItem(this.storageKey, JSON.stringify({}))
  }
}

export function createDemoIdempotencyStore(
  options?: DemoIdempotencyStoreOptions,
): DemoIdempotencyStore {
  return new DemoIdempotencyStore(options)
}
