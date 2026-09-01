import { Stethoscope, Syringe, Scissors, UtensilsCrossed, Pill } from 'lucide-react'
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

function sortByDateTime(a: CalendarEvent, b: CalendarEvent) {
  const dateCompare = a.date.localeCompare(b.date)
  if (dateCompare !== 0) return dateCompare
  return (a.time ?? '').localeCompare(b.time ?? '')
}

const eventAccent: Record<
  EventType,
  { icon: typeof Pill; iconClass: string; ring: string }
> = {
  vet: {
    icon: Stethoscope,
    iconClass: 'text-sky-700 bg-sky-50/90',
    ring: 'ring-sky-100/80',
  },
  vaccination: {
    icon: Syringe,
    iconClass: 'text-[#2C4A3E] bg-[#EBF2EE]',
    ring: 'ring-[#D1E0D8]/80',
  },
  medication: {
    icon: Pill,
    iconClass: 'text-amber-700 bg-amber-50/90',
    ring: 'ring-amber-100/80',
  },
  feeding: {
    icon: UtensilsCrossed,
    iconClass: 'text-emerald-700 bg-emerald-50/80',
    ring: 'ring-emerald-100/80',
  },
  grooming: {
    icon: Scissors,
    iconClass: 'text-purple-700 bg-purple-50/80',
    ring: 'ring-purple-100/80',
  },
}

function ScheduleEventRow({
  event,
  timeLabel,
  highlighted = false,
}: {
  event: CalendarEvent
  timeLabel: string
  highlighted?: boolean
}) {
  const accent = eventAccent[event.type]
  const Icon = accent.icon

  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2 sm:px-3.5 sm:py-2.5 transition-colors duration-200',
        'hover:bg-white/55',
        highlighted && 'bg-white/45',
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1',
          accent.iconClass,
          accent.ring,
        )}
      >
        <Icon size={16} strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'font-semibold text-[#191E1B]',
            highlighted ? 'text-[15px]' : 'text-sm',
          )}
        >
          {event.petName}
        </p>
        <p className="mt-0.5 text-xs text-[#7D8B82]">
          {getEventTypeLabel(event.type)}
        </p>
      </div>
      <span
        className={cn(
          'shrink-0 tabular-nums',
          highlighted
            ? 'text-sm font-bold text-[#2C4A3E]'
            : 'text-xs font-semibold text-[#4A564F]',
        )}
      >
        {timeLabel}
      </span>
    </li>
  )
}

function SchedulePanel({
  title,
  accentClass,
  children,
}: {
  title: string
  accentClass: string
  children: React.ReactNode
}) {
  return (
    <section className="relative self-start overflow-hidden rounded-xl sm:rounded-2xl border border-[#E8E4DC]/30 bg-[#FAF8F5]/60">
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#EBF2EE]/25 via-transparent to-[#FAF4E6]/20"
        aria-hidden
      />
      <div
        className={cn(
          'absolute -right-8 -top-8 h-14 w-14 rounded-full blur-2xl opacity-50',
          accentClass,
        )}
        aria-hidden
      />
      <div className="relative px-3.5 py-3 sm:px-4 sm:py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#7D8B82]">
          {title}
        </p>
        {children}
      </div>
    </section>
  )
}

export function DashboardSchedule() {
  const { calendarEvents } = useApp()

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

  return (
    <div className="grid items-start gap-4 sm:gap-5 lg:grid-cols-2 lg:gap-6">
      <SchedulePanel
        title={`Dnes · ${formatTodayHeader()}`}
        accentClass="bg-[#2C4A3E]/6"
      >
        {todayEvents.length === 0 ? (
          <p className="mt-2.5 text-sm font-medium text-[#7D8B82]">
            Dnes je vše hotovo ✓
          </p>
        ) : (
          <ul className="mt-2.5 space-y-1">
            {todayEvents.map((event, index) => (
              <ScheduleEventRow
                key={event.id}
                event={event}
                timeLabel={event.time ?? ''}
                highlighted={index === 0}
              />
            ))}
          </ul>
        )}
      </SchedulePanel>

      <SchedulePanel title="Nadchází" accentClass="bg-[#B8934A]/8">
        {upcomingEvents.length === 0 ? (
          <p className="mt-2.5 text-sm font-medium text-[#7D8B82]">
            Žádné nadcházející události.
          </p>
        ) : (
          <ul className="mt-2.5 space-y-1">
            {upcomingEvents.map((event, index) => (
              <ScheduleEventRow
                key={event.id}
                event={event}
                timeLabel={formatUpcomingDate(event.date, event.time)}
                highlighted={index === 0}
              />
            ))}
          </ul>
        )}
      </SchedulePanel>
    </div>
  )
}
