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

function sortByDateTime(a: CalendarEvent, b: CalendarEvent) {
  const dateCompare = a.date.localeCompare(b.date)
  if (dateCompare !== 0) return dateCompare
  return (a.time ?? '').localeCompare(b.time ?? '')
}

const eventAccentDark: Record<
  EventType,
  { icon: typeof Pill; iconClass: string }
> = {
  vet: { icon: Stethoscope, iconClass: 'text-white bg-sky-600' },
  vaccination: { icon: Syringe, iconClass: 'text-white bg-emerald-600' },
  medication: { icon: Pill, iconClass: 'text-white bg-amber-600' },
  feeding: { icon: UtensilsCrossed, iconClass: 'text-white bg-emerald-500' },
  grooming: { icon: Scissors, iconClass: 'text-white bg-purple-600' },
}

const eventAccentLight: Record<
  EventType,
  { icon: typeof Pill; iconClass: string }
> = {
  vet: { icon: Stethoscope, iconClass: 'text-sky-800 bg-sky-100' },
  vaccination: { icon: Syringe, iconClass: 'text-[#2C4A3E] bg-[#D1E0D8]' },
  medication: { icon: Pill, iconClass: 'text-amber-900 bg-amber-100' },
  feeding: { icon: UtensilsCrossed, iconClass: 'text-emerald-800 bg-emerald-100' },
  grooming: { icon: Scissors, iconClass: 'text-purple-800 bg-purple-100' },
}

function CareEventRow({
  event,
  timeLabel,
  variant = 'dark',
  size = 'default',
  highlightTime = false,
}: {
  event: CalendarEvent
  timeLabel: string
  variant?: 'dark' | 'light'
  size?: 'default' | 'compact'
  highlightTime?: boolean
}) {
  const accent = variant === 'dark' ? eventAccentDark[event.type] : eventAccentLight[event.type]
  const Icon = accent.icon
  const isDark = variant === 'dark'
  const goldTime = isDark || highlightTime

  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-xl transition-all duration-200',
        size === 'default' ? 'px-1 py-2 sm:py-2.5' : 'py-1.5',
        isDark ? 'hover:bg-white/10' : 'hover:bg-white/70 hover:shadow-[0_2px_12px_rgba(21,35,42,0.07)]',
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-xl shadow-sm',
          size === 'default' ? 'h-9 w-9' : 'h-7 w-7',
          accent.iconClass,
        )}
      >
        <Icon size={size === 'default' ? 16 : 14} strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'font-semibold',
            size === 'default' ? 'text-sm' : 'text-xs',
            isDark ? 'text-white' : 'text-[#191E1B]',
          )}
        >
          {event.petName}
        </p>
        <p className={cn('text-xs', isDark ? 'text-white/65' : 'text-[#5A6660]')}>
          {getEventTypeLabel(event.type)}
        </p>
      </div>
      <span
        className={cn(
          'shrink-0 tabular-nums text-sm',
          goldTime ? 'font-bold text-[#B8934A]' : 'font-semibold text-[#234B54]',
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
      <div className="h-px flex-1 bg-[#2C4A3E]/20" aria-hidden />
      <p className="shrink-0 font-serif italic text-lg sm:text-xl text-[#2C4A3E] tracking-tight">
        Dnes je o ně postaráno.
      </p>
      <span className="h-2 w-2 shrink-0 rounded-full bg-[#B8934A]" aria-hidden />
      <div className="h-px flex-1 bg-[#2C4A3E]/20" aria-hidden />
    </div>
  )
}

export function DashboardCareSection() {
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
    <section className="space-y-5 sm:space-y-6">
      <CareSectionIntro />

      <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-5">
        {/* Dnes — tmavý petrolejový blok */}
        <div className="relative self-start overflow-hidden rounded-2xl shadow-[0_10px_40px_rgba(21,35,42,0.32)]">
          <div
            className="absolute inset-0 bg-gradient-to-br from-[#234B54] via-[#1C3A42] to-[#152328]"
            aria-hidden
          />
          <div
            className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#B8934A]/25 blur-2xl"
            aria-hidden
          />
          <div className="relative px-5 py-4 sm:px-6 sm:py-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#B8934A]">
              Dnes · {formatTodayHeader()}
            </p>
            {todayEvents.length === 0 ? (
              <p className="mt-3 text-sm font-medium text-white/70">
                Dnes je vše hotovo ✓
              </p>
            ) : (
              <ul className="mt-3 space-y-1">
                {todayEvents.map((event) => (
                  <CareEventRow
                    key={event.id}
                    event={event}
                    timeLabel={event.time ?? ''}
                    variant="dark"
                  />
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Nadchází — teplý krémový protějšek */}
        <div className="relative self-start overflow-hidden rounded-2xl border border-[#E5DDD2] shadow-[0_10px_40px_rgba(21,35,42,0.1)]">
          <div
            className="absolute inset-0 bg-gradient-to-br from-[#FBF7F0] via-[#FAF4E8] to-[#F3EBE0]"
            aria-hidden
          />
          <div
            className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-[#B8934A]/15 blur-2xl"
            aria-hidden
          />
          <div
            className="absolute -right-6 bottom-0 h-24 w-24 rounded-full bg-[#1C3A42]/[0.06] blur-2xl"
            aria-hidden
          />
          <div
            className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#B8934A]/25 to-transparent"
            aria-hidden
          />
          <div className="relative px-5 py-4 sm:px-6 sm:py-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#1C3A42]">
              Nadchází
            </p>
            {upcomingEvents.length === 0 ? (
              <p className="mt-3 text-sm font-medium text-[#5A6660]">
                Žádné nadcházející události.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {upcomingEvents.map((event, index) => (
                  <CareEventRow
                    key={event.id}
                    event={event}
                    timeLabel={formatUpcomingDate(event.date, event.time)}
                    variant="light"
                    highlightTime={index === 0}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
