/**
 * Payment authorization — isolated from health / membership / pet access.
 * payment ≠ health, payment ≠ membership, payment ≠ pet access.
 */

import type { Payment } from '../../payments/types'
import { getBooking } from '../../booking/bookings'
import type { AuthorizationDecision, SecurityAction, SecurityContext } from '../types'
import { actorAccountId } from '../context'

export type PaymentAdapterDeps = {
  getBooking?: typeof getBooking
}

export function authorizePayment(
  ctx: SecurityContext,
  payment: Payment,
  action: SecurityAction,
  deps: PaymentAdapterDeps = {},
): AuthorizationDecision {
  if (
    action.startsWith('health.') ||
    action.startsWith('medication.') ||
    action.startsWith('vaccination.') ||
    action.startsWith('labs.') ||
    action.startsWith('documents.') ||
    action === 'microchip.read' ||
    action === 'ownerContacts.read' ||
    action.startsWith('pet.')
  ) {
    return {
      allowed: false,
      code: 'unauthorized',
      reason: 'Payment access does not grant health or pet data',
      denyClass: 'isolation',
    }
  }

  const accountId = actorAccountId(ctx)
  if (!accountId) {
    return {
      allowed: false,
      code: 'unauthenticated',
      reason: 'Authentication required for payment',
      denyClass: 'unauthenticated',
    }
  }

  const isOwner = payment.ownerAccountId === accountId

  switch (action) {
    case 'payment.read':
      if (isOwner) {
        return { allowed: true, reason: 'payment', path: 'payment' }
      }
      return {
        allowed: false,
        code: 'unauthorized',
        reason: 'Only payment owner may read payment',
        denyClass: 'forbidden',
      }
    case 'payment.checkout': {
      if (!isOwner) {
        return {
          allowed: false,
          code: 'unauthorized',
          reason: 'Only payment owner may initiate checkout',
          denyClass: 'forbidden',
        }
      }
      const get = deps.getBooking ?? getBooking
      const booking = get(payment.bookingId)
      if (!booking || booking.ownerAccountId !== accountId) {
        return {
          allowed: false,
          code: 'unauthorized',
          reason: 'Checkout requires matching booking ownership',
          denyClass: 'forbidden',
        }
      }
      return { allowed: true, reason: 'payment', path: 'payment' }
    }
    default:
      return {
        allowed: false,
        code: 'unauthorized',
        reason: `Unknown payment action: ${action}`,
        denyClass: 'unknown_action',
      }
  }
}
