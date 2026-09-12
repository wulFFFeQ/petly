/**
 * Map K47 AuthorizationDenyClass → AuditReasonCode.
 * Reuses existing vocabulary — no parallel deny system.
 */

import type { AuthorizationDenyClass } from '../types'
import type { AuditReasonCode } from './types'

export function auditReasonFromDenyClass(
  denyClass: AuthorizationDenyClass | undefined,
): AuditReasonCode | undefined {
  if (!denyClass) return undefined
  switch (denyClass) {
    case 'unauthenticated':
      return 'UNAUTHENTICATED'
    case 'forbidden':
    case 'deny_by_default':
      return 'UNAUTHORIZED'
    case 'not_found':
      return 'NOT_FOUND'
    case 'missing_grant':
      return 'NO_ACCESS'
    case 'unknown_permission':
      return 'NO_PERMISSION'
    case 'revoked':
      return 'REVOKED_ACCESS'
    case 'expired':
      return 'EXPIRED_ACCESS'
    case 'cross_organization':
      return 'ORG_SCOPE_MISMATCH'
    case 'forged_identity':
    case 'isolation':
      return 'INVALID_CONTEXT'
    case 'unknown_action':
      return 'UNKNOWN_ACTION'
    default:
      return 'UNAUTHORIZED'
  }
}
