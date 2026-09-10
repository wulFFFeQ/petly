import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  calendarEvents as initialCalendarEvents,
  healthRecords as initialHealthRecords,
  importantContacts as initialImportantContacts,
  myPets as initialPets,
  petDocuments as initialPetDocuments,
  petPhotos as initialPetPhotos,
} from '../data/mockData'
import {
  normalizeImportantContact,
  normalizeImportantContacts,
} from '../lib/contacts/normalize'
import { loadTravelPrefs, saveTravelPrefs } from '../lib/travel/travelPrefs'
import {
  COMMUNITY_SELF_AUTHOR_ID,
  COMMUNITY_SELF_AVATAR,
  addCommunityReport,
  getCommunitySelfAuthorName,
  isCommunitySelfAuthor,
  loadPosts,
  savePosts,
  toCommunityPublicLocation,
  withCommunityPrefGate,
} from '../lib/community'
import {
  applyBreedingProfileRules,
  buildAutoHeatEvent,
  canAutoGenerateHeat,
  canHaveBreedingProfile,
  hasActiveHeatForPet,
  sanitizePetBreedingProfile,
} from '../lib/breedingProfile'
import { getEventCategory } from '../lib/calendarEventTypes'
import { getDefaultBreedImage } from '../lib/petBreedImages'
import { localizeBreedName } from '../lib/petBreeds'
import { normalizeGenderForType } from '../lib/petTypes'
import { pickRandomCoverColor } from '../lib/petCoverColors'
import { formatIsoDateToCzech } from '../lib/petProfileUtils'
import { normalizeLifestyleList } from '../lib/petProfileDisplay'
import { normalizePetConnectionPreferences } from '../lib/connections'
import { getBadgeDefinition } from '../lib/badges/catalog'
import {
  computeBadgeProgress,
  isNightOwlHour,
  mergeBadgeAwards,
  romanLevel,
  toIsoDay,
} from '../lib/badges/evaluate'
import { loadPersistedInboxConversations } from '../lib/messages/inboxStorage'
import {
  buildMedicationReminderEvents,
  buildMedicationReminderNotification,
  getMedicationCourseBounds,
  normalizeReminderDays,
  petNameForRecord,
} from '../lib/medicationReminders'
import {
  reconcileDocumentReminders,
  removeDocumentReminderEvents,
  syncDocumentReminderEvents,
} from '../lib/documentReminders'
import {
  deleteDocumentBlob,
  getDocumentObjectUrl,
  loadDocumentsMeta,
  migrateDocumentBlobs,
  persistDocumentsMeta,
  saveDocumentBlob,
} from '../lib/documentStorage'
import { formatFileSize, assertDocumentFile } from '../lib/readDocumentFile'
import type { DocumentCategory, DocumentTypeId } from '../lib/documentCategories'
import {
  applySeriesExclude,
  isRecurring,
  normalizeRecurrence,
  splitSeriesAt,
} from '../lib/calendarRecurrence'
import {
  DEFAULT_DISCOVER_CRITERIA,
  type DiscoverCriteria,
} from '../lib/discoverCriteria'
import {
  clearDiscoverFiltersSession,
  loadDiscoverFiltersFromSession,
  saveDiscoverFiltersToSession,
} from '../lib/discover/filterStorage'
import { normalizeMicrochipInput } from '../lib/microchip'
import {
  createFoundContactToken,
  ensurePetsFoundContactFields,
  findPetByFoundToken,
} from '../lib/foundPet'
import { ensurePetEmergencyCard } from '../lib/emergencyCard'
import {
  createLostAnnouncementToken,
  findAnnouncementByToken,
  foundSafetyLabel,
  formatRelativeCzech,
  getOrCreateReporterAnonymousId,
  loadLostAnnouncements,
  loadLostConversations,
  loadLostReports,
  loadSafeContactChannels,
  saveLostAnnouncements,
  saveLostConversations,
  saveLostReports,
  saveSafeContactChannels,
  scrubPersonalData,
  normalizeSharedPhone,
} from '../lib/lostPet'
import {
  buildCalendarNotificationDrafts,
  buildHealthNotificationDrafts,
  buildSeedNotifications,
  loadNotifications,
  markAllNotificationsRead as markAllReadInList,
  markNotificationRead as markOneReadInList,
  removeNotificationsBySourceRecord,
  saveNotifications,
  upsertNotification as upsertNotificationInList,
  pruneStaleDerivedNotifications,
  type NotificationDraft,
} from '../lib/notifications'
import type { EarnedBadge } from '../types/badges'
import type {
  AppNotification,
  CalendarEvent,
  CommunityPost,
  ConciergeContactPreference,
  ConciergeRequest,
  ConciergeRequestPriority,
  ConciergeRequestStatus,
  ConciergeRequestType,
  Conversation,
  CreateLostAnnouncementInput,
  EventType,
  HealthRecord,
  HealthRecordType,
  ImportantContact,
  LostPetAnnouncement,
  LostPetReport,
  ModalType,
  NewPetForm,
  Pet,
  PetDocument,
  PetPhoto,
  RecurrenceEditScope,
  ReportFlagReason,
  SafeApproxLocationShare,
  SafeContactChannel,
  SafeContactMessageKind,
  SubmitLostFoundInput,
  SubmitLostSightingInput,
  ToastMessage,
  TravelPrefs,
  TravelRequirementCheck,
} from '../types'

export type { DiscoverCriteria, DiscoverSpecies } from '../lib/discoverCriteria'

/** @deprecated Prefer discoverCriteria.species / nearby / popular */
export type DiscoverFilter = 'all' | 'dog' | 'cat' | 'nearby' | 'popular'

const PETS_STORAGE_KEY = 'lovedandknown.pets'
const PHOTOS_STORAGE_KEY = 'lovedandknown.petPhotos'
const HEALTH_STORAGE_KEY = 'lovedandknown.healthRecords'
const CALENDAR_STORAGE_KEY = 'lovedandknown.calendarEvents'
const BADGES_STORAGE_KEY = 'lovedandknown.earnedBadges'
const NIGHT_OWL_STORAGE_KEY = 'lovedandknown.nightOwlEligible'
const CONTACTS_STORAGE_KEY = 'lovedandknown.importantContacts'
const CONCIERGE_STORAGE_KEY = 'lovedandknown.conciergeRequests'

function normalizeLifestyleField(value: unknown): string[] | undefined {
  const list = normalizeLifestyleList(value as string | string[] | null | undefined)
  return list.length > 0 ? list : undefined
}

function loadPets(): Pet[] {
  if (typeof window === 'undefined') {
    return initialPets.map(sanitizePetBreedingProfile)
  }
  try {
    const raw = window.localStorage.getItem(PETS_STORAGE_KEY)
    if (!raw) return initialPets.map(sanitizePetBreedingProfile)
    const parsed = JSON.parse(raw) as Pet[]
    if (!Array.isArray(parsed) || parsed.length === 0) return initialPets
    return parsed.map((pet) => {
      const seed = initialPets.find((item) => item.id === pet.id)
      const { lifestyleExtras: _removed, ...rest } = pet as Pet & {
        lifestyleExtras?: unknown
      }
      const merged: Pet = {
        ...rest,
        breed: localizeBreedName(pet.breed),
        breedingProfile: pet.breedingProfile ?? seed?.breedingProfile,
        breeding: pet.breeding ?? seed?.breeding,
        neutered: 'neutered' in pet ? pet.neutered : seed?.neutered,
        gender: pet.gender
          ? normalizeGenderForType(pet.gender, pet.type) ?? pet.gender
          : pet.gender,
        diet: normalizeLifestyleField(pet.diet),
        supplements: normalizeLifestyleField(pet.supplements),
        favoriteToy: normalizeLifestyleField(pet.favoriteToy),
        bio:
          'bio' in pet
            ? typeof pet.bio === 'string' && pet.bio.trim()
              ? pet.bio.trim()
              : undefined
            : seed?.bio,
        personality:
          'personality' in pet
            ? typeof pet.personality === 'string' && pet.personality.trim()
              ? pet.personality.trim()
              : undefined
            : seed?.personality,
        likes: 'likes' in pet ? normalizeLifestyleField(pet.likes) : seed?.likes,
        dislikes: 'dislikes' in pet ? normalizeLifestyleField(pet.dislikes) : seed?.dislikes,
        lookingFor:
          'lookingFor' in pet
            ? typeof pet.lookingFor === 'string' && pet.lookingFor.trim()
              ? pet.lookingFor.trim()
              : undefined
            : seed?.lookingFor,
        connectionPreferences:
          'connectionPreferences' in pet
            ? normalizePetConnectionPreferences(pet.connectionPreferences)
            : normalizePetConnectionPreferences(seed?.connectionPreferences),
        publicDiscover:
          typeof pet.publicDiscover === 'boolean'
            ? pet.publicDiscover
            : (seed?.publicDiscover ?? false),
        arrivedAt:
          typeof pet.arrivedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(pet.arrivedAt.trim())
            ? pet.arrivedAt.trim()
            : seed?.arrivedAt,
        discoverEngagement: pet.discoverEngagement ?? seed?.discoverEngagement,
        foundContactToken:
          typeof pet.foundContactToken === 'string' && pet.foundContactToken.trim()
            ? pet.foundContactToken.trim()
            : seed?.foundContactToken,
        qrContactEnabled:
          typeof pet.qrContactEnabled === 'boolean'
            ? pet.qrContactEnabled
            : (seed?.qrContactEnabled ?? true),
        foundPublic: pet.foundPublic ?? seed?.foundPublic,
        emergencyCard: pet.emergencyCard ?? seed?.emergencyCard,
        profileUpdatedAt:
          typeof pet.profileUpdatedAt === 'string' && pet.profileUpdatedAt.trim()
            ? pet.profileUpdatedAt.trim()
            : seed?.profileUpdatedAt,
      }
      return sanitizePetBreedingProfile(merged)
    }).map((pet) =>
      ensurePetEmergencyCard({
        ...pet,
        foundContactToken: pet.foundContactToken || createFoundContactToken(),
        qrContactEnabled: pet.qrContactEnabled ?? true,
      }),
    )
  } catch {
    return initialPets.map(sanitizePetBreedingProfile)
  }
}

function loadPhotos(): PetPhoto[] {
  if (typeof window === 'undefined') return initialPetPhotos
  try {
    const raw = window.localStorage.getItem(PHOTOS_STORAGE_KEY)
    if (!raw) return initialPetPhotos
    const parsed = JSON.parse(raw) as PetPhoto[]
    if (!Array.isArray(parsed)) return initialPetPhotos
    return parsed
  } catch {
    return initialPetPhotos
  }
}

function normalizeStoredHealthRecord(record: HealthRecord): HealthRecord {
  if (record.type === 'examination') {
    return record.title === 'Laboratorní výsledky'
      ? { ...record, title: 'Vyšetření' }
      : record
  }
  if (record.type !== 'vet') return record

  const blob = `${record.title} ${record.subtitle}`
  if (!/laborator|vyšetřen|krevní|biochem/i.test(blob)) return record

  return {
    ...record,
    type: 'examination',
    title:
      record.title === 'Laboratorní výsledky' || record.title === 'Návštěva veterináře'
        ? 'Vyšetření'
        : record.title,
  }
}

function loadHealthRecords(): HealthRecord[] {
  if (typeof window === 'undefined') return initialHealthRecords
  try {
    const raw = window.localStorage.getItem(HEALTH_STORAGE_KEY)
    if (!raw) return initialHealthRecords
    const parsed = JSON.parse(raw) as HealthRecord[]
    if (!Array.isArray(parsed)) return initialHealthRecords
    return parsed.map(normalizeStoredHealthRecord)
  } catch {
    return initialHealthRecords
  }
}

function loadDocuments(): PetDocument[] {
  return loadDocumentsMeta(initialPetDocuments)
}

function loadEarnedBadges(): EarnedBadge[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(BADGES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as EarnedBadge[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item) =>
        item &&
        typeof item.badgeId === 'string' &&
        typeof item.level === 'number' &&
        typeof item.earnedAt === 'string',
    )
  } catch {
    return []
  }
}

function loadCalendarEvents(): CalendarEvent[] {
  if (typeof window === 'undefined') return initialCalendarEvents
  try {
    const raw = window.localStorage.getItem(CALENDAR_STORAGE_KEY)
    if (!raw) return initialCalendarEvents
    const parsed = JSON.parse(raw) as CalendarEvent[]
    if (!Array.isArray(parsed)) return initialCalendarEvents
    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.petName === 'string' &&
        typeof item.type === 'string' &&
        typeof item.date === 'string',
    )
  } catch {
    return initialCalendarEvents
  }
}

function loadNightOwlEligible(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(NIGHT_OWL_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function loadImportantContacts(): ImportantContact[] {
  const fallback = normalizeImportantContacts(initialImportantContacts, [])
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(CONTACTS_STORAGE_KEY)
    if (!raw) return fallback
    return normalizeImportantContacts(JSON.parse(raw), fallback)
  } catch {
    return fallback
  }
}

function normalizeConciergeRequest(raw: unknown): ConciergeRequest | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const item = raw as Record<string, unknown>
  if (typeof item.id !== 'string' || !item.id) return null
  if (typeof item.type !== 'string') return null
  if (typeof item.description !== 'string') return null
  const status = (typeof item.status === 'string' ? item.status : 'new') as ConciergeRequestStatus
  const priority = (typeof item.priority === 'string' ? item.priority : 'normal') as ConciergeRequestPriority
  const contactPreference = (
    typeof item.contactPreference === 'string' ? item.contactPreference : 'in_app'
  ) as ConciergeContactPreference
  const createdAt =
    typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString()
  const updatedAt = typeof item.updatedAt === 'string' ? item.updatedAt : createdAt
  return {
    id: item.id,
    petId: typeof item.petId === 'string' && item.petId ? item.petId : undefined,
    type: item.type as ConciergeRequestType,
    description: item.description,
    priority,
    contactPreference,
    status,
    createdAt,
    updatedAt,
  }
}

function loadConciergeRequests(): ConciergeRequest[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CONCIERGE_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeConciergeRequest).filter((r): r is ConciergeRequest => r != null)
  } catch {
    return []
  }
}

export type NewHealthRecordInput = {
  petId: string
  type: HealthRecordType
  title: string
  date: string
  doctor?: string
}

