/**
 * Resource resolution — client resource ids are untrusted until loaded.
 */

import { getBooking } from '../booking/bookings'
import type { Booking } from '../booking/types'
import { getConversation } from '../messaging/conversations'
import type { Conversation } from '../../types'
import { getPayment } from '../payments/payments'
import type { Payment } from '../payments/types'
import { loadOrganizations } from '../organization/storage'
import type { Organization } from '../organization/types'
import { loadProfessionalProfiles } from '../professional/storage'
import type { ProfessionalProfile } from '../professional/types'
import type { Pet } from '../../types'
import type { ResourceRef, ResourceType } from './types'

export const PETS_STORAGE_KEY = 'lovedandknown.pets'

export function loadPetsFromDemoStorage(): Pet[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(PETS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (p): p is Pet =>
        Boolean(p) && typeof p === 'object' && typeof (p as Pet).id === 'string',
    )
  } catch {
    return []
  }
}

export type AuthorizationResourceStore = {
  pets?: Pet[]
  loadPets?: () => Pet[]
  getBooking?: (id: string) => Booking | null
  getPayment?: (id: string) => Payment | null
  getConversation?: (id: string, accountId?: string) => Conversation | null
  loadOrganizations?: () => Organization[]
  loadProfessionalProfiles?: () => ProfessionalProfile[]
}

export type ResolvedResource =
  | { type: 'pet'; id: string; pet: Pet }
  | { type: 'organization'; id: string; organization: Organization }
  | { type: 'booking'; id: string; booking: Booking }
  | { type: 'payment'; id: string; payment: Payment }
  | { type: 'conversation'; id: string; conversation: Conversation }
  | { type: 'professional_profile'; id: string; profile: ProfessionalProfile }
  | { type: 'public_pet'; id: string; pet: Pet }

export type ResolveResourceResult =
  | { ok: true; resource: ResolvedResource }
  | { ok: false; code: 'not_found'; message: string }

function resolvePets(store: AuthorizationResourceStore): Pet[] {
  if (store.pets) return store.pets
  if (store.loadPets) return store.loadPets()
  return loadPetsFromDemoStorage()
}

export function resolveResource(
  ref: ResourceRef,
  store: AuthorizationResourceStore = {},
  options?: { viewerAccountId?: string },
): ResolveResourceResult {
  const id = typeof ref.id === 'string' ? ref.id.trim() : ''
  if (!id) {
    return { ok: false, code: 'not_found', message: 'Resource id is required' }
  }

  const type: ResourceType = ref.type

  switch (type) {
    case 'pet':
    case 'public_pet': {
      const pet = resolvePets(store).find((p) => p.id === id)
      if (!pet) {
        return { ok: false, code: 'not_found', message: `Pet not found: ${id}` }
      }
      return {
        ok: true,
        resource:
          type === 'public_pet'
            ? { type: 'public_pet', id, pet }
            : { type: 'pet', id, pet },
      }
    }
    case 'organization': {
      const loadOrgs = store.loadOrganizations ?? loadOrganizations
      const org = loadOrgs().find((o) => o.id === id)
      if (!org) {
        return { ok: false, code: 'not_found', message: `Organization not found: ${id}` }
      }
      return { ok: true, resource: { type: 'organization', id, organization: org } }
    }
    case 'booking': {
      const get = store.getBooking ?? getBooking
      const booking = get(id)
      if (!booking) {
        return { ok: false, code: 'not_found', message: `Booking not found: ${id}` }
      }
      return { ok: true, resource: { type: 'booking', id, booking } }
    }
    case 'payment': {
      const get = store.getPayment ?? getPayment
      const payment = get(id)
      if (!payment) {
        return { ok: false, code: 'not_found', message: `Payment not found: ${id}` }
      }
      return { ok: true, resource: { type: 'payment', id, payment } }
    }
    case 'conversation': {
      const get = store.getConversation ?? getConversation
      const conversation = get(id, options?.viewerAccountId)
      if (!conversation) {
        return { ok: false, code: 'not_found', message: `Conversation not found: ${id}` }
      }
      return { ok: true, resource: { type: 'conversation', id, conversation } }
    }
    case 'professional_profile': {
      const load = store.loadProfessionalProfiles ?? loadProfessionalProfiles
      const profile = load().find((p) => p.id === id)
      if (!profile) {
        return {
          ok: false,
          code: 'not_found',
          message: `ProfessionalProfile not found: ${id}`,
        }
      }
      return { ok: true, resource: { type: 'professional_profile', id, profile } }
    }
    default:
      return { ok: false, code: 'not_found', message: `Unknown resource type` }
  }
}
