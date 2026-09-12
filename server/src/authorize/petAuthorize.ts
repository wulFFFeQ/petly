/**
 * Server authorize — port of Edge _shared/authorize.ts (K47-equivalent).
 * Single server ACL path; do not invent a parallel system.
 */

export type SecurityAction =
  | 'health.read'
  | 'health.write'
  | 'medication.read'
  | 'medication.write'
  | 'documents.read'
  | 'documents.write'
  | 'labs.read'
  | 'labs.write'
  | 'vaccination.read'
  | 'vaccination.write'
  | 'microchip.read'
  | 'ownerContacts.read'
  | 'pet.profile.read'
  | 'pet.profile.write'
  | 'clinical.finalize'
  | 'clinical.sign'
  | 'clinical.withdraw'
  | 'clinical.admin'
  | 'clinical.export'
  | 'clinical.emergency.write'
  | 'booking.read'
  | 'booking.confirm'
  | 'booking.cancel'
  | 'payment.read'
  | 'payment.checkout'
  | 'messaging.read'
  | 'messaging.send'
  | 'public.pet.project'
  | 'organization.ops'
  | 'organization.pet.access'

export type AuthorizationDecision =
  | {
      allowed: true
      reason: string
      path:
        | 'owner'
        | 'household'
        | 'professional'
        | 'organization'
        | 'booking'
        | 'payment'
        | 'messaging'
        | 'public'
      grantId?: string
      permission?: string
    }
  | {
      allowed: false
      code: string
      reason: string
      denyClass: string
    }

export type PetRow = { id: string; owner_account_id: string }

export type HouseholdGrant = {
  id: string
  account_id: string
  permissions: string[]
  status: string
  expires_at: string | null
  revoked_at: string | null
}

export type ProfessionalGrant = {
  id: string
  professional_id: string
  professional_account_id: string
  permissions: string[]
  status: string
  expires_at: string | null
  revoked_at: string | null
}

export type OrgPetGrant = {
  id: string
  organization_id: string
  permissions: string[]
  status: string
  visibility_mode: string
  eligible_roles: string[] | null
  assigned_account_ids: string[] | null
  expires_at: string | null
  revoked_at: string | null
  membership_role: string | null
  membership_status: string | null
  membership_id: string | null
}

export type ConversationRow = {
  id: string
  participant_account_ids: string[] | null
}

function deny(code: string, reason: string, denyClass: string): AuthorizationDecision {
  return { allowed: false, code, reason, denyClass }
}

function grantActive(
  status: string,
  expiresAt: string | null,
  revokedAt: string | null,
  now: number,
): boolean {
  if (status !== 'active') return false
  if (revokedAt) return false
  if (expiresAt && Date.parse(expiresAt) <= now) return false
  return true
}

const HH_MAP: Record<string, string> = {
  'health.read': 'health_read',
  'health.write': 'health_write',
  'medication.read': 'health_read',
  'medication.write': 'health_write',
  'documents.read': 'documents_read',
  'documents.write': 'documents_write',
  'labs.read': 'health_read',
  'labs.write': 'health_write',
  'vaccination.read': 'health_read',
  'vaccination.write': 'health_write',
  'pet.profile.read': 'pet_profile_read',
  'pet.profile.write': 'pet_profile_write',
  'clinical.emergency.write': 'emergency_write',
  'clinical.withdraw': 'health_write',
}

const PRO_MAP: Record<string, string> = {
  'health.read': 'viewHealth',
  'health.write': 'addHealthRecord',
  'medication.read': 'viewMedications',
  'medication.write': 'addHealthRecord',
  'documents.read': 'viewDocuments',
  'documents.write': 'viewDocuments',
  'labs.read': 'viewHealth',
  'labs.write': 'addHealthRecord',
  'vaccination.read': 'viewVaccinations',
  'vaccination.write': 'addVaccination',
  'pet.profile.read': 'viewHealth',
  'clinical.emergency.write': 'emergencyWrite',
}

export function authorizePetAction(input: {
  actorAccountId: string
  action: SecurityAction
  pet: PetRow
  householdGrants: HouseholdGrant[]
  professionalGrants: ProfessionalGrant[]
  orgPetGrants: OrgPetGrant[]
  activeMode?: 'personal' | 'professional' | 'organization'
  now?: number
}): AuthorizationDecision {
  const now = input.now ?? Date.now()
  const { actorAccountId, action, pet } = input

  if (!actorAccountId) {
    return deny('unauthenticated', 'No actor', 'authentication')
  }

  if (
    action === 'clinical.sign' ||
    action === 'clinical.finalize' ||
    action === 'clinical.admin' ||
    action === 'clinical.export'
  ) {
    return deny('server_required', `${action} requires dedicated clinician server flow`, 'capability')
  }

  if (pet.owner_account_id === actorAccountId) {
    if (action === 'clinical.sign') {
      return deny('owner_cannot_sign', 'Owner cannot clinical.sign', 'capability')
    }
    return { allowed: true, reason: 'pet_owner', path: 'owner' }
  }

  if (action === 'microchip.read' || action === 'ownerContacts.read') {
    return deny('owner_only', 'Sensitive field is owner-only', 'capability')
  }

  const mode = input.activeMode ?? 'personal'

  if (mode === 'organization') {
    for (const g of input.orgPetGrants) {
      if (!grantActive(g.status, g.expires_at, g.revoked_at, now)) continue
      if (g.membership_status !== 'active' || !g.membership_role) continue
      const needed = PRO_MAP[action]
      if (!needed || !g.permissions.includes(needed)) {
        return deny('missing_permission', 'Org grant lacks permission', 'permission')
      }
      return {
        allowed: true,
        reason: 'organization_pet_grant',
        path: 'organization',
        grantId: g.id,
        permission: needed,
      }
    }
    return deny('no_org_grant', 'No effective organization pet grant', 'access')
  }

  if (mode === 'professional') {
    for (const g of input.professionalGrants) {
      if (g.professional_account_id !== actorAccountId) continue
      if (!grantActive(g.status, g.expires_at, g.revoked_at, now)) {
        return deny('grant_inactive', 'Professional grant revoked or expired', 'access')
      }
      const needed = PRO_MAP[action]
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
    return deny('no_professional_grant', 'Professional role alone is not access', 'access')
  }

  for (const g of input.householdGrants) {
    if (g.account_id !== actorAccountId) continue
    if (!grantActive(g.status, g.expires_at, g.revoked_at, now)) {
      return deny('grant_inactive', 'Household grant revoked or expired', 'access')
    }
    const needed = HH_MAP[action]
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

export function authorizeMessaging(input: {
  actorAccountId: string
  action: 'messaging.read' | 'messaging.send'
  conversation: ConversationRow | null
}): AuthorizationDecision {
  if (!input.actorAccountId) {
    return deny('unauthenticated', 'No actor', 'authentication')
  }
  const participants = input.conversation?.participant_account_ids
  if (!participants || participants.length < 2) {
    return deny('missing_participants', 'Conversation missing participantAccountIds', 'access')
  }
  if (!participants.includes(input.actorAccountId)) {
    return deny('not_participant', 'Actor is not a conversation participant', 'access')
  }
  return { allowed: true, reason: 'conversation_participant', path: 'messaging' }
}

export function rejectForgedActorClaim(
  trustedActorId: string,
  claimedActorAccountId?: string | null,
): AuthorizationDecision | null {
  if (
    claimedActorAccountId &&
    claimedActorAccountId.trim() &&
    claimedActorAccountId.trim() !== trustedActorId
  ) {
    return deny('forged_actor', 'claimedActorAccountId does not match session', 'authentication')
  }
  return null
}
