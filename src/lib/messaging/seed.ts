import type { Conversation, Message } from '../../types'
import type { Booking } from '../booking/types'
import { buildBookingMessageContext } from './bookingContext'
import { createMessagingId, loadInboxConversations, upsertConversation } from './storage'

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=160&q=85'

export type MessagingSeedFixture = {
  ownerAccountId: string
  ownerDisplayName?: string
  veterinarian: { professionalId: string; accountId: string; displayName: string }
  groomer: { professionalId: string; accountId: string; displayName: string }
  trainer: { professionalId: string; accountId: string; displayName: string }
  /** Bookings to attach (completed + cancelled required for seed coverage). */
  bookings: {
    vetConfirmed?: Booking
    groomerConfirmed?: Booking
    trainerConfirmed?: Booking
    completed?: Booking
    cancelled?: Booking
  }
}

function msg(
  senderAccountId: string,
  text: string,
  createdAt: string,
  unreadSide?: boolean,
): Message {
  return {
    id: createMessagingId('msg_seed'),
    sender: 'them',
    text,
    time: '10:00',
    senderAccountId,
    createdAt,
    ...(unreadSide ? {} : { readAt: createdAt }),
  }
}

function shell(input: {
  id: string
  name: string
  role: string
  petContext: string
  participants: [string, string]
  professionalId: string
  bookingId?: string
  serviceName?: string
  statusLabel?: string
  messages: Message[]
  unread: number
  now: string
}): Conversation {
  const last = input.messages[input.messages.length - 1]
  return {
    id: input.id,
    name: input.name,
    avatar: DEFAULT_AVATAR,
    role: input.role,
    petContext: input.petContext,
    contactType: 'professional',
    lastMessage: last?.text ?? '',
    time: last ? 'Včera' : '',
    unread: input.unread,
    messages: input.messages,
    participantAccountIds: input.participants,
    professionalId: input.professionalId,
    bookingId: input.bookingId,
    serviceNameSnapshot: input.serviceName,
    bookingStatusSnapshot: input.statusLabel,
    createdAt: input.now,
    updatedAt: last?.createdAt ?? input.now,
  }
}

/**
 * DEMO seed: owner ↔ vet / groomer / trainer, unread, completed, cancelled.
 * Idempotent by stable conversation ids.
 */
