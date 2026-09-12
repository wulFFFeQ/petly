/**
 * DEMO audit sink — localStorage append-only simulation.
 *
 * authority: demo on every event.
 * localStorage ≠ production audit authority, ≠ tamper-proof.
 * No editAuditEvent / deleteAuditEvent.
 */

import type { AuditEvent } from './types'
import type { AuditSink } from './sink'

/** Storage key — separate from HH/Pro domain access logs. */
export const DEMO_AUDIT_STORAGE_KEY = 'lovedandknown.securityAuthorizationAudit'

export type DemoAuditSinkOptions = {
  storageKey?: string
  /** Inject storage for tests (defaults to localStorage). */
  storage?: Pick<Storage, 'getItem' | 'setItem'>
}

function readEvents(storage: Pick<Storage, 'getItem'>, key: string): AuditEvent[] {
  try {
    const raw = storage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as AuditEvent[]) : []
  } catch {
    return []
  }
}

/**
 * Append-only DEMO sink. Every recorded event is forced to authority: 'demo'.
 * Not presented as tamper-proof or production-grade.
 */
export class DemoAuditSink implements AuditSink {
  readonly storageKey: string
  private readonly storage: Pick<Storage, 'getItem' | 'setItem'>

  constructor(options?: DemoAuditSinkOptions) {
    this.storageKey = options?.storageKey ?? DEMO_AUDIT_STORAGE_KEY
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

  record(event: AuditEvent): void {
    const stamped: AuditEvent = { ...event, authority: 'demo' }
    const existing = readEvents(this.storage, this.storageKey)
    existing.push(stamped)
    this.storage.setItem(this.storageKey, JSON.stringify(existing))
  }

  /** DEMO/test read — not a production API. Prefer queryDemoAuditEvents. */
  listAll(): AuditEvent[] {
    return readEvents(this.storage, this.storageKey)
  }

  /** Clear DEMO store (tests only). Not a production delete API. */
  clearForTests(): void {
    this.storage.setItem(this.storageKey, JSON.stringify([]))
  }
}

export function createDemoAuditSink(options?: DemoAuditSinkOptions): DemoAuditSink {
  return new DemoAuditSink(options)
}
