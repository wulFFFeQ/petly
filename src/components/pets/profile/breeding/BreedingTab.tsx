import { HeartHandshake } from 'lucide-react'
import type { CalendarEvent, EventType, Pet, PetBreedingData, PetDocument } from '../../../../types'
import { hasActiveBreedingProfile } from '../../../../lib/breedingProfile'
import { Card } from '../../../ui/Card'
import { BreedingEventsSection } from './BreedingEventsSection'
import { BreedingInfoSection } from './BreedingInfoSection'
import {
  BreedingHealthTestsSection,
  BreedingLittersSection,
  BreedingMatingsSection,
  BreedingPedigreeSection,
  BreedingShowsSection,
  BreedingTitlesSection,
} from './BreedingRecordsSections'

export interface BreedingTabProps {
  pet: Pet
  pets: Pet[]
  documents: PetDocument[]
  calendarEvents: CalendarEvent[]
  onSaveBreeding: (breeding: PetBreedingData) => void
  onOpenCalendarEvent: (eventId: string) => void
  onCreateCalendarEvent: (type: EventType) => void
}

export function BreedingTab({
  pet,
  pets,
  documents,
  calendarEvents,
  onSaveBreeding,
  onOpenCalendarEvent,
  onCreateCalendarEvent,
}: BreedingTabProps) {
  const active = hasActiveBreedingProfile(pet)
  const petDocuments = documents.filter((doc) => doc.petId === pet.id)

  return (
    <div className="space-y-6">
      <Card variant="elevated" padding="md">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D1E0D8] bg-[#EBF2EE] text-[#2C4A3E]">
            <HeartHandshake size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#191E1B]">Chovný profil</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-[#5A6660]">
              Samostatná chovatelská vrstva nad běžným profilem. Zdraví, dokumenty a kalendář
              zůstávají ve svých sekcích — zde je propojujete, neduplikujete.
              {!active && (
                <>
                  {' '}
                  Profil je momentálně neaktivní (např. po kastraci), ale historická data zůstávají.
                </>
              )}
            </p>
          </div>
        </div>
      </Card>

      <BreedingInfoSection pet={pet} onSave={onSaveBreeding} />
      <BreedingPedigreeSection pet={pet} pets={pets} onSave={onSaveBreeding} />
      <BreedingHealthTestsSection
        pet={pet}
        documents={petDocuments}
        onSave={onSaveBreeding}
      />
      <BreedingShowsSection pet={pet} documents={petDocuments} onSave={onSaveBreeding} />
      <BreedingTitlesSection pet={pet} documents={petDocuments} onSave={onSaveBreeding} />
      <BreedingMatingsSection
        pet={pet}
        pets={pets}
        documents={petDocuments}
        onSave={onSaveBreeding}
      />
      <BreedingLittersSection
        pet={pet}
        pets={pets}
        documents={petDocuments}
        onSave={onSaveBreeding}
      />
      <BreedingEventsSection
        pet={pet}
        calendarEvents={calendarEvents}
        onOpenEvent={onOpenCalendarEvent}
        onCreateEvent={onCreateCalendarEvent}
      />
    </div>
  )
}
