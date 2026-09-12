/**
 * Retention policy extension point — K48 prepares contract only.
 * No deletion / purge implementation.
 */

import type { AuditRetentionPolicy } from './types'

/**
 * Plan future retention — returns policy unchanged.
 * Server governance will decide actual retainDays / legalHold later.
 */
export function planRetention(policy: AuditRetentionPolicy): AuditRetentionPolicy {
  return { ...policy }
}

/** Default undecided retention for authorization decisions. */
export const DEFAULT_AUTHORIZATION_RETENTION: AuditRetentionPolicy = {
  stream: 'authorization_decision',
}
