import {
  Pill,
  Scissors,
  Stethoscope,
  Syringe,
  UtensilsCrossed,
} from 'lucide-react'
import { useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import type { CalendarEvent, EventType } from '../../types'
import {
  APP_TODAY,
  formatTodayHeader,
  formatUpcomingDate,
  getEventTypeLabel,
  isSameDay,
  parseEventDate,
} from '../../lib/dashboardDates'
import { cn } from '../../lib/utils'
import { Card } from '../ui/Card'

function sortByDateTime(a: CalendarEvent, b: CalendarEvent) {
  const dateCompare = a.date.localeCompare(b.date)
  if (dateCompare !== 0) return dateCompare
  return (a.time ?? '').localeCompare(b.time ?? '')
}

const eventAccent: Record<
  EventType,
  { icon: typeof Pill; iconClass: string; rowTint: string }
> = {
  vet: {
    icon: Stethoscope,
    iconClass: 'text-sky-800 bg-sky-100 border-sky-200/60',
    rowTint: 'bg-sky-50/50',
  },
  vaccination: {
    icon: Syringe,
    iconClass: 'text-[#234B54] bg-[#E0EAEC] border-[#C5D5D9]/70',
    rowTint: 'bg-[#EEF4F5]/60',
  },
  medication: {
    icon: Pill,
    iconClass: 'text-amber-900 bg-amber-100 border-amber-200/60',
    rowTint: 'bg-amber-50/50',
  },
  feeding: {
    icon: UtensilsCrossed,
    iconClass: 'text-[#234B54] bg-[#FAF4E6] border-[#E8D8B5]/70',
    rowTint: 'bg-[#FBF7F0]/80',
  },
  grooming: {
    icon: Scissors,
    iconClass: 'text-purple-800 bg-purple-100 border-purple-200/60',
    rowTint: 'bg-purple-50/40',
  },
}

function CareEventRow({
  event,
  timeLabel,
  petImage,
  highlightTime = false,
}: {
  event: CalendarEvent
  timeLabel: string
  petImage?: string
  highlightTime?: boolean
}) {
  const accent = eventAccent[event.type]
  const Icon = accent.icon

  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-all duration-200',
        accent.rowTint,
        'hover:border-[#E8E4DC]/80 hover:bg-white hover:shadow-[0_2px_12px_rgba(21,35,42,0.06)]',
      )}
    >
      <div className="relative shrink-0">
        {petImage ? (
          <img
            src={petImage}
            alt={event.petName}
            className="h-9 w-9 rounded-full object-cover ring-2 ring-white shadow-sm"
          />
        ) : (
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full border',
              accent.iconClass,
            )}
          >
            <Icon size={16} strokeWidth={1.75} />
          </div>
        )}
        {petImage && (
          <div
            className={cn(
              'absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-white shadow-sm',
              accent.iconClass,
            )}
          >
            <Icon size={9} strokeWidth={2} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#191E1B]">{event.petName}</p>
        <p className="text-xs text-[#5A6660]">{getEventTypeLabel(event.type)}</p>
      </div>
      <span
        className={cn(
          'shrink-0 tabular-nums text-sm',
          highlightTime ? 'font-bold text-[#B8934A]' : 'font-semibold text-[#234B54]',
        )}
      >
        {timeLabel}
      </span>
    </li>
  )
}

function CareSectionIntro() {
  return (
    <div className="flex items-center gap-4">
      <div className="h-px flex-1 bg-[#234B54]/15" aria-hidden />
      <p className="shrink-0 font-serif italic text-lg sm:text-xl text-[#234B54] tracking-tight">
        Dnes je o ně postaráno.
      </p>
      <span className="h-2 w-2 shrink-0 rounded-full bg-[#B8934A]" aria-hidden />
      <div className="h-px flex-1 bg-[#234B54]/15" aria-hidden />
    </div>
  )
}

export function DashboardCareSection() {
  const { calendarEvents, pets } = useApp()

  const { todayEvents, upcomingEvents } = useMemo(() => {
    const today = calendarEvents
      .filter((e) => isSameDay(parseEventDate(e.date), APP_TODAY))
      .sort(sortByDateTime)

    const upcoming = calendarEvents
      .filter((e) => parseEventDate(e.date) > APP_TODAY)
      .sort(sortByDateTime)
      .slice(0, 4)

    return { todayEvents: today, upcomingEvents: upcoming }
  }, [calendarEvents])

  const petImageByName = useMemo(
    () => new Map(pets.map((pet) => [pet.name, pet.image])),
    [pets],
  )

  return (
    <section className="space-y-5 sm:space-y-6">
      <CareSectionIntro />

      <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-5">
        <Card
          variant="elevated"
          padding="none"
          className="overflow-hidden border-l-[3px] border-l-[#234B54]"
        >
          <div className="border-b border-[#F0EDE6] bg-gradient-to-r from-[#FBF7F0] to-white px-5 py-3.5 sm:px-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#234B54]">
              Dnes · {formatTodayHeader()}
            </p>
          </div>
          <div className="px-4 py-3.5 sm:px-5 sm:py-4">
            {todayEvents.length === 0 ? (
              <p className="text-sm font-medium text-[#5A6660]">
                Dnes je vše hotovo ✓
              </p>
            ) : (
              <ul className="space-y-2">
                {todayEvents.map((event) => (
                  <CareEventRow
                    key={event.id}
                    event={event}
                    timeLabel={event.time ?? ''}
                    petImage={petImageByName.get(event.petName)}
                  />
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card variant="elevated" padding="none" className="overflow-hidden">
          <div className="border-b border-[#F0EDE6] bg-gradient-to-r from-[#FAF4E6]/80 to-[#FBF7F0] px-5 py-3.5 sm:px-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#234B54]">
              Nadchází
            </p>
          </div>
          <div className="bg-[#FAF8F5]/40 px-4 py-3.5 sm:px-5 sm:py-4">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm font-medium text-[#5A6660]">
                Žádné nadcházející události.
              </p>
            ) : (
              <ul className="space-y-2">
                {upcomingEvents.map((event, index) => (
                  <CareEventRow
                    key={event.id}
                    event={event}
                    timeLabel={formatUpcomingDate(event.date, event.time)}
                    petImage={petImageByName.get(event.petName)}
                    highlightTime={index === 0}
                  />
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </section>
  )
}
