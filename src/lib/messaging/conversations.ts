import type { Conversation } from '../../types'
import type { ProfessionalProfile } from '../professional/types'
import { getBooking, listBookings } from '../booking/bookings'
import { loadProfessionalProfiles } from '../professional/storage'
import { SLOT_BLOCKING_STATUSES, type Booking } from '../booking/types'
import { buildBookingMessageContext } from './bookingContext'
import { assertMessagingPayloadSafe } from './privacy'
import {
  createMessagingId,
  loadInboxConversations,
  projectConversationForViewer,
  upsertConversation,
} from './storage'

export type MessagingResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: MessagingErrorCode; message: string }

export type MessagingErrorCode =
  | 'not_found'
  | 'forbidden'
  | 'invalid'
  | 'booking_not_found'

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=160&q=85'

function fail<T>(code: MessagingErrorCode, message: string): MessagingResult<T> {
  return { ok: false, code, message }
}

function resolveProfessional(professionalId: string): ProfessionalProfile | null {
  return loadProfessionalProfiles().find((p) => p.id === professionalId) ?? null
}

function professionalRoleLabel(type: string): string {
  switch (type) {
    case 'veterinarian':
    case 'veterinary_clinic':
      return 'Veterinář'
    case 'groomer':
      return 'Groomer'
    case 'trainer':
      return 'Trenér'
    case 'pet_hotel':
      return 'Pet hotel'
    case 'shelter':
      return 'Útulek'
    case 'breeder':
      return 'Chovatel'
    default:
      return 'Profesionál'
  }
}

/**
 * Access: participant list only.
 * bookingId alone never grants access. Legacy threads without participants stay open
 * for demo UI (no ACL), but booking/professional threads always have participants.
 */
export function canAccessConversation(
  accountId: string | null | undefined,
  conversation: Conversation | null | undefined,
): boolean {
  if (!accountId || !conversation) return false
  const participants = conversation.participantAccountIds
  if (!participants?.length) {
    // Legacy community/vet seeds — no ACL gate.
    return conversation.contactType !== 'professional'
  }
  return participants.includes(accountId)
}

export function getConversation(
  id: string,
  viewerAccountId?: string | null,
): Conversation | null {
  const found = loadInboxConversations().find((c) => c.id === id) ?? null
  if (!found) return null
  if (viewerAccountId) return projectConversationForViewer(found, viewerAccountId)
  return found
}

export function findConversationByBookingId(bookingId: string): Conversation | null {
  return loadInboxConversations().find((c) => c.bookingId === bookingId) ?? null
}

export function findDirectProfessionalConversation(
  ownerAccountId: string,
  professionalId: string,
): Conversation | null {
  return (
    loadInboxConversations().find(
      (c) =>
        c.professionalId === professionalId &&
        !c.bookingId &&
        c.participantAccountIds?.includes(ownerAccountId) &&
        c.contactType === 'professional',
    ) ?? null
  )
}

/** Sort: unread first, then last activity (updatedAt / time). */
export function sortConversationsForInbox(list: Conversation[]): Conversation[] {
  return [...list].sort((a, b) => {
    const unreadDiff = (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0)
    if (unreadDiff !== 0) return unreadDiff
    const aAt = a.updatedAt || a.createdAt || ''
    const bAt = b.updatedAt || b.createdAt || ''
    if (aAt && bAt && aAt !== bAt) return bAt.localeCompare(aAt)
    return b.id.localeCompare(a.id)
  })
}

export function listConversationsForAccount(
  accountId: string,
  opts?: { professionalOnly?: boolean },
): Conversation[] {
  const list = loadInboxConversations().filter((c) => {
    if (c.archived) return false
    if (!canAccessConversation(accountId, c)) return false
    if (opts?.professionalOnly) {
      return Boolean(c.participantAccountIds?.includes(accountId)) &&
        (c.contactType === 'professional' || Boolean(c.bookingId) || Boolean(c.professionalId))
    }
    return true
  })
  return sortConversationsForInbox(
    list.map((c) => projectConversationForViewer(c, accountId)),
  )
}

function buildBookingConversationShell(
  booking: Booking,
  professional: ProfessionalProfile,
  now: string,
): Conversation {
  const ctx = buildBookingMessageContext(booking)
  const conv: Conversation = {
    id: createMessagingId('conv_bkg'),
    name: professional.displayName || booking.professionalName || 'Profesionál',
    avatar: professional.profilePhotoUrl || professional.logoUrl || DEFAULT_AVATAR,
    role: professionalRoleLabel(professional.type),
    petContext: ctx.summaryLine,
    petId: booking.petId,
    contactType: 'professional',
    lastMessage: '',
    time: '',
    unread: 0,
    messages: [],
    participantAccountIds: [booking.ownerAccountId, professional.accountId],
    bookingId: booking.id,
    professionalId: booking.professionalId,
    createdAt: now,
    updatedAt: now,
    serviceNameSnapshot: ctx.serviceName,
    bookingStatusSnapshot: ctx.statusLabel,
  }
  assertMessagingPayloadSafe(conv)
  return conv
}

