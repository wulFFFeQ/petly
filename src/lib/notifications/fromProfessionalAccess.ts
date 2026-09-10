import type { PetProfessionalAccess, ProfessionalProfile } from '../../types/professional'
import type { NotificationDraft } from './model'

export type ProfessionalAccessNotificationEvent =
  | 'requested'
  | 'approved'
  | 'revoked'
  | 'expired'

export type ProfessionalAccessNotificationContext = {
  access: PetProfessionalAccess
  event: ProfessionalAccessNotificationEvent
  petName?: string | null
  professional?: Pick<ProfessionalProfile, 'id' | 'accountId' | 'displayName' | 'type'> | null
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
  /licenseNumber/i,
]

const SAFE_PET_FALLBACK = 'mazlíček'
const SAFE_PRO_FALLBACK = 'Profesionál'

function safeDisplayName(value: string | null | undefined, fallback: string): string {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (!trimmed) return fallback
  if (FORBIDDEN_PAYLOAD_PATTERNS.some((re) => re.test(trimmed))) return fallback
  return trimmed
}

export function professionalAccessDedupeKey(
  event: ProfessionalAccessNotificationEvent,
  accessId: string,
): string {
  return `pro-access:${event}:${accessId}`
}

/**
 * Privacy-safe draft for a professional-access lifecycle event.
 * Returns null when recipient cannot be resolved.
 */
export function buildProfessionalAccessNotification(
  ctx: ProfessionalAccessNotificationContext,
): NotificationDraft | null {
  const { access, event, professional } = ctx
  const petName = safeDisplayName(ctx.petName, SAFE_PET_FALLBACK)
  const proName = safeDisplayName(professional?.displayName, SAFE_PRO_FALLBACK)
  const roleLabel = safeDisplayName(ctx.roleLabel, '')

  let recipientAccountId: string | undefined
  let type: NotificationDraft['type']
  let title: string
  let message: string
  let href: string

  switch (event) {
    case 'requested': {
      recipientAccountId = access.grantedByAccountId
      type = 'professional_access_requested'
      title = 'Nová žádost o propojení'
      message = roleLabel
        ? `${proName} (${roleLabel}) žádá o propojení s mazlíčkem ${petName}.`
        : `${proName} žádá o propojení s mazlíčkem ${petName}.`
      href = `/pets/${access.petId}?tab=overview#who-has-access`
      break
    }
    case 'approved': {
      recipientAccountId = professional?.accountId
      type = 'professional_access_approved'
      title = 'Přístup schválen'
      message = roleLabel
        ? `Přístup k mazlíčkovi ${petName} byl schválen (${roleLabel}).`
        : `Přístup k mazlíčkovi ${petName} byl schválen.`
      href = `/professionals/${access.professionalId}/pets/${access.petId}`
      break
    }
    case 'revoked': {
      recipientAccountId = professional?.accountId
      type = 'professional_access_revoked'
      title = 'Přístup odebrán'
      message = `Přístup k mazlíčkovi ${petName} byl odebrán.`
      href = `/professionals/${access.professionalId}`
      break
    }
    case 'expired': {
      recipientAccountId = professional?.accountId
      type = 'professional_access_expired'
      title = 'Přístup vypršel'
      message = `Přístup k mazlíčkovi ${petName} vypršel.`
      href = `/professionals/${access.professionalId}`
      break
    }
    default:
      return null
  }

  if (!recipientAccountId) return null

  return {
    type,
    title,
    message,
    priority: event === 'requested' ? 'important' : 'normal',
    dedupeKey: professionalAccessDedupeKey(event, access.id),
    sourceEventId: professionalAccessDedupeKey(event, access.id),
    petId: access.petId,
    petName,
    href,
    recipientAccountId,
    relatedProfessionalId: access.professionalId,
    relatedAccessId: access.id,
    unread: true,
  }
}

/** Emit helper for UI — no-op when draft cannot be built. */
export function emitProfessionalAccessNotification(
  upsert: (draft: NotificationDraft) => void,
  ctx: ProfessionalAccessNotificationContext,
): NotificationDraft | null {
  const draft = buildProfessionalAccessNotification(ctx)
  if (!draft) return null
  upsert(draft)
  return draft
}

/**
 * Returns true when title/message look privacy-safe (no sensitive tokens).
 * Used by assert scripts — does not throw.
 */
export function isSafeProfessionalAccessNotificationPayload(
  draft: Pick<NotificationDraft, 'title' | 'message' | 'petName'> & Record<string, unknown>,
): boolean {
  const blobs = [draft.title, draft.message, draft.petName ?? '', JSON.stringify(draft)]
  for (const blob of blobs) {
    if (FORBIDDEN_PAYLOAD_PATTERNS.some((re) => re.test(blob))) return false
  }
  // Never embed clinical / contact structured keys in the draft itself.
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
  return true
}
