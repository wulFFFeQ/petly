/**
 * DEMO audit query helpers — contract for future org/clinic audit views.
 *
 * Tenant isolation: org-scoped queries REQUIRE organizationId.
 * There is no production getAllAuditEvents() exposed to clients.
 */

import type { AuditEvent, AuditQueryFilter } from './types'
import { DEMO_AUDIT_STORAGE_KEY, type DemoAuditSink } from './demoSink'

export type DemoAuditQueryOptions = {
  /** When true, organizationId is required (tenant-safe org view). */
  requireOrganizationScope?: boolean
}

/**
 * Filter DEMO events in-memory.
 * For organization audit views, pass requireOrganizationScope: true.
 */
export function filterAuditEvents(
  events: AuditEvent[],
  filter: AuditQueryFilter,
  options?: DemoAuditQueryOptions,
): AuditEvent[] {
  if (options?.requireOrganizationScope) {
    if (!filter.organizationId) {
      throw new Error(
        'Organization audit query requires organizationId (tenant isolation contract)',
      )
    }
  }

  return events.filter((e) => {
    if (filter.actorAccountId && e.actorAccountId !== filter.actorAccountId) return false
    if (filter.organizationId && e.organizationId !== filter.organizationId) return false
    if (filter.resourceType && e.resourceType !== filter.resourceType) return false
    if (filter.resourceId && e.resourceId !== filter.resourceId) return false
    if (filter.action && e.action !== filter.action) return false
    if (filter.result && e.result !== filter.result) return false
    if (filter.correlationId && e.correlationId !== filter.correlationId) return false
    if (filter.fromTimestamp && e.timestamp < filter.fromTimestamp) return false
    if (filter.toTimestamp && e.timestamp > filter.toTimestamp) return false
    return true
  })
}

/**
 * Query DEMO sink with optional tenant scope enforcement.
 * Not a production API — DEMO / tests only.
 */
export function queryDemoAuditEvents(
  sink: DemoAuditSink,
  filter: AuditQueryFilter,
  options?: DemoAuditQueryOptions,
): AuditEvent[] {
  return filterAuditEvents(sink.listAll(), filter, options)
}

/**
 * Prove Organization X cannot read Organization Y events via org-scoped query.
 * Contract helper for tests — not a client API.
 */
export function assertOrganizationAuditIsolation(
  events: AuditEvent[],
  organizationId: string,
): AuditEvent[] {
  const scoped = filterAuditEvents(
    events,
    { organizationId },
    { requireOrganizationScope: true },
  )
  for (const e of scoped) {
    if (e.organizationId !== organizationId) {
      throw new Error('Tenant isolation violated: foreign organizationId in result')
    }
  }
  return scoped
}

export { DEMO_AUDIT_STORAGE_KEY }
