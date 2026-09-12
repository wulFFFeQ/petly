/**
 * K61 — Clinical Share workflow.
 *
 * Share = authorize source → validate Messages participant → safe projection → message.
 * NOT an access grant. NOT a permission grant. NOT a new ACL / audit / chat system.
 *
 * HealthRecord / WeightMeasurement / PetDocument / Encounter remain SSOTs.
 * Messages is transport/context only.
 */

import type {
  ClinicalShareAttachment,
  ClinicalShareDisplayKind,
  ClinicalShareType,
  Conversation,
  HealthRecord,
  Message,
  Pet,
} from '../../types'
import {
  canAccessConversation,
  type MessagingErrorCode,
  type MessagingResult,
} from '../messaging/conversations'
import { sendMessage, type SendMessageResult } from '../messaging/messages'
import { assertClinicalShareAttachmentSafe } from '../messaging/privacy'
import { loadInboxConversations } from '../messaging/storage'
import { emitAuthorizationAudit } from '../security/auditHook'
import { actorAccountId, isAuthenticatedAccount } from '../security/context'
import type { AuthorizationDenyClass, SecurityContext } from '../security/types'
import { ClinicalError, isClinicalError, rethrowAsClinical } from './errors'
import type { ClinicalService } from './service'

export type ClinicalShareResult = SendMessageResult & {
  recipientAccountId: string
  attachment: ClinicalShareAttachment
}

export type CreateClinicalShareInput = {
  context: SecurityContext
  /** UNTRUSTED — forgery denied via ClinicalService / assertTrustedActor. */
  claimedActorAccountId?: string
  claimedOrganizationId?: string
  conversationId: string
  petId: string
  shareType: ClinicalShareType
  sourceId: string
  pets?: Pet[]
  clinical: ClinicalService
  /**
   * Client-supplied recipient — IGNORED for authority.
   * Recipient is always derived from conversation.participantAccountIds.
   */
  claimedRecipientAccountId?: string
}

function failShare<T>(
  code: MessagingErrorCode | 'forbidden' | 'not_found' | 'invalid',
  message: string,
): MessagingResult<T> {
  return { ok: false, code: code as MessagingErrorCode, message }
}

function emitShareAudit(
  ctx: SecurityContext,
  input: {
    resourceId: string
    result: 'allow' | 'deny'
    denyClass?: AuthorizationDenyClass
    shareType: ClinicalShareType
    phase: 'recipient' | 'created' | 'source'
  },
): void {
  const accountId = actorAccountId(ctx)
  emitAuthorizationAudit({
    actorAccountId: accountId,
    actorKind: ctx.actor.kind,
    resourceType: 'conversation',
    resourceId: input.resourceId,
    action: 'messaging.send',
    authorizationResult: input.result,
    correlationId: ctx.correlationId,
    channel: ctx.channel,
    authority: ctx.authority,
    denyCode: input.result === 'deny' ? 'unauthorized' : undefined,
    denyClass: input.result === 'deny' ? (input.denyClass ?? 'forbidden') : undefined,
    // Scrub-safe keys only (avoid medication / healthRecord key names).
    metadata: {
      workflow: 'clinical_share',
      shareType: input.shareType,
      phase: input.phase,
    },
  })
}

function displayKindForRecord(type: HealthRecord['type']): ClinicalShareDisplayKind {
  switch (type) {
    case 'vaccination':
      return 'vax'
    case 'medication':
      return 'med'
    case 'examination':
      return 'labs'
    default:
      return 'visit'
  }
}

function encounterLabel(encounterType: string, status: string): string {
  return `Encounter · ${encounterType} · ${status}`
}

function buildAttachment(input: {
  shareType: ClinicalShareType
  sourceId: string
  petId: string
  title: string
  subtitle?: string
  occurredOn?: string
  displayKind?: ClinicalShareDisplayKind
}): ClinicalShareAttachment {
  const attachment: ClinicalShareAttachment = {
    kind: 'clinical_share',
    shareType: input.shareType,
    sourceId: input.sourceId.trim(),
    petId: input.petId.trim(),
    title: input.title.trim().slice(0, 120),
    subtitle: input.subtitle?.trim().slice(0, 160) || undefined,
    occurredOn: input.occurredOn?.trim() || undefined,
    displayKind: input.displayKind,
  }
  assertClinicalShareAttachmentSafe(attachment)
  return attachment
}

function deriveRecipient(
  conversation: Conversation,
  senderAccountId: string,
): string | null {
  const participants = conversation.participantAccountIds
  if (!participants?.length) return null
  const others = participants.filter((id) => id && id !== senderAccountId)
  if (others.length !== 1) return null
  return others[0] ?? null
}

/**
 * Create a clinical share message.
 * Does NOT grant recipient pet access, health.read, documents.read, or write.
 */
