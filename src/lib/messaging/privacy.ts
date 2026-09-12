/**
 * Messaging payload privacy gates.
 * Blocks freeform clinical / PII dumps in message JSON.
 * K61 clinical_share attachments use a dedicated allowlist (not freeform).
 */

import type { ClinicalShareAttachment } from '../../types'

const FORBIDDEN_PATTERNS = [
  /microchip/i,
  /ownerContacts?/i,
  /ownerPhone/i,
  /ownerEmail/i,
  /medication/i,
  /vaccination/i,
  /healthRecord/i,
  /documentContent/i,
  /internalNote/i,
  /clinicInternal/i,
  /verificationStatus/i,
  /licenseNumber/i,
  /password/i,
  /storageKey/i,
]

/** True when payload JSON does not contain forbidden private fields. */
export function isSafeMessagingPayload(payload: unknown): boolean {
  if (payload == null) return true
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload)
  return !FORBIDDEN_PATTERNS.some((re) => re.test(text))
}

const SHARE_ATTACHMENT_KEYS = new Set([
  'kind',
  'shareType',
  'sourceId',
  'petId',
  'title',
  'subtitle',
  'occurredOn',
  'displayKind',
])

const SHARE_TYPES = new Set([
  'health_record',
  'measurement',
  'document',
  'encounter',
])

const DISPLAY_KINDS = new Set([
  'vax',
  'med',
  'visit',
  'labs',
  'weight',
  'doc',
  'encounter',
])

/** Hard reject if display strings look like storage / credential injection. */
const ATTACHMENT_VALUE_FORBIDDEN = [
  /storageKey/i,
  /indexeddb/i,
  /^https?:\/\//i,
  /^blob:/i,
  /^data:/i,
  /microchip/i,
  /ownerContacts?/i,
  /ownerPhone/i,
  /ownerEmail/i,
  /password/i,
  /bearer\s+/i,
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isClinicalShareAttachment(
  value: unknown,
): value is ClinicalShareAttachment {
  if (!isRecord(value)) return false
  return value.kind === 'clinical_share'
}

/**
 * Allowlist validator for K61 clinical_share attachments.
 * Permits safe display titles; rejects storage keys, raw URLs, and unknown keys.
 */
export function assertClinicalShareAttachmentSafe(
  attachment: unknown,
  label = 'clinical_share',
): asserts attachment is ClinicalShareAttachment {
  if (!isRecord(attachment)) {
    throw new Error(`${label}: attachment must be an object`)
  }
  for (const key of Object.keys(attachment)) {
    if (!SHARE_ATTACHMENT_KEYS.has(key)) {
      throw new Error(`${label}: forbidden key ${key}`)
    }
  }
  if (attachment.kind !== 'clinical_share') {
    throw new Error(`${label}: kind must be clinical_share`)
  }
  if (typeof attachment.shareType !== 'string' || !SHARE_TYPES.has(attachment.shareType)) {
    throw new Error(`${label}: invalid shareType`)
  }
  if (typeof attachment.sourceId !== 'string' || !attachment.sourceId.trim()) {
    throw new Error(`${label}: sourceId required`)
  }
  if (typeof attachment.petId !== 'string' || !attachment.petId.trim()) {
    throw new Error(`${label}: petId required`)
  }
  if (typeof attachment.title !== 'string' || !attachment.title.trim()) {
    throw new Error(`${label}: title required`)
  }
  if (attachment.subtitle !== undefined && typeof attachment.subtitle !== 'string') {
    throw new Error(`${label}: subtitle must be string`)
  }
  if (attachment.occurredOn !== undefined && typeof attachment.occurredOn !== 'string') {
    throw new Error(`${label}: occurredOn must be string`)
  }
  if (
    attachment.displayKind !== undefined &&
    (typeof attachment.displayKind !== 'string' ||
      !DISPLAY_KINDS.has(attachment.displayKind))
  ) {
    throw new Error(`${label}: invalid displayKind`)
  }

  for (const key of ['title', 'subtitle', 'occurredOn', 'sourceId', 'petId'] as const) {
    const v = attachment[key]
    if (typeof v !== 'string') continue
    if (ATTACHMENT_VALUE_FORBIDDEN.some((re) => re.test(v))) {
      throw new Error(`${label}: unsafe value in ${key}`)
    }
  }
}

export function assertMessagingPayloadSafe(payload: unknown, label = 'messaging'): void {
  if (payload == null) return

  // Clinical share: validate attachment via allowlist; scrub rest without attachment body.
  if (isRecord(payload) && isClinicalShareAttachment(payload.attachment)) {
    assertClinicalShareAttachmentSafe(payload.attachment, label)
    const { attachment: _att, ...rest } = payload
    if (!isSafeMessagingPayload(rest)) {
      throw new Error(`${label}: payload contains forbidden private fields`)
    }
    return
  }

  if (!isSafeMessagingPayload(payload)) {
    throw new Error(`${label}: payload contains forbidden private fields`)
  }
}
