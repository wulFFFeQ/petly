import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  calendarEvents as initialCalendarEvents,
  communityPosts as initialPosts,
  healthRecords as initialHealthRecords,
  myPets as initialPets,
  petPhotos as initialPetPhotos,
} from '../data/mockData'
import { getDefaultBreedImage } from '../lib/petBreedImages'
import { localizeBreedName } from '../lib/petBreeds'
import { pickRandomCoverColor } from '../lib/petCoverColors'
import { formatIsoDateToCzech } from '../lib/petProfileUtils'
import {
  buildMedicationReminderEvents,
  buildMedicationReminderNotification,
  normalizeReminderDays,
  petNameForRecord,
} from '../lib/medicationReminders'
import type {
  AppNotification,
  CalendarEvent,
  CommunityPost,
  HealthRecord,
  HealthRecordType,
  ModalType,
  NewPetForm,
  Pet,
  PetPhoto,
  ToastMessage,
} from '../types'

export type DiscoverFilter = 'all' | 'dog' | 'cat' | 'other' | 'nearby' | 'popular'

const PETS_STORAGE_KEY = 'lovedandknown.pets'
const PHOTOS_STORAGE_KEY = 'lovedandknown.petPhotos'
const HEALTH_STORAGE_KEY = 'lovedandknown.healthRecords'

function loadPets(): Pet[] {
  if (typeof window === 'undefined') return initialPets
  try {
    const raw = window.localStorage.getItem(PETS_STORAGE_KEY)
    if (!raw) return initialPets
    const parsed = JSON.parse(raw) as Pet[]
    if (!Array.isArray(parsed) || parsed.length === 0) return initialPets
    return parsed.map((pet) => ({
      ...pet,
      breed: localizeBreedName(pet.breed),
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

function loadHealthRecords(): HealthRecord[] {
  if (typeof window === 'undefined') return initialHealthRecords
  try {
    const raw = window.localStorage.getItem(HEALTH_STORAGE_KEY)
    if (!raw) return initialHealthRecords
    const parsed = JSON.parse(raw) as HealthRecord[]
    if (!Array.isArray(parsed)) return initialHealthRecords
    return parsed
  } catch {
    return initialHealthRecords
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
  healthRecords: HealthRecord[]
  posts: CommunityPost[]
  calendarEvents: CalendarEvent[]
  notifications: AppNotification[]
  activeModal: ModalType
  modalPetId: string | null
  discoverSearch: string
  discoverFilter: DiscoverFilter
  toasts: ToastMessage[]
  notificationsOpen: boolean
  setActiveModal: (modal: ModalType, petId?: string) => void
  setDiscoverSearch: (query: string) => void
  setDiscoverFilter: (filter: DiscoverFilter) => void
  setNotificationsOpen: (open: boolean) => void
  addPet: (form: NewPetForm) => void
  updatePetImage: (petId: string, image: string) => void
  updatePetCoverImage: (petId: string, coverImage: string) => void
  addPetPhotos: (petId: string, urls: string[]) => void
  updatePetPhoto: (photoId: string, updates: Partial<Pick<PetPhoto, 'caption'>>) => void
  deletePetPhoto: (photoId: string) => void
  addHealthRecord: (input: NewHealthRecordInput) => void
  updateHealthRecord: (recordId: string, updates: Partial<HealthRecord>) => void
  deleteHealthRecord: (recordId: string) => void
  toggleMedicationReminder: (recordId: string) => void
  setMedicationReminderTime: (recordId: string, time: string) => void
  setMedicationReminderDays: (recordId: string, days: number) => void
  markNotificationsRead: () => void
  toggleLike: (postId: string) => void
  addComment: (postId: string, text: string) => void
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void
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
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>(loadHealthRecords)
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(initialCalendarEvents)
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS)
  const [activeModal, setActiveModalState] = useState<ModalType>(null)
  const [modalPetId, setModalPetId] = useState<string | null>(null)
  const [discoverSearch, setDiscoverSearch] = useState('')
  const [discoverFilter, setDiscoverFilter] = useState<DiscoverFilter>('all')
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)

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

  const setActiveModal = (modal: ModalType, petId?: string) => {
    setActiveModalState(modal)
    setModalPetId(modal ? petId ?? null : null)
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
      ...(form.age != null && form.age > 0 ? { age: form.age } : {}),
      ...(form.gender ? { gender: form.gender } : {}),
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

  // Keep calendar/bell in sync for medications that already have reminderEnabled
  useEffect(() => {
    const enabledMeds = healthRecords.filter(
      (record) => record.type === 'medication' && record.reminderEnabled,
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
    const newComment = {
      id: `c_${Date.now()}`,
      author: 'Tereza V.',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&q=85',
      text: text.trim(),
      time: 'Právě teď',
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

  const addCalendarEvent = (event: Omit<CalendarEvent, 'id'>) => {
    setCalendarEvents((prev) => [
      ...prev,
      { ...event, id: `c_${Date.now()}` },
    ])
    setActiveModal(null)
    showToast(
      `${event.title} naplánováno`,
      `Termín ${event.date} pro ${event.petName}`,
      'gold',
    )
  }

  return (
    <AppContext.Provider
      value={{
        pets,
        photos,
        healthRecords,
        posts,
        calendarEvents,
        notifications,
        activeModal,
        modalPetId,
        discoverSearch,
        discoverFilter,
        toasts,
        notificationsOpen,
        setActiveModal,
        setDiscoverSearch,
        setDiscoverFilter,
        setNotificationsOpen,
        addPet,
        updatePetImage,
        updatePetCoverImage,
        addPetPhotos,
        updatePetPhoto,
        deletePetPhoto,
        addHealthRecord,
        updateHealthRecord,
        deleteHealthRecord,
        toggleMedicationReminder,
        setMedicationReminderTime,
        setMedicationReminderDays,
        markNotificationsRead,
        toggleLike,
        addComment,
        addCalendarEvent,
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
