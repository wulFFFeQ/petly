import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  calendarEvents as initialCalendarEvents,
  communityPosts as initialPosts,
  healthRecords as initialHealthRecords,
  myPets as initialPets,
  petDocuments as initialPetDocuments,
  petPhotos as initialPetPhotos,
} from '../data/mockData'
import { getDefaultBreedImage } from '../lib/petBreedImages'
import { localizeBreedName } from '../lib/petBreeds'
import { normalizeGenderForType } from '../lib/petTypes'
import { pickRandomCoverColor } from '../lib/petCoverColors'
import { formatIsoDateToCzech } from '../lib/petProfileUtils'
import { normalizeLifestyleList } from '../lib/petProfileDisplay'
import { getBadgeDefinition } from '../lib/badges/catalog'
import {
  computeBadgeProgress,
  isNightOwlHour,
  mergeBadgeAwards,
  romanLevel,
  toIsoDay,
} from '../lib/badges/evaluate'
import {
  buildMedicationReminderEvents,
  buildMedicationReminderNotification,
  getMedicationCourseBounds,
  normalizeReminderDays,
  petNameForRecord,
} from '../lib/medicationReminders'
import {
  DEFAULT_DISCOVER_CRITERIA,
  type DiscoverCriteria,
} from '../lib/discoverCriteria'
import { normalizeMicrochipInput } from '../lib/microchip'
import {
  createFoundContactToken,
  ensurePetsFoundContactFields,
  findPetByFoundToken,
} from '../lib/foundPet'
import {
  createLostAnnouncementToken,
  findAnnouncementByToken,
  foundSafetyLabel,
  formatRelativeCzech,
  loadLostAnnouncements,
  loadLostChatThreads,
  loadLostConversations,
  loadLostReports,
  saveLostAnnouncements,
  saveLostChatThreads,
  saveLostConversations,
  saveLostReports,
  type LostPetChatThread,
} from '../lib/lostPet'
import type { EarnedBadge } from '../types/badges'
import type {
  AppNotification,
  CalendarEvent,
  CommunityPost,
  Conversation,
  CreateLostAnnouncementInput,
  EventType,
  HealthRecord,
  HealthRecordType,
  LostPetAnnouncement,
  LostPetReport,
  ModalType,
  NewPetForm,
  Pet,
  PetDocument,
  PetPhoto,
  ReportFlagReason,
  SubmitLostFoundInput,
  SubmitLostSightingInput,
  ToastMessage,
} from '../types'

export type { DiscoverCriteria, DiscoverSpecies } from '../lib/discoverCriteria'

/** @deprecated Prefer discoverCriteria.species / nearby / popular */
export type DiscoverFilter = 'all' | 'dog' | 'cat' | 'nearby' | 'popular'

const PETS_STORAGE_KEY = 'lovedandknown.pets'
const PHOTOS_STORAGE_KEY = 'lovedandknown.petPhotos'
const HEALTH_STORAGE_KEY = 'lovedandknown.healthRecords'
const DOCUMENTS_STORAGE_KEY = 'lovedandknown.petDocuments'
const BADGES_STORAGE_KEY = 'lovedandknown.earnedBadges'
const NIGHT_OWL_STORAGE_KEY = 'lovedandknown.nightOwlEligible'

function normalizeLifestyleField(value: unknown): string[] | undefined {
  const list = normalizeLifestyleList(value as string | string[] | null | undefined)
  return list.length > 0 ? list : undefined
}

