/**
 * AppNotification drafts for OrganizationPetAccess lifecycle (K44).
 * Extends existing notification system — no parallel notification stack.
 */

import type { Organization, OrganizationPetAccess } from '../organization/types'
import type { NotificationDraft } from './model'

export type OrganizationPetAccessNotificationEvent =
  | 'requested'
  | 'granted'
  | 'revoked'

export type OrganizationPetAccessNotificationContext = {
  access: OrganizationPetAccess
  event: OrganizationPetAccessNotificationEvent
  organization?: Pick<Organization, 'id' | 'displayName'> | null
  petName?: string | null
  /** Required for granted/revoked org-side recipient when not requestedByAccountId. */
  recipientAccountId?: string | null
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

const SAFE_PET_FALLBACK = 'mazlíček'
const SAFE_ORG_FALLBACK = 'organizace'

function safeDisplayName(value: string | null | undefined, fallback: string): string {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (!trimmed) return fallback
  if (FORBIDDEN_PAYLOAD_PATTERNS.some((re) => re.test(trimmed))) return fallback
  return trimmed
}

export function organizationPetAccessDedupeKey(
  event: OrganizationPetAccessNotificationEvent,
  accessId: string,
): string {
  return `org-pet-access:${event}:${accessId}`
}

/**
 * Privacy-safe draft for organization→pet access lifecycle.
 * Never embeds health/docs/microchip/owner PII.
 */
export function buildOrganizationPetAccessNotification(
  ctx: OrganizationPetAccessNotificationContext,
): NotificationDraft | null {
  const { access, event } = ctx
  const petName = safeDisplayName(ctx.petName, SAFE_PET_FALLBACK)
  const orgName = safeDisplayName(ctx.organization?.displayName, SAFE_ORG_FALLBACK)

  let type: NotificationDraft['type']
  let title: string
  let message: string
  let recipientAccountId: string | undefined

  switch (event) {
    case 'requested': {
      type = 'organization_access_requested'
      title = 'Žádost o přístup organizace'
      message = `Organizace ${orgName} žádá o přístup k mazlíčkovi ${petName}.`
      recipientAccountId = access.grantedByAccountId
      break
    }
    case 'granted': {
      type = 'organization_access_granted'
      title = 'Přístup organizace schválen'
      message = `Organizace ${orgName} má schválený přístup k mazlíčkovi ${petName}.`
      recipientAccountId =
        ctx.recipientAccountId?.trim() ||
        access.requestedByAccountId ||
        undefined
      break
    }
    case 'revoked': {
      type = 'organization_access_revoked'
      title = 'Přístup organizace odebrán'
      message = `Přístup organizace ${orgName} k mazlíčkovi ${petName} byl odebrán.`
      recipientAccountId =
        ctx.recipientAccountId?.trim() ||
        access.requestedByAccountId ||
        undefined
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
    dedupeKey: organizationPetAccessDedupeKey(event, access.id),
    sourceEventId: organizationPetAccessDedupeKey(event, access.id),
    href: `/pets/${access.petId}?tab=overview#who-has-access`,
    petId: access.petId,
    petName,
    recipientAccountId,
    relatedAccessId: access.id,
    unread: true,
  }
}

export function emitOrganizationPetAccessNotification(
  upsert: (draft: NotificationDraft) => void,
  ctx: OrganizationPetAccessNotificationContext,
): NotificationDraft | null {
  const draft = buildOrganizationPetAccessNotification(ctx)
  if (!draft) return null
  upsert(draft)
  return draft
}

export function isSafeOrganizationPetAccessNotificationPayload(
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
