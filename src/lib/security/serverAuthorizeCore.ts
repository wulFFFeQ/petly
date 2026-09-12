/**
 * Port of Edge `_shared/authorize.ts` for Node assert scripts / isomorphic tests.
 * Keep behavior aligned with server/src/authorize/petAuthorize.ts.
 */

export type ServerSecurityAction =
  | 'health.read'
  | 'health.write'
  | 'documents.read'
  | 'documents.write'
  | 'clinical.emergency.write'
  | 'clinical.sign'
  | 'microchip.read'
  | 'ownerContacts.read'
  | 'messaging.read'
  | 'messaging.send'

export type ServerAuthorizationDecision =
  | {
      allowed: true
      reason: string
      path: 'owner' | 'household' | 'professional' | 'organization' | 'messaging'
      grantId?: string
      permission?: string
    }
  | {
      allowed: false
      code: string
      reason: string
      denyClass: string
    }

function deny(code: string, reason: string, denyClass: string): ServerAuthorizationDecision {
  return { allowed: false, code, reason, denyClass }
}

function grantActive(
  status: string,
  expiresAt: string | null | undefined,
  revokedAt: string | null | undefined,
  now: number,
): boolean {
  if (status !== 'active') return false
  if (revokedAt) return false
  if (expiresAt && Date.parse(expiresAt) <= now) return false
  return true
}

export function rejectForgedActorClaim(
  trustedActorId: string,
  claimedActorAccountId?: string | null,
): ServerAuthorizationDecision | null {
  if (
    claimedActorAccountId &&
    claimedActorAccountId.trim() &&
    claimedActorAccountId.trim() !== trustedActorId
  ) {
    return deny('forged_actor', 'claimedActorAccountId does not match session', 'authentication')
  }
  return null
}

export function authorizeMessagingParticipants(input: {
  actorAccountId: string
  participantAccountIds: string[] | null | undefined
}): ServerAuthorizationDecision {
  if (!input.actorAccountId) {
    return deny('unauthenticated', 'No actor', 'authentication')
  }
  const participants = input.participantAccountIds
  if (!participants || participants.length < 2) {
    return deny('missing_participants', 'Conversation missing participantAccountIds', 'access')
  }
  if (!participants.includes(input.actorAccountId)) {
    return deny('not_participant', 'Actor is not a conversation participant', 'access')
  }
  return { allowed: true, reason: 'conversation_participant', path: 'messaging' }
}

export function authorizePetServer(input: {
  actorAccountId: string
  action: ServerSecurityAction
  ownerAccountId: string
  household?: {
    id: string
    accountId: string
    permissions: string[]
    status: string
    expiresAt?: string | null
    revokedAt?: string | null
  } | null
  professional?: {
    id: string
    professionalAccountId: string
    permissions: string[]
    status: string
    expiresAt?: string | null
    revokedAt?: string | null
  } | null
  orgMembershipOnly?: boolean
  now?: number
  activeMode?: 'personal' | 'professional' | 'organization'
}): ServerAuthorizationDecision {
  const now = input.now ?? Date.now()
  if (!input.actorAccountId) {
    return deny('unauthenticated', 'No actor', 'authentication')
  }
  if (input.action === 'clinical.sign') {
    return deny('server_required', 'clinical.sign requires clinician server flow', 'capability')
  }
  if (input.ownerAccountId === input.actorAccountId) {
    return { allowed: true, reason: 'pet_owner', path: 'owner' }
  }
  if (input.action === 'microchip.read' || input.action === 'ownerContacts.read') {
    return deny('owner_only', 'Sensitive field is owner-only', 'capability')
  }
  // Professional role alone without grant
  if (input.activeMode === 'professional' && !input.professional) {
    return deny('no_professional_grant', 'Professional role alone is not access', 'access')
  }
  if (input.orgMembershipOnly) {
    return deny('no_org_grant', 'Organization membership alone is not clinical access', 'access')
  }
  if (input.activeMode === 'professional' && input.professional) {
    const g = input.professional
    if (g.professionalAccountId !== input.actorAccountId) {
      return deny('no_professional_grant', 'Grant is for another professional', 'access')
    }
    if (!grantActive(g.status, g.expiresAt, g.revokedAt, now)) {
      return deny('grant_inactive', 'Professional grant revoked or expired', 'access')
    }
    const needed =
      input.action === 'health.read'
        ? 'viewHealth'
        : input.action === 'health.write'
          ? 'addHealthRecord'
          : input.action === 'documents.read'
            ? 'viewDocuments'
            : input.action === 'documents.write'
              ? 'viewDocuments'
              : input.action === 'clinical.emergency.write'
                ? 'emergencyWrite'
                : null
    if (!needed || !g.permissions.includes(needed)) {
      return deny('missing_permission', 'Professional grant lacks permission', 'permission')
    }
    return {
      allowed: true,
      reason: 'professional_grant',
      path: 'professional',
      grantId: g.id,
      permission: needed,
    }
  }
  if (input.household) {
    const g = input.household
    if (g.accountId !== input.actorAccountId) {
      return deny('forbidden', 'Household grant for another account', 'access')
    }
    if (!grantActive(g.status, g.expiresAt, g.revokedAt, now)) {
      return deny('grant_inactive', 'Household grant revoked or expired', 'access')
    }
    const needed =
      input.action === 'health.read'
        ? 'health_read'
        : input.action === 'health.write'
          ? 'health_write'
          : input.action === 'documents.read'
            ? 'documents_read'
            : input.action === 'documents.write'
              ? 'documents_write'
              : null
    if (!needed || !g.permissions.includes(needed)) {
      return deny('missing_permission', 'Household grant lacks permission', 'permission')
    }
    return {
      allowed: true,
      reason: 'household_grant',
      path: 'household',
      grantId: g.id,
      permission: needed,
    }
  }
  return deny('forbidden', 'No access path for pet resource', 'access')
}

/** Public projection forbidden keys (allowlist enforcement helper). */
export const PUBLIC_FORBIDDEN_KEYS = [
  'microchip',
  'owner_account_id',
  'ownerAccountId',
  'account_id',
  'accountId',
  'storage_key',
  'storageKey',
  'email',
  'phone',
  'address',
  'notes',
  'medications',
  'health_history',
  'audit',
  'permissions',
] as const

export function assertPublicProjectionSafe(obj: unknown): void {
  const raw = JSON.stringify(obj)
  for (const key of PUBLIC_FORBIDDEN_KEYS) {
    if (raw.includes(`"${key}"`)) {
      throw new Error(`Forbidden public key present: ${key}`)
    }
  }
}
