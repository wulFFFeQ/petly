/**
 * K62 — AppNotification drafts for clinical.emergency.write grant lifecycle.
 * Never includes clinical payload, health history, medications, documents, microchip, or owner PII.
 */

import type { NotificationDraft } from './model'

export type ClinicalEmergencyAccessGrantedContext = {
  recipientAccountId: string
  petId: string
  grantId: string
  /** Optional deep-link target (professional access page). */
  href?: string
  professionalId?: string
  organizationId?: string
  expiresAt?: string
}

export type ClinicalEmergencyAccessRevokedContext = {
  recipientAccountId: string
  petId: string
  grantId: string
  href?: string
  professionalId?: string
  organizationId?: string
}

const FORBIDDEN = [
  /microchip/i,
  /ownerContacts?/i,
  /medication/i,
  /vaccination/i,
  /healthRecord/i,
  /allerg/i,
  /documentContent/i,
  /storageKey/i,
  /password/i,
]

export function clinicalEmergencyGrantDedupeKey(grantId: string, phase: string): string {
  return `clinical_emergency:${phase}:${grantId}`
}

export function isSafeClinicalEmergencyNotificationPayload(payload: unknown): boolean {
  if (payload == null) return true
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload)
  return !FORBIDDEN.some((re) => re.test(text))
}

/**
 * Privacy-safe: emergency capability granted (event + deep-link only).
 */
export function buildClinicalEmergencyAccessGrantedNotification(
  ctx: ClinicalEmergencyAccessGrantedContext,
): NotificationDraft | null {
  if (!ctx.recipientAccountId || !ctx.petId || !ctx.grantId) return null

  const href =
    ctx.href ??
    (ctx.professionalId
      ? `/professional/access`
      : `/pets/${encodeURIComponent(ctx.petId)}`)

  const draft: NotificationDraft = {
    type: 'clinical_emergency_access_granted',
    title: 'Nouzový přístup',
    message: 'Byl vám udělen časově omezený nouzový zápis (emergency write).',
    priority: 'important',
    dedupeKey: clinicalEmergencyGrantDedupeKey(ctx.grantId, 'granted'),
    sourceEventId: clinicalEmergencyGrantDedupeKey(ctx.grantId, 'granted'),
    href,
    petId: ctx.petId,
    recipientAccountId: ctx.recipientAccountId,
    relatedAccessId: ctx.grantId,
  }
  if (ctx.professionalId) draft.relatedProfessionalId = ctx.professionalId

  if (!isSafeClinicalEmergencyNotificationPayload(draft)) return null
  return draft
}

export function buildClinicalEmergencyAccessRevokedNotification(
  ctx: ClinicalEmergencyAccessRevokedContext,
): NotificationDraft | null {
  if (!ctx.recipientAccountId || !ctx.petId || !ctx.grantId) return null

  const href = ctx.href ?? `/pets/${encodeURIComponent(ctx.petId)}`

  const draft: NotificationDraft = {
    type: 'clinical_emergency_access_revoked',
    title: 'Nouzový přístup ukončen',
    message: 'Časově omezený nouzový zápis byl odebrán nebo vypršel.',
    priority: 'normal',
    dedupeKey: clinicalEmergencyGrantDedupeKey(ctx.grantId, 'revoked'),
    sourceEventId: clinicalEmergencyGrantDedupeKey(ctx.grantId, 'revoked'),
    href,
    petId: ctx.petId,
    recipientAccountId: ctx.recipientAccountId,
    relatedAccessId: ctx.grantId,
  }
  if (ctx.professionalId) draft.relatedProfessionalId = ctx.professionalId

  if (!isSafeClinicalEmergencyNotificationPayload(draft)) return null
  return draft
}

export function emitClinicalEmergencyAccessGrantedNotification(
  upsert: (draft: NotificationDraft) => void,
  ctx: ClinicalEmergencyAccessGrantedContext,
): NotificationDraft | null {
  const draft = buildClinicalEmergencyAccessGrantedNotification(ctx)
  if (!draft) return null
  upsert(draft)
  return draft
}

export function emitClinicalEmergencyAccessRevokedNotification(
  upsert: (draft: NotificationDraft) => void,
  ctx: ClinicalEmergencyAccessRevokedContext,
): NotificationDraft | null {
  const draft = buildClinicalEmergencyAccessRevokedNotification(ctx)
  if (!draft) return null
  upsert(draft)
  return draft
}
