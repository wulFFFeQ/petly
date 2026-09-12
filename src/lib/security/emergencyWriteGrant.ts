/**
 * K62 — clinical.emergency.write on Pro/Org grants must be time-bounded.
 * Owner path does not use this helper (ownership management).
 * Never creates a parallel EmergencyAccess system.
 */

import type { ProfessionalPermission } from '../professional/types'
import type { AuthorizationDecision } from './types'

/** True when permissions include emergencyWrite. */
export function hasEmergencyWritePermission(
  permissions: readonly ProfessionalPermission[] | undefined,
): boolean {
  return Boolean(permissions?.includes('emergencyWrite'))
}

/**
 * Non-owner clinical.emergency.write requires expiresAt on the grant.
 * Missing / invalid expiresAt → DENY (not permanent escalate).
 */
export function denyIfEmergencyWriteLacksExpiry(
  action: string,
  expiresAt: string | undefined | null,
  now: number = Date.now(),
): AuthorizationDecision | null {
  if (action !== 'clinical.emergency.write') return null

  const raw = typeof expiresAt === 'string' ? expiresAt.trim() : ''
  if (!raw) {
    return {
      allowed: false,
      code: 'unauthorized',
      reason: 'clinical.emergency.write requires time-bounded grant (expiresAt)',
      denyClass: 'forbidden',
    }
  }

  const exp = Date.parse(raw)
  if (Number.isNaN(exp)) {
    return {
      allowed: false,
      code: 'unauthorized',
      reason: 'clinical.emergency.write grant has invalid expiresAt',
      denyClass: 'forbidden',
    }
  }

  if (exp <= now) {
    return {
      allowed: false,
      code: 'unauthorized',
      reason: 'clinical.emergency.write grant expired',
      denyClass: 'expired',
    }
  }

  return null
}

/**
 * Grant-time integrity: cannot attach emergencyWrite without expiresAt.
 * Throws Error with stable message for callers / asserts.
 */
export function assertEmergencyWriteGrantHasExpiry(
  permissions: readonly ProfessionalPermission[],
  expiresAt: string | undefined | null,
): void {
  if (!hasEmergencyWritePermission(permissions)) return
  const raw = typeof expiresAt === 'string' ? expiresAt.trim() : ''
  if (!raw || Number.isNaN(Date.parse(raw))) {
    throw new Error(
      'emergencyWrite permission requires a valid expiresAt (time-bounded clinical.emergency.write)',
    )
  }
}
