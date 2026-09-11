import type { PetHouseholdAccess, HouseholdPetRole } from '../household/types'
import { HOUSEHOLD_ROLE_LABELS } from '../household/permissionLabels'
import type { NotificationDraft } from './model'

export type HouseholdAccessNotificationEvent = 'granted' | 'revoked' | 'role_changed' | 'invited'

export type HouseholdAccessNotificationContext = {
  access: PetHouseholdAccess
  event: HouseholdAccessNotificationEvent
  petName?: string | null
  /** Display name of the grantee account. */
  memberDisplayName?: string | null
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
]

const SAFE_PET_FALLBACK = 'mazlíček'

function safeDisplayName(value: string | null | undefined, fallback: string): string {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (!trimmed) return fallback
  if (FORBIDDEN_PAYLOAD_PATTERNS.some((re) => re.test(trimmed))) return fallback
  return trimmed
}

function roleLabelFor(role: HouseholdPetRole, override?: string | null): string {
  if (override && override.trim()) return safeDisplayName(override, HOUSEHOLD_ROLE_LABELS[role])
  return HOUSEHOLD_ROLE_LABELS[role]
}

export function householdAccessDedupeKey(
  event: HouseholdAccessNotificationEvent,
  accessId: string,
): string {
  return `hh-access:${event}:${accessId}`
}

/**
 * Privacy-safe draft for a household-access lifecycle event.
 * Recipient = grantee account. Never embeds health/docs/microchip/contacts.
 */
export function buildHouseholdAccessNotification(
  ctx: HouseholdAccessNotificationContext,
): NotificationDraft | null {
  const { access, event } = ctx
  const petName = safeDisplayName(ctx.petName, SAFE_PET_FALLBACK)
  const roleLabel = roleLabelFor(access.role, ctx.roleLabel)
  // memberDisplayName reserved for future owner-facing copy; kept on context for callers.
  void ctx.memberDisplayName

  let type: NotificationDraft['type']
  let title: string
  let message: string

  switch (event) {
    case 'granted': {
      type = 'household_access_granted'
      title = 'Přístup do domácnosti'
      message = `Byl vám udělen přístup k mazlíčkovi ${petName} jako ${roleLabel}.`
      break
    }
    case 'revoked': {
      type = 'household_access_revoked'
      title = 'Přístup odebrán'
      message = `Přístup k mazlíčkovi ${petName} byl odebrán.`
      break
    }
    case 'role_changed': {
      type = 'household_role_changed'
      title = 'Změna role v domácnosti'
      message = `Vaše role u mazlíčka ${petName} byla změněna na ${roleLabel}.`
      break
    }
    case 'invited': {
      type = 'household_access_invited'
      title = 'Pozvánka do domácnosti'
      message = `Byli jste pozváni ke sdílení mazlíčka ${petName} jako ${roleLabel}.`
      break
    }
    default:
      return null
  }

  const recipientAccountId = access.accountId
  if (!recipientAccountId) return null

  return {
    type,
    title,
    message,
    priority: 'normal',
    dedupeKey: householdAccessDedupeKey(event, access.id),
    sourceEventId: householdAccessDedupeKey(event, access.id),
    petId: access.petId,
    petName,
    href: `/pets/${access.petId}?tab=overview#who-has-access`,
    recipientAccountId,
    relatedAccessId: access.id,
    unread: true,
  }
}

export function emitHouseholdAccessNotification(
  upsert: (draft: NotificationDraft) => void,
  ctx: HouseholdAccessNotificationContext,
): NotificationDraft | null {
  const draft = buildHouseholdAccessNotification(ctx)
  if (!draft) return null
  upsert(draft)
  return draft
}

export function isSafeHouseholdAccessNotificationPayload(
  draft: Pick<NotificationDraft, 'title' | 'message' | 'petName'> & Record<string, unknown>,
): boolean {
  const blobs = [draft.title, draft.message, draft.petName ?? '', JSON.stringify(draft)]
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
  ]
  for (const key of forbiddenKeys) {
    if (Object.prototype.hasOwnProperty.call(draft, key) && draft[key] != null) {
      return false
    }
  }
  // memberName in message is ok; ensure we didn't stash clinical fields
  void draft
  return true
}