export function ensureMessagingSeed(fixture: MessagingSeedFixture): Conversation[] {
  const existing = loadInboxConversations()
  const byId = new Map(existing.map((c) => [c.id, c]))
  const now = new Date().toISOString()
  const owner = fixture.ownerAccountId
  const ownerName = fixture.ownerDisplayName ?? 'Majitel'
  const created: Conversation[] = []

  const upsertSeed = (c: Conversation) => {
    if (byId.has(c.id)) return byId.get(c.id)!
    const saved = upsertConversation(c)
    byId.set(saved.id, saved)
    created.push(saved)
    return saved
  }

  const { veterinarian: vet, groomer, trainer, bookings } = fixture

  if (bookings.vetConfirmed) {
    const b = bookings.vetConfirmed
    const ctx = buildBookingMessageContext(b)
    upsertSeed(
      shell({
        id: 'conv_seed_vet',
        name: vet.displayName,
        role: 'Veterinář',
        petContext: ctx.summaryLine,
        participants: [owner, vet.accountId],
        professionalId: vet.professionalId,
        bookingId: b.id,
        serviceName: ctx.serviceName,
        statusLabel: ctx.statusLabel,
        messages: [
          msg(owner, `Dobrý den, mám dotaz k rezervaci pro ${ctx.petName}.`, now),
          msg(vet.accountId, 'Dobrý den, rád pomohu. Co potřebujete vědět?', now),
        ],
        unread: 0,
        now,
      }),
    )
  }

  if (bookings.groomerConfirmed) {
    const b = bookings.groomerConfirmed
    const ctx = buildBookingMessageContext(b)
    upsertSeed(
      shell({
        id: 'conv_seed_groomer',
        name: groomer.displayName,
        role: 'Groomer',
        petContext: ctx.summaryLine,
        participants: [owner, groomer.accountId],
        professionalId: groomer.professionalId,
        bookingId: b.id,
        serviceName: ctx.serviceName,
        statusLabel: ctx.statusLabel,
        messages: [
          msg(owner, 'Prosím o potvrzení délky stříhání.', now),
          msg(groomer.accountId, 'Počítáme cca 60 minut.', now),
        ],
        unread: 0,
        now,
      }),
    )
  }

  if (bookings.trainerConfirmed) {
    const b = bookings.trainerConfirmed
    const ctx = buildBookingMessageContext(b)
    // Unread message from trainer → owner
    upsertSeed(
      shell({
        id: 'conv_seed_trainer_unread',
        name: trainer.displayName,
        role: 'Trenér',
        petContext: ctx.summaryLine,
        participants: [owner, trainer.accountId],
        professionalId: trainer.professionalId,
        bookingId: b.id,
        serviceName: ctx.serviceName,
        statusLabel: ctx.statusLabel,
        messages: [
          msg(owner, 'Dobrý den, připravíme pejska na první lekci?', now),
          msg(
            trainer.accountId,
            'Ano — přineste vodítko a pamlsky. Těším se!',
            now,
            true,
          ),
        ],
        unread: 1,
        now,
      }),
    )
  }

  if (bookings.completed) {
    const b = bookings.completed
    const ctx = buildBookingMessageContext(b)
    upsertSeed(
      shell({
        id: 'conv_seed_completed',
        name: vet.displayName,
        role: 'Veterinář',
        petContext: ctx.summaryLine,
        participants: [owner, vet.accountId],
        professionalId: vet.professionalId,
        bookingId: b.id,
        serviceName: ctx.serviceName,
        statusLabel: ctx.statusLabel,
        messages: [
          msg(vet.accountId, 'Děkujeme za návštěvu, vše proběhlo v pořádku.', now),
          msg(owner, 'Děkuji za péči!', now),
        ],
        unread: 0,
        now,
      }),
    )
  }

  if (bookings.cancelled) {
    const b = bookings.cancelled
    const ctx = buildBookingMessageContext(b)
    upsertSeed(
      shell({
        id: 'conv_seed_cancelled',
        name: groomer.displayName,
        role: 'Groomer',
        petContext: ctx.summaryLine,
        participants: [owner, groomer.accountId],
        professionalId: groomer.professionalId,
        bookingId: b.id,
        serviceName: ctx.serviceName,
        statusLabel: ctx.statusLabel,
        messages: [
          msg(owner, 'Musím bohužel zrušit termín.', now),
          msg(groomer.accountId, 'Rozumím, ozvěte se kdykoliv znovu.', now),
        ],
        unread: 0,
        now,
      }),
    )
  }

  // Touch ownerDisplayName for privacy-safe demos (no PII fields).
  void ownerName

  return created.length ? created : existing.filter((c) => c.id.startsWith('conv_seed_'))
}

/** Lightweight seed when bookings already exist in storage (runtime DEMO). */
export function seedMessagingFromBookings(input: {
  ownerAccountId: string
  bookings: Booking[]
  professionals: Array<{
    id: string
    accountId: string
    displayName: string
    type: string
  }>
}): void {
  const byType = (t: string) =>
    input.professionals.find((p) => p.type === t || (t === 'veterinarian' && p.type === 'veterinary_clinic'))

  const vet = byType('veterinarian')
  const groomer = byType('groomer')
  const trainer = byType('trainer')
  if (!vet || !groomer || !trainer) return

  const ownerBookings = input.bookings.filter((b) => b.ownerAccountId === input.ownerAccountId)
  const forPro = (proId: string) => ownerBookings.filter((b) => b.professionalId === proId)

  ensureMessagingSeed({
    ownerAccountId: input.ownerAccountId,
    veterinarian: {
      professionalId: vet.id,
      accountId: vet.accountId,
      displayName: vet.displayName,
    },
    groomer: {
      professionalId: groomer.id,
      accountId: groomer.accountId,
      displayName: groomer.displayName,
    },
    trainer: {
      professionalId: trainer.id,
      accountId: trainer.accountId,
      displayName: trainer.displayName,
    },
    bookings: {
      vetConfirmed: forPro(vet.id).find((b) => b.status === 'confirmed'),
      groomerConfirmed: forPro(groomer.id).find((b) => b.status === 'confirmed'),
      trainerConfirmed: forPro(trainer.id).find((b) => b.status === 'confirmed'),
      completed: ownerBookings.find((b) => b.status === 'completed'),
      cancelled: ownerBookings.find(
        (b) =>
          b.status === 'cancelled_by_owner' || b.status === 'cancelled_by_professional',
      ),
    },
  })
}
