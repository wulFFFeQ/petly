import type { Pet } from '../../types'
import { useApp } from '../../context/AppContext'
import { DocumentsTab } from './profile/DocumentsTab'
import { HealthTab } from './profile/HealthTab'
import { OverviewTab } from './profile/OverviewTab'
import { PetProfileModals } from './profile/PetProfileModals'
import { PhotosTab } from './profile/PhotosTab'
import { TimelineTab } from './profile/TimelineTab'
import { BreedingTab } from './profile/breeding/BreedingTab'
import { usePetProfileTabState } from './profile/usePetProfileTabState'

interface PetProfileTabContentProps {
  pet: Pet
  activeTab: string
  onTabChange: (tab: string) => void
}

export function PetProfileTabContent({ pet, activeTab, onTabChange }: PetProfileTabContentProps) {
  const state = usePetProfileTabState({ pet, onTabChange })
  const {
    pets,
    documents,
    calendarEvents,
    updatePet,
    openEditCalendarEvent,
    openNewCalendarEvent,
    showToast,
  } = useApp()

  return (
    <>
      {activeTab === 'overview' && <OverviewTab {...state.overview} />}
      {activeTab === 'health' && <HealthTab {...state.health} />}
      {activeTab === 'timeline' && <TimelineTab {...state.timeline} />}
      {activeTab === 'documents' && <DocumentsTab {...state.documents} />}
      {activeTab === 'photos' && <PhotosTab {...state.photos} />}
      {activeTab === 'breeding' && (
        <BreedingTab
          pet={pet}
          pets={pets}
          documents={documents}
          calendarEvents={calendarEvents}
          onSaveBreeding={(breeding) => {
            updatePet(pet.id, { breeding })
            showToast('Chovný profil uložen', undefined, 'gold')
          }}
          onOpenCalendarEvent={(eventId) => openEditCalendarEvent(eventId)}
          onCreateCalendarEvent={(type) =>
            openNewCalendarEvent({ petId: pet.id, type })
          }
        />
      )}
      <PetProfileModals {...state.modals} />
    </>
  )
}
