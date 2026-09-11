import type { Organization, OrganizationMembership, OrganizationRole } from '../organization/types'
import { ORGANIZATION_ROLE_LABELS } from '../organization/permissions'
import type { NotificationDraft } from './model'

export type OrganizationMembershipNotificationEvent =
  | 'invited'
  | 'accepted'
  | 'role_changed'
  | 'removed'

export type OrganizationMembershipNotificationContext = {
  membership: OrganizationMembership
  organization: Organization
  event: OrganizationMembershipNotificationEvent
  /** Recipient override (defaults: invitee for invited/role/removed; inviter for accepted). */
  recipientAccountId?: string | null
  roleLabel?: string | null
}

const FORBIDDEN_PAYLOAD_PATTERNS = [
  /microchip/i,
  /ownerContacts?/i,
  /ownerPhone/i,
  /ownerEmail/i,
  /medication/i,
  /vaccination/i,
  /healthRecord/i,
  /documentContent/i,
  /password/i,
  /stripe/i,
]

const SAFE_ORG_FALLBACK = 'organizace'

function safeDisplayName(value: string | null | undefined, fallback: string): string {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (!trimmed) return fallback
  if (FORBIDDEN_PAYLOAD_PATTERNS.some((re) => re.test(trimmed))) return fallback
  return trimmed
}

function roleLabelFor(role: OrganizationRole, override?: string | null): string {
  if (override && override.trim()) {
    return safeDisplayName(override, ORGANIZATION_ROLE_LABELS[role])
  }
  return ORGANIZATION_ROLE_LABELS[role]
}

export function organizationMembershipDedupeKey(
  event: OrganizationMembershipNotificationEvent,
  membershipId: string,
): string {
  return `org-membership:${event}:${membershipId}`
}

/**
 * Privacy-safe draft for organization membership lifecycle.
 * Never embeds health/docs/microchip/owner PII/payment credentials.
 */
export function buildOrganizationMembershipNotification(
  ctx: OrganizationMembershipNotificationContext,
): NotificationDraft | null {
  const { membership, organization, event } = ctx
  const orgName = safeDisplayName(organization.displayName, SAFE_ORG_FALLBACK)
  const roleLabel = roleLabelFor(membership.role, ctx.roleLabel)

  let type: NotificationDraft['type']
  let title: string
  let message: string
  let recipientAccountId: string | undefined

  switch (event) {
    case 'invited': {
      type = 'organization_membership_invited'
      title = 'Pozvánka do organizace'
      message = `Byli jste pozváni do organizace ${orgName} jako ${roleLabel}.`
      recipientAccountId = membership.accountId
      break
    }
    case 'accepted': {
      type = 'organization_membership_accepted'
      title = 'Pozvánka přijata'
      message = `Pozvánka do organizace ${orgName} byla přijata.`
      recipientAccountId =
        ctx.recipientAccountId?.trim() || membership.invitedByAccountId || undefined
      break
    }
    case 'role_changed': {
      type = 'organization_membership_role_changed'
      title = 'Změna role v organizaci'
      message = `Vaše role v organizaci ${orgName} byla změněna na ${roleLabel}.`
      recipientAccountId = membership.accountId
      break
    }
    case 'removed': {
      type = 'organization_membership_removed'
      title = 'Členství ukončeno'
      message = `Vaše členství v organizaci ${orgName} bylo ukončeno.`
      recipientAccountId = membership.accountId
      break
    }
    default:
      return null
  }

  if (ctx.recipientAccountId?.trim()) {
    recipientAccountId = ctx.recipientAccountId.trim()
  }
  if (!recipientAccountId) return null

  return {
    type,
    title,
    message,
    priority: 'normal',
    dedupeKey: organizationMembershipDedupeKey(event, membership.id),
    sourceEventId: organizationMembershipDedupeKey(event, membership.id),
    href: '/organization-invitations',
    recipientAccountId,
    relatedAccessId: membership.id,
    unread: true,
  }
}

export function emitOrganizationMembershipNotification(
  upsert: (draft: NotificationDraft) => void,
  ctx: OrganizationMembershipNotificationContext,
): NotificationDraft | null {
  const draft = buildOrganizationMembershipNotification(ctx)
  if (!draft) return null
  upsert(draft)
  return draft
}

export function isSafeOrganizationMembershipNotificationPayload(
  draft: Pick<NotificationDraft, 'title' | 'message'> & Record<string, unknown>,
): boolean {
  const blobs = [draft.title, draft.message, JSON.stringify(draft)]
  for (const blob of blobs) {
    if (FORBIDDEN_PAYLOAD_PATTERNS.some((re) => re.test(blob))) return false
  }
  const forbiddenKeys = [
    'microchip',
    'ownerContacts',
    'ownerPhone',
    'ownerEmail',
    'healthRecords',
    'medications',
    'documents',
    'stripe',
    'paymentCredentials',
  ]
  for (const key of forbiddenKeys) {
    if (Object.prototype.hasOwnProperty.call(draft, key) && draft[key] != null) {
      return false
    }
  }
  return true
}
