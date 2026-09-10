import { CalendarDays } from 'lucide-react'
import type { CalendarEvent, EventType, Pet } from '../../../../types'
import { getEventCategory, getEventTypeLabel } from '../../../../lib/calendarEventTypes'
import { formatIsoDateToCzech } from '../../../../lib/petProfileUtils'
import { hasActiveBreedingProfile } from '../../../../lib/breedingProfile'
import { Button } from '../../../ui/Button'
import { BreedingSection } from './BreedingSection'

const BREEDING_QUICK_TYPES: { type: EventType; label: string }[] = [
  { type: 'heat', label: 'Hárání' },
  { type: 'mating', label: 'Krytí' },
  { type: 'pregnancy', label: 'Březost' },
  { type: 'birth', label: 'Porod / vrh' },
  { type: 'litter_check', label: 'Vrh (kontrola)' },
  { type: 'exhibition', label: 'Výstava' },
  { type: 'pregnancy_check', label: 'Chovatelská kontrola' },
  { type: 'breeding_other', label: 'Jiná chovatelská' },
]

interface BreedingEventsSectionProps {
  pet: Pet
  calendarEvents: CalendarEvent[]
  onOpenEvent: (eventId: string) => void
  onCreateEvent: (type: EventType) => void
}

export function BreedingEventsSection({
  pet,
  calendarEvents,
  onOpenEvent,
  onCreateEvent,
}: BreedingEventsSectionProps) {
  const active = hasActiveBreedingProfile(pet)
  const events = calendarEvents
    .filter((event) => {
      const forPet =
        event.petId === pet.id || (!event.petId && event.petName === pet.name)
      if (!forPet) return false
      const category = getEventCategory(event.type)
      return category === 'breeding' || event.type === 'exhibition'
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <BreedingSection
      title="Chovatelské události v kalendáři"
      description="Propojeno s Kalendářem. Automaticky vzniká jen Hárání podle pravidel — ostatní typy jen ručně."
      icon={<CalendarDays size={18} className="text-[#2C4A3E]" />}
      empty={events.length === 0}
      emptyLabel="V kalendáři zatím nejsou chovatelské události pro tohoto mazlíčka."
    >
      {active && (
        <div className="mb-4 flex flex-wrap gap-2">
          {BREEDING_QUICK_TYPES.map((item) => (
            <Button
              key={item.type}
              size="xs"
              variant="outline"
              onClick={() => onCreateEvent(item.type)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      )}
      {!active && (
        <p className="mb-3 text-xs text-[#7D8B82]">
          Chovný profil je vypnutý — nové kalendářní chovatelské události nelze vytvářet. Historie
          níže zůstává.
        </p>
      )}
      {events.length > 0 && (
        <ul className="divide-y divide-[#F0EDE6] overflow-hidden rounded-xl border border-[#E8E4DC]">
          {events.map((event) => (
            <li key={event.id}>
              <button
                type="button"
                onClick={() => onOpenEvent(event.id)}
                className="flex w-full items-center justify-between gap-3 bg-white px-3.5 py-2.5 text-left hover:bg-[#FAF8F5] cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#191E1B]">
                    {event.title || getEventTypeLabel(event.type)}
                  </p>
                  <p className="text-[11px] text-[#7D8B82]">
                    {getEventTypeLabel(event.type)} · {formatIsoDateToCzech(event.date)}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-semibold text-[#234B54]">Otevřít</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </BreedingSection>
  )
}
