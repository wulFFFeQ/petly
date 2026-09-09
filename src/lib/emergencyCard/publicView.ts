import type { Pet } from '../../types'
import type { LostPetAnnouncement } from '../../types/lostPet'
import type {
  EmergencyCardHealthContent,
  EmergencyCardVisibility,
} from '../../types/emergencyCard'
import { maskMicrochip } from '../microchip'
import { formatOptionalAge, hasMicrochip } from '../petProfileDisplay'
import { ensureEmergencyCardSettings } from './defaults'

/**
 * Whitelisted public emergency card payload.
 * Built only from opted-in fields — never copies owner PII from the private profile.
 * Basic ID (photo, name, type, breed, age, gender) is always included when known.
 */
export interface EmergencyCardPublicView {
  publicSlug: string
  name: string
  breed: string
  type: Pet['type']
  image: string
  ageLabel?: string
  gender?: string
  /** Masked only, e.g. ••••••••7890 — only when owner opted in. */
  maskedMicrochip?: string
  health?: EmergencyCardHealthContent
  vet?: {
    label: string
    clinicOrName: string
    phone?: string
    navigateQuery?: string
  }
  contactEnabled: boolean
  isLost: boolean
  lost?: {
    announcementId: string
    publicToken: string
    lastSeenPublicLabel?: string
    lastSeenAt?: string
    possibleAreaPublicLabel?: string
    respondsToName?: string
    publicBehavior?: LostPetAnnouncement['publicBehavior']
    importantInstructions?: string
    specialCaution?: string
    allowAppContact: boolean
  }
}

function pickPublicHealth(
  health: EmergencyCardHealthContent | undefined,
  visibility: EmergencyCardVisibility,
): EmergencyCardHealthContent | undefined {
  if (!health) return undefined
  const out: EmergencyCardHealthContent = {}
  if (visibility.showHealthAllergies && health.allergies?.trim()) {
    out.allergies = health.allergies.trim()
  }
  if (visibility.showHealthChronic && health.chronicConditions?.trim()) {
    out.chronicConditions = health.chronicConditions.trim()
  }
  if (visibility.showHealthMedication && health.regularMedication?.trim()) {
    out.regularMedication = health.regularMedication.trim()
  }
  if (visibility.showHealthRestrictions && health.importantRestrictions?.trim()) {
    out.importantRestrictions = health.importantRestrictions.trim()
  }
  if (visibility.showHealthOther && health.other?.trim()) {
    out.other = health.other.trim()
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/**
 * Builds the finder-facing emergency card.
 * Owner phone, email, address, partner, full chip, private notes are never included.
 */
export function buildEmergencyCardPublicView(
  pet: Pet,
  options?: {
    activeLostAnnouncement?: LostPetAnnouncement | null
  },
): EmergencyCardPublicView {
  const card = ensureEmergencyCardSettings(pet)
  const v = card.visibility
  const chip = pet.microchip?.trim()
  const hasChip = hasMicrochip(chip)

  const announcement = options?.activeLostAnnouncement
  const isLost = announcement?.status === 'lost'

  const view: EmergencyCardPublicView = {
    publicSlug: card.publicSlug,
    name: pet.name,
    breed: pet.breed,
    type: pet.type,
    image: pet.image,
    contactEnabled: pet.qrContactEnabled !== false,
    isLost: Boolean(isLost),
  }

  const ageLabel = formatOptionalAge(pet.age, pet.ageMonths)
  if (ageLabel !== 'Zatím nevyplněno') view.ageLabel = ageLabel
  if (pet.gender?.trim()) view.gender = pet.gender.trim()

  if (v.showMaskedMicrochip && hasChip && chip) {
    view.maskedMicrochip = maskMicrochip(chip)
  }

  const health = pickPublicHealth(card.health, v)
  if (health) view.health = health

  if (v.showVet && card.vet?.clinicOrName?.trim()) {
    view.vet = {
      label: card.vet.label?.trim() || 'Hlavní veterinář',
      clinicOrName: card.vet.clinicOrName.trim(),
      ...(v.showVetPhone && card.vet.phone?.trim()
        ? { phone: card.vet.phone.trim() }
        : {}),
      ...(v.showVetNavigate && card.vet.navigateQuery?.trim()
        ? { navigateQuery: card.vet.navigateQuery.trim() }
        : {}),
    }
  }

  if (isLost && announcement) {
    view.lost = {
      announcementId: announcement.id,
      publicToken: announcement.publicToken,
      lastSeenPublicLabel: announcement.lastSeen.publicLabel,
      lastSeenAt: announcement.lastSeen.seenAt,
      possibleAreaPublicLabel: announcement.possibleArea?.publicLabel,
      respondsToName: announcement.respondsToName,
      publicBehavior: announcement.publicBehavior,
      importantInstructions: announcement.importantInstructions?.trim() || undefined,
      specialCaution: announcement.specialCaution?.trim() || undefined,
      allowAppContact: announcement.allowAppContact,
    }
  }

  return view
}

export function findPetByEmergencySlug(pets: Pet[], slug: string): Pet | undefined {
  const normalized = decodeURIComponent(slug).trim().toLowerCase()
  if (!normalized) return undefined
  return pets.find((pet) => {
    const card = ensureEmergencyCardSettings(pet)
    return (
      card.publicSlug.toLowerCase() === normalized ||
      pet.id.toLowerCase() === normalized
    )
  })
}

/** Assert helpers for audits / tests — what must never appear on a public view. */
export const PUBLIC_EMERGENCY_FORBIDDEN_KEYS = [
  'ownerPhone',
  'ownerEmail',
  'ownerAddress',
  'ownerName',
  'partnerPhone',
  'fullMicrochip',
  'microchip',
  'healthRecords',
  'documents',
  'calendar',
  'privateNotes',
] as const