function loadPets(): Pet[] {
  if (typeof window === 'undefined') return initialPets
  try {
    const raw = window.localStorage.getItem(PETS_STORAGE_KEY)
    if (!raw) return initialPets
    const parsed = JSON.parse(raw) as Pet[]
    if (!Array.isArray(parsed) || parsed.length === 0) return initialPets
    return parsed.map((pet) => {
      const seed = initialPets.find((item) => item.id === pet.id)
      const { lifestyleExtras: _removed, ...rest } = pet as Pet & {
        lifestyleExtras?: unknown
      }
      return {
        ...rest,
        breed: localizeBreedName(pet.breed),
        breedingProfile: pet.breedingProfile ?? seed?.breedingProfile,
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
        foundContactToken:
          typeof pet.foundContactToken === 'string' && pet.foundContactToken.trim()
            ? pet.foundContactToken.trim()
            : seed?.foundContactToken,
        qrContactEnabled:
          typeof pet.qrContactEnabled === 'boolean'
            ? pet.qrContactEnabled
            : (seed?.qrContactEnabled ?? true),
        foundPublic: pet.foundPublic ?? seed?.foundPublic,
      }
    }).map((pet) => ({
      ...pet,
      foundContactToken: pet.foundContactToken || createFoundContactToken(),
      qrContactEnabled: pet.qrContactEnabled ?? true,
    }))
  } catch {
    return initialPets
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
  if (typeof window === 'undefined') return initialPetDocuments
  try {
    const raw = window.localStorage.getItem(DOCUMENTS_STORAGE_KEY)
    if (!raw) return initialPetDocuments
    const parsed = JSON.parse(raw) as PetDocument[]
    if (!Array.isArray(parsed)) return initialPetDocuments
    return parsed
  } catch {
    return initialPetDocuments
  }
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

function loadNightOwlEligible(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(NIGHT_OWL_STORAGE_KEY) === '1'
  } catch {
    return false
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
  /** When opening bookVet for a new event, optionally preselect this event type. */
  calendarEventPrefillType: EventType | null
  openEditCalendarEvent: (eventId: string) => void
  openNewCalendarEvent: (options?: { petId?: string; type?: EventType }) => void
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
  addPetDocuments: (
    petId: string,
    files: Array<{
      name: string
      size: string
      url: string
      mimeType?: string
      type: PetDocument['type']
    }>,
  ) => void
  updatePetDocument: (documentId: string, updates: Partial<PetDocument>) => void
  replacePetDocument: (
    documentId: string,
    file: {
      name: string
      size: string
      url: string
      mimeType?: string
      type?: PetDocument['type']
    },
  ) => void
  deletePetDocument: (documentId: string) => void
  addHealthRecord: (input: NewHealthRecordInput) => void
  updateHealthRecord: (recordId: string, updates: Partial<HealthRecord>) => void
  deleteHealthRecord: (recordId: string) => void
  toggleMedicationReminder: (recordId: string) => void
  setMedicationReminderTime: (recordId: string, time: string) => void
  setMedicationReminderDays: (recordId: string, days: number) => void
  markNotificationsRead: () => void
  submitFoundPetContact: (token: string, message: string) => boolean
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
  ) => { reportId: string; conversationId: string } | null
  flagLostReport: (reportId: string, reason: ReportFlagReason, note?: string) => boolean
  getLostAnnouncementByToken: (token: string) => LostPetAnnouncement | undefined
  getLostReportsForAnnouncement: (announcementId: string) => LostPetReport[]
  sendLostFinderMessage: (conversationId: string, text: string, as: 'owner' | 'finder') => boolean
  getLostChatThreadForFinder: (
    announcementId: string,
    finderAnonymousId: string,
  ) => LostPetChatThread | undefined
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
  deletePost: (postId: string) => void
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void
  updateCalendarEvent: (eventId: string, updates: Partial<Omit<CalendarEvent, 'id'>>) => void
  deleteCalendarEvent: (eventId: string) => void
  showToast: (title: string, description?: string, type?: ToastMessage['type']) => void
  removeToast: (id: string) => void
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    title: 'Naplánováno očkování proti vzteklině u Luny',
    time: 'Za 12 dní · 24. 9.',
    unread: true,
    kind: 'system',
  },
  {
    id: 'n2',
    title: 'Rutinní dentální prohlídka u Mila',
    time: 'Zítra v 14:30 · MUDr. Novák',
    unread: true,
    kind: 'system',
  },
  {
    id: 'n3',
    title: 'Sarah K. se líbí váš příspěvek',
    time: 'před 2 hodinami',
    unread: false,
    kind: 'community',
  },
]

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [pets, setPets] = useState<Pet[]>(loadPets)
  const [photos, setPhotos] = useState<PetPhoto[]>(loadPhotos)
  const [documents, setDocuments] = useState<PetDocument[]>(loadDocuments)
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>(loadHealthRecords)
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(initialCalendarEvents)
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS)
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>(loadEarnedBadges)
  const [nightOwlEligible, setNightOwlEligible] = useState(loadNightOwlEligible)
  const [badgeRevision, setBadgeRevision] = useState(0)
  const badgesHydratedRef = useRef(false)
  const [activeModal, setActiveModalState] = useState<ModalType>(null)
  const [modalPetId, setModalPetId] = useState<string | null>(null)
  const [discoverSearch, setDiscoverSearch] = useState('')
  const [discoverCriteria, setDiscoverCriteria] = useState<DiscoverCriteria>(
    DEFAULT_DISCOVER_CRITERIA,
  )
  const resetDiscoverCriteria = useCallback(() => {
    setDiscoverCriteria(DEFAULT_DISCOVER_CRITERIA)
  }, [])
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [calendarFocusDate, setCalendarFocusDate] = useState<string | null>(null)
  const [editingCalendarEventId, setEditingCalendarEventId] = useState<string | null>(null)
  const [calendarEventPrefillType, setCalendarEventPrefillType] = useState<EventType | null>(
    null,
  )
  const [healthRecordPrefillType, setHealthRecordPrefillType] = useState<HealthRecordType | null>(
    null,
  )
  const [lostAnnouncements, setLostAnnouncements] = useState<LostPetAnnouncement[]>(loadLostAnnouncements)
  const [lostReports, setLostReports] = useState<LostPetReport[]>(loadLostReports)
  const [lostConversations, setLostConversations] = useState<Conversation[]>(loadLostConversations)
  const [lostChatThreads, setLostChatThreads] = useState<LostPetChatThread[]>(loadLostChatThreads)

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
    saveLostAnnouncements(lostAnnouncements)
  }, [lostAnnouncements])

  useEffect(() => {
    saveLostReports(lostReports)
  }, [lostReports])

  useEffect(() => {
    saveLostConversations(lostConversations)
  }, [lostConversations])

  useEffect(() => {
    saveLostChatThreads(lostChatThreads)
  }, [lostChatThreads])

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
    const progress = computeBadgeProgress({
      pets,
      healthRecords,
      documents,
      photos,
      posts,
      calendarEvents,
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
    try {
      const payload = JSON.stringify(documents)
      if (payload.length > 4_500_000) return
      window.localStorage.setItem(DOCUMENTS_STORAGE_KEY, payload)
    } catch {
      // Ignore quota errors — documents remain available in the current session.
    }
  }, [documents])

  const setActiveModal = (modal: ModalType, petId?: string) => {
    if (modal !== 'bookVet') {
      setEditingCalendarEventId(null)
    } else {
      // Creating a new event via setActiveModal clears edit mode.
      setEditingCalendarEventId(null)
    }
    setCalendarEventPrefillType(null)
    setHealthRecordPrefillType(null)
    setActiveModalState(modal)
    setModalPetId(modal ? petId ?? null : null)
  }

  const openEditCalendarEvent = (eventId: string) => {
    setEditingCalendarEventId(eventId)
    setCalendarEventPrefillType(null)
    setHealthRecordPrefillType(null)
    setActiveModalState('bookVet')
    setModalPetId(null)
  }

  const openNewCalendarEvent = (options?: { petId?: string; type?: EventType }) => {
    setEditingCalendarEventId(null)
    setCalendarEventPrefillType(options?.type ?? null)
    setHealthRecordPrefillType(null)
    setActiveModalState('bookVet')
    setModalPetId(options?.petId ?? null)
  }

  const openNewHealthRecord = (options?: { petId?: string; type?: HealthRecordType }) => {
    setEditingCalendarEventId(null)
    setCalendarEventPrefillType(null)
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

    const newPet: Pet = {
      id: `${slug}-${Date.now()}`,
      name: form.name,
      type: form.type,
      breed: form.breed,
      image: getDefaultBreedImage(form.type, form.breed),
      coverColor: pickRandomCoverColor(),
      foundContactToken: createFoundContactToken(),
      qrContactEnabled: true,
      ...(form.age != null && form.age > 0 ? { age: form.age } : {}),
      ...(form.gender
        ? { gender: normalizeGenderForType(form.gender, form.type) ?? form.gender }
        : {}),
      ...(form.weight != null && form.weight > 0 ? { weight: form.weight } : {}),
    }
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

    setPets((prev) => prev.filter((item) => item.id !== petId))
    setPhotos((prev) => prev.filter((photo) => photo.petId !== petId))
    setDocuments((prev) => prev.filter((doc) => doc.petId !== petId))
    setHealthRecords((prev) => prev.filter((record) => record.petId !== petId))
    setCalendarEvents((prev) => prev.filter((event) => event.petName !== pet.name))
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
    setPets((prev) =>
      prev.map((pet) => {
        if (pet.id !== petId) return pet
        const next: Pet = { ...pet, ...updates }

        if ('gender' in updates) {
          const gender = updates.gender
            ? normalizeGenderForType(updates.gender, next.type)
            : undefined
          if (gender) next.gender = gender
          else delete next.gender
        }
        if ('age' in updates && (updates.age == null || updates.age < 0)) {
          delete next.age
        }
        if ('ageMonths' in updates) {
          const months = updates.ageMonths
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
        if ('weight' in updates && (updates.weight == null || updates.weight <= 0)) {
          delete next.weight
        }
        if ('dateOfBirth' in updates && !updates.dateOfBirth?.trim()) {
          delete next.dateOfBirth
        }
        if ('microchip' in updates) {
          if (!updates.microchip?.trim()) {
            delete next.microchip
            delete next.microchipVerification
          } else {
            const nextChip = updates.microchip.trim()
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
        if ('microchipVerification' in updates) {
          if (updates.microchipVerification == null) {
            delete next.microchipVerification
          } else {
            next.microchipVerification = updates.microchipVerification
          }
        }
        if ('neutered' in updates && updates.neutered === undefined) {
          delete next.neutered
        }
        if ('diet' in updates) {
          const list = normalizeLifestyleField(updates.diet)
          if (list) next.diet = list
          else delete next.diet
        }
        if ('supplements' in updates) {
          const list = normalizeLifestyleField(updates.supplements)
          if (list) next.supplements = list
          else delete next.supplements
        }
        if ('favoriteToy' in updates) {
          const list = normalizeLifestyleField(updates.favoriteToy)
          if (list) next.favoriteToy = list
          else delete next.favoriteToy
        }
        if ('likes' in updates) {
          const list = normalizeLifestyleField(updates.likes)
          if (list) next.likes = list
          else delete next.likes
        }
        if ('dislikes' in updates) {
          const list = normalizeLifestyleField(updates.dislikes)
          if (list) next.dislikes = list
          else delete next.dislikes
        }
        if ('bio' in updates) {
          const value = updates.bio?.trim()
          if (value) next.bio = value
          else delete next.bio
        }
        if ('personality' in updates) {
          const value = updates.personality?.trim()
          if (value) next.personality = value
          else delete next.personality
        }
        if ('lookingFor' in updates) {
          const value = updates.lookingFor?.trim()
          if (value) next.lookingFor = value
          else delete next.lookingFor
        }

        return next
      }),
    )
  }

  const updatePetImage = (petId: string, image: string) => {
    setPets((prev) =>
      prev.map((pet) => (pet.id === petId ? { ...pet, image } : pet)),
    )
  }

  const updatePetCoverImage = (petId: string, coverImage: string) => {
    setPets((prev) =>
      prev.map((pet) => (pet.id === petId ? { ...pet, coverImage } : pet)),
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

    const feedPosts: CommunityPost[] = added.map((photo) => ({
      id: `post_${photo.id}`,
      author: 'Tereza V.',
      avatar:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&q=85',
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
    }))
    setPosts((prev) => [...feedPosts, ...prev])

    setActiveModal(null)
    showToast(
      urls.length === 1 ? 'Fotografie nahrána' : `${urls.length} fotografie nahrány`,
      pet
        ? `Přidáno do galerie ${pet.name} a do komunitního feedu.`
        : 'Přidáno do galerie a do komunitního feedu.',
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

  const addPetDocuments = (
    petId: string,
    files: Array<{
      name: string
      size: string
      url: string
      mimeType?: string
      type: PetDocument['type']
    }>,
  ) => {
    if (files.length === 0) return
    const pet = pets.find((item) => item.id === petId)
    const stamp = Date.now()
    const added: PetDocument[] = files.map((file, index) => ({
      id: `doc_${stamp}_${index}_${Math.random().toString(36).slice(2, 6)}`,
      petId,
      name: file.name,
      size: file.size,
      updatedAt: 'právě teď',
      type: file.type,
      url: file.url,
      mimeType: file.mimeType,
    }))
    setDocuments((prev) => [...added, ...prev])
    showToast(
      files.length === 1 ? 'Dokument nahrán' : `${files.length} dokumenty nahrány`,
      pet
        ? `Uloženo v sekci Dokumenty u ${pet.name}.`
        : 'Uloženo v sekci Dokumenty.',
      'gold',
    )
  }

  const updatePetDocument = (documentId: string, updates: Partial<PetDocument>) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === documentId ? { ...doc, ...updates } : doc)),
    )
  }

  const replacePetDocument = (
    documentId: string,
    file: {
      name: string
      size: string
      url: string
      mimeType?: string
      type?: PetDocument['type']
    },
  ) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === documentId
          ? {
              ...doc,
              name: file.name,
              size: file.size,
              url: file.url,
              mimeType: file.mimeType,
              type: file.type ?? doc.type,
              updatedAt: 'právě teď',
            }
          : doc,
      ),
    )
    showToast('Dokument nahrazen', 'Nová verze byla nahrána.', 'gold')
  }

  const deletePetDocument = (documentId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== documentId))
    showToast('Dokument smazán', 'Soubor byl odstraněn ze seznamu.', 'info')
  }

  const enableMedicationReminder = (record: HealthRecord) => {
    const petName = petNameForRecord(pets, record.petId)
    const withDefaults: HealthRecord = {
      ...record,
      scheduleTime: record.scheduleTime || '09:00',
      reminderDays: normalizeReminderDays(record.reminderDays),
    }
    const events = buildMedicationReminderEvents(withDefaults, petName)
    const notification = buildMedicationReminderNotification(withDefaults, petName)

    setCalendarEvents((prev) => [
      ...prev.filter((item) => item.sourceRecordId !== record.id),
      ...events,
    ])
    setNotifications((prev) => [
      notification,
      ...prev.filter((item) => item.sourceRecordId !== record.id),
    ])
  }

  const disableMedicationReminder = (recordId: string) => {
    setCalendarEvents((prev) => prev.filter((item) => item.sourceRecordId !== recordId))
    setNotifications((prev) => prev.filter((item) => item.sourceRecordId !== recordId))
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
      showToast('Připomínka zapnuta', schedule.time, 'gold')
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
    setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })))
  }

  const submitFoundPetContact = (token: string, message: string): boolean => {
    const trimmed = message.trim()
    if (!trimmed) return false

    const pet = findPetByFoundToken(pets, token)
    if (!pet || pet.qrContactEnabled === false) return false

    setNotifications((prev) => [
      {
        id: `found-${Date.now()}`,
        title: `Někdo se pokouší kontaktovat vás kvůli ${pet.name}.`,
        time: 'právě teď',
        unread: true,
        kind: 'system',
      },
      {
        id: `found-msg-${Date.now()}`,
        title: `Zpráva o ${pet.name}: ${trimmed.slice(0, 120)}${trimmed.length > 120 ? '…' : ''}`,
        time: 'právě teď',
        unread: true,
        kind: 'system',
      },
      ...prev,
    ])

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

    const reporterIds = [...new Set(relatedReports.map((r) => r.reporterAnonymousId))]
    if (reporterIds.length > 0) {
      setNotifications((prev) => [
        {
          id: `lost-resolved-${Date.now()}`,
          title: `${petName} je doma. Děkujeme všem, kteří pomohli.`,
          time: 'právě teď',
          unread: true,
          kind: 'lost_pet',
          lostAnnouncementId: announcementId,
          href: `/pets/${announcement.petId}?tab=overview`,
        },
        ...prev,
      ])
    }

    // Notify finder conversations
    setLostConversations((prev) =>
      prev.map((conv) => {
        if (conv.lostAnnouncementId !== announcementId) return conv
        const systemMsg = {
          id: `m-resolved-${Date.now()}-${conv.id}`,
          sender: 'me' as const,
          text: `🟢 ${petName} je doma. Děkujeme všem, kteří pomohli.`,
          time: 'právě teď',
        }
        return {
          ...conv,
          lastMessage: systemMsg.text,
          time: 'právě teď',
          messages: [...conv.messages, systemMsg],
        }
      }),
    )
    setLostChatThreads((prev) =>
      prev.map((thread) => {
        if (thread.announcementId !== announcementId) return thread
        return {
          ...thread,
          messages: [
            ...thread.messages,
            {
              id: `cm-resolved-${Date.now()}-${thread.conversationId}`,
              sender: 'owner',
              text: `🟢 ${petName} je doma. Děkujeme všem, kteří pomohli.`,
              createdAt: now,
            },
          ],
        }
      }),
    )

    showToast(`${petName} je doma`, 'Oznámení bylo označeno jako vyřešené.', 'success')
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
    setNotifications((prev) => [
      {
        id: `lost-sight-${Date.now()}`,
        title: `Nové hlášení o ${pet.name}`,
        time: `${formatRelativeCzech(input.observedAt)} · ${input.location.publicLabel}`,
        unread: true,
        kind: 'lost_pet',
        lostAnnouncementId: announcementId,
        lostReportId: reportId,
        href: `/pets/${pet.id}?tab=overview&lostReport=${reportId}`,
      },
      ...prev,
    ])

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
  ): { reportId: string; conversationId: string } | null => {
    const announcement = lostAnnouncements.find((item) => item.id === announcementId)
    if (!announcement || announcement.status !== 'lost') return null
    if (!announcement.allowAppContact) {
      showToast('Kontakt je vypnutý', 'Majitel momentálně nepřijímá zprávy přes aplikaci.', 'info')
      return null
    }
    const pet = pets.find((item) => item.id === announcement.petId)
    if (!pet) return null

    const reportId = `lfr-${Date.now()}`
    const conversationId = `lost-conv-${Date.now()}`
    const now = new Date().toISOString()
    const safetyText = foundSafetyLabel(input.safetyStatus)

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
      note: input.note?.trim() || undefined,
      photoUrl: input.photoUrl,
    }

    const opener =
      input.note?.trim() ||
      `${pet.name} byl/a právě nalezen/a. Nálezce uvedl: ${safetyText}. ${input.location.publicLabel}`

    const conversation: Conversation = {
      id: conversationId,
      name: `Nálezce · ${pet.name}`,
      avatar: pet.image,
      role: 'Anonymní nálezce',
      petContext: pet.name,
      petId: pet.id,
      contactType: 'lost_finder',
      online: true,
      lastMessage: opener,
      time: 'právě teď',
      unread: 1,
      messages: [
        {
          id: `m-${Date.now()}`,
          sender: 'them',
          text: opener,
          time: 'právě teď',
        },
      ],
      lostAnnouncementId: announcementId,
      lostReportId: reportId,
      finderAnonymousId: input.reporterAnonymousId,
    }

    const chatThread: LostPetChatThread = {
      conversationId,
      announcementId,
      reportId,
      finderAnonymousId: input.reporterAnonymousId,
      petName: pet.name,
      messages: [
        {
          id: `cm-${Date.now()}`,
          sender: 'finder',
          text: opener,
          createdAt: now,
        },
      ],
    }

    setLostReports((prev) => [report, ...prev])
    setLostConversations((prev) => [conversation, ...prev])
    setLostChatThreads((prev) => [chatThread, ...prev])
    setNotifications((prev) => [
      {
        id: `lost-found-${Date.now()}`,
        title: `${pet.name} byl/a nalezen/a.`,
        time: `Nálezce uvedl, že ${safetyText.toLowerCase()}. · ${input.location.publicLabel}`,
        unread: true,
        kind: 'lost_pet',
        lostAnnouncementId: announcementId,
        lostReportId: reportId,
        href: `/pets/${pet.id}?tab=overview&lostReport=${reportId}`,
      },
      ...prev,
    ])

    showToast(
      'Majitel byl kontaktován',
      'Zpráva byla odeslána anonymně přes LOVED & KNOWN.',
      'gold',
    )
    return { reportId, conversationId }
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

  const sendLostFinderMessage = (
    conversationId: string,
    text: string,
    as: 'owner' | 'finder',
  ): boolean => {
    const trimmed = text.trim()
    if (!trimmed) return false
    const conv = lostConversations.find((item) => item.id === conversationId)
    if (!conv) return false
    const now = new Date().toISOString()
    const ownerSender = as === 'owner' ? ('me' as const) : ('them' as const)

    setLostConversations((prev) =>
      prev.map((item) => {
        if (item.id !== conversationId) return item
        return {
          ...item,
          lastMessage: trimmed,
          time: 'právě teď',
          unread: as === 'finder' ? item.unread + 1 : item.unread,
          messages: [
            ...item.messages,
            {
              id: `m-${Date.now()}`,
              sender: ownerSender,
              text: trimmed,
              time: 'právě teď',
            },
          ],
        }
      }),
    )

    setLostChatThreads((prev) =>
      prev.map((thread) => {
        if (thread.conversationId !== conversationId) return thread
        return {
          ...thread,
          messages: [
            ...thread.messages,
            {
              id: `cm-${Date.now()}`,
              sender: as,
              text: trimmed,
              createdAt: now,
            },
          ],
        }
      }),
    )

    if (as === 'finder') {
      const petName = conv.petContext
      setNotifications((prev) => [
        {
          id: `lost-msg-${Date.now()}`,
          title: `Nová zpráva od nálezce · ${petName}`,
          time: 'právě teď',
          unread: true,
          kind: 'lost_pet',
          lostAnnouncementId: conv.lostAnnouncementId,
          href: `/messages?conversationId=${conversationId}`,
        },
        ...prev,
      ])
    }

    return true
  }

  const getLostChatThreadForFinder = (
    announcementId: string,
    finderAnonymousId: string,
  ) =>
    lostChatThreads.find(
      (thread) =>
        thread.announcementId === announcementId &&
        thread.finderAnonymousId === finderAnonymousId,
    )

  // Ensure QR tokens exist for pets loaded before this feature.
  useEffect(() => {
    setPets((prev) => ensurePetsFoundContactFields(prev))
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
    setNotifications((prev) =>
      prev.filter((item) => !item.sourceRecordId || !expiredIds.has(item.sourceRecordId)),
    )
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
        if (next.some((item) => item.sourceRecordId === record.id)) continue
        const notification = buildMedicationReminderNotification(
          record,
          petNameForRecord(pets, record.petId),
        )
        next = [notification, ...next]
        changed = true
      }
      return changed ? next : prev
    })
  }, [healthRecords, pets])

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
    const newComment = {
      id: `c_${createdAt}`,
      author: 'Tereza V.',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&q=85',
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
        if (!target || target.author !== 'Tereza V.') return post
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

    const post: CommunityPost = {
      id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      author: 'Tereza V.',
      avatar:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&q=85',
      time: 'Právě teď',
      text: text || 'Sdílím fotografii z komunity.',
      image: input.image,
      likes: 0,
      liked: false,
      petTag: input.petTag,
      petId: input.petId,
      location: input.location,
      locationLat: input.locationLat,
      locationLng: input.locationLng,
      commentsCount: 0,
      comments: [],
    }
    setPosts((prev) => [post, ...prev])
    showToast(
      'Příspěvek publikován v komunitě',
      'Váš příběh o mazlíčkovi je nyní viditelný v komunitě.',
      'gold',
    )
  }

  const addCalendarEvent = (event: Omit<CalendarEvent, 'id'>) => {
    setCalendarEvents((prev) => [
      { ...event, id: `c_${Date.now()}` },
      ...prev,
    ])
    setCalendarFocusDate(event.date)
    setEditingCalendarEventId(null)
    setActiveModal(null)
    showToast(
      `${event.title} naplánováno`,
      `Termín ${formatIsoDateToCzech(event.date)} pro ${event.petName}`,
      'gold',
    )
  }

  const updateCalendarEvent = (
    eventId: string,
    updates: Partial<Omit<CalendarEvent, 'id'>>,
  ) => {
    const existing = calendarEvents.find((event) => event.id === eventId)
    setCalendarEvents((prev) =>
      prev.map((event) => {
        if (event.id !== eventId) return event
        return {
          id: event.id,
          sourceRecordId: event.sourceRecordId,
          title: updates.title ?? event.title,
          petName: updates.petName ?? event.petName,
          type: updates.type ?? event.type,
          date: updates.date ?? event.date,
          time: 'time' in updates ? updates.time : event.time,
          location: 'location' in updates ? updates.location : event.location,
          notes: 'notes' in updates ? updates.notes : event.notes,
          reminderEnabled:
            'reminderEnabled' in updates ? updates.reminderEnabled : event.reminderEnabled,
          expectedBirthDate:
            'expectedBirthDate' in updates
              ? updates.expectedBirthDate
              : event.expectedBirthDate,
          expectedEndDate:
            'expectedEndDate' in updates ? updates.expectedEndDate : event.expectedEndDate,
          actualEndDate:
            'actualEndDate' in updates ? updates.actualEndDate : event.actualEndDate,
        }
      }),
    )
    if (updates.date) setCalendarFocusDate(updates.date)
    setEditingCalendarEventId(null)
    setActiveModalState(null)
    setModalPetId(null)
    showToast('Událost upravena', updates.title ?? existing?.title, 'gold')
  }

  const deleteCalendarEvent = (eventId: string) => {
    const existing = calendarEvents.find((event) => event.id === eventId)
    setCalendarEvents((prev) => prev.filter((event) => event.id !== eventId))
    setEditingCalendarEventId(null)
    setActiveModalState(null)
    setModalPetId(null)
    setCalendarEventPrefillType(null)
    showToast(
      'Událost smazána',
      existing ? `${existing.title} byla odstraněna z kalendáře.` : undefined,
      'info',
    )
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
        calendarEventPrefillType,
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
        addPetDocuments,
        updatePetDocument,
        replacePetDocument,
        deletePetDocument,
        addHealthRecord,
        updateHealthRecord,
        deleteHealthRecord,
        toggleMedicationReminder,
        setMedicationReminderTime,
        setMedicationReminderDays,
        markNotificationsRead,
        submitFoundPetContact,
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
        toggleLike,
        addComment,
        deleteComment,
        addCommunityPost,
        deletePost,
        addCalendarEvent,
        updateCalendarEvent,
        deleteCalendarEvent,
        showToast,
        removeToast,
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
