import type { PetType } from '../lib/petTypes'
import type { LostPetLifecycle } from './lostPet'
import type { EmergencyCardSettings } from './emergencyCard'

export type { PetType } from '../lib/petTypes'
export type {
  EmergencyCardSettings,
  EmergencyCardVisibility,
  EmergencyCardHealthContent,
  EmergencyCardVetContent,
} from './emergencyCard'
export type {
  LostPetLifecycle,
  PublicBehavior,
  TemperamentHint,
  LostPetReportType,
  SightingActivity,
  FoundSafety,
  ReportFlagReason,
  ObservedAtPreset,
  ApproxLocation,
  LostPetAnnouncement,
  LostPetReport,
  CreateLostAnnouncementInput,
  SubmitLostSightingInput,
  SubmitLostFoundInput,
  LostPetChatMessage,
  SafeContactMessageKind,
  SafeContactStatus,
  SafeContactCloseReason,
  SafeApproxLocationShare,
  ContactExchangeOffer,
  SafeContactExchange,
  SafeContactChannel,
  VoiceProxyConfig,
} from './lostPet'
export type HealthStatus =
  | 'excellent'
  | 'good'
  | 'attention'
  | 'vet_check'
  | 'urgent'

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
  | 'swimming'
  | 'roadtrip'
  | 'foreign_travel'
  | 'pet_friend'
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
  | 'checkup'
  | 'health_other'
  | 'care_other'
  | 'walk'
  | 'sport'
  | 'activity_other'
  | 'judging'
  | 'show_entry'
  | 'show_other'
  | 'pregnancy_check'
  | 'weaning'
  | 'breeding_other'
  | 'document_expiry'

/** How a calendar event series repeats. */
export type RecurrenceFrequency =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom'

export interface EventRecurrence {
  frequency: RecurrenceFrequency
  /** Every N days/weeks/months/years (custom = every N of customUnit). Default 1. */
  interval?: number
  /** For frequency `custom`: which unit the interval applies to. */
  customUnit?: 'days' | 'weeks' | 'months'
  /** 0 = Mon … 6 = Sun (app calendar week). Used for weekly / custom weeks. */
  weekDays?: number[]
  /** Inclusive end date (YYYY-MM-DD). Omit for no end. */
  endDate?: string
}

export type ReminderOffset = '15m' | '1h' | '1d' | '2d' | 'custom'

/** Scope when editing/deleting a recurring occurrence. */
export type RecurrenceEditScope = 'this' | 'following' | 'series'

export type HealthRecordType =
  | 'vaccination'
  | 'vet'
  | 'medication'
  | 'examination'
  | 'assessment'
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
  /** Extra months beyond full years (0–11). */
  ageMonths?: number
  healthStatus?: HealthStatus
  /** Last orientational health assessment (owner-reported, not a diagnosis). */
  healthAssessment?: HealthAssessmentSnapshot
  dateOfBirth?: string
  gender?: string
  weight?: number
  microchip?: string
  /** Last safe microchip registry check (owner-private). */
  microchipVerification?: {
    status: 'found' | 'not_found' | 'unavailable'
    verifiedAt: string
    registryLabel?: string
    mode: 'live' | 'dev_mock' | 'unconfigured'
    chipNumber: string
  }
  /**
   * Opaque public token for the found-pet QR URL (`/found/:token`).
   * Never equal to microchip or internal pet id.
   */
  foundContactToken?: string
  /**
   * When false, the found-pet page cannot contact the owner.
   * Defaults to true once a token exists.
   */
  qrContactEnabled?: boolean
  /** Owner-controlled fields that may appear on the found-pet page. */
  foundPublic?: {
    showApproximateArea?: boolean
    approximateArea?: string
    showUrgentNote?: boolean
    urgentNote?: string
  }
  /**
   * Emergency card settings — data-separated from the private profile.
   * Public emergency surfaces must only expose fields opted in via visibility
   * (defaults: all sensitive fields OFF).
   */
  emergencyCard?: EmergencyCardSettings
  neutered?: boolean
  /** When true, breeding calendar events (Chov) are available for this pet. */
  breedingProfile?: boolean
  lastVetVisit?: string
  nextVaccination?: string
  healthScore?: number
  favoriteToy?: string[]
  diet?: string[]
  supplements?: string[]
  /** Public-facing short bio (Discover / shared profile). */
  bio?: string
  /** Temperament / character summary. */
  personality?: string
  likes?: string[]
  dislikes?: string[]
  /** What they are looking for (walk buddy, playdates…). */
  lookingFor?: string
  /**
   * Derived lost-pet lifecycle for badges.
   * Synced from LostPetAnnouncement — do not store the full announcement here.
   */
  lostStatus?: LostPetLifecycle
  /** Active announcement id when `lostStatus === 'lost'`. */
  activeLostAnnouncementId?: string
  /** ISO timestamp of last owner-facing profile edit (list sorting). */
  profileUpdatedAt?: string
}