interface AppContextValue {
  pets: Pet[]
  photos: PetPhoto[]
  documents: PetDocument[]
  healthRecords: HealthRecord[]
  posts: CommunityPost[]
  calendarEvents: CalendarEvent[]
  notifications: AppNotification[]
  earnedBadges: EarnedBadge[]
  /** Re-run badge evaluation (e.g. after localStorage-only care/share/weight signals). */
  refreshBadges: () => void
  activeModal: ModalType
  modalPetId: string | null
  discoverSearch: string
  discoverCriteria: DiscoverCriteria
  toasts: ToastMessage[]
  notificationsOpen: boolean
  /** ISO date (YYYY-MM-DD) to focus in the calendar after adding an event. */
  calendarFocusDate: string | null
  clearCalendarFocusDate: () => void
  editingCalendarEventId: string | null
  /** When editing a recurring series, the concrete occurrence date (YYYY-MM-DD). */
  editingOccurrenceDate: string | null
  /** When opening bookVet for a new event, optionally preselect this event type. */
  calendarEventPrefillType: EventType | null
  /** Prefill date when opening new event from a selected calendar day. */
  calendarEventPrefillDate: string | null
  openEditCalendarEvent: (
    eventId: string,
    options?: { occurrenceDate?: string },
  ) => void
  openNewCalendarEvent: (options?: {
    petId?: string
    type?: EventType
    date?: string
  }) => void
  /** When opening addHealthRecord, optionally preselect this record type. */
  healthRecordPrefillType: HealthRecordType | null
  openNewHealthRecord: (options?: { petId?: string; type?: HealthRecordType }) => void
  setActiveModal: (modal: ModalType, petId?: string) => void
  setDiscoverSearch: (query: string) => void
  setDiscoverCriteria: (
    update: DiscoverCriteria | ((prev: DiscoverCriteria) => DiscoverCriteria),
  ) => void
  resetDiscoverCriteria: () => void
  setNotificationsOpen: (open: boolean) => void
  addPet: (form: NewPetForm) => void
  deletePet: (petId: string) => void
  updatePet: (petId: string, updates: Partial<Pet>) => void
  updatePetImage: (petId: string, image: string) => void
  updatePetCoverImage: (petId: string, coverImage: string) => void
  addPetPhotos: (petId: string, urls: string[]) => void
  updatePetPhoto: (photoId: string, updates: Partial<Pick<PetPhoto, 'caption'>>) => void
  deletePetPhoto: (photoId: string) => void
  addPetDocument: (input: {
    petId: string
    name: string
    category: DocumentCategory
    documentType: DocumentTypeId
    file: File
    issuedAt?: string
    expiresAt?: string
    notes?: string
    reminderEnabled?: boolean
    reminderOffsetsDays?: number[]
  }) => Promise<PetDocument | null>
  updatePetDocument: (documentId: string, updates: Partial<PetDocument>) => void
  replacePetDocument: (documentId: string, file: File) => Promise<boolean>
  deletePetDocument: (documentId: string) => Promise<void>
  resolveDocumentUrl: (doc: PetDocument) => Promise<string | null>
  addHealthRecord: (input: NewHealthRecordInput) => void
  updateHealthRecord: (recordId: string, updates: Partial<HealthRecord>) => void
  deleteHealthRecord: (recordId: string) => void
  toggleMedicationReminder: (recordId: string) => void
  setMedicationReminderTime: (recordId: string, time: string) => void
  setMedicationReminderDays: (recordId: string, days: number) => void
  markNotificationsRead: () => void
  markNotificationRead: (id: string) => void
  upsertNotification: (draft: NotificationDraft) => void
  submitFoundPetContact: (token: string, message: string) => boolean
  /**
   * Opens a SafeContact channel from the public emergency card (no owner phone revealed).
   * Demo persistence via existing safe-contact storage — not a production backend.
   */
  submitEmergencySafeContact: (
    petId: string,
    input: { kind: 'contact' | 'sighting' | 'found'; message?: string },
  ) => { conversationId: string; channelId: string } | null
  lostAnnouncements: LostPetAnnouncement[]
  lostReports: LostPetReport[]
  lostConversations: Conversation[]
  createLostAnnouncement: (petId: string, input: CreateLostAnnouncementInput) => string | null
  resolveLostAnnouncement: (announcementId: string) => boolean
  closeLostAnnouncement: (announcementId: string) => boolean
  submitLostSighting: (announcementId: string, input: SubmitLostSightingInput) => string | null
  submitLostFoundReport: (
    announcementId: string,
    input: SubmitLostFoundInput,
  ) => { reportId: string; conversationId?: string; channelId?: string } | null
  flagLostReport: (reportId: string, reason: ReportFlagReason, note?: string) => boolean
  getLostAnnouncementByToken: (token: string) => LostPetAnnouncement | undefined
  getLostReportsForAnnouncement: (announcementId: string) => LostPetReport[]
  sendLostFinderMessage: (
    conversationId: string,
    text: string,
    as: 'owner' | 'finder',
    kind?: SafeContactMessageKind,
  ) => boolean
  getLostChatThreadForFinder: (
    announcementId: string,
    finderAnonymousId: string,
  ) => SafeContactChannel | undefined
  safeContactChannels: SafeContactChannel[]
  getSafeContactChannel: (idOrConversationId: string) => SafeContactChannel | undefined
  shareSafeApproxLocation: (channelId: string, location: SafeApproxLocationShare) => boolean
  thankSafeContactFinder: (channelId: string) => boolean
  offerSafeContactPhone: (
    channelId: string,
    as: 'owner' | 'finder',
    phone: string,
  ) => boolean
  respondSafeContactPhoneOffer: (
    channelId: string,
    as: 'owner' | 'finder',
    accept: boolean,
  ) => boolean
  toggleLike: (postId: string) => void
  addComment: (postId: string, text: string) => void
  deleteComment: (postId: string, commentId: string) => void
  addCommunityPost: (input: {
    text: string
    image?: string
    petTag?: string
    petId?: string
    location?: string
    locationLat?: number
    locationLng?: number
  }) => void
  updateCommunityPost: (
    postId: string,
    updates: {
      text?: string
      location?: string | null
      locationLat?: number | null
      locationLng?: number | null
    },
  ) => void
  deletePost: (postId: string) => void
  reportPost: (postId: string, note?: string) => void
  reportComment: (postId: string, commentId: string, note?: string) => void
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void
  updateCalendarEvent: (eventId: string, updates: Partial<Omit<CalendarEvent, 'id'>>) => void
  deleteCalendarEvent: (eventId: string) => void
  updateCalendarOccurrence: (
    eventId: string,
    occurrenceDate: string,
    scope: RecurrenceEditScope,
    updates: Partial<Omit<CalendarEvent, 'id'>>,
  ) => void
  deleteCalendarOccurrence: (
    eventId: string,
    occurrenceDate: string,
    scope: RecurrenceEditScope,
  ) => void
  showToast: (title: string, description?: string, type?: ToastMessage['type']) => void
  removeToast: (id: string) => void
  importantContacts: ImportantContact[]
  addContact: (input: Omit<ImportantContact, 'id'>) => ImportantContact
  updateContact: (contactId: string, updates: Partial<Omit<ImportantContact, 'id'>>) => void
  deleteContact: (contactId: string) => void
  setPrimaryContact: (petId: string, contactId: string | null) => void
  conciergeRequests: ConciergeRequest[]
  createConciergeRequest: (input: {
    petId?: string
    type: ConciergeRequestType
    description: string
    priority: ConciergeRequestPriority
    contactPreference: ConciergeContactPreference
  }) => ConciergeRequest
  updateConciergeRequestStatus: (requestId: string, status: ConciergeRequestStatus) => void
  travelPrefs: TravelPrefs
  setTravelPrefs: (update: TravelPrefs | ((prev: TravelPrefs) => TravelPrefs)) => void
  confirmTravelCheck: (
    petId: string,
    destinationId: string,
    check: TravelRequirementCheck,
  ) => void
}