/**
 * Lazy-create booking conversation. Caller must be owner or the booking's professional account.
 */
export function getOrCreateBookingConversation(input: {
  bookingId: string
  callerAccountId: string
}): MessagingResult<Conversation> {
  const booking = getBooking(input.bookingId)
  if (!booking) return fail('booking_not_found', 'Rezervace nenalezena')

  const professional = resolveProfessional(booking.professionalId)
  if (!professional) return fail('not_found', 'Profesionál nenalezen')

  const isOwner = booking.ownerAccountId === input.callerAccountId
  const isPro = professional.accountId === input.callerAccountId
  if (!isOwner && !isPro) {
    return fail('forbidden', 'Nemáte přístup k této rezervaci')
  }

  const existing = findConversationByBookingId(booking.id)
  if (existing) {
    if (!canAccessConversation(input.callerAccountId, existing)) {
      return fail('forbidden', 'Nemáte přístup ke konverzaci')
    }
    // Refresh booking status snapshot
    const ctx = buildBookingMessageContext(booking)
    const refreshed = upsertConversation({
      ...existing,
      bookingStatusSnapshot: ctx.statusLabel,
      petContext: ctx.summaryLine,
      serviceNameSnapshot: ctx.serviceName,
    })
    return {
      ok: true,
      data: projectConversationForViewer(refreshed, input.callerAccountId),
    }
  }

  const now = new Date().toISOString()
  const created = upsertConversation(
    buildBookingConversationShell(booking, professional, now),
  )
  return {
    ok: true,
    data: projectConversationForViewer(created, input.callerAccountId),
  }
}

/**
 * General (non-booking) conversation with a professional.
 * Prefer booking conversation when an active booking exists.
 */
export function getOrCreateProfessionalConversation(input: {
  professionalId: string
  callerAccountId: string
  preferActiveBooking?: boolean
}): MessagingResult<Conversation> {
  const professional = resolveProfessional(input.professionalId)
  if (!professional) return fail('not_found', 'Profesionál nenalezen')

  if (professional.accountId === input.callerAccountId) {
    return fail('invalid', 'Nelze otevřít konverzaci se sebou')
  }

  if (input.preferActiveBooking !== false) {
    const active = listBookings({
      ownerAccountId: input.callerAccountId,
      professionalId: input.professionalId,
      status: [...SLOT_BLOCKING_STATUSES],
    })
    const preferred = active[0]
    if (preferred) {
      return getOrCreateBookingConversation({
        bookingId: preferred.id,
        callerAccountId: input.callerAccountId,
      })
    }
  }

  const existing = findDirectProfessionalConversation(
    input.callerAccountId,
    input.professionalId,
  )
  if (existing) {
    if (!canAccessConversation(input.callerAccountId, existing)) {
      return fail('forbidden', 'Nemáte přístup ke konverzaci')
    }
    return {
      ok: true,
      data: projectConversationForViewer(existing, input.callerAccountId),
    }
  }

  const now = new Date().toISOString()
  const created = upsertConversation({
    id: createMessagingId('conv_pro'),
    name: professional.displayName || 'Profesionál',
    avatar: professional.profilePhotoUrl || professional.logoUrl || DEFAULT_AVATAR,
    role: professionalRoleLabel(professional.type),
    petContext: 'Obecná konverzace',
    contactType: 'professional',
    lastMessage: '',
    time: '',
    unread: 0,
    messages: [],
    participantAccountIds: [input.callerAccountId, professional.accountId],
    professionalId: professional.id,
    createdAt: now,
    updatedAt: now,
  })
  assertMessagingPayloadSafe(created)
  return {
    ok: true,
    data: projectConversationForViewer(created, input.callerAccountId),
  }
}

export function requireConversationAccess(
  conversationId: string,
  accountId: string,
): MessagingResult<Conversation> {
  const conv = getConversation(conversationId)
  if (!conv) return fail('not_found', 'Konverzace nenalezena')
  if (!canAccessConversation(accountId, conv)) {
    return fail('forbidden', 'Nemáte přístup ke konverzaci')
  }
  return {
    ok: true,
    data: projectConversationForViewer(conv, accountId),
  }
}