export interface HealthAssessmentSnapshot {
  status: HealthStatus
  /** ISO date YYYY-MM-DD */
  assessedAt: string
  summary: string
  reasons: string[]
  recommendations: string[]
  urgentWarning?: string
  answers: Record<string, string>
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

export type PetDocumentCategory =
  | 'identification'
  | 'health'
  | 'insurance'
  | 'breeding'
  | 'travel'
  | 'other'

export type PetDocumentTypeId = string

export interface PetDocument {
  id: string
  petId: string
  /** Display title (editable). */
  name: string
  category: PetDocumentCategory
  documentType: PetDocumentTypeId
  /** Original file name on disk. */
  fileName: string
  fileSizeBytes?: number
  /** Formatted size for UI, e.g. "2,4 MB". */
  size: string
  mimeType?: string
  /** ISO timestamp when first uploaded. */
  uploadedAt: string
  /** ISO timestamp or legacy display label of last update. */
  updatedAt: string
  /** ISO date `YYYY-MM-DD` when issued. */
  issuedAt?: string
  /** ISO date `YYYY-MM-DD` when expires; omit / undefined = no expiry. */
  expiresAt?: string
  notes?: string
  /** IndexedDB blob key (usually same as id). */
  storageKey?: string
  /**
   * Legacy data URL or remote URL. Prefer `storageKey` for new uploads.
   * Demo seed docs have neither.
   */
  url?: string
  /** Documents are private by default and must never auto-publish. */
  isPublic: boolean
  reminderEnabled?: boolean
  /** Days before expiry to remind (e.g. 30, 14, 7). */
  reminderOffsetsDays?: number[]
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

export interface DiscoverPublicPhoto {
  id: string
  url: string
  caption?: string
}

export interface DiscoverPublicTimelineEvent {
  id: string
  title: string
  date: string
  category: 'milestone' | 'adoption' | 'birthday' | 'memory' | 'show' | 'award'
  description?: string
}

export interface DiscoverActivityPreference {
  /** Stable key for matching / recommendations later. */
  key: string
  label: string
  /** 1 = nízký zájem, 5 = miluje. */
  level: 1 | 2 | 3 | 4 | 5
}

export interface DiscoverPublicBadge {
  badgeId: string
  level: number
  earnedAt: string
  /** Optional public story shown on click (activity-based). */
  story?: string
}

export interface DiscoverBreedingShow {
  name: string
  year: string
  result?: string
}

export interface DiscoverBreedingLitter {
  date: string
  count: number
  note?: string
}

/** Public breeding info — only when breedingProfile is enabled. */
export interface DiscoverBreedingPublic {
  status?: string
  titles?: string[]
  shows?: DiscoverBreedingShow[]
  pedigreeSummary?: string
  litters?: DiscoverBreedingLitter[]
}

export interface DiscoverOwner {
  id: string
  name: string
  avatar: string
  location?: string
  bio?: string
  /** Number of pets shown on public owner profile. */
  petsCount?: number
}

/**
 * Public Discover profile. Never includes private health, chip, documents, or weight
 * unless the owner later marks specific fields public via dedicated public* fields.
 */
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
  ownerId?: string
  bio?: string
  gender?: string
  /** Temperament / character summary. */
  personality?: string
  likes?: string[]
  dislikes?: string[]
  /** What they are looking for (walk buddy, playdates…). */
  lookingFor?: string
  activities?: DiscoverActivityPreference[]
  publicBadges?: DiscoverPublicBadge[]
  gallery?: DiscoverPublicPhoto[]
  publicTimeline?: DiscoverPublicTimelineEvent[]
  /** When true, public breeding section may be shown. */
  breedingProfile?: boolean
  breeding?: DiscoverBreedingPublic
}

export interface PostComment {
  id: string
  author: string
  avatar: string
  text: string
  time: string
  /** Unix ms — when set, UI shows live relative time from this moment. */
  createdAt?: number
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
  /** Own pet (`/pets/:id`) or discover pet (`/discover/:id`) when the tag is linked. */
  petId?: string
  location?: string
  locationLat?: number
  locationLng?: number
  commentsCount: number
  comments?: PostComment[]
  /** When set, post was created from a gallery photo upload. */
  sourcePhotoId?: string
}

export interface CalendarEvent {
  id: string
  title: string
  petName: string
  /** Stable pet link for future pet filters (name kept for display / legacy). */
  petId?: string
  type: EventType
  date: string
  time?: string
  location?: string
  notes?: string
  /** Optional reminder flag for medication / treatment calendar events. */
  reminderEnabled?: boolean
  reminderOffset?: ReminderOffset
  reminderCustomMinutes?: number
  recurrence?: EventRecurrence
  /** Dates skipped from a series (YYYY-MM-DD). */
  excludedDates?: string[]
  /** Detached occurrence: points at the series master. */
  seriesId?: string
  /** Original occurrence date this detached row replaces. */
  originalDate?: string
  /** For pregnancy events: expected whelping / queening date. */
  expectedBirthDate?: string
  /** For heat events: estimated end of heat (auto-suggested ~21 days). */
  expectedEndDate?: string
  /** For heat events: actual end date when the owner marks heat as finished. */
  actualEndDate?: string
  /** Links medication reminder events to a health record. */
  sourceRecordId?: string
  /** Links document-expiry reminders to a pet document. */
  sourceDocumentId?: string
  /** Type-specific details */
  dosage?: string
  medicationName?: string
  vaccineName?: string
  nextBoosterDate?: string
  partnerName?: string
  showClass?: string
  /** Reason for a vet visit / checkup. */
  visitReason?: string
  /** Product name for deworming / antiparasitic. */
  productName?: string
  /** Examination type label. */
  examType?: string
  /** Training / sport detail. */
  trainingType?: string
  /** Competition / race discipline. */
  discipline?: string
  /** Litter size for birth / litter events. */
  litterCount?: number
  /** Treatment course end date (medications). */
  treatmentEndDate?: string
}

export interface AppNotification {
  id: string
  title: string
  time: string
  unread: boolean
  kind?: 'medication_reminder' | 'system' | 'community' | 'lost_pet'
  sourceRecordId?: string
  /** Deep link path, e.g. `/pets/luna?tab=overview&lostReport=xyz`. */
  href?: string
  lostAnnouncementId?: string
  lostReportId?: string
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
  /** Own pet in this thread (e.g. for sharing health records with a vet). */
  petId?: string
  /** Discover pet belonging to the contact (their animal's public profile). */
  contactPetId?: string
  contactType: 'vet' | 'trainer' | 'community' | 'lost_finder' | 'emergency_finder'
  online?: boolean
  lastMessage: string
  time: string
  unread: number
  messages: Message[]
  /** Entire thread hidden from the active conversation list when true. */
  archived?: boolean
  /** Lost-pet anonymous finder thread. */
  lostAnnouncementId?: string
  lostReportId?: string
  finderAnonymousId?: string
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
  | 'parasite_prevention'

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
  /** ISO 3166-1 alpha-2 (lowercase), used for flag images. */
  flagCode: string
  /** Fallback for plain-text contexts (PDF, share). */
  emoji: string
  summary: string
  requirements: TravelDestinationRequirement[]
}
