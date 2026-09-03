import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  calendarEvents as initialCalendarEvents,
  communityPosts as initialPosts,
  myPets as initialPets,
  petPhotos as initialPetPhotos,
} from '../data/mockData'
import { getDefaultBreedImage } from '../lib/petBreedImages'
import { localizeBreedName } from '../lib/petBreeds'
import { pickRandomCoverColor } from '../lib/petCoverColors'
import type {
  CalendarEvent,
  CommunityPost,
  ModalType,
  NewPetForm,
  Pet,
  PetPhoto,
  ToastMessage,
} from '../types'

export type DiscoverFilter = 'all' | 'dog' | 'cat' | 'other' | 'nearby' | 'popular'

const PETS_STORAGE_KEY = 'lovedandknown.pets'
const PHOTOS_STORAGE_KEY = 'lovedandknown.petPhotos'

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

interface AppContextValue {
  pets: Pet[]
  photos: PetPhoto[]
  posts: CommunityPost[]
  calendarEvents: CalendarEvent[]
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
  toggleLike: (postId: string) => void
  addComment: (postId: string, text: string) => void
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void
  showToast: (title: string, description?: string, type?: ToastMessage['type']) => void
  removeToast: (id: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [pets, setPets] = useState<Pet[]>(loadPets)
  const [photos, setPhotos] = useState<PetPhoto[]>(loadPhotos)
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(initialCalendarEvents)
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
    const added: PetPhoto[] = urls.map((url, index) => ({
      id: `ph_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
      petId,
      url,
    }))
    setPhotos((prev) => [...added, ...prev])
    const pet = pets.find((item) => item.id === petId)
    setActiveModal(null)
    showToast(
      urls.length === 1 ? 'Fotografie nahrána' : `${urls.length} fotografie nahrány`,
      pet ? `Přidáno do galerie mazlíčka ${pet.name}.` : 'Přidáno do fotogalerie.',
      'gold',
    )
  }

  const updatePetPhoto = (photoId: string, updates: Partial<Pick<PetPhoto, 'caption'>>) => {
    setPhotos((prev) =>
      prev.map((photo) => (photo.id === photoId ? { ...photo, ...updates } : photo)),
    )
  }

  const deletePetPhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== photoId))
  }

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
        posts,
        calendarEvents,
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
