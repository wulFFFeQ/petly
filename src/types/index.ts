import type { PetType } from '../lib/petTypes'

export type { PetType } from '../lib/petTypes'
export type HealthStatus = 'excellent' | 'good' | 'attention'

/** Top-level calendar categories (modal: category → type). */
export type CalendarEventCategory =
  | 'health'
  | 'care'
  | 'activity'
  | 'show'
  | 'breeding'
  | 'other'

/**
 * Concrete calendar event kinds.
 * Legacy `feeding` remains for older demo data; it is not offered in the add-event modal.
 */
export type EventType =
  | 'vet'
  | 'vaccination'
  | 'deworming'
  | 'antiparasitic'
  | 'medication'
  | 'examination'
  | 'lab'
  | 'surgery'
  | 'rehab'
  | 'dental'
  | 'grooming'
  | 'bathing'
  | 'nail_trim'
  | 'teeth_cleaning'
  | 'ear_cleaning'
  | 'coat_care'
  | 'training'
  | 'agility'
  | 'socialization'
  | 'course'
  | 'doggy_daycare'
  | 'pet_sitting'
  | 'trip'
  | 'travel'
  | 'exhibition'
  | 'competition'
  | 'exam'
  | 'seminar'
  | 'heat'
  | 'mating'
  | 'pregnancy'
  | 'birth'
  | 'litter_check'
  | 'birthday'
  | 'adoption_anniversary'
  | 'community_meetup'
  | 'custom'
  | 'feeding'

export type HealthRecordType = 'vaccination' | 'vet' | 'medication' | 'examination'
export type ModalType = 'addPet' | 'addHealthRecord' | 'bookVet' | 'addActivity' | 'addPhoto' | null

export interface Pet {
  id: string
  name: string
  type: PetType
  breed: string
  image: string
  coverColor?: string
  coverImage?: string
  age?: number
  healthStatus?: HealthStatus
  dateOfBirth?: string
  gender?: string
  weight?: number
  microchip?: string
  neutered?: boolean
  /** When true, breeding calendar events (Chov) are available for this pet. */
  breedingProfile?: boolean
  lastVetVisit?: string
  nextVaccination?: string
  healthScore?: number
  favoriteToy?: string
  diet?: string
  supplements?: string
}

export interface HealthRecord {
  id: string
  petId: string
  type: HealthRecordType
  title: string
  subtitle: string
  date: string
  doctor?: string
  clinic?: string
  status?: 'completed' | 'scheduled' | 'active'
  vaccineName?: string
  nextDueDate?: string
  dosage?: string
  scheduleTime?: string
  /** Length of the treatment course in days (also used for reminder series). */
  reminderDays?: number
  reminderEnabled?: boolean
  notes?: string
}

export interface TimelineEvent {
  id: string
  petId: string
  title: string
  date: string
  category?: 'milestone' | 'medical' | 'adoption' | 'birthday' | 'memory'
  description?: string
  source?: 'manual' | 'health_record' | 'vaccination' | 'medication' | 'vet'
  sourceId?: string
}

export interface PetDocument {
  id: string
  petId: string
  name: string
  size: string
  updatedAt: string
  expiresAt?: string
  type: 'passport' | 'chip' | 'insurance' | 'lab' | 'other'
  /** Data URL or remote URL for preview / download. */
  url?: string
  mimeType?: string
}

export interface PetPhoto {
  id: string
  petId: string
  url: string
  caption?: string
}

export interface WeightMeasurement {
  id: string
  petId: string
  date: string
  weight: number
  note?: string
}

export interface OverviewItem {
  id: string
  type: EventType
  petName: string
  label: string
  detail: string
  timeBadge?: string
  isUrgent?: boolean
}

export interface ActivityItem {
  id: string
  text: string
  time: string
  petName?: string
  category?: 'health' | 'photo' | 'routine' | 'appointment'
}

export interface DiscoverPet {
  id: string
  name: string
  type: PetType
  breed: string
  age: number
  location: string
  image: string
  popular?: boolean
  distance?: string
  verified?: boolean
  ownerName?: string
  bio?: string
}

export interface PostComment {
  id: string
  author: string
  avatar: string
  text: string
  time: string
}

export interface CommunityPost {
  id: string
  author: string
  avatar: string
  badge?: string
  time: string
  text: string
  image?: string
  likes: number
  liked: boolean
  petTag?: string
  commentsCount: number
  comments?: PostComment[]
  /** When set, post was created from a gallery photo upload. */
  sourcePhotoId?: string
}

export interface CalendarEvent {
  id: string
  title: string
  petName: string
  type: EventType
  date: string
  time?: string
  location?: string
  notes?: string
  /** Optional reminder flag for medication / treatment calendar events. */
  reminderEnabled?: boolean
  /** Links medication reminder events to a health record. */
  sourceRecordId?: string
}

export interface AppNotification {
  id: string
  title: string
  time: string
  unread: boolean
  kind?: 'medication_reminder' | 'system' | 'community'
  sourceRecordId?: string
}

export interface Message {
  id: string
  sender: 'me' | 'them'
  text: string
  time: string
  attachment?: {
    kind: 'health_record'
    recordId: string
    title: string
    subtitle: string
    date: string
    category?: 'vaccination' | 'medication' | 'visit' | 'results'
  }
}

export interface Conversation {
  id: string
  name: string
  avatar: string
  role?: string
  petContext: string
  petId?: string
  contactType: 'vet' | 'trainer' | 'community'
  online?: boolean
  lastMessage: string
  time: string
  unread: number
  messages: Message[]
}

export interface WeightDataPoint {
  month: string
  weight: number
  target?: number
}

export interface NewPetForm {
  name: string
  type: PetType
  breed: string
  age?: number
  gender?: string
  weight?: number
}

export interface ToastMessage {
  id: string
  title: string
  description?: string
  type?: 'success' | 'info' | 'gold'
}

export type ImportantContactType =
  | 'emergency'
  | 'vet'
  | 'insurance'
  | 'registry'
  | 'emergency_person'

export interface ImportantContact {
  id: string
  type: ImportantContactType
  label: string
  name: string
  phone: string
  note?: string
}

export interface PetTravelPackage {
  petId: string
  euPassport: {
    number: string
    validUntil: string
    status: 'valid' | 'expiring' | 'missing'
  }
  vaccinationSummary: string
  microchip: string
  healthRecordCount: number
  documents: { label: string; ready: boolean }[]
}

export type TravelRequirementCheck =
  | 'eu_passport'
  | 'rabies'
  | 'microchip'
  | 'tapeworm'
  | 'health_cert'
  | 'insurance'
  | 'import_permit'

export interface TravelDestinationRequirement {
  id: string
  category: 'vaccination' | 'passport' | 'document' | 'microchip' | 'other'
  label: string
  detail: string
  check: TravelRequirementCheck
}

export interface TravelDestination {
  id: string
  country: string
  emoji: string
  summary: string
  requirements: TravelDestinationRequirement[]
}