function loadInitialNotifications(): AppNotification[] {
  const stored = loadNotifications()
  if (stored === null) return buildSeedNotifications()
  return stored
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [pets, setPets] = useState<Pet[]>(loadPets)
  const [photos, setPhotos] = useState<PetPhoto[]>(loadPhotos)
  const [documents, setDocuments] = useState<PetDocument[]>(loadDocuments)
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>(loadHealthRecords)
  const [posts, setPosts] = useState<CommunityPost[]>(loadPosts)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(loadCalendarEvents)
  const [notifications, setNotifications] = useState<AppNotification[]>(loadInitialNotifications)
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>(loadEarnedBadges)
  const [nightOwlEligible, setNightOwlEligible] = useState(loadNightOwlEligible)
  const [badgeRevision, setBadgeRevision] = useState(0)
  const badgesHydratedRef = useRef(false)
  const [activeModal, setActiveModalState] = useState<ModalType>(null)
  const [modalPetId, setModalPetId] = useState<string | null>(null)
  const [discoverSearch, setDiscoverSearchState] = useState(() => {
    return loadDiscoverFiltersFromSession()?.search ?? ''
  })
  const [discoverCriteria, setDiscoverCriteriaState] = useState<DiscoverCriteria>(() => {
    return loadDiscoverFiltersFromSession()?.criteria ?? DEFAULT_DISCOVER_CRITERIA
  })

  const setDiscoverSearch = useCallback((query: string) => {
    setDiscoverSearchState(query)
  }, [])

  const setDiscoverCriteria = useCallback(
    (value: DiscoverCriteria | ((prev: DiscoverCriteria) => DiscoverCriteria)) => {
      setDiscoverCriteriaState(value)
    },
    [],
  )

  const resetDiscoverCriteria = useCallback(() => {
    setDiscoverCriteriaState(DEFAULT_DISCOVER_CRITERIA)
    setDiscoverSearchState('')
    clearDiscoverFiltersSession()
  }, [])

  useEffect(() => {
    const isDefault =
      discoverSearch === '' &&
      JSON.stringify(discoverCriteria) === JSON.stringify(DEFAULT_DISCOVER_CRITERIA)
    if (isDefault) {
      clearDiscoverFiltersSession()
      return
    }
    saveDiscoverFiltersToSession({ search: discoverSearch, criteria: discoverCriteria })
  }, [discoverSearch, discoverCriteria])
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [calendarFocusDate, setCalendarFocusDate] = useState<string | null>(null)
  const [editingCalendarEventId, setEditingCalendarEventId] = useState<string | null>(null)
  const [editingOccurrenceDate, setEditingOccurrenceDate] = useState<string | null>(null)
  const [calendarEventPrefillType, setCalendarEventPrefillType] = useState<EventType | null>(
    null,
  )
  const [calendarEventPrefillDate, setCalendarEventPrefillDate] = useState<string | null>(null)
  const [healthRecordPrefillType, setHealthRecordPrefillType] = useState<HealthRecordType | null>(
    null,
  )
  const [lostAnnouncements, setLostAnnouncements] = useState<LostPetAnnouncement[]>(loadLostAnnouncements)
  const [lostReports, setLostReports] = useState<LostPetReport[]>(loadLostReports)
  const [lostConversations, setLostConversations] = useState<Conversation[]>(loadLostConversations)
  const [safeContactChannels, setSafeContactChannels] = useState<SafeContactChannel[]>(
    loadSafeContactChannels,
  )
  const [importantContacts, setImportantContacts] = useState<ImportantContact[]>(loadImportantContacts)
  const [conciergeRequests, setConciergeRequests] = useState<ConciergeRequest[]>(loadConciergeRequests)
  const [travelPrefs, setTravelPrefsState] = useState<TravelPrefs>(loadTravelPrefs)

  const setTravelPrefs = useCallback(
    (update: TravelPrefs | ((prev: TravelPrefs) => TravelPrefs)) => {
      setTravelPrefsState(update)
    },
    [],
  )

  const confirmTravelCheck = useCallback(
    (petId: string, destinationId: string, check: TravelRequirementCheck) => {
      const key = `${petId}:${destinationId}:${check}`
      setTravelPrefsState((prev) => ({
        ...prev,
        confirmations: {
          ...prev.confirmations,
          [key]: new Date().toISOString(),
        },
      }))
    },
    [],
  )

  const addContact = useCallback((input: Omit<ImportantContact, 'id'>): ImportantContact => {
    const contact: ImportantContact = {
      ...input,
      id: `ic_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      petIds: input.petIds ?? [],
      primaryForPetIds: input.primaryForPetIds ?? [],
    }
    const normalized = normalizeImportantContact(contact)
    const next = normalized ?? contact
    setImportantContacts((prev) => {
      let list = [next, ...prev]
      if (next.primaryForPetIds.length > 0) {
        list = list.map((c) => {
          if (c.id === next.id) return c
          return {
            ...c,
            primaryForPetIds: c.primaryForPetIds.filter((pid) => !next.primaryForPetIds.includes(pid)),
          }
        })
      }
      return list
    })
    return next
  }, [])

  const updateContact = useCallback(
    (contactId: string, updates: Partial<Omit<ImportantContact, 'id'>>) => {
      setImportantContacts((prev) => {
        const existing = prev.find((c) => c.id === contactId)
        if (!existing) return prev
        const merged = normalizeImportantContact({ ...existing, ...updates, id: contactId })
        if (!merged) return prev
        let list = prev.map((c) => (c.id === contactId ? merged : c))
        if (merged.primaryForPetIds.length > 0) {
          list = list.map((c) => {
            if (c.id === merged.id) return c
            return {
              ...c,
              primaryForPetIds: c.primaryForPetIds.filter(
                (pid) => !merged.primaryForPetIds.includes(pid),
              ),
            }
          })
        }
        return list
      })
    },
    [],
  )

  const deleteContact = useCallback((contactId: string) => {
    setImportantContacts((prev) => prev.filter((c) => c.id !== contactId))
  }, [])

  const setPrimaryContact = useCallback((petId: string, contactId: string | null) => {
    setImportantContacts((prev) =>
      prev.map((c) => {
        const without = c.primaryForPetIds.filter((id) => id !== petId)
        if (contactId && c.id === contactId) {
          return { ...c, primaryForPetIds: [...without, petId] }
        }
        return { ...c, primaryForPetIds: without }
      }),
    )
  }, [])

  const createConciergeRequest = useCallback(
    (input: {
      petId?: string
      type: ConciergeRequestType
      description: string
      priority: ConciergeRequestPriority
      contactPreference: ConciergeContactPreference
    }): ConciergeRequest => {
      const now = new Date().toISOString()
      const request: ConciergeRequest = {
        id: `cr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        petId: input.petId || undefined,
        type: input.type,
        description: input.description.trim(),
        priority: input.priority,
        contactPreference: input.contactPreference,
        status: 'new',
        createdAt: now,
        updatedAt: now,
      }
      setConciergeRequests((prev) => [request, ...prev])
      return request
    },
    [],
  )

  const updateConciergeRequestStatus = useCallback(
    (requestId: string, status: ConciergeRequestStatus) => {
      const now = new Date().toISOString()
      setConciergeRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status, updatedAt: now } : r)),
      )
    },
    [],
  )

  const refreshBadges = useCallback(() => {
    setBadgeRevision((n) => n + 1)
  }, [])

  const clearCalendarFocusDate = useCallback(() => {
    setCalendarFocusDate(null)
  }, [])

  const showToast = (
    title: string,
    description?: string,
    type: ToastMessage['type'] = 'success',
  ) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
    setToasts((prev) => [...prev, { id, title, description, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  useEffect(() => {
    window.localStorage.setItem(PETS_STORAGE_KEY, JSON.stringify(pets))
  }, [pets])

  useEffect(() => {
    window.localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(importantContacts))
  }, [importantContacts])

  useEffect(() => {
    window.localStorage.setItem(CONCIERGE_STORAGE_KEY, JSON.stringify(conciergeRequests))
  }, [conciergeRequests])

  useEffect(() => {
    saveTravelPrefs(travelPrefs)
  }, [travelPrefs])

  useEffect(() => {
    window.localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(calendarEvents))
  }, [calendarEvents])

  useEffect(() => {
    savePosts(posts)
  }, [posts])

  const notificationsRef = useRef(notifications)
  notificationsRef.current = notifications
  const postsRef = useRef(posts)
  postsRef.current = posts

  useEffect(() => {
    saveNotifications(notifications)
  }, [notifications])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const api = {
      get: () => notificationsRef.current,
      set: (items: AppNotification[]) => setNotifications(items),
      upsert: (draft: NotificationDraft) =>
        setNotifications((prev) => upsertNotificationInList(prev, draft)),
    }
    ;(window as unknown as { __LK_NOTIFICATIONS__?: typeof api }).__LK_NOTIFICATIONS__ = api
    return () => {
      delete (window as unknown as { __LK_NOTIFICATIONS__?: typeof api }).__LK_NOTIFICATIONS__
    }
  }, [])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const communityApi = {
      getPosts: () => postsRef.current,
      simulateOtherComment: (postId: string, text = 'Skvělý tip, díky!') => {
        const post = postsRef.current.find((item) => item.id === postId)
        if (!post) return false
        const createdAt = Date.now()
        const newComment = {
          id: `c_sim_${createdAt}`,
          author: 'Sarah K.',
          authorId: 'community_sarah',
          avatar:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=85',
          text: text.trim() || 'Skvělý tip, díky!',
          time: 'Právě teď',
          createdAt,
        }
        setPosts((prev) =>
          prev.map((item) =>
            item.id === postId
              ? {
                  ...item,
                  commentsCount: item.commentsCount + 1,
                  comments: [...(item.comments || []), newComment],
                }
              : item,
          ),
        )
        if (isCommunitySelfAuthor(post.authorId, post.author)) {
          withCommunityPrefGate(
            {
              type: 'community',
              title: 'Sarah K. okomentovala váš příspěvek',
              message: newComment.text.slice(0, 120),
              priority: 'normal',
              dedupeKey: `community:comment:${postId}:${newComment.id}`,
              href: `/community?post=${encodeURIComponent(postId)}`,
              time: 'Právě teď',
            },
            (draft) => setNotifications((prev) => upsertNotificationInList(prev, draft)),
          )
        }
        return true
      },
      simulateOtherLike: (postId: string) => {
        const post = postsRef.current.find((item) => item.id === postId)
        if (!post || !isCommunitySelfAuthor(post.authorId, post.author)) return false
        setPosts((prev) =>
          prev.map((item) =>
            item.id === postId ? { ...item, likes: item.likes + 1 } : item,
          ),
        )
        withCommunityPrefGate(
          {
            type: 'community',
            title: 'Sarah K. se líbí váš příspěvek',
            message: 'Komunita',
            priority: 'normal',
            dedupeKey: `community:like:${postId}:community_sarah`,
            href: `/community?post=${encodeURIComponent(postId)}`,
            time: 'Právě teď',
          },
          (draft) => setNotifications((prev) => upsertNotificationInList(prev, draft)),
        )
        return true
      },
    }
    ;(window as unknown as { __LK_COMMUNITY__?: typeof communityApi }).__LK_COMMUNITY__ =
      communityApi
    return () => {
      delete (window as unknown as { __LK_COMMUNITY__?: typeof communityApi }).__LK_COMMUNITY__
    }
  }, [])

  useEffect(() => {
    saveLostAnnouncements(lostAnnouncements)
  }, [lostAnnouncements])

  useEffect(() => {
    saveLostReports(lostReports)
  }, [lostReports])

  useEffect(() => {
    saveLostConversations(lostConversations)
  }, [lostConversations])

  useEffect(() => {
    saveSafeContactChannels(safeContactChannels)
  }, [safeContactChannels])

  useEffect(() => {
    window.localStorage.setItem(BADGES_STORAGE_KEY, JSON.stringify(earnedBadges))
  }, [earnedBadges])

  useEffect(() => {
    if (!isNightOwlHour()) return
    setNightOwlEligible((prev) => {
      if (prev) return prev
      try {
        window.localStorage.setItem(NIGHT_OWL_STORAGE_KEY, '1')
      } catch {
        // ignore
      }
      return true
    })
  }, [pets, healthRecords, documents, posts, calendarEvents])

  useEffect(() => {
    const connectionCountsByPetId: Record<string, number> = {}
    try {
      for (const convo of loadPersistedInboxConversations()) {
        if (convo.contactType !== 'community') continue
        const pid = convo.petId
        if (!pid) continue
        connectionCountsByPetId[pid] = (connectionCountsByPetId[pid] ?? 0) + 1
      }
    } catch {
      // best-effort
    }

    const progress = computeBadgeProgress({
      pets,
      healthRecords,
      documents,
      photos,
      posts,
      calendarEvents,
      connectionCountsByPetId,
      todayIso: toIsoDay(),
    })

    setEarnedBadges((prev) => {
      const { next, newlyAwarded } = mergeBadgeAwards(prev, progress, toIsoDay())

      const unchanged =
        next.length === prev.length &&
        newlyAwarded.length === 0 &&
        next.every((item) =>
          prev.some(
            (p) =>
              p.badgeId === item.badgeId &&
              p.petId === item.petId &&
              p.level === item.level,
          ),
        )

      if (unchanged) {
        badgesHydratedRef.current = true
        return prev
      }

      if (!badgesHydratedRef.current) {
        badgesHydratedRef.current = true
        return next
      }

      const toastBatch = newlyAwarded
      queueMicrotask(() => {
        for (const award of toastBatch) {
          const def = getBadgeDefinition(award.badgeId)
          if (!def) continue
          const petName = award.petId
            ? pets.find((p) => p.id === award.petId)?.name
            : undefined
          const levelSuffix =
            (def.maxLevel ?? 1) > 1 ? ` · úroveň ${romanLevel(award.level)}` : ''
          const title = def.secret ? 'Tajný odznak odhalen' : 'Nový odznak'
          const description = petName
            ? `${def.name}${levelSuffix} · ${petName}`
            : `${def.name}${levelSuffix}`
          showToast(title, description, 'gold')
        }
      })

      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- evaluate on domain data; merge via functional update
  }, [pets, healthRecords, documents, photos, posts, calendarEvents, badgeRevision, nightOwlEligible])

  // Migrate legacy Samice/Samec → Fena/Pes or Kočka/Kocour
  useEffect(() => {
    setPets((prev) => {
      let changed = false
      const next = prev.map((pet) => {
        if (!pet.gender) return pet
        const gender = normalizeGenderForType(pet.gender, pet.type)
        if (!gender || gender === pet.gender) return pet
        changed = true
        return { ...pet, gender }
      })
      return changed ? next : prev
    })
  }, [])

  useEffect(() => {
    try {
      const payload = JSON.stringify(photos)
      // Keep gallery uploads in memory even if browser storage is full.
      if (payload.length > 4_500_000) return
      window.localStorage.setItem(PHOTOS_STORAGE_KEY, payload)
    } catch {
      // Ignore quota errors — photos remain available in the current session.
    }
  }, [photos])

  useEffect(() => {
    try {
      window.localStorage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(healthRecords))
    } catch {
      // Ignore quota errors — records remain available in the current session.
    }
  }, [healthRecords])

  useEffect(() => {
    persistDocumentsMeta(documents)
  }, [documents])

  // Migrate legacy data-URL documents into IndexedDB once on mount.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const migrated = await migrateDocumentBlobs(documents)
      if (cancelled) return
      const changed = migrated.some((doc, i) => doc.storageKey !== documents[i]?.storageKey || doc.url !== documents[i]?.url)
      if (changed) {
        setDocuments(migrated)
        persistDocumentsMeta(migrated)
      }
    })().catch(() => {
      /* keep session documents */
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once after initial load
  }, [])

  // Keep document expiry reminders synced with calendar (session state).
  useEffect(() => {
    setCalendarEvents((prev) => {
      const next = reconcileDocumentReminders(prev, documents, pets)
      if (
        next.length === prev.length &&
        next.every((event, index) => event.id === prev[index]?.id && event.date === prev[index]?.date)
      ) {
        return prev
      }
      return next
    })
  }, [documents, pets])

  const setActiveModal = (modal: ModalType, petId?: string) => {
    if (modal !== 'bookVet') {
      setEditingCalendarEventId(null)
      setEditingOccurrenceDate(null)
    } else {
      // Creating a new event via setActiveModal clears edit mode.
      setEditingCalendarEventId(null)
      setEditingOccurrenceDate(null)
    }
    setCalendarEventPrefillType(null)
    setCalendarEventPrefillDate(null)
    setHealthRecordPrefillType(null)
    setActiveModalState(modal)
    setModalPetId(modal ? petId ?? null : null)
  }

  const openEditCalendarEvent = (
    eventId: string,
    options?: { occurrenceDate?: string },
  ) => {
    setEditingCalendarEventId(eventId)
    setEditingOccurrenceDate(options?.occurrenceDate ?? null)
    setCalendarEventPrefillType(null)
    setCalendarEventPrefillDate(null)
    setHealthRecordPrefillType(null)
    setActiveModalState('bookVet')
    setModalPetId(null)
  }

  const openNewCalendarEvent = (options?: {
    petId?: string
    type?: EventType
    date?: string
  }) => {
    setEditingCalendarEventId(null)
    setEditingOccurrenceDate(null)
    setCalendarEventPrefillType(options?.type ?? null)
    setCalendarEventPrefillDate(options?.date ?? null)
    setHealthRecordPrefillType(null)
    setActiveModalState('bookVet')
    setModalPetId(options?.petId ?? null)
  }

  const openNewHealthRecord = (options?: { petId?: string; type?: HealthRecordType }) => {
    setEditingCalendarEventId(null)
    setEditingOccurrenceDate(null)
    setCalendarEventPrefillType(null)
    setCalendarEventPrefillDate(null)
    setHealthRecordPrefillType(options?.type ?? 'vaccination')
    setActiveModalState('addHealthRecord')
    setModalPetId(options?.petId ?? null)
  }

  const addPet = (form: NewPetForm) => {
    const slug =
      form.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '') || 'pet'

    const newPet: Pet = ensurePetEmergencyCard({
      id: `${slug}-${Date.now()}`,
      name: form.name,
      type: form.type,
      breed: form.breed,
      image: getDefaultBreedImage(form.type, form.breed),
      coverColor: pickRandomCoverColor(),
      foundContactToken: createFoundContactToken(),
      qrContactEnabled: true,
      profileUpdatedAt: new Date().toISOString(),
      ...(form.age != null && form.age > 0 ? { age: form.age } : {}),
      ...(form.gender
        ? { gender: normalizeGenderForType(form.gender, form.type) ?? form.gender }
        : {}),
      ...(form.weight != null && form.weight > 0 ? { weight: form.weight } : {}),
    })
    setPets((prev) => [...prev, newPet])
    setActiveModal(null)
    showToast(
      `${newPet.name} přidán mezi vaše mazlíčky`,
      'Doplňte profil podle potřeby — ostatní údaje zůstávají prázdné.',
      'gold',
    )
  }

  const deletePet = (petId: string) => {
    const pet = pets.find((item) => item.id === petId)
    if (!pet) return

    const petDocIds = documents.filter((doc) => doc.petId === petId).map((doc) => doc.id)
    petDocIds.forEach((id) => {
      void deleteDocumentBlob(id).catch(() => undefined)
    })

    setPets((prev) => prev.filter((item) => item.id !== petId))
    setPhotos((prev) => prev.filter((photo) => photo.petId !== petId))
    setDocuments((prev) => prev.filter((doc) => doc.petId !== petId))
    setHealthRecords((prev) => prev.filter((record) => record.petId !== petId))
    setCalendarEvents((prev) =>
      prev.filter(
        (event) =>
          event.petName !== pet.name &&
          event.petId !== petId &&
          !petDocIds.includes(event.sourceDocumentId ?? ''),
      ),
    )
    setPosts((prev) =>
      prev.map((post) =>
        post.petId === petId ? { ...post, petId: undefined } : post,
      ),
    )
    setEarnedBadges((prev) => prev.filter((badge) => badge.petId !== petId))

    if (modalPetId === petId) {
      setModalPetId(null)
      setActiveModalState(null)
    }

    showToast(
      `Profil ${pet.name} smazán`,
      'Mazlíček a související údaje byly odstraněny.',
      'info',
    )
  }

  const updatePet = (petId: string, updates: Partial<Pet>) => {
    let breedingJustEnabledPet: Pet | null = null

    setPets((prev) =>
      prev.map((pet) => {
        if (pet.id !== petId) return pet

        // Reject activating breeding profile for neutered pets before merge.
        const safeUpdates =
          updates.breedingProfile === true && !canHaveBreedingProfile({ ...pet, ...updates })
            ? { ...updates, breedingProfile: false }
            : updates

        const { next: ruled, breedingJustEnabled } = applyBreedingProfileRules(pet, safeUpdates)
        const next: Pet = ruled

        if ('gender' in safeUpdates) {
          const gender = safeUpdates.gender
            ? normalizeGenderForType(safeUpdates.gender, next.type)
            : undefined
          if (gender) next.gender = gender
          else delete next.gender
        }
        if ('age' in safeUpdates && (safeUpdates.age == null || safeUpdates.age < 0)) {
          delete next.age
        }
        if ('ageMonths' in safeUpdates) {
          const months = safeUpdates.ageMonths
          if (months == null || months <= 0) delete next.ageMonths
          else next.ageMonths = Math.min(11, Math.floor(months))
        }
        if (
          (next.age == null || next.age < 0) &&
          (next.ageMonths == null || next.ageMonths <= 0)
        ) {
          delete next.age
          delete next.ageMonths
        }
        if ('weight' in safeUpdates && (safeUpdates.weight == null || safeUpdates.weight <= 0)) {
          delete next.weight
        }
        if ('dateOfBirth' in safeUpdates && !safeUpdates.dateOfBirth?.trim()) {
          delete next.dateOfBirth
        }
        if ('microchip' in safeUpdates) {
          if (!safeUpdates.microchip?.trim()) {
            delete next.microchip
            delete next.microchipVerification
          } else {
            const nextChip = safeUpdates.microchip.trim()
            next.microchip = nextChip
            if (
              next.microchipVerification &&
              normalizeMicrochipInput(next.microchipVerification.chipNumber) !==
                normalizeMicrochipInput(nextChip)
            ) {
              delete next.microchipVerification
            }
          }
        }
        if ('microchipVerification' in safeUpdates) {
          if (safeUpdates.microchipVerification == null) {
            delete next.microchipVerification
          } else {
            next.microchipVerification = safeUpdates.microchipVerification
          }
        }
        if ('neutered' in safeUpdates && safeUpdates.neutered === undefined) {
          delete next.neutered
        }
        // Re-apply after neutered/gender field cleanup.
        if (!canHaveBreedingProfile(next)) {
          next.breedingProfile = false
        }
        if ('diet' in safeUpdates) {
          const list = normalizeLifestyleField(safeUpdates.diet)
          if (list) next.diet = list
          else delete next.diet
        }
        if ('supplements' in safeUpdates) {
          const list = normalizeLifestyleField(safeUpdates.supplements)
          if (list) next.supplements = list
          else delete next.supplements
        }
        if ('favoriteToy' in safeUpdates) {
          const list = normalizeLifestyleField(safeUpdates.favoriteToy)
          if (list) next.favoriteToy = list
          else delete next.favoriteToy
        }
        if ('likes' in safeUpdates) {
          const list = normalizeLifestyleField(safeUpdates.likes)
          if (list) next.likes = list
          else delete next.likes
        }
        if ('dislikes' in safeUpdates) {
          const list = normalizeLifestyleField(safeUpdates.dislikes)
          if (list) next.dislikes = list
          else delete next.dislikes
        }
        if ('bio' in safeUpdates) {
          const value = safeUpdates.bio?.trim()
          if (value) next.bio = value
          else delete next.bio
        }
        if ('personality' in safeUpdates) {
          const value = safeUpdates.personality?.trim()
          if (value) next.personality = value
          else delete next.personality
        }
        if ('lookingFor' in safeUpdates) {
          const value = safeUpdates.lookingFor?.trim()
          if (value) next.lookingFor = value
          else delete next.lookingFor
        }
        if ('connectionPreferences' in safeUpdates) {
          const normalized = normalizePetConnectionPreferences(
            safeUpdates.connectionPreferences,
          )
          if (normalized) next.connectionPreferences = normalized
          else delete next.connectionPreferences
        }

        if (!('profileUpdatedAt' in safeUpdates)) {
          next.profileUpdatedAt = new Date().toISOString()
        }

        if (breedingJustEnabled && canAutoGenerateHeat(next)) {
          breedingJustEnabledPet = next
        }

        return next
      }),
    )

    if (breedingJustEnabledPet) {
      const petForHeat = breedingJustEnabledPet
      setCalendarEvents((prev) => {
        if (hasActiveHeatForPet(prev, petForHeat)) return prev
        if (!canAutoGenerateHeat(petForHeat)) return prev
        return [
          {
            ...buildAutoHeatEvent(petForHeat),
            id: `c_heat_${petForHeat.id}_${Date.now()}`,
          },
          ...prev,
        ]
      })
    }
  }

  const updatePetImage = (petId: string, image: string) => {
    setPets((prev) =>
      prev.map((pet) =>
        pet.id === petId
          ? { ...pet, image, profileUpdatedAt: new Date().toISOString() }
          : pet,
      ),
    )
  }

  const updatePetCoverImage = (petId: string, coverImage: string) => {
    setPets((prev) =>
      prev.map((pet) =>
        pet.id === petId
          ? { ...pet, coverImage, profileUpdatedAt: new Date().toISOString() }
          : pet,
      ),
    )
  }

  const addPetPhotos = (petId: string, urls: string[]) => {
    if (urls.length === 0) return
    const pet = pets.find((item) => item.id === petId)
    const stamp = Date.now()
    const added: PetPhoto[] = urls.map((url, index) => ({
      id: `ph_${stamp}_${index}_${Math.random().toString(36).slice(2, 6)}`,
      petId,
      url,
    }))
    setPhotos((prev) => [...added, ...prev])

    const shareToCommunity = Boolean(pet?.publicDiscover)
    if (shareToCommunity) {
      const authorName = getCommunitySelfAuthorName()
      const feedPosts: CommunityPost[] = added.map((photo) => ({
        id: `post_${photo.id}`,
        author: authorName,
        authorId: COMMUNITY_SELF_AUTHOR_ID,
        avatar: COMMUNITY_SELF_AVATAR,
        badge: 'Nová fotografie z galerie',
        time: 'Právě teď',
        text: pet
          ? `Přidala jsem novou fotografii ${pet.name} do galerie.`
          : 'Přidala jsem novou fotografii do galerie.',
        image: photo.url,
        likes: 0,
        liked: false,
        petTag: pet ? `${pet.name} · ${pet.breed}` : undefined,
        petId: pet?.id,
        commentsCount: 0,
        comments: [],
        sourcePhotoId: photo.id,
        createdAt: stamp,
      }))
      setPosts((prev) => [...feedPosts, ...prev])
    }

    setActiveModal(null)
    showToast(
      urls.length === 1 ? 'Fotografie nahrána' : `${urls.length} fotografie nahrány`,
      shareToCommunity
        ? pet
          ? `Přidáno do galerie ${pet.name} a do komunitního feedu.`
          : 'Přidáno do galerie a do komunitního feedu.'
        : pet
          ? `Přidáno do galerie ${pet.name}. Pro sdílení v komunitě zapněte veřejný profil Objevovat.`
          : 'Přidáno do galerie.',
      'gold',
    )
  }

  const updatePetPhoto = (photoId: string, updates: Partial<Pick<PetPhoto, 'caption'>>) => {
    setPhotos((prev) =>
      prev.map((photo) => (photo.id === photoId ? { ...photo, ...updates } : photo)),
    )

    if ('caption' in updates) {
      const caption = updates.caption?.trim()
      const linkedPet = pets.find((item) =>
        photos.some((photo) => photo.id === photoId && photo.petId === item.id),
      )
      const fallback = linkedPet
        ? `Přidala jsem novou fotografii ${linkedPet.name} do galerie.`
        : 'Přidala jsem novou fotografii do galerie.'

      setPosts((prev) =>
        prev.map((post) =>
          post.sourcePhotoId === photoId
            ? { ...post, text: caption || fallback }
            : post,
        ),
      )
    }
  }

  const deletePetPhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== photoId))
    setPosts((prev) => prev.filter((post) => post.sourcePhotoId !== photoId))
  }

  const addPetDocument = async (input: {
    petId: string
    name: string
    category: DocumentCategory
    documentType: DocumentTypeId
    file: File
    issuedAt?: string
    expiresAt?: string
    notes?: string
    reminderEnabled?: boolean
    reminderOffsetsDays?: number[]
  }): Promise<PetDocument | null> => {
    const pet = pets.find((item) => item.id === input.petId)
    const stamp = Date.now()
    const id = `doc_${stamp}_${Math.random().toString(36).slice(2, 8)}`
    const nowIso = new Date().toISOString()
    const doc: PetDocument = {
      id,
      petId: input.petId,
      name: input.name.trim() || input.file.name,
      category: input.category,
      documentType: input.documentType,
      fileName: input.file.name,
      fileSizeBytes: input.file.size,
      size: formatFileSize(input.file.size),
      mimeType: input.file.type || undefined,
      uploadedAt: nowIso,
      updatedAt: nowIso,
      issuedAt: input.issuedAt || undefined,
      expiresAt: input.expiresAt || undefined,
      notes: input.notes?.trim() || undefined,
      storageKey: id,
      isPublic: false,
      reminderEnabled: Boolean(input.reminderEnabled && input.expiresAt),
      reminderOffsetsDays:
        input.reminderEnabled && input.expiresAt
          ? input.reminderOffsetsDays?.filter((d) => d > 0)
          : undefined,
    }

    try {
      assertDocumentFile(input.file)
      await saveDocumentBlob(id, input.file, {
        mimeType: doc.mimeType,
        fileName: doc.fileName,
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'read_failed'
      if (reason === 'unsupported_type') {
        showToast('Nepodporovaný formát', 'Nahrajte PDF, JPG nebo PNG.', 'info')
      } else if (reason === 'too_large') {
        showToast('Soubor je příliš velký', 'Maximální velikost je 25 MB.', 'info')
      } else {
        showToast(
          'Nahrání selhalo',
          'Soubor se nepodařilo uložit. Zkuste to znovu.',
          'info',
        )
      }
      return null
    }

    const nextDocs = [doc, ...documents]
    const metaOk = persistDocumentsMeta(nextDocs)
    if (!metaOk) {
      await deleteDocumentBlob(id).catch(() => undefined)
      showToast(
        'Nahrání selhalo',
        'Metadata dokumentu se nepodařilo uložit.',
        'info',
      )
      return null
    }

    setDocuments(nextDocs)
    setCalendarEvents((prev) => syncDocumentReminderEvents(prev, doc, pet))
    showToast(
      'Dokument nahrán',
      pet ? `Uloženo v sekci Dokumenty u ${pet.name}.` : 'Uloženo v sekci Dokumenty.',
      'gold',
    )
    return doc
  }

  const updatePetDocument = (documentId: string, updates: Partial<PetDocument>) => {
    const existing = documents.find((doc) => doc.id === documentId)
    if (!existing) return

    const merged: PetDocument = {
      ...existing,
      ...updates,
      id: existing.id,
      petId: updates.petId ?? existing.petId,
      isPublic: false,
      updatedAt: new Date().toISOString(),
    }

    setDocuments((prev) => prev.map((doc) => (doc.id === documentId ? merged : doc)))
    const pet = pets.find((item) => item.id === merged.petId)
    setCalendarEvents((prev) => syncDocumentReminderEvents(prev, merged, pet))
    showToast('Dokument upraven', 'Metadata dokumentu byla uložena.', 'gold')
  }

  const replacePetDocument = async (documentId: string, file: File): Promise<boolean> => {
    const existing = documents.find((doc) => doc.id === documentId)
    if (!existing) return false

    try {
      assertDocumentFile(file)
      await saveDocumentBlob(documentId, file, {
        mimeType: file.type || undefined,
        fileName: file.name,
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'read_failed'
      if (reason === 'unsupported_type') {
        showToast('Nepodporovaný formát', 'Nahrajte PDF, JPG nebo PNG.', 'info')
      } else if (reason === 'too_large') {
        showToast('Soubor je příliš velký', 'Maximální velikost je 25 MB.', 'info')
      } else {
        showToast('Nahrazení selhalo', 'Nový soubor se nepodařilo uložit.', 'info')
      }
      return false
    }

    const updated: PetDocument = {
      ...existing,
      fileName: file.name,
      fileSizeBytes: file.size,
      size: formatFileSize(file.size),
      mimeType: file.type || undefined,
      storageKey: documentId,
      url: undefined,
      updatedAt: new Date().toISOString(),
      isPublic: false,
    }

    const nextDocs = documents.map((doc) => (doc.id === documentId ? updated : doc))
    if (!persistDocumentsMeta(nextDocs)) {
      showToast('Nahrazení selhalo', 'Metadata se nepodařilo uložit.', 'info')
      return false
    }

    setDocuments(nextDocs)
    showToast('Dokument nahrazen', 'Nová verze souboru byla nahrána.', 'gold')
    return true
  }

  const deletePetDocument = async (documentId: string) => {
    await deleteDocumentBlob(documentId).catch(() => undefined)
    setDocuments((prev) => prev.filter((doc) => doc.id !== documentId))
    setCalendarEvents((prev) => removeDocumentReminderEvents(prev, documentId))
    showToast('Dokument smazán', 'Dokument byl trvale odstraněn.', 'info')
  }

  const resolveDocumentUrl = async (doc: PetDocument): Promise<string | null> => {
    if (doc.storageKey) {
      try {
        return await getDocumentObjectUrl(doc.storageKey)
      } catch {
        return null
      }
    }
    if (doc.url) return doc.url
    return null
  }

  const enableMedicationReminder = (record: HealthRecord) => {
    const petName = petNameForRecord(pets, record.petId)
    const withDefaults: HealthRecord = {
      ...record,
      scheduleTime: record.scheduleTime || '09:00',
      reminderDays: normalizeReminderDays(record.reminderDays),
    }
    const events = buildMedicationReminderEvents(withDefaults, petName, record.petId)
    const notification = buildMedicationReminderNotification(withDefaults, petName)

    setCalendarEvents((prev) => [
      ...prev.filter((item) => item.sourceRecordId !== record.id),
      ...events,
    ])
    setNotifications((prev) => upsertNotificationInList(prev, notification))
  }

  const disableMedicationReminder = (recordId: string) => {
    setCalendarEvents((prev) => prev.filter((item) => item.sourceRecordId !== recordId))
    setNotifications((prev) => removeNotificationsBySourceRecord(prev, recordId))
  }

  const addHealthRecord = (input: NewHealthRecordInput) => {
    const pet = pets.find((item) => item.id === input.petId)
    if (!pet || !input.title.trim() || !input.date) return

    const czechDate = formatIsoDateToCzech(input.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const recordDate = new Date(`${input.date}T12:00:00`)
    const isPastOrToday = recordDate.getTime() <= today.getTime() + 12 * 60 * 60 * 1000

    const typeTitle: Record<HealthRecordType, string> = {
      vaccination: 'Očkování',
      vet: 'Návštěva veterináře',
      medication: 'Léky',
      examination: 'Vyšetření',
      assessment: 'Zdravotní přehled',
    }

    const record: HealthRecord = {
      id: `hr_${Date.now()}`,
      petId: input.petId,
      type: input.type,
      title: typeTitle[input.type],
      subtitle: input.title.trim(),
      date: czechDate,
      doctor: input.doctor?.trim() || undefined,
      status:
        input.type === 'medication'
          ? 'active'
          : isPastOrToday
            ? 'completed'
            : 'scheduled',
      vaccineName: input.type === 'vaccination' ? input.title.trim() : undefined,
      reminderEnabled: input.type === 'medication' ? true : undefined,
      scheduleTime: input.type === 'medication' ? '09:00' : undefined,
      reminderDays: input.type === 'medication' ? 7 : undefined,
    }

    setHealthRecords((prev) => [record, ...prev])
    if (record.type === 'medication' && record.reminderEnabled) {
      enableMedicationReminder(record)
    }
    setActiveModal(null)
    showToast(
      'Zdravotní záznam uložen',
      record.type === 'medication' && record.reminderEnabled
        ? `${record.subtitle} přidán pro ${pet.name} · připomínka v kalendáři a ve zvonku`
        : `${record.subtitle} přidán pro ${pet.name}`,
      'gold',
    )
  }

  const updateHealthRecord = (recordId: string, updates: Partial<HealthRecord>) => {
    const record = healthRecords.find((item) => item.id === recordId)
    if (!record) return

    const updated: HealthRecord = { ...record, ...updates }
    setHealthRecords((prev) =>
      prev.map((item) => (item.id === recordId ? updated : item)),
    )

    if (updated.type === 'medication' && updated.reminderEnabled) {
      enableMedicationReminder(updated)
    } else if (record.type === 'medication' || updated.type === 'medication') {
      disableMedicationReminder(recordId)
    }

    showToast('Záznam upraven', updated.subtitle || updated.title, 'gold')
  }

  const deleteHealthRecord = (recordId: string) => {
    const record = healthRecords.find((item) => item.id === recordId)
    if (!record) return

    disableMedicationReminder(recordId)
    setHealthRecords((prev) => prev.filter((item) => item.id !== recordId))
    showToast('Záznam smazán', record.subtitle || record.title, 'info')
  }

  const toggleMedicationReminder = (recordId: string) => {
    const record = healthRecords.find((item) => item.id === recordId)
    if (!record || record.type !== 'medication') return

    const nextEnabled = !record.reminderEnabled
    const updated: HealthRecord = {
      ...record,
      reminderEnabled: nextEnabled,
      scheduleTime: record.scheduleTime || '09:00',
      reminderDays: normalizeReminderDays(record.reminderDays),
    }
    setHealthRecords((prev) =>
      prev.map((item) => (item.id === recordId ? updated : item)),
    )

    if (nextEnabled) {
      enableMedicationReminder(updated)
      const schedule = buildMedicationReminderNotification(
        updated,
        petNameForRecord(pets, record.petId),
      )
      showToast('Připomínka zapnuta', schedule.message || schedule.time || '', 'gold')
    } else {
      disableMedicationReminder(recordId)
      showToast(
        'Připomínka vypnuta',
        `${record.subtitle} · ${record.scheduleTime || record.date}`,
        'gold',
      )
    }
  }

  const setMedicationReminderTime = (recordId: string, time: string) => {
    const record = healthRecords.find((item) => item.id === recordId)
    if (!record || record.type !== 'medication') return

    const normalized = /^\d{1,2}:\d{2}$/.test(time.trim()) ? time.trim() : '09:00'
    const updated: HealthRecord = { ...record, scheduleTime: normalized }
    setHealthRecords((prev) =>
      prev.map((item) => (item.id === recordId ? updated : item)),
    )

    if (updated.reminderEnabled) {
      enableMedicationReminder(updated)
    }
  }

  const setMedicationReminderDays = (recordId: string, days: number) => {
    const record = healthRecords.find((item) => item.id === recordId)
    if (!record || record.type !== 'medication') return

    const updated: HealthRecord = {
      ...record,
      reminderDays: normalizeReminderDays(days),
    }
    setHealthRecords((prev) =>
      prev.map((item) => (item.id === recordId ? updated : item)),
    )

    if (updated.reminderEnabled) {
      enableMedicationReminder(updated)
    }
  }

  const markNotificationsRead = () => {
    setNotifications((prev) => markAllReadInList(prev))
  }

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => markOneReadInList(prev, id))
  }

  const upsertNotification = (draft: NotificationDraft) => {
    setNotifications((prev) => upsertNotificationInList(prev, draft))
  }

  const submitFoundPetContact = (token: string, message: string): boolean => {
    const trimmed = message.trim()
    if (!trimmed) return false

    const pet = findPetByFoundToken(pets, token)
    if (!pet || pet.qrContactEnabled === false) return false

    const contactKey = `found-contact:${token}:${Date.now()}`
    upsertNotification({
      id: `found-${Date.now()}`,
      type: 'system',
      title: `Někdo se pokouší kontaktovat vás kvůli ${pet.name}.`,
      message: 'Nová zpráva přes QR kontakt.',
      priority: 'important',
      dedupeKey: contactKey,
      petId: pet.id,
      petName: pet.name,
      href: `/pets/${pet.id}?tab=overview`,
      time: 'právě teď',
    })
    upsertNotification({
      id: `found-msg-${Date.now()}`,
      type: 'system',
      title: `Zpráva o ${pet.name}`,
      message: `${trimmed.slice(0, 120)}${trimmed.length > 120 ? '…' : ''}`,
      priority: 'normal',
      dedupeKey: `found-msg:${token}:${Date.now()}`,
      petId: pet.id,
      petName: pet.name,
      href: `/pets/${pet.id}?tab=overview`,
      time: 'právě teď',
    })

    try {
      const key = 'lovedandknown.foundPetMessages'
      const existing = JSON.parse(window.localStorage.getItem(key) || '[]') as unknown[]
      const entry = {
        id: `fm-${Date.now()}`,
        token,
        petId: pet.id,
        petName: pet.name,
        message: trimmed,
        createdAt: new Date().toISOString(),
      }
      window.localStorage.setItem(key, JSON.stringify([entry, ...(Array.isArray(existing) ? existing : [])]))
    } catch {
      // Demo persistence is best-effort.
    }

    showToast(
      'Zpráva odeslána majiteli',
      'Kontakt probíhá přes LOVED & KNOWN — majitel neuvidí váš telefon ani e-mail automaticky.',
      'gold',
    )
    return true
  }

  const submitEmergencySafeContact = (
    petId: string,
    input: { kind: 'contact' | 'sighting' | 'found'; message?: string },
  ): { conversationId: string; channelId: string } | null => {
    const pet = pets.find((item) => item.id === petId)
    if (!pet || pet.qrContactEnabled === false) {
      showToast('Kontakt je vypnutý', 'Majitel momentálně nepřijímá zprávy přes aplikaci.', 'info')
      return null
    }

    const finderAnonymousId = getOrCreateReporterAnonymousId()
    const existing = safeContactChannels.find(
      (channel) =>
        channel.source === 'emergency_card' &&
        channel.petId === petId &&
        channel.finderAnonymousId === finderAnonymousId &&
        channel.status === 'active',
    )
    if (existing) {
      showToast(
        'Bezpečný kontakt je aktivní',
        'Komunikace probíhá anonymně přes LOVED & KNOWN.',
        'info',
      )
      return { conversationId: existing.conversationId, channelId: existing.id }
    }

    const conversationId = `em-conv-${Date.now()}`
    const channelId = `em-sc-${Date.now()}`
    const now = new Date().toISOString()
    const openerRaw =
      input.message?.trim() ||
      (input.kind === 'found'
        ? `Nálezce hlásí, že našel/a ${pet.name} (nouzová karta).`
        : input.kind === 'sighting'
          ? `Nálezce hlásí spatření ${pet.name} (nouzová karta).`
          : `Někdo se pokusil kontaktovat vás kvůli ${pet.name}.`)
    const opener = scrubPersonalData(openerRaw).text

    const systemIntro = {
      id: `cm-sys-${Date.now()}`,
      sender: 'system' as const,
      kind: 'system' as const,
      text: 'Kontakt s majitelem je zprostředkován bezpečně přes LOVED & KNOWN. Osobní telefony se nezobrazují automaticky.',
      createdAt: now,
    }
    const openerMsg = {
      id: `cm-${Date.now()}`,
      sender: 'finder' as const,
      kind: 'text' as const,
      text: opener,
      createdAt: now,
    }

    const conversation: Conversation = {
      id: conversationId,
      name: `Nouzová karta · ${pet.name}`,
      avatar: pet.image,
      role: 'Anonymní nálezce · bezpečný kontakt',
      petContext: pet.name,
      petId: pet.id,
      contactType: 'emergency_finder',
      online: true,
      lastMessage: opener,
      time: 'právě teď',
      unread: 1,
      messages: [
        {
          id: `m-sys-${Date.now()}`,
          sender: 'them',
          text: systemIntro.text,
          time: 'právě teď',
        },
        {
          id: `m-${Date.now()}`,
          sender: 'them',
          text: opener,
          time: 'právě teď',
        },
      ],
      finderAnonymousId,
    }

    const channel: SafeContactChannel = {
      id: channelId,
      conversationId,
      source: 'emergency_card',
      petId: pet.id,
      petName: pet.name,
      finderAnonymousId,
      status: 'active',
      createdAt: now,
      messages: [systemIntro, openerMsg],
    }

    setLostConversations((prev) => [conversation, ...prev])
    setSafeContactChannels((prev) => [channel, ...prev])
    upsertNotification({
      id: `em-contact-${conversationId}`,
      type: 'message',
      title: `Někdo se pokusil kontaktovat vás kvůli ${pet.name}.`,
      message: 'Nový bezpečný kontakt z nouzové karty.',
      priority: 'important',
      dedupeKey: `em:contact:${conversationId}`,
      petId: pet.id,
      petName: pet.name,
      href: `/messages?conversationId=${conversationId}`,
      conversationId,
      time: 'právě teď',
    })

    showToast(
      'Bezpečný kontakt navázán',
      'Majitel byl informován. Telefon ani e-mail se druhé straně nezobrazí automaticky.',
      'gold',
    )
    return { conversationId, channelId }
  }

  const createLostAnnouncement = (
    petId: string,
    input: CreateLostAnnouncementInput,
  ): string | null => {
    const pet = pets.find((item) => item.id === petId)
    if (!pet) return null
    if (lostAnnouncements.some((item) => item.petId === petId && item.status === 'lost')) {
      showToast('Aktivní oznámení už existuje', `${pet.name} už je označen/a jako ztracený.`, 'info')
      return null
    }

    const respondsToName = input.respondsToName.trim()
    if (!respondsToName || !input.lastSeen?.publicLabel) {
      showToast('Doplňte povinné údaje', 'Lokalita a jméno, na které slyší, jsou povinné.', 'info')
      return null
    }

    const id = `lost-${Date.now()}`
    const announcement: LostPetAnnouncement = {
      id,
      publicToken: createLostAnnouncementToken(),
      petId,
      status: 'lost',
      createdAt: new Date().toISOString(),
      lastSeen: input.lastSeen,
      knowsPossibleArea: input.knowsPossibleArea,
      possibleArea: input.knowsPossibleArea ? input.possibleArea : undefined,
      publicBehavior: input.publicBehavior,
      importantInstructions: input.importantInstructions?.trim() || undefined,
      respondsToName,
      nickname: input.nickname?.trim() || undefined,
      allowAppContact: input.allowAppContact,
      reactionToPeople: input.reactionToPeople,
      reactionToAnimals: input.reactionToAnimals,
      specialCaution: input.specialCaution?.trim() || undefined,
    }

    setLostAnnouncements((prev) => [announcement, ...prev])
    setPets((prev) =>
      prev.map((item) =>
        item.id === petId
          ? { ...item, lostStatus: 'lost', activeLostAnnouncementId: id }
          : item,
      ),
    )

    upsertNotification({
      id: `lost-active-${id}`,
      type: 'lost_pet',
      title: `${pet.name} je ztracená`,
      message: 'Pátrání je aktivní.',
      priority: 'urgent',
      dedupeKey: `lost:active:${id}`,
      petId,
      petName: pet.name,
      href: `/pets/${petId}?tab=overview#lost-panel`,
      lostAnnouncementId: id,
      time: 'právě teď',
    })

    showToast(
      'Oznámení zveřejněno',
      `${pet.name} je označen/a jako ztracený. Veřejné oznámení je aktivní.`,
      'gold',
    )
    return id
  }

  const resolveLostAnnouncement = (announcementId: string): boolean => {
    const announcement = lostAnnouncements.find((item) => item.id === announcementId)
    if (!announcement || announcement.status !== 'lost') return false
    const pet = pets.find((item) => item.id === announcement.petId)
    const petName = pet?.name ?? 'Mazlíček'
    const now = new Date().toISOString()

    setLostAnnouncements((prev) =>
      prev.map((item) =>
        item.id === announcementId
          ? { ...item, status: 'found', resolvedAt: now }
          : item,
      ),
    )
    setPets((prev) =>
      prev.map((item) =>
        item.id === announcement.petId
          ? { ...item, lostStatus: 'found', activeLostAnnouncementId: undefined }
          : item,
      ),
    )

    const relatedReports = lostReports.filter((r) => r.announcementId === announcementId)
    setLostReports((prev) =>
      prev.map((report) =>
        report.announcementId === announcementId
          ? { ...report, notifiedOfResolution: true }
          : report,
      ),
    )

    // Retire active lost alert (keep in history as read) + record resolution
    setNotifications((prev) => {
      let next = prev.map((item) =>
        item.dedupeKey === `lost:active:${announcementId}`
          ? {
              ...item,
              unread: false,
              priority: 'normal' as const,
              title: `${petName} je doma`,
              message: 'Pátrání bylo ukončeno.',
              time: 'právě teď',
            }
          : item,
      )
      next = upsertNotificationInList(next, {
        id: `lost-resolved-${announcementId}`,
        type: 'lost_pet',
        title:
          relatedReports.length > 0
            ? `${petName} je doma. Děkujeme všem, kteří pomohli.`
            : `${petName} je doma`,
        message: 'Pátrání bylo ukončeno.',
        priority: 'important',
        dedupeKey: `lost:resolved:${announcementId}`,
        petId: announcement.petId,
        petName,
        href: `/pets/${announcement.petId}?tab=overview#lost-panel`,
        lostAnnouncementId: announcementId,
        time: 'právě teď',
      })
      return next
    })

    // Close secure contacts + notify finders
    const homeText = `Mazlíček je doma. ❤️\nDěkujeme, že jste pomohli.`
    setLostConversations((prev) =>
      prev.map((conv) => {
        if (conv.lostAnnouncementId !== announcementId) return conv
        const systemMsg = {
          id: `m-resolved-${Date.now()}-${conv.id}`,
          sender: 'me' as const,
          text: homeText,
          time: 'právě teď',
        }
        return {
          ...conv,
          lastMessage: 'Mazlíček je doma. ❤️',
          time: 'právě teď',
          messages: [...conv.messages, systemMsg],
        }
      }),
    )
    setSafeContactChannels((prev) =>
      prev.map((channel) => {
        if (channel.announcementId !== announcementId) return channel
        return {
          ...channel,
          status: 'closed',
          closedAt: now,
          closedReason: 'pet_home',
          messages: [
            ...channel.messages,
            {
              id: `cm-resolved-${Date.now()}-${channel.id}`,
              sender: 'system',
              kind: 'system',
              text: homeText,
              createdAt: now,
            },
          ],
        }
      }),
    )

    showToast(`${petName} je doma`, 'Oznámení bylo označeno jako vyřešené. Bezpečný kontakt je ukončen.', 'success')
    return true
  }

  const closeLostAnnouncement = (announcementId: string): boolean => {
    const announcement = lostAnnouncements.find((item) => item.id === announcementId)
    if (!announcement) return false
    const now = new Date().toISOString()
    setLostAnnouncements((prev) =>
      prev.map((item) =>
        item.id === announcementId
          ? { ...item, status: 'closed', closedAt: now }
          : item,
      ),
    )
    setPets((prev) =>
      prev.map((item) =>
        item.id === announcement.petId
          ? { ...item, lostStatus: 'closed', activeLostAnnouncementId: undefined }
          : item,
      ),
    )
    setNotifications((prev) =>
      prev.map((item) =>
        item.dedupeKey === `lost:active:${announcementId}`
          ? {
              ...item,
              unread: false,
              priority: 'normal' as const,
              message: 'Pátrání bylo deaktivováno.',
            }
          : item,
      ),
    )
    showToast('Oznámení ukončeno', 'Veřejné hlášení bylo deaktivováno.', 'info')
    return true
  }

  const submitLostSighting = (
    announcementId: string,
    input: SubmitLostSightingInput,
  ): string | null => {
    const announcement = lostAnnouncements.find((item) => item.id === announcementId)
    if (!announcement || announcement.status !== 'lost') return null
    const pet = pets.find((item) => item.id === announcement.petId)
    if (!pet) return null

    const reportId = `lsr-${Date.now()}`
    const report: LostPetReport = {
      id: reportId,
      announcementId,
      petId: announcement.petId,
      type: 'sighting',
      createdAt: new Date().toISOString(),
      reporterAnonymousId: input.reporterAnonymousId,
      location: input.location,
      observedAt: input.observedAt,
      observedAtPreset: input.observedAtPreset,
      activity: input.activity,
      note: input.note?.trim() || undefined,
      photoUrl: input.photoUrl,
    }

    setLostReports((prev) => [report, ...prev])
    upsertNotification({
      id: `lost-sight-${reportId}`,
      type: 'lost_sighting',
      title: `Nové spatření ${pet.name}`,
      message: 'Někdo nahlásil možné spatření.',
      priority: 'important',
      dedupeKey: `lost:sighting:${reportId}`,
      petId: pet.id,
      petName: pet.name,
      href: `/pets/${pet.id}?tab=overview&lostReport=${reportId}#lost-panel`,
      lostAnnouncementId: announcementId,
      lostReportId: reportId,
      time: `${formatRelativeCzech(input.observedAt)} · ${input.location.publicLabel}`,
    })

    showToast(
      'Hlášení odesláno',
      'Majitel byl informován. Vaše identita zůstává anonymní.',
      'gold',
    )
    return reportId
  }

  const submitLostFoundReport = (
    announcementId: string,
    input: SubmitLostFoundInput,
  ): { reportId: string; conversationId?: string; channelId?: string } | null => {
    const announcement = lostAnnouncements.find((item) => item.id === announcementId)
    if (!announcement || announcement.status !== 'lost') return null
    const pet = pets.find((item) => item.id === announcement.petId)
    if (!pet) return null

    const reportId = `lfr-${Date.now()}`
    const now = new Date().toISOString()
    const safetyText = foundSafetyLabel(input.safetyStatus)

    const noteScrubbed = input.note?.trim()
      ? scrubPersonalData(input.note.trim())
      : null

    const report: LostPetReport = {
      id: reportId,
      announcementId,
      petId: announcement.petId,
      type: 'found',
      createdAt: now,
      reporterAnonymousId: input.reporterAnonymousId,
      location: input.location,
      observedAt: input.observedAt,
      hasPetWithThem: input.hasPetWithThem,
      safetyStatus: input.safetyStatus,
      canKeepSafely: input.canKeepSafely,
      note: noteScrubbed?.text || undefined,
      photoUrl: input.photoUrl,
    }

    setLostReports((prev) => [report, ...prev])

    // Report-only path: owner disabled in-app contact — still notify, no chat.
    if (!announcement.allowAppContact) {
      upsertNotification({
        id: `lost-found-${reportId}`,
        type: 'lost_found',
        title: `${pet.name} byla nalezena`,
        message: 'Bylo nahlášeno nalezení mazlíčka.',
        priority: 'urgent',
        dedupeKey: `lost:found:${reportId}`,
        petId: pet.id,
        petName: pet.name,
        href: `/pets/${pet.id}?tab=overview&lostReport=${reportId}#lost-panel`,
        lostAnnouncementId: announcementId,
        lostReportId: reportId,
        time: `Nálezce uvedl, že ${safetyText.toLowerCase()}. · ${input.location.publicLabel}`,
      })
      showToast(
        'Hlášení nálezu odesláno',
        'Majitel byl informován. Přímý chat není dostupný — majitel kontakt přes aplikaci nepovolil.',
        'gold',
      )
      return { reportId }
    }

    const conversationId = `lost-conv-${Date.now()}`
    const channelId = `sc-${Date.now()}`

    const openerRaw =
      noteScrubbed?.text ||
      `${pet.name} byl/a právě nalezen/a. Nálezce uvedl: ${safetyText}. ${input.location.publicLabel}`
    const opener = scrubPersonalData(openerRaw).text

    const systemIntro = {
      id: `cm-sys-${Date.now()}`,
      sender: 'system' as const,
      kind: 'system' as const,
      text: 'Kontakt s majitelem byl navázán. Komunikace probíhá anonymně přes LOVED & KNOWN.',
      createdAt: now,
    }
    const openerMsg = {
      id: `cm-${Date.now()}`,
      sender: 'finder' as const,
      kind: 'text' as const,
      text: opener,
      createdAt: now,
    }

    const sharedPhone =
      input.sharePhoneConsent && input.sharedPhone
        ? normalizeSharedPhone(input.sharedPhone)
        : null

    const contactOfferMsg = sharedPhone
      ? {
          id: `cm-phone-${Date.now()}`,
          sender: 'system' as const,
          kind: 'contact_offer' as const,
          text: 'Nálezce nabízí své telefonní číslo. Majitel ho uvidí až po vlastním souhlasu.',
          createdAt: now,
        }
      : null

    const conversation: Conversation = {
      id: conversationId,
      name: `Nálezce · ${pet.name}`,
      avatar: pet.image,
      role: sharedPhone
        ? 'Nálezce · nabídka telefonu (čeká na souhlas)'
        : 'Anonymní nálezce · bezpečný kontakt',
      petContext: pet.name,
      petId: pet.id,
      contactType: 'lost_finder',
      online: true,
      lastMessage: contactOfferMsg?.text ?? opener,
      time: 'právě teď',
      unread: 1,
      messages: [
        {
          id: `m-sys-${Date.now()}`,
          sender: 'them',
          text: systemIntro.text,
          time: 'právě teď',
        },
        {
          id: `m-${Date.now()}`,
          sender: 'them',
          text: opener,
          time: 'právě teď',
        },
        ...(contactOfferMsg
          ? [
              {
                id: `m-phone-${Date.now()}`,
                sender: 'them' as const,
                text: contactOfferMsg.text,
                time: 'právě teď',
              },
            ]
          : []),
      ],
      lostAnnouncementId: announcementId,
      lostReportId: reportId,
      finderAnonymousId: input.reporterAnonymousId,
    }

    const channel: SafeContactChannel = {
      id: channelId,
      conversationId,
      announcementId,
      reportId,
      petId: pet.id,
      petName: pet.name,
      finderAnonymousId: input.reporterAnonymousId,
      status: 'active',
      createdAt: now,
      messages: contactOfferMsg
        ? [systemIntro, openerMsg, contactOfferMsg]
        : [systemIntro, openerMsg],
      ...(sharedPhone
        ? {
            contactExchange: {
              finderOffer: {
                phone: sharedPhone,
                offeredAt: now,
              },
            },
          }
        : {}),
    }

    setLostConversations((prev) => [conversation, ...prev])
    setSafeContactChannels((prev) => [channel, ...prev])
    upsertNotification({
      id: `lost-found-${reportId}`,
      type: 'lost_found',
      title: `${pet.name} byla nalezena`,
      message: 'Bylo nahlášeno nalezení mazlíčka.',
      priority: 'urgent',
      dedupeKey: `lost:found:${reportId}`,
      petId: pet.id,
      petName: pet.name,
      href: `/pets/${pet.id}?tab=overview&lostReport=${reportId}#lost-panel`,
      lostAnnouncementId: announcementId,
      lostReportId: reportId,
      conversationId,
      time: sharedPhone
        ? `Nálezce nabízí telefonní kontakt (vyžaduje váš souhlas). · ${input.location.publicLabel}`
        : `Nálezce uvedl, že ${safetyText.toLowerCase()}. · ${input.location.publicLabel}`,
    })

    showToast(
      'Bezpečný kontakt navázán',
      sharedPhone
        ? 'Majitel byl informován o nabídce telefonu. Číslo uvidí až po svém souhlasu.'
        : 'Majitel byl informován. Komunikace zůstává anonymní přes LOVED & KNOWN.',
      'gold',
    )
    return { reportId, conversationId, channelId }
  }

  const flagLostReport = (
    reportId: string,
    reason: ReportFlagReason,
    note?: string,
  ): boolean => {
    const report = lostReports.find((item) => item.id === reportId)
    if (!report) return false
    setLostReports((prev) =>
      prev.map((item) =>
        item.id === reportId
          ? {
              ...item,
              ownerFlag: {
                reason,
                note: note?.trim() || undefined,
                flaggedAt: new Date().toISOString(),
              },
            }
          : item,
      ),
    )
    showToast('Hlášení označeno', 'Děkujeme za nahlášení. Hlášení zůstane v historii.', 'info')
    return true
  }

  const getLostAnnouncementByToken = (token: string) =>
    findAnnouncementByToken(lostAnnouncements, token)

  const getLostReportsForAnnouncement = (announcementId: string) =>
    [...lostReports]
      .filter((item) => item.announcementId === announcementId)
      .sort((a, b) => a.observedAt.localeCompare(b.observedAt))

  const getSafeContactChannel = (idOrConversationId: string) =>
    safeContactChannels.find(
      (c) => c.id === idOrConversationId || c.conversationId === idOrConversationId,
    )

  const sendLostFinderMessage = (
    conversationId: string,
    text: string,
    as: 'owner' | 'finder',
    kind: SafeContactMessageKind = 'text',
  ): boolean => {
    const channel = safeContactChannels.find((c) => c.conversationId === conversationId)
    if (channel?.status === 'closed') {
      showToast('Kontakt je ukončen', 'Mazlíček je doma — další zprávy nejsou možné.', 'info')
      return false
    }

    const { text: cleaned, scrubbed } = scrubPersonalData(text)
    if (!cleaned) return false
    if (scrubbed) {
      showToast(
        'Osobní údaje byly skryty',
        'Telefon, e-mail nebo adresa se v bezpečném kontaktu nezobrazují.',
        'info',
      )
    }

    const conv = lostConversations.find((item) => item.id === conversationId)
    if (!conv && !channel) return false
    const now = new Date().toISOString()
    const ownerSender = as === 'owner' ? ('me' as const) : ('them' as const)

    if (conv) {
      setLostConversations((prev) =>
        prev.map((item) => {
          if (item.id !== conversationId) return item
          return {
            ...item,
            lastMessage: cleaned,
            time: 'právě teď',
            unread: as === 'finder' ? item.unread + 1 : item.unread,
            messages: [
              ...item.messages,
              {
                id: `m-${Date.now()}`,
                sender: ownerSender,
                text: cleaned,
                time: 'právě teď',
              },
            ],
          }
        }),
      )
    }

    setSafeContactChannels((prev) =>
      prev.map((item) => {
        if (item.conversationId !== conversationId) return item
        return {
          ...item,
          messages: [
            ...item.messages,
            {
              id: `cm-${Date.now()}`,
              sender: as,
              kind,
              text: cleaned,
              createdAt: now,
            },
          ],
        }
      }),
    )

    if (as === 'finder') {
      const petName = conv?.petContext ?? channel?.petName ?? 'mazlíčka'
      const messageId = `m-${Date.now()}`
      upsertNotification({
        id: `lost-msg-${messageId}`,
        type: 'message',
        title: 'Nová zpráva',
        message: `Máte novou zprávu v bezpečném kontaktu · ${petName}`,
        priority: 'important',
        dedupeKey: `lost:msg:${conversationId}:${messageId}`,
        petId: conv?.petId ?? channel?.petId,
        petName,
        href: `/messages?conversationId=${conversationId}`,
        conversationId,
        lostAnnouncementId: conv?.lostAnnouncementId ?? channel?.announcementId,
        time: 'právě teď',
      })
    }

    return true
  }

  const shareSafeApproxLocation = (
    channelId: string,
    location: SafeApproxLocationShare,
  ): boolean => {
    const channel = safeContactChannels.find((c) => c.id === channelId)
    if (!channel || channel.status !== 'active') return false
    const now = new Date().toISOString()
    const text = `📍 Přibližná poloha: ${location.publicLabel} (${location.accuracyNote})`

    setSafeContactChannels((prev) =>
      prev.map((item) => {
        if (item.id !== channelId) return item
        return {
          ...item,
          messages: [
            ...item.messages,
            {
              id: `cm-loc-${Date.now()}`,
              sender: 'finder',
              kind: 'approx_location',
              text,
              createdAt: now,
              approxLocation: location,
            },
          ],
        }
      }),
    )
    setLostConversations((prev) =>
      prev.map((item) => {
        if (item.id !== channel.conversationId) return item
        return {
          ...item,
          lastMessage: text,
          time: 'právě teď',
          unread: item.unread + 1,
          messages: [
            ...item.messages,
            {
              id: `m-loc-${Date.now()}`,
              sender: 'them',
              text,
              time: 'právě teď',
            },
          ],
        }
      }),
    )
    setNotifications((prev) =>
      upsertNotificationInList(prev, {
        id: `lost-loc-${channel.conversationId}-${now}`,
        type: 'message',
        title: `Nálezce sdílel přibližnou polohu · ${channel.petName}`,
        message: location.publicLabel,
        priority: 'important',
        dedupeKey: `lost:loc:${channel.conversationId}:${now}`,
        petId: channel.petId,
        petName: channel.petName,
        href: `/messages?conversationId=${channel.conversationId}`,
        conversationId: channel.conversationId,
        lostAnnouncementId: channel.announcementId,
        time: location.publicLabel,
      }),
    )
    showToast('Poloha sdílena', 'Majitel vidí jen přibližnou oblast.', 'gold')
    return true
  }

  const thankSafeContactFinder = (channelId: string): boolean => {
    const channel = safeContactChannels.find((c) => c.id === channelId)
    if (!channel || channel.thankYouSentAt) return false
    const now = new Date().toISOString()
    const text = '❤️ Majitel vám děkuje za pomoc.'

    setSafeContactChannels((prev) =>
      prev.map((item) => {
        if (item.id !== channelId) return item
        return {
          ...item,
          thankYouSentAt: now,
          messages: [
            ...item.messages,
            {
              id: `cm-thanks-${Date.now()}`,
              sender: 'system',
              kind: 'thank_you',
              text,
              createdAt: now,
            },
          ],
        }
      }),
    )
    setLostConversations((prev) =>
      prev.map((item) => {
        if (item.id !== channel.conversationId) return item
        return {
          ...item,
          lastMessage: text,
          time: 'právě teď',
          messages: [
            ...item.messages,
            {
              id: `m-thanks-${Date.now()}`,
              sender: 'me',
              text,
              time: 'právě teď',
            },
          ],
        }
      }),
    )
    showToast('Poděkování odesláno', 'Nálezce uvidí vaše poděkování v bezpečném kontaktu.', 'gold')
    return true
  }

  const offerSafeContactPhone = (
    channelId: string,
    as: 'owner' | 'finder',
    phone: string,
  ): boolean => {
    const channel = safeContactChannels.find((c) => c.id === channelId)
    if (!channel || channel.status !== 'active') return false
    const normalized = normalizeSharedPhone(phone)
    if (!normalized) {
      showToast('Neplatné číslo', 'Zadejte telefonní číslo (alespoň 9 číslic).', 'info')
      return false
    }
    const now = new Date().toISOString()
    const offerKey = as === 'finder' ? 'finderOffer' : 'ownerOffer'
    const existing = channel.contactExchange?.[offerKey]
    if (existing && !existing.declinedAt) {
      showToast('Nabídka už existuje', 'Telefon už byl nabídnut v tomto kontaktu.', 'info')
      return false
    }

    const text =
      as === 'finder'
        ? 'Nálezce nabízí své telefonní číslo. Majitel ho uvidí až po vlastním souhlasu.'
        : 'Majitel nabízí své telefonní číslo. Nálezce ho uvidí až po vlastním souhlasu.'

    setSafeContactChannels((prev) =>
      prev.map((item) => {
        if (item.id !== channelId) return item
        return {
          ...item,
          contactExchange: {
            ...item.contactExchange,
            [offerKey]: { phone: normalized, offeredAt: now },
          },
          messages: [
            ...item.messages,
            {
              id: `cm-phone-offer-${Date.now()}`,
              sender: 'system',
              kind: 'contact_offer',
              text,
              createdAt: now,
            },
          ],
        }
      }),
    )
    setLostConversations((prev) =>
      prev.map((item) => {
        if (item.id !== channel.conversationId) return item
        return {
          ...item,
          lastMessage: text,
          time: 'právě teď',
          unread: as === 'finder' ? item.unread + 1 : item.unread,
          messages: [
            ...item.messages,
            {
              id: `m-phone-offer-${Date.now()}`,
              sender: as === 'finder' ? 'them' : 'me',
              text,
              time: 'právě teď',
            },
          ],
        }
      }),
    )
    if (as === 'finder') {
      upsertNotification({
        id: `lost-phone-${channel.conversationId}-${now}`,
        type: 'message',
        title: `Nálezce nabízí telefon · ${channel.petName}`,
        message: 'Vyžaduje váš souhlas před zobrazením čísla',
        priority: 'important',
        dedupeKey: `lost:phone:${channel.conversationId}:${now}`,
        petId: channel.petId,
        petName: channel.petName,
        href: `/messages?conversationId=${channel.conversationId}`,
        conversationId: channel.conversationId,
        lostAnnouncementId: channel.announcementId,
        time: 'Vyžaduje váš souhlas před zobrazením čísla',
      })
    }
    showToast(
      'Nabídka odeslána',
      'Druhá strana uvidí číslo až po svém výslovném souhlasu.',
      'gold',
    )
    return true
  }

  const respondSafeContactPhoneOffer = (
    channelId: string,
    as: 'owner' | 'finder',
    accept: boolean,
  ): boolean => {
    const channel = safeContactChannels.find((c) => c.id === channelId)
    if (!channel || channel.status !== 'active') return false
    // Owner responds to finderOffer; finder responds to ownerOffer
    const offerKey = as === 'owner' ? 'finderOffer' : 'ownerOffer'
    const offer = channel.contactExchange?.[offerKey]
    if (!offer || offer.acceptedAt || offer.declinedAt) return false
    const now = new Date().toISOString()

    if (accept) {
      const text =
        as === 'owner'
          ? `Majitel přijal kontakt. Telefon nálezce: ${offer.phone}`
          : `Nálezce přijal kontakt. Telefon majitele: ${offer.phone}`
      setSafeContactChannels((prev) =>
        prev.map((item) => {
          if (item.id !== channelId) return item
          return {
            ...item,
            contactExchange: {
              ...item.contactExchange,
              [offerKey]: { ...offer, acceptedAt: now },
            },
            messages: [
              ...item.messages,
              {
                id: `cm-phone-ok-${Date.now()}`,
                sender: 'system',
                kind: 'contact_offer',
                text,
                createdAt: now,
              },
            ],
          }
        }),
      )
      setLostConversations((prev) =>
        prev.map((item) => {
          if (item.id !== channel.conversationId) return item
          return {
            ...item,
            lastMessage: text,
            time: 'právě teď',
            messages: [
              ...item.messages,
              {
                id: `m-phone-ok-${Date.now()}`,
                sender: 'me',
                text,
                time: 'právě teď',
              },
            ],
          }
        }),
      )
      showToast('Kontakt přijat', 'Telefonní číslo je nyní viditelné v bezpečném kontaktu.', 'success')
      return true
    }

    const declineText =
      as === 'owner'
        ? 'Majitel ponechal anonymní chat. Telefon nálezce nebyl zobrazen.'
        : 'Nálezce ponechal anonymní chat. Telefon majitele nebyl zobrazen.'
    setSafeContactChannels((prev) =>
      prev.map((item) => {
        if (item.id !== channelId) return item
        return {
          ...item,
          contactExchange: {
            ...item.contactExchange,
            [offerKey]: { ...offer, declinedAt: now },
          },
          messages: [
            ...item.messages,
            {
              id: `cm-phone-no-${Date.now()}`,
              sender: 'system',
              kind: 'system',
              text: declineText,
              createdAt: now,
            },
          ],
        }
      }),
    )
    showToast('Zůstává anonymní kontakt', 'Můžete dál komunikovat přes LOVED & KNOWN.', 'info')
    return true
  }

  const getLostChatThreadForFinder = (
    announcementId: string,
    finderAnonymousId: string,
  ) =>
    safeContactChannels.find(
      (thread) =>
        thread.announcementId === announcementId &&
        thread.finderAnonymousId === finderAnonymousId,
    )

  // Ensure QR tokens + emergency card shells exist for pets loaded before this feature.
  useEffect(() => {
    setPets((prev) => ensurePetsFoundContactFields(prev).map(ensurePetEmergencyCard))
  }, [])

  // Sync pet.lostStatus badges from persisted announcements.
  useEffect(() => {
    setPets((prev) =>
      prev.map((pet) => {
        const forPet = lostAnnouncements.filter((item) => item.petId === pet.id)
        if (forPet.length === 0) {
          if (!pet.lostStatus && !pet.activeLostAnnouncementId) return pet
          const { lostStatus: _a, activeLostAnnouncementId: _b, ...rest } = pet
          return rest
        }
        const active = forPet.find((item) => item.status === 'lost')
        if (active) {
          if (pet.lostStatus === 'lost' && pet.activeLostAnnouncementId === active.id) {
            return pet
          }
          return { ...pet, lostStatus: 'lost', activeLostAnnouncementId: active.id }
        }
        const latest = [...forPet].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
        if (pet.lostStatus === latest.status && !pet.activeLostAnnouncementId) return pet
        return {
          ...pet,
          lostStatus: latest.status,
          activeLostAnnouncementId: undefined,
        }
      }),
    )
    // Only when announcements change (initial hydrate + mutations).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lostAnnouncements])

  // Mark finished medication courses as completed and clear reminders
  useEffect(() => {
    const expired = healthRecords.filter((record) => {
      if (record.type !== 'medication' || record.status !== 'active') return false
      return !getMedicationCourseBounds(record).isWithinCourse
    })
    if (expired.length === 0) return

    const expiredIds = new Set(expired.map((record) => record.id))
    setHealthRecords((prev) =>
      prev.map((record) =>
        expiredIds.has(record.id)
          ? { ...record, status: 'completed', reminderEnabled: false }
          : record,
      ),
    )
    setCalendarEvents((prev) =>
      prev.filter((event) => !event.sourceRecordId || !expiredIds.has(event.sourceRecordId)),
    )
    setNotifications((prev) => {
      let next = prev
      for (const id of expiredIds) {
        next = removeNotificationsBySourceRecord(next, id)
      }
      return next
    })
  }, [healthRecords])

  // Keep calendar/bell in sync for medications that already have reminderEnabled
  useEffect(() => {
    const enabledMeds = healthRecords.filter(
      (record) =>
        record.type === 'medication' &&
        record.reminderEnabled &&
        record.status === 'active' &&
        getMedicationCourseBounds(record).isWithinCourse,
    )
    if (enabledMeds.length === 0) return

    setCalendarEvents((prev) => {
      let next = prev
      let changed = false
      for (const record of enabledMeds) {
        if (next.some((event) => event.sourceRecordId === record.id)) continue
        const events = buildMedicationReminderEvents(
          {
            ...record,
            scheduleTime: record.scheduleTime || '09:00',
            reminderDays: normalizeReminderDays(record.reminderDays),
          },
          petNameForRecord(pets, record.petId),
          record.petId,
        )
        next = [...next, ...events]
        changed = true
      }
      return changed ? next : prev
    })

    setNotifications((prev) => {
      let next = prev
      let changed = false
      for (const record of enabledMeds) {
        const dedupeKey = `med:${record.id}`
        if (next.some((item) => item.dedupeKey === dedupeKey || item.sourceRecordId === record.id)) {
          continue
        }
        const notification = buildMedicationReminderNotification(
          record,
          petNameForRecord(pets, record.petId),
        )
        next = upsertNotificationInList(next, notification)
        changed = true
      }
      return changed ? next : prev
    })
  }, [healthRecords, pets])

  // Reconcile calendar + health derived notifications (stable dedupeKeys)
  useEffect(() => {
    const drafts = [
      ...buildCalendarNotificationDrafts(calendarEvents, pets),
      ...buildHealthNotificationDrafts(healthRecords, pets),
    ]
    setNotifications((prev) => {
      let next = prev
      let changed = false
      for (const draft of drafts) {
        const before = next
        next = upsertNotificationInList(next, draft)
        if (next !== before) changed = true
      }
      const pruned = pruneStaleDerivedNotifications(
        next,
        drafts.map((d) => d.dedupeKey),
      )
      if (pruned !== next) {
        next = pruned
        changed = true
      }
      return changed ? next : prev
    })
  }, [calendarEvents, healthRecords, pets])

  const toggleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              liked: !post.liked,
              likes: post.liked ? post.likes - 1 : post.likes + 1,
            }
          : post,
      ),
    )
  }

  const addComment = (postId: string, text: string) => {
    if (!text.trim()) return
    const createdAt = Date.now()
    const authorName = getCommunitySelfAuthorName()
    const newComment = {
      id: `c_${createdAt}`,
      author: authorName,
      authorId: COMMUNITY_SELF_AUTHOR_ID,
      avatar: COMMUNITY_SELF_AVATAR,
      text: text.trim(),
      time: 'Právě teď',
      createdAt,
    }

    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              commentsCount: post.commentsCount + 1,
              comments: [...(post.comments || []), newComment],
            }
          : post,
      ),
    )
    showToast('Komentář publikován', undefined, 'success')
  }

  const deleteComment = (postId: string, commentId: string) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post
        const comments = post.comments || []
        const target = comments.find((comment) => comment.id === commentId)
        if (!target || !isCommunitySelfAuthor(target.authorId, target.author)) return post
        const nextComments = comments.filter((comment) => comment.id !== commentId)
        return {
          ...post,
          comments: nextComments,
          commentsCount: Math.max(0, nextComments.length),
        }
      }),
    )
    showToast('Komentář smazán', undefined, 'info')
  }

  const deletePost = (postId: string) => {
    setPosts((prev) => prev.filter((post) => post.id !== postId))
    showToast('Příspěvek smazán', 'Příspěvek byl odstraněn z komunitního feedu.', 'info')
  }

  const addCommunityPost = (input: {
    text: string
    image?: string
    petTag?: string
    petId?: string
    location?: string
    locationLat?: number
    locationLng?: number
  }) => {
    const text = input.text.trim()
    if (!text && !input.image) return

    if (input.petId) {
      const tagged = pets.find((pet) => pet.id === input.petId)
      if (!tagged) {
        showToast('Mazlíčka nelze označit', 'Mazlíček nebyl nalezen.', 'info')
        return
      }
      if (!tagged.publicDiscover) {
        showToast(
          'Mazlíček není veřejný',
          'Označit ve feedu lze jen mazlíčky s veřejným profilem Objevovat.',
          'info',
        )
        return
      }
    }

    const createdAt = Date.now()
    const authorName = getCommunitySelfAuthorName()
    const safeLocation = input.location
      ? toCommunityPublicLocation(input.location, input.locationLat, input.locationLng)
      : undefined

    const post: CommunityPost = {
      id: `post_${createdAt}_${Math.random().toString(36).slice(2, 6)}`,
      author: authorName,
      authorId: COMMUNITY_SELF_AUTHOR_ID,
      avatar: COMMUNITY_SELF_AVATAR,
      time: 'Právě teď',
      text: text || 'Sdílím fotografii z komunity.',
      image: input.image,
      likes: 0,
      liked: false,
      petTag: input.petTag,
      petId: input.petId,
      location: safeLocation?.location,
      locationLat: safeLocation?.locationLat,
      locationLng: safeLocation?.locationLng,
      commentsCount: 0,
      comments: [],
      createdAt,
    }
    setPosts((prev) => [post, ...prev])
    showToast(
      'Příspěvek publikován v komunitě',
      'Váš příběh o mazlíčkovi je nyní viditelný v komunitě.',
      'gold',
    )
  }

  const updateCommunityPost = (
    postId: string,
    updates: {
      text?: string
      location?: string | null
      locationLat?: number | null
      locationLng?: number | null
    },
  ) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post
        if (!isCommunitySelfAuthor(post.authorId, post.author)) return post

        const next: CommunityPost = { ...post, editedAt: Date.now() }
        if (typeof updates.text === 'string') {
          const trimmed = updates.text.trim()
          if (trimmed) next.text = trimmed
        }
        if (updates.location === null) {
          next.location = undefined
          next.locationLat = undefined
          next.locationLng = undefined
        } else if (typeof updates.location === 'string' && updates.location.trim()) {
          const safe = toCommunityPublicLocation(
            updates.location,
            updates.locationLat ?? undefined,
            updates.locationLng ?? undefined,
          )
          next.location = safe.location
          next.locationLat = safe.locationLat
          next.locationLng = safe.locationLng
        }
        return next
      }),
    )
    showToast('Příspěvek upraven', undefined, 'success')
  }

  const reportPost = (postId: string, note?: string) => {
    addCommunityReport({ target: 'post', postId, note })
    showToast(
      'Příspěvek nahlášen',
      'Děkujeme. Podíváme se na to co nejdřív.',
      'info',
    )
  }

  const reportComment = (postId: string, commentId: string, note?: string) => {
    addCommunityReport({ target: 'comment', postId, commentId, note })
    showToast(
      'Komentář nahlášen',
      'Děkujeme. Podíváme se na to co nejdřív.',
      'info',
    )
  }

  const addCalendarEvent = (event: Omit<CalendarEvent, 'id'>) => {
    const pet =
      pets.find((item) => item.id === event.petId) ??
      pets.find((item) => item.name === event.petName)
    const category = getEventCategory(event.type)

    if (category === 'breeding') {
      if (!pet || !canHaveBreedingProfile(pet) || !pet.breedingProfile) {
        showToast(
          'Chovatelskou událost nelze uložit',
          'Chovný profil je dostupný jen u nekastrovaných mazlíčků se zapnutým chovným profilem.',
          'info',
        )
        return
      }
    }

    if (event.type === 'heat') {
      if (!pet || !canAutoGenerateHeat(pet)) {
        showToast(
          'Hárání nelze uložit',
          'Hárání je jen pro nekastrovanou fenu se zapnutým chovným profilem.',
          'info',
        )
        return
      }
    }

    const recurrence = normalizeRecurrence(event.recurrence)
    setCalendarEvents((prev) => [
      {
        ...event,
        id: `c_${Date.now()}`,
        recurrence,
      },
      ...prev,
    ])
    setCalendarFocusDate(event.date)
    setEditingCalendarEventId(null)
    setEditingOccurrenceDate(null)
    setCalendarEventPrefillDate(null)
    setActiveModal(null)
    showToast(
      `${event.title} naplánováno`,
      `Termín ${formatIsoDateToCzech(event.date)} pro ${event.petName}`,
      'gold',
    )
  }

  const mergeCalendarEvent = (
    event: CalendarEvent,
    updates: Partial<Omit<CalendarEvent, 'id'>>,
  ): CalendarEvent => {
    const next: CalendarEvent = {
      ...event,
      ...updates,
      id: event.id,
      sourceRecordId: event.sourceRecordId,
      sourceDocumentId: event.sourceDocumentId,
    }
    if ('recurrence' in updates) {
      next.recurrence = normalizeRecurrence(updates.recurrence)
    }
    return next
  }

  const updateCalendarEvent = (
    eventId: string,
    updates: Partial<Omit<CalendarEvent, 'id'>>,
  ) => {
    const existing = calendarEvents.find((event) => event.id === eventId)
    if (!existing) return

    const merged = mergeCalendarEvent(existing, updates)
    const pet =
      pets.find((item) => item.id === merged.petId) ??
      pets.find((item) => item.name === merged.petName)
    const nextCategory = getEventCategory(merged.type)
    const prevCategory = getEventCategory(existing.type)
    const becomingBreeding = nextCategory === 'breeding' && prevCategory !== 'breeding'
    const becomingHeat = merged.type === 'heat' && existing.type !== 'heat'

    if (becomingBreeding) {
      if (!pet || !canHaveBreedingProfile(pet) || !pet.breedingProfile) {
        showToast(
          'Chovatelskou událost nelze uložit',
          'Chovný profil je dostupný jen u nekastrovaných mazlíčků se zapnutým chovným profilem.',
          'info',
        )
        return
      }
    }

    if (becomingHeat) {
      if (!pet || !canAutoGenerateHeat(pet)) {
        showToast(
          'Hárání nelze uložit',
          'Hárání je jen pro nekastrovanou fenu se zapnutým chovným profilem.',
          'info',
        )
        return
      }
    }

    setCalendarEvents((prev) =>
      prev.map((event) => (event.id === eventId ? merged : event)),
    )
    if (updates.date) setCalendarFocusDate(updates.date)
    setEditingCalendarEventId(null)
    setEditingOccurrenceDate(null)
    setActiveModalState(null)
    setModalPetId(null)
    showToast('Událost upravena', updates.title ?? existing?.title, 'gold')
  }

  const deleteCalendarEvent = (eventId: string) => {
    const existing = calendarEvents.find((event) => event.id === eventId)
    setCalendarEvents((prev) =>
      prev.filter((event) => event.id !== eventId && event.seriesId !== eventId),
    )
    setNotifications((prev) =>
      prev.filter(
        (item) =>
          item.sourceEventId !== eventId &&
          !item.dedupeKey.startsWith(`cal:${eventId}:`),
      ),
    )
    setEditingCalendarEventId(null)
    setEditingOccurrenceDate(null)
    setActiveModalState(null)
    setModalPetId(null)
    setCalendarEventPrefillType(null)
    showToast(
      'Událost smazána',
      existing ? `${existing.title} byla odstraněna z kalendáře.` : undefined,
      'info',
    )
  }

  const updateCalendarOccurrence = (
    eventId: string,
    occurrenceDate: string,
    scope: RecurrenceEditScope,
    updates: Partial<Omit<CalendarEvent, 'id'>>,
  ) => {
    const master = calendarEvents.find((event) => event.id === eventId)
    if (!master) return

    if (!isRecurring(master) || scope === 'series') {
      updateCalendarEvent(eventId, {
        ...updates,
        date: scope === 'this' ? occurrenceDate : (updates.date ?? master.date),
      })
      return
    }

    if (scope === 'this') {
      const excludedMaster = applySeriesExclude(master, occurrenceDate)
      const detached: Omit<CalendarEvent, 'id'> = {
        ...master,
        ...updates,
        date: updates.date ?? occurrenceDate,
        seriesId: master.id,
        originalDate: occurrenceDate,
        recurrence: undefined,
        excludedDates: undefined,
        sourceRecordId: undefined,
      }
      setCalendarEvents((prev) => [
        { ...detached, id: `c_${Date.now()}` },
        ...prev.map((event) => (event.id === eventId ? excludedMaster : event)),
      ])
      setCalendarFocusDate(detached.date)
      setEditingCalendarEventId(null)
      setEditingOccurrenceDate(null)
      setActiveModalState(null)
      setModalPetId(null)
      showToast('Událost upravena', updates.title ?? master.title, 'gold')
      return
    }

    // following
    const { updatedMaster, newSeries } = splitSeriesAt(master, occurrenceDate, updates)
    setCalendarEvents((prev) => [
      { ...newSeries, id: `c_${Date.now()}` },
      ...prev.map((event) => (event.id === eventId ? updatedMaster : event)),
    ])
    setCalendarFocusDate(newSeries.date)
    setEditingCalendarEventId(null)
    setEditingOccurrenceDate(null)
    setActiveModalState(null)
    setModalPetId(null)
    showToast('Série upravena', updates.title ?? master.title, 'gold')
  }

  const deleteCalendarOccurrence = (
    eventId: string,
    occurrenceDate: string,
    scope: RecurrenceEditScope,
  ) => {
    const master = calendarEvents.find((event) => event.id === eventId)
    if (!master) return

    if (!isRecurring(master) || scope === 'series') {
      deleteCalendarEvent(eventId)
      return
    }

    if (scope === 'this') {
      setCalendarEvents((prev) =>
        prev.map((event) =>
          event.id === eventId ? applySeriesExclude(event, occurrenceDate) : event,
        ),
      )
      setEditingCalendarEventId(null)
      setEditingOccurrenceDate(null)
      setActiveModalState(null)
      setModalPetId(null)
      showToast('Výskyt smazán', `${master.title} — pouze tento den.`, 'info')
      return
    }

    // following: end series the day before this occurrence
    if (occurrenceDate <= master.date) {
      deleteCalendarEvent(eventId)
      return
    }
    const endBefore = (() => {
      const d = new Date(`${occurrenceDate}T12:00:00`)
      d.setDate(d.getDate() - 1)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    })()
    setCalendarEvents((prev) =>
      prev.map((event) => {
        if (event.id !== eventId) return event
        return {
          ...event,
          recurrence: event.recurrence
            ? { ...event.recurrence, endDate: endBefore }
            : undefined,
        }
      }),
    )
    setEditingCalendarEventId(null)
    setEditingOccurrenceDate(null)
    setActiveModalState(null)
    setModalPetId(null)
    showToast('Následující výskyty smazány', master.title, 'info')
  }

  return (
    <AppContext.Provider
      value={{
        pets,
        photos,
        documents,
        healthRecords,
        posts,
        calendarEvents,
        notifications,
        earnedBadges,
        refreshBadges,
        activeModal,
        modalPetId,
        discoverSearch,
        discoverCriteria,
        toasts,
        notificationsOpen,
        calendarFocusDate,
        clearCalendarFocusDate,
        editingCalendarEventId,
        editingOccurrenceDate,
        calendarEventPrefillType,
        calendarEventPrefillDate,
        openEditCalendarEvent,
        openNewCalendarEvent,
        healthRecordPrefillType,
        openNewHealthRecord,
        setActiveModal,
        setDiscoverSearch,
        setDiscoverCriteria,
        resetDiscoverCriteria,
        setNotificationsOpen,
        addPet,
        deletePet,
        updatePet,
        updatePetImage,
        updatePetCoverImage,
        addPetPhotos,
        updatePetPhoto,
        deletePetPhoto,
        addPetDocument,
        updatePetDocument,
        replacePetDocument,
        deletePetDocument,
        resolveDocumentUrl,
        addHealthRecord,
        updateHealthRecord,
        deleteHealthRecord,
        toggleMedicationReminder,
        setMedicationReminderTime,
        setMedicationReminderDays,
        markNotificationsRead,
        markNotificationRead,
        upsertNotification,
        submitFoundPetContact,
        submitEmergencySafeContact,
        lostAnnouncements,
        lostReports,
        lostConversations,
        createLostAnnouncement,
        resolveLostAnnouncement,
        closeLostAnnouncement,
        submitLostSighting,
        submitLostFoundReport,
        flagLostReport,
        getLostAnnouncementByToken,
        getLostReportsForAnnouncement,
        sendLostFinderMessage,
        getLostChatThreadForFinder,
        safeContactChannels,
        getSafeContactChannel,
        shareSafeApproxLocation,
        thankSafeContactFinder,
        offerSafeContactPhone,
        respondSafeContactPhoneOffer,
        toggleLike,
        addComment,
        deleteComment,
        addCommunityPost,
        updateCommunityPost,
        deletePost,
        reportPost,
        reportComment,
        addCalendarEvent,
        updateCalendarEvent,
        deleteCalendarEvent,
        updateCalendarOccurrence,
        deleteCalendarOccurrence,
        showToast,
        removeToast,
        importantContacts,
        addContact,
        updateContact,
        deleteContact,
        setPrimaryContact,
        conciergeRequests,
        createConciergeRequest,
        updateConciergeRequestStatus,
        travelPrefs,
        setTravelPrefs,
        confirmTravelCheck,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}
