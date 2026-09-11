import type { HealthRecord, Pet, PetDocument, PetPhoto } from '../../types'
import { isPetOwner } from '../pets/ownership'
import {
  hasHouseholdPermission,
  isHouseholdAccessEffective,
} from './access'
import type { PetHouseholdAccess } from './types'

/**
 * Permission-filtered household view of a pet.
 * Denied fields are absent — never present + UI-hidden.
 * Microchip and owner contacts are never included.
 */
export interface HouseholdPetView {
  petId: string
  name?: string
  type?: string
  breed?: string
  age?: number
  gender?: string
  image?: string
  bio?: string
  healthRecords?: HealthRecord[]
  documents?: PetDocument[]
  photos?: PetPhoto[]
  /** Emergency card projection when emergency_read is granted — never invents a new model. */
  emergencyCard?: Pet['emergencyCard']
  calendarWriteAllowed?: boolean
  timelineWriteAllowed?: boolean
  galleryWriteAllowed?: boolean
  healthWriteAllowed?: boolean
  documentsWriteAllowed?: boolean
  profileWriteAllowed?: boolean
  householdManageAllowed?: boolean
  lostManageAllowed?: boolean
  emergencyWriteAllowed?: boolean
}

export type ProjectHouseholdPetOptions = {
  access: PetHouseholdAccess | null | undefined
  /** When set and matches pet owner, returns full owner view (no access record required). */
  actorAccountId?: string
  healthRecords?: HealthRecord[]
  documents?: PetDocument[]
  photos?: PetPhoto[]
  /** Must never appear on the view. */
  ownerContacts?: { phone?: string; email?: string; address?: string }
  now?: number
}

export const HOUSEHOLD_VIEW_FORBIDDEN_KEYS = [
  'microchip',
  'microchipNumber',
  'microchipVerification',
  'ownerContacts',
  'ownerPhone',
  'ownerEmail',
  'ownerAddress',
  'phone',
  'email',
  'address',
] as const

export function assertHouseholdViewSafe(view: HouseholdPetView): void {
  const record = view as Record<string, unknown>
  for (const key of HOUSEHOLD_VIEW_FORBIDDEN_KEYS) {
    if (key in record && record[key] != null) {
      throw new Error(`HouseholdPetView must not include ${key}`)
    }
  }
}

/**
 * Project pet data for a household member under PetHouseholdAccess.
 * Owner path: full safe owner view (still never leaks as "contacts" keys).
 */
export function projectPetForHousehold(
  pet: Pet,
  options: ProjectHouseholdPetOptions,
): HouseholdPetView {
  const now = options.now ?? Date.now()
  const view: HouseholdPetView = { petId: pet.id }

  // Owner bypass — full access independent of access record
  if (options.actorAccountId && isPetOwner(pet, options.actorAccountId)) {
    view.name = pet.name
    view.type = pet.type
    view.breed = pet.breed
    if (pet.age != null) view.age = pet.age
    if (pet.gender) view.gender = pet.gender
    if (pet.image) view.image = pet.image
    if (pet.bio) view.bio = pet.bio
    view.healthRecords = (options.healthRecords ?? []).filter((r) => r.petId === pet.id)
    view.documents = (options.documents ?? []).filter((d) => d.petId === pet.id)
    view.photos = (options.photos ?? []).filter((p) => p.petId === pet.id)
    if (pet.emergencyCard) view.emergencyCard = pet.emergencyCard
    view.calendarWriteAllowed = true
    view.timelineWriteAllowed = true
    view.galleryWriteAllowed = true
    view.healthWriteAllowed = true
    view.documentsWriteAllowed = true
    view.profileWriteAllowed = true
    view.householdManageAllowed = true
    view.lostManageAllowed = true
    view.emergencyWriteAllowed = true
    void options.ownerContacts
    void pet.microchip
    assertHouseholdViewSafe(view)
    return view
  }

  const access = options.access
  if (!isHouseholdAccessEffective(access, now) || !access) {
    void options.ownerContacts
    void pet.microchip
    return view
  }

  if (hasHouseholdPermission(access, 'pet_profile_read', now)) {
    view.name = pet.name
    view.type = pet.type
    view.breed = pet.breed
    if (pet.age != null) view.age = pet.age
    if (pet.gender) view.gender = pet.gender
    if (pet.image) view.image = pet.image
    if (pet.bio) view.bio = pet.bio
  }

  if (hasHouseholdPermission(access, 'health_read', now)) {
    view.healthRecords = (options.healthRecords ?? []).filter((r) => r.petId === pet.id)
  }

  if (hasHouseholdPermission(access, 'documents_read', now)) {
    view.documents = (options.documents ?? []).filter((d) => d.petId === pet.id)
  }

  if (hasHouseholdPermission(access, 'gallery_read', now)) {
    view.photos = (options.photos ?? []).filter((p) => p.petId === pet.id)
  }

  if (hasHouseholdPermission(access, 'emergency_read', now) && pet.emergencyCard) {
    view.emergencyCard = pet.emergencyCard
  }

  view.healthWriteAllowed = hasHouseholdPermission(access, 'health_write', now)
  view.documentsWriteAllowed = hasHouseholdPermission(access, 'documents_write', now)
  view.calendarWriteAllowed = hasHouseholdPermission(access, 'calendar_write', now)
  view.timelineWriteAllowed = hasHouseholdPermission(access, 'timeline_write', now)
  view.galleryWriteAllowed = hasHouseholdPermission(access, 'gallery_write', now)
  view.profileWriteAllowed = hasHouseholdPermission(access, 'pet_profile_write', now)
  view.householdManageAllowed = hasHouseholdPermission(access, 'household_manage', now)
  view.lostManageAllowed = hasHouseholdPermission(access, 'lost_manage', now)
  view.emergencyWriteAllowed = hasHouseholdPermission(access, 'emergency_write', now)

  // Explicit runtime guard: never attach microchip or owner contacts.
  void options.ownerContacts
  void pet.microchip

  assertHouseholdViewSafe(view)
  return view
}
