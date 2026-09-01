import {
  Pill,
  Stethoscope,
  Syringe,
  UtensilsCrossed,
  Scissors,
} from 'lucide-react'
import { useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import type { CalendarEvent, EventType } from '../../types'
import {
  APP_TODAY,
  formatUpcomingDate,
  isSameDay,
  parseEventDate,
} from '../../lib/dashboardDates'
import { Card } from '../ui/Card'
import { cn } from '../../lib/utils'

const typeConfig: Record<
  EventType,
  { label: string; icon: typeof Pill; color: string }
> = {
  medication: { label: 'Lék', icon: Pill, color: 'text-amber-700' },
  feeding: { label: 'Krmení', icon: UtensilsCrossed, color: 'text-emerald-700' },
  vet: { label: 'Veterinář', icon: Stethoscope, color: 'text-sky-700' },
  vaccination: { label: 'Očkování', icon: Syringe, color: 'text-[#2C4A3E]' },
  grooming: { label: 'Péče o srst', icon: Scissors, color: 'text-purple-700' },
}

function sortByDateTime(a: CalendarEvent, b: CalendarEvent) {
  const dateCompare = a.date.localeCompare(b.date)
  if (dateCompare !== 0) return dateCompare
  return (a.time ?? '').localeCompare(b.time ?? '')
}

function EventRow({
  event,
  showTime = true,
}: {
  event: CalendarEvent
  showTime?: boolean
}) {
  const config = typeConfig[event.type]
  const Icon = config.icon

  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FAF8F5]',
          config.color,
        )}
      >
        <Icon size={16} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[#191E1B]">{event.petName}</p>
        <p className="text-xs text-[#7D8B82]">{config.label}</p>
      </div>
      {showTime && event.time && (
        <span className="shrink-0 text-xs font-semibold text-[#4A564F] tabular-nums">
          {event.time}
        </span>
      )}
      {!showTime && (
        <span className="shrink-0 text-xs font-semibold text-[#4A564F]">
          {formatUpcomingDate(event.date, event.time)}
        </span>
      )}
    </li>
  )
}

function SchedulePanel({
  title,
  children,
  isEmpty,
  emptyMessage,
}: {
  title: string
  children: React.ReactNode
  isEmpty: boolean
  emptyMessage: string
}) {
  return (
    <Card variant="elevated" padding="md" className="h-full">
      <h2 className="text-lg font-bold tracking-tight text-[#191E1B]">{title}</h2>
      {isEmpty ? (
        <p className="mt-6 text-sm text-[#7D8B82]">{emptyMessage}</p>
      ) : (
        <ul className="mt-4 divide-y divide-[#F0EDE6]">{children}</ul>
      )}
    </Card>
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
    <div className="grid gap-5 lg:grid-cols-2">
      <SchedulePanel
        title="Dnes"
        isEmpty={todayEvents.length === 0}
        emptyMessage="Dnes je vše hotovo."
      >
        {todayEvents.map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
      </SchedulePanel>

      <SchedulePanel
        title="Nadchází"
        isEmpty={upcomingEvents.length === 0}
        emptyMessage="Žádné nadcházející události."
      >
        {upcomingEvents.map((event) => (
          <EventRow key={event.id} event={event} showTime={false} />
        ))}
      </SchedulePanel>
    </div>
  )
}
