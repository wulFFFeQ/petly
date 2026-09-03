import { createContext, useContext, useState, type ReactNode } from 'react'
import {
  calendarEvents as initialCalendarEvents,
  communityPosts as initialPosts,
  myPets as initialPets,
} from '../data/mockData'
import { petPlaceholderImages } from '../lib/petTypes'
import type {
  CalendarEvent,
  CommunityPost,
  ModalType,
  NewPetForm,
  Pet,
  ToastMessage,
} from '../types'

export type DiscoverFilter = 'all' | 'dog' | 'cat' | 'other' | 'nearby' | 'popular'

interface AppContextValue {
  pets: Pet[]
  posts: CommunityPost[]
  calendarEvents: CalendarEvent[]
  activeModal: ModalType
  discoverSearch: string
  discoverFilter: DiscoverFilter
  toasts: ToastMessage[]
  notificationsOpen: boolean
  setActiveModal: (modal: ModalType) => void
  setDiscoverSearch: (query: string) => void
  setDiscoverFilter: (filter: DiscoverFilter) => void
  setNotificationsOpen: (open: boolean) => void
  addPet: (form: NewPetForm) => void
  toggleLike: (postId: string) => void
  addComment: (postId: string, text: string) => void
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void
  showToast: (title: string, description?: string, type?: ToastMessage['type']) => void
  removeToast: (id: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [pets, setPets] = useState<Pet[]>(initialPets)
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(initialCalendarEvents)
  const [activeModal, setActiveModal] = useState<ModalType>(null)
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
      image: petPlaceholderImages[form.type],
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
        posts,
        calendarEvents,
        activeModal,
        discoverSearch,
        discoverFilter,
        toasts,
        notificationsOpen,
        setActiveModal,
        setDiscoverSearch,
        setDiscoverFilter,
        setNotificationsOpen,
        addPet,
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
