/**
 * Messaging authorization — participant-based only.
 * Organization membership does not open all organization conversations.
 * Legacy threads without participants → DENY (server deny-by-default).
 */

import type { Conversation } from '../../../types'
import type { AuthorizationDecision, SecurityAction, SecurityContext } from '../types'
import { actorAccountId } from '../context'

export function authorizeMessaging(
  ctx: SecurityContext,
  conversation: Conversation,
  action: SecurityAction,
): AuthorizationDecision {
  if (
    action.startsWith('health.') ||
    action === 'microchip.read' ||
    action === 'ownerContacts.read'
  ) {
    return {
      allowed: false,
      code: 'unauthorized',
      reason: 'Messaging access does not grant health or sensitive pet data',
      denyClass: 'isolation',
    }
  }

  const accountId = actorAccountId(ctx)
  if (!accountId) {
    return {
      allowed: false,
      code: 'unauthenticated',
      reason: 'Authentication required for messaging',
      denyClass: 'unauthenticated',
    }
  }

  if (action !== 'messaging.read' && action !== 'messaging.send') {
    return {
      allowed: false,
      code: 'unauthorized',
      reason: `Unknown messaging action: ${action}`,
      denyClass: 'unknown_action',
    }
  }

  const participants = conversation.participantAccountIds
  if (!participants?.length) {
    // K46: legacy open threads are a DEMO hole — central authorize closes them.
    return {
      allowed: false,
      code: 'unauthorized',
      reason: 'Conversation has no participant ACL (deny-by-default)',
      denyClass: 'deny_by_default',
    }
  }

  if (!participants.includes(accountId)) {
    return {
      allowed: false,
      code: 'unauthorized',
      reason: 'Actor is not a conversation participant',
      denyClass: 'forbidden',
    }
  }

  return { allowed: true, reason: 'messaging', path: 'messaging' }
}
