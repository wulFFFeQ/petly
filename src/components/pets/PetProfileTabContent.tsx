import type { Pet } from '../../types'
import { DocumentsTab } from './profile/DocumentsTab'
import { HealthTab } from './profile/HealthTab'
import { OverviewTab } from './profile/OverviewTab'
import { PetProfileModals } from './profile/PetProfileModals'
import { PhotosTab } from './profile/PhotosTab'
import { TimelineTab } from './profile/TimelineTab'
import { usePetProfileTabState } from './profile/usePetProfileTabState'

interface PetProfileTabContentProps {
  pet: Pet
  activeTab: string
  onTabChange: (tab: string) => void
}

export function PetProfileTabContent({ pet, activeTab, onTabChange }: PetProfileTabContentProps) {
  const state = usePetProfileTabState({ pet, onTabChange })

  return (
    <>
      {activeTab === 'overview' && <OverviewTab {...state.overview} />}
      {activeTab === 'health' && <HealthTab {...state.health} />}
      {activeTab === 'timeline' && <TimelineTab {...state.timeline} />}
      {activeTab === 'documents' && <DocumentsTab {...state.documents} />}
      {activeTab === 'photos' && <PhotosTab {...state.photos} />}
      <PetProfileModals {...state.modals} />
    </>
  )
}