export function createClinicalShare(
  input: CreateClinicalShareInput,
): MessagingResult<ClinicalShareResult> {
  void input.claimedRecipientAccountId // never used as authority

  if (!isAuthenticatedAccount(input.context)) {
    emitShareAudit(input.context, {
      resourceId: input.conversationId,
      result: 'deny',
      denyClass: 'unauthenticated',
      shareType: input.shareType,
      phase: 'recipient',
    })
    return failShare('forbidden', 'Authentication required')
  }

  const senderAccountId = actorAccountId(input.context)
  if (!senderAccountId) {
    return failShare('forbidden', 'Authentication required')
  }

  if (
    input.claimedActorAccountId &&
    input.claimedActorAccountId.trim() !== senderAccountId
  ) {
    emitShareAudit(input.context, {
      resourceId: input.conversationId,
      result: 'deny',
      denyClass: 'forged_identity',
      shareType: input.shareType,
      phase: 'source',
    })
    return failShare('forbidden', 'Actor claim rejected')
  }

  if (!input.petId?.trim() || !input.sourceId?.trim() || !input.shareType) {
    return failShare('invalid', 'Invalid share input')
  }

  const list = loadInboxConversations()
  const conversation = list.find((c) => c.id === input.conversationId)
  if (!conversation) {
    emitShareAudit(input.context, {
      resourceId: input.conversationId,
      result: 'deny',
      denyClass: 'not_found',
      shareType: input.shareType,
      phase: 'recipient',
    })
    return failShare('not_found', 'Konverzace nenalezena')
  }

  if (!conversation.participantAccountIds?.length) {
    emitShareAudit(input.context, {
      resourceId: conversation.id,
      result: 'deny',
      shareType: input.shareType,
      phase: 'recipient',
    })
    return failShare('forbidden', 'Konverzace nepodporuje clinical share')
  }

  if (!canAccessConversation(senderAccountId, conversation)) {
    emitShareAudit(input.context, {
      resourceId: conversation.id,
      result: 'deny',
      shareType: input.shareType,
      phase: 'recipient',
    })
    return failShare('forbidden', 'Nemáte přístup ke konverzaci')
  }

  const recipientAccountId = deriveRecipient(conversation, senderAccountId)
  if (!recipientAccountId) {
    emitShareAudit(input.context, {
      resourceId: conversation.id,
      result: 'deny',
      shareType: input.shareType,
      phase: 'recipient',
    })
    return failShare('forbidden', 'Neplatný příjemce share')
  }

  let attachment: ClinicalShareAttachment
  try {
    attachment = authorizeAndProject(input)
  } catch (err) {
    emitShareAudit(input.context, {
      resourceId: input.sourceId,
      result: 'deny',
      denyClass: isClinicalError(err) ? err.denyClass : 'forbidden',
      shareType: input.shareType,
      phase: 'source',
    })
    if (isClinicalError(err)) {
      if (err.code === 'NOT_FOUND') return failShare('not_found', err.message)
      if (err.code === 'UNAUTHENTICATED') return failShare('forbidden', err.message)
      return failShare('forbidden', err.message)
    }
    rethrowAsClinical(err)
  }

  const sendResult = sendMessage({
    conversationId: input.conversationId,
    senderAccountId,
    text: 'Sdílen klinický záznam',
    attachment,
  })

  if (!sendResult.ok) {
    emitShareAudit(input.context, {
      resourceId: conversation.id,
      result: 'deny',
      shareType: input.shareType,
      phase: 'created',
    })
    return sendResult
  }

  emitShareAudit(input.context, {
    resourceId: conversation.id,
    result: 'allow',
    shareType: input.shareType,
    phase: 'created',
  })

  return {
    ok: true,
    data: {
      ...sendResult.data,
      recipientAccountId,
      attachment,
    },
  }
}

function authorizeAndProject(input: CreateClinicalShareInput): ClinicalShareAttachment {
  const base = {
    context: input.context,
    claimedActorAccountId: input.claimedActorAccountId,
    claimedOrganizationId: input.claimedOrganizationId,
    petId: input.petId,
    pets: input.pets,
  }

  switch (input.shareType) {
    case 'health_record': {
      const result = input.clinical.readRecord({
        ...base,
        recordId: input.sourceId,
      })
      const record = result.data
      return buildAttachment({
        shareType: 'health_record',
        sourceId: record.id,
        petId: record.petId,
        title: record.title,
        subtitle: record.subtitle,
        occurredOn: record.date,
        displayKind: displayKindForRecord(record.type),
      })
    }
    case 'measurement': {
      const result = input.clinical.getWeightMeasurement({
        ...base,
        measurementId: input.sourceId,
      })
      const m = result.data
      return buildAttachment({
        shareType: 'measurement',
        sourceId: m.id,
        petId: m.petId,
        title: `Hmotnost ${m.weight} kg`,
        subtitle: m.note?.trim() ? m.note.trim().slice(0, 160) : undefined,
        occurredOn: m.date,
        displayKind: 'weight',
      })
    }
    case 'document': {
      const result = input.clinical.readDocument({
        ...base,
        documentId: input.sourceId,
      })
      const doc = result.data
      // Metadata-only — never storageKey / url / blob.
      return buildAttachment({
        shareType: 'document',
        sourceId: doc.id,
        petId: doc.petId,
        title: doc.name,
        subtitle: doc.documentType || doc.category,
        occurredOn: doc.issuedAt || doc.uploadedAt?.slice(0, 10),
        displayKind: 'doc',
      })
    }
    case 'encounter': {
      const result = input.clinical.getEncounter({
        ...base,
        encounterId: input.sourceId,
      })
      const enc = result.data
      // Summary only — no linked HealthRecords / documents / weights / reason text.
      return buildAttachment({
        shareType: 'encounter',
        sourceId: enc.id,
        petId: enc.petId,
        title: encounterLabel(enc.encounterType, enc.status),
        subtitle: undefined,
        occurredOn: enc.startedAt.slice(0, 10),
        displayKind: 'encounter',
      })
    }
    default: {
      throw new ClinicalError('INVALID_RESOURCE', 'Unsupported share type')
    }
  }
}

/** Type guard for message clinical share cards. */
export function getClinicalShareAttachment(
  message: Message,
): ClinicalShareAttachment | null {
  const att = message.attachment
  if (att && att.kind === 'clinical_share') return att
  return null
}
