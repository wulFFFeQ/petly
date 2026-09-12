/**
 * Booking authorization — isolated from health.
 * booking access ≠ health access.
 */

import type { Booking } from '../../booking/types'
import { loadProfessionalProfiles } from '../../professional/storage'
import type { AuthorizationDecision, SecurityAction, SecurityContext } from '../types'
import { actorAccountId } from '../context'

export type BookingAdapterDeps = {
  loadProfiles?: typeof loadProfessionalProfiles
}

export function authorizeBooking(
  ctx: SecurityContext,
  booking: Booking,
  action: SecurityAction,
  deps: BookingAdapterDeps = {},
): AuthorizationDecision {
  // Explicit isolation: never treat booking as health.
  if (
    action.startsWith('health.') ||
    action.startsWith('medication.') ||
    action.startsWith('vaccination.') ||
    action.startsWith('labs.') ||
    action.startsWith('documents.') ||
    action === 'microchip.read' ||
    action === 'ownerContacts.read'
  ) {
    return {
      allowed: false,
      code: 'unauthorized',
      reason: 'Booking access does not grant health or sensitive pet data',
      denyClass: 'isolation',
    }
  }

  const accountId = actorAccountId(ctx)
  if (!accountId) {
    return {
      allowed: false,
      code: 'unauthenticated',
      reason: 'Authentication required for booking',
      denyClass: 'unauthenticated',
    }
  }

  const isOwner = booking.ownerAccountId === accountId
  const loadProfiles = deps.loadProfiles ?? loadProfessionalProfiles
  const profile = loadProfiles().find((p) => p.accountId === accountId)
  const isProfessional =
    Boolean(profile) && booking.professionalId === profile!.id

  switch (action) {
    case 'booking.read':
      if (isOwner || isProfessional) {
        return { allowed: true, reason: 'booking', path: 'booking' }
      }
      return {
        allowed: false,
        code: 'unauthorized',
        reason: 'Not booking owner or assigned professional',
        denyClass: 'forbidden',
      }
    case 'booking.confirm':
      if (isProfessional) {
        return { allowed: true, reason: 'booking', path: 'booking' }
      }
      return {
        allowed: false,
        code: 'unauthorized',
        reason: 'Only assigned professional may confirm booking',
        denyClass: 'forbidden',
      }
    case 'booking.cancel':
      if (isOwner || isProfessional) {
        return { allowed: true, reason: 'booking', path: 'booking' }
      }
      return {
        allowed: false,
        code: 'unauthorized',
        reason: 'Not booking owner or assigned professional',
        denyClass: 'forbidden',
      }
    default:
      return {
        allowed: false,
        code: 'unauthorized',
        reason: `Unknown booking action: ${action}`,
        denyClass: 'unknown_action',
      }
  }
}
