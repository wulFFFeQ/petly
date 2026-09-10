import type { Pet } from '../../types'
import type {
  LostPetAnnouncement,
  LostPetLifecycle,
  PublicBehavior,
  TemperamentHint,
} from '../../types/lostPet'
import { formatOptionalAge } from '../petProfileDisplay'

/** Whitelisted fields for the public lost-pet announcement page. */
export interface LostPetPublicView {
  token: string
  announcementId: string
  status: LostPetLifecycle
  name: string
  breed: string
  type: Pet['type']
  image: string
  /** Safe basic ID — never address, phone, email, or microchip. */
  ageLabel?: string
  gender?: string
  lastSeenPublicLabel: string
  lastSeenAt: string
  /** Very coarse public pin only. */
  publicLat: number
  publicLng: number
  knowsPossibleArea: boolean
  possibleAreaPublicLabel?: string
  publicBehavior: PublicBehavior
  importantInstructions?: string
  respondsToName: string
  nickname?: string
  allowAppContact: boolean
  reactionToPeople?: TemperamentHint
  reactionToAnimals?: TemperamentHint
  specialCaution?: string
  /** Optional found-QR contact when enabled on the pet. */
  foundContactToken?: string
  foundContactEnabled?: boolean
}

export function buildLostPetPublicView(
  pet: Pet,
  announcement: LostPetAnnouncement,
): LostPetPublicView {
  const ageLabel = formatOptionalAge(pet.age, pet.ageMonths)
  return {
    token: announcement.publicToken,
    announcementId: announcement.id,
    status: announcement.status,
    name: pet.name,
    breed: pet.breed,
    type: pet.type,
    image: pet.image,
    ageLabel: ageLabel !== 'Zatím nevyplněno' ? ageLabel : undefined,
    gender: pet.gender?.trim() || undefined,
    lastSeenPublicLabel: announcement.lastSeen.publicLabel,
    lastSeenAt: announcement.lastSeen.seenAt,
    publicLat: announcement.lastSeen.publicLat,
    publicLng: announcement.lastSeen.publicLng,
    knowsPossibleArea: announcement.knowsPossibleArea,
    possibleAreaPublicLabel: announcement.possibleArea?.publicLabel,
    publicBehavior: announcement.publicBehavior,
    importantInstructions: announcement.importantInstructions?.trim() || undefined,
    respondsToName: announcement.respondsToName,
    nickname: announcement.nickname?.trim() || undefined,
    allowAppContact: announcement.allowAppContact,
    reactionToPeople: announcement.reactionToPeople,
    reactionToAnimals: announcement.reactionToAnimals,
    specialCaution: announcement.specialCaution?.trim() || undefined,
    foundContactToken: pet.foundContactToken,
    foundContactEnabled: pet.qrContactEnabled !== false,
  }
}

export function findAnnouncementByToken(
  announcements: LostPetAnnouncement[],
  token: string,
): LostPetAnnouncement | undefined {
  const normalized = token.trim()
  if (!normalized) return undefined
  return announcements.find((item) => item.publicToken === normalized)
}

export function findActiveAnnouncementForPet(
  announcements: LostPetAnnouncement[],
  petId: string,
): LostPetAnnouncement | undefined {
  return announcements.find((item) => item.petId === petId && item.status === 'lost')
}

export function findLatestAnnouncementForPet(
  announcements: LostPetAnnouncement[],
  petId: string,
): LostPetAnnouncement | undefined {
  const forPet = announcements.filter((item) => item.petId === petId)
  if (forPet.length === 0) return undefined
  return [...forPet].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}
