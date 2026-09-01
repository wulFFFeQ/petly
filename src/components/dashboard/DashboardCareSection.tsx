import {
  PawPrint,
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

const eventAccent: Record<
  EventType,
  { icon: typeof Pill; iconClass: string }
> = {
  vet: { icon: Stethoscope, iconClass: 'text-sky-700 bg-sky-50/90' },
  vaccination: { icon: Syringe, iconClass: 'text-[#2C4A3E] bg-[#EBF2EE]' },
  medication: { icon: Pill, iconClass: 'text-amber-700 bg-amber-50/90' },
  feeding: { icon: UtensilsCrossed, iconClass: 'text-emerald-700 bg-emerald-50/80' },
  grooming: { icon: Scissors, iconClass: 'text-purple-700 bg-purple-50/80' },
}

function CareEventRow({
  event,
  timeLabel,
  size = 'default',
}: {
  event: CalendarEvent
  timeLabel: string
  size?: 'default' | 'compact'
}) {
  const accent = eventAccent[event.type]
  const Icon = accent.icon

  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-xl transition-colors duration-200 hover:bg-white/40',
        size === 'default' ? 'px-1 py-2 sm:py-2.5' : 'py-1.5',
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-xl',
          size === 'default' ? 'h-9 w-9' : 'h-7 w-7',
          accent.iconClass,
        )}
      >
        <Icon size={size === 'default' ? 16 : 14} strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'font-semibold text-[#191E1B]',
            size === 'default' ? 'text-sm' : 'text-xs',
          )}
        >
          {event.petName}
        </p>
        <p className="text-xs text-[#7D8B82]">{getEventTypeLabel(event.type)}</p>
      </div>
      <span
        className={cn(
          'shrink-0 tabular-nums font-semibold text-[#4A564F]',
          size === 'default' ? 'text-xs' : 'text-[11px]',
        )}
      >
        {timeLabel}
      </span>
    </li>
  )
}

function EditorialDivider() {
  return (
    <div className="flex items-center gap-4">
      <div
        className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D1E0D8]/70 to-transparent"
        aria-hidden
      />
      <PawPrint
        size={16}
        strokeWidth={1.5}
        className="shrink-0 text-[#2C4A3E]/25"
        aria-hidden
      />
      <p className="shrink-0 font-serif italic text-base sm:text-lg text-[#2C4A3E]/90 tracking-tight">
        Dnes je o ně postaráno.
      </p>
      <PawPrint
        size={16}
        strokeWidth={1.5}
        className="shrink-0 text-[#2C4A3E]/25"
        aria-hidden
      />
      <div
        className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D1E0D8]/70 to-transparent"
        aria-hidden
      />
    </div>
  )
}

export function DashboardCareSection() {
  const { calendarEvents } = useApp()

  const { todayEvents, nextEvent, moreUpcoming } = useMemo(() => {
    const today = calendarEvents
      .filter((e) => isSameDay(parseEventDate(e.date), APP_TODAY))
      .sort(sortByDateTime)

    const upcoming = calendarEvents
      .filter((e) => parseEventDate(e.date) > APP_TODAY)
      .sort(sortByDateTime)

    return {
      todayEvents: today,
      nextEvent: upcoming[0] ?? null,
      moreUpcoming: upcoming.slice(1, 4),
    }
  }, [calendarEvents])

  const nextAccent = nextEvent ? eventAccent[nextEvent.type] : null
  const NextIcon = nextAccent?.icon

  return (
    <section className="space-y-5 sm:space-y-6">
      <EditorialDivider />

      <div className="grid items-start gap-4 lg:grid-cols-12 lg:gap-5">
        {/* Dnešní péče — dominantní blok */}
        <div className="relative self-start overflow-hidden rounded-2xl lg:col-span-8">
          <div
            className="absolute inset-0 bg-gradient-to-br from-[#EBF2EE]/70 via-[#F5F9F6]/50 to-[#FAF4E6]/40"
            aria-hidden
          />
          <div
            className="absolute -left-6 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-[#2C4A3E]/6 blur-2xl"
            aria-hidden
          />
          <PawPrint
            size={72}
            strokeWidth={1}
            className="pointer-events-none absolute -bottom-2 -right-2 text-[#2C4A3E]/[0.05]"
            aria-hidden
          />
          <div className="relative px-4 py-3.5 sm:px-5 sm:py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#7D8B82]">
              Dnes · {formatTodayHeader()}
            </p>
            {todayEvents.length === 0 ? (
              <p className="mt-3 text-sm font-medium text-[#7D8B82]">
                Dnes je vše hotovo ✓
              </p>
            ) : (
              <ul className="mt-2.5 space-y-0.5">
                {todayEvents.map((event) => (
                  <CareEventRow
                    key={event.id}
                    event={event}
                    timeLabel={event.time ?? ''}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Nejbližší událost + zbytek */}
        <div className="flex flex-col gap-3 self-start lg:col-span-4">
          {nextEvent && nextAccent && NextIcon ? (
            <div className="relative overflow-hidden rounded-2xl">
              <div
                className="absolute inset-0 bg-gradient-to-br from-[#FAF4E6]/80 via-[#FAF8F5] to-[#EBF2EE]/30"
                aria-hidden
              />
              <div
                className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[#B8934A]/10 blur-xl"
                aria-hidden
              />
              <div className="relative px-4 py-3.5 sm:px-5 sm:py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#7D8B82]">
                  Nadchází
                </p>
                <div className="mt-3 flex items-start gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      nextAccent.iconClass,
                    )}
                  >
                    <NextIcon size={18} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold tracking-tight text-[#191E1B]">
                      {nextEvent.petName}
                    </p>
                    <p className="mt-0.5 text-xs text-[#7D8B82]">
                      {getEventTypeLabel(nextEvent.type)}
                    </p>
                    <p className="mt-2 text-sm font-semibold tabular-nums text-[#2C4A3E]">
                      {formatUpcomingDate(nextEvent.date, nextEvent.time)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4">
              <div
                className="absolute inset-0 bg-gradient-to-br from-[#FAF4E6]/60 to-[#FAF8F5]"
                aria-hidden
              />
              <p className="relative text-sm font-medium text-[#7D8B82]">
                Žádné nadcházející události.
              </p>
            </div>
          )}

          {moreUpcoming.length > 0 && (
            <ul className="space-y-0.5 px-1">
              {moreUpcoming.map((event) => (
                <CareEventRow
                  key={event.id}
                  event={event}
                  timeLabel={formatUpcomingDate(event.date, event.time)}
                  size="compact"
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
