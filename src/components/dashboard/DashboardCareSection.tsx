import {
  Award,
  Check,
  Footprints,
  Heart,
  Pill,
  Scissors,
  Stethoscope,
  Syringe,
  UtensilsCrossed,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import type { CalendarEvent, CalendarEventCategory, EventType } from '../../types'
import { getEventCategory } from '../../lib/calendarEventTypes'
import {
  buildDashboardTodayItems,
  loadAllDailyCareCompleted,
  sortUpcomingEvents,
  type DashboardTodayItem,
} from '../../lib/dashboardCare'
import { saveDailyCareCompleted } from '../../lib/dailyCareChecklist'
import {
  formatTodayHeader,
  formatUpcomingDate,
  getEventTypeLabel,
} from '../../lib/dashboardDates'
import { cn } from '../../lib/utils'
import { Card } from '../ui/Card'

const categoryAccent: Record<
  CalendarEventCategory,
  { icon: typeof Pill; iconClass: string; rowTint: string }
> = {
  health: {
    icon: Stethoscope,
    iconClass: 'text-sky-800 bg-sky-100 border-sky-200/60',
    rowTint: 'bg-sky-50/50',
  },
  care: {
    icon: Scissors,
    iconClass: 'text-purple-800 bg-purple-100 border-purple-200/60',
    rowTint: 'bg-purple-50/40',
  },
  activity: {
    icon: Footprints,
    iconClass: 'text-emerald-800 bg-emerald-100 border-emerald-200/60',
    rowTint: 'bg-emerald-50/40',
  },
  show: {
    icon: Award,
    iconClass: 'text-amber-900 bg-amber-100 border-amber-200/60',
    rowTint: 'bg-amber-50/50',
  },
  breeding: {
    icon: Heart,
    iconClass: 'text-rose-800 bg-rose-100 border-rose-200/60',
    rowTint: 'bg-rose-50/40',
  },
  other: {
    icon: Heart,
    iconClass: 'text-[#4A564F] bg-[#FAF8F5] border-[#E8E4DC]',
    rowTint: 'bg-[#FAF8F5]/80',
  },
}

const typeAccentOverride: Partial<
  Record<EventType, { icon: typeof Pill; iconClass: string; rowTint: string }>
> = {
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
}

function getAccent(type: EventType) {
  return typeAccentOverride[type] ?? categoryAccent[getEventCategory(type)]
}

function CareSectionIntro({ caring }: { caring: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-px flex-1 bg-[#234B54]/15" aria-hidden />
      <p className="shrink-0 font-serif italic text-lg sm:text-xl text-[#234B54] tracking-tight">
        {caring ? 'Dnes se staráte o' : 'Dnes je o vaše mazlíčky postaráno. ♥'}
      </p>
      <span className="h-2 w-2 shrink-0 rounded-full bg-[#B8934A]" aria-hidden />
      <div className="h-px flex-1 bg-[#234B54]/15" aria-hidden />
    </div>
  )
}

function PetAvatar({
  image,
  name,
  type,
}: {
  image?: string
  name: string
  type: EventType
}) {
  const accent = getAccent(type)
  const Icon = accent.icon

  return (
    <div className="relative shrink-0">
      {image ? (
        <img
          src={image}
          alt={name}
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
      {image && (
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
  )
}

function TodayCareRow({
  item,
  done,
  onToggle,
  onOpen,
}: {
  item: DashboardTodayItem
  done: boolean
  onToggle: () => void
  onOpen: () => void
}) {
  const type = item.eventType ?? 'custom'
  const accent = getAccent(type)

  return (
    <li
      className={cn(
        'flex items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-2 transition-all duration-200 sm:gap-3 sm:px-3 sm:py-2.5',
        done ? 'bg-[#EBF2EE]/50' : accent.rowTint,
        !done &&
          'hover:border-[#E8E4DC]/80 hover:bg-white hover:shadow-[0_2px_12px_rgba(21,35,42,0.06)]',
      )}
    >
      {item.completable ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={done ? `Odškrtnout: ${item.label}` : `Splnit: ${item.label}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          className={cn(
            'flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors',
            done
              ? 'border-[#2C4A3E] bg-[#2C4A3E] text-white'
              : 'border-[#D1D9D4] bg-white text-transparent hover:border-[#2C4A3E]',
          )}
        >
          <Check size={12} strokeWidth={3} />
        </button>
      ) : (
        <span className="w-5 shrink-0" aria-hidden />
      )}

      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
      >
        <PetAvatar image={item.petImage} name={item.petName} type={type} />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'text-sm font-semibold',
              done ? 'text-[#5A6660] line-through' : 'text-[#191E1B]',
            )}
          >
            {item.petName}
          </p>
          <p className={cn('text-xs', done ? 'text-[#7D8B82] line-through' : 'text-[#5A6660]')}>
            {item.label}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 tabular-nums text-sm font-semibold',
            done ? 'text-[#7D8B82]' : 'text-[#234B54]',
          )}
        >
          {item.time ?? ''}
        </span>
      </button>

      {item.completable && !done && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          className="hidden shrink-0 cursor-pointer rounded-lg px-2 py-1 text-[11px] font-semibold text-[#2C4A3E] transition-colors hover:bg-[#EBF2EE] sm:inline-flex"
        >
          ✓ Splněno
        </button>
      )}
      {item.completable && done && (
        <span className="hidden shrink-0 text-[11px] font-semibold text-[#5A6660] sm:inline">
          Splněno
        </span>
      )}
    </li>
  )
}

function UpcomingEventRow({
  event,
  petImage,
  highlightTime,
  onOpen,
}: {
  event: CalendarEvent
  petImage?: string
  highlightTime?: boolean
  onOpen: () => void
}) {
  const accent = getAccent(event.type)
  const Icon = accent.icon

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'flex w-full cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-all duration-200',
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
          {formatUpcomingDate(event.date, event.time)}
        </span>
      </button>
    </li>
  )
}

export function DashboardCareSection() {
  const navigate = useNavigate()
  const { calendarEvents, pets, healthRecords, openEditCalendarEvent } = useApp()
  const [completedByPet, setCompletedByPet] = useState(() => loadAllDailyCareCompleted(pets))

  useEffect(() => {
    setCompletedByPet(loadAllDailyCareCompleted(pets))
  }, [pets])

  const todayItems = useMemo(
    () => buildDashboardTodayItems(pets, healthRecords, calendarEvents),
    [pets, healthRecords, calendarEvents],
  )

  const upcomingEvents = useMemo(
    () => sortUpcomingEvents(calendarEvents, 5),
    [calendarEvents],
  )

  const petImageByName = useMemo(
    () => new Map(pets.map((pet) => [pet.name, pet.image])),
    [pets],
  )

  const { pendingItems, doneItems } = useMemo(() => {
    const pending: DashboardTodayItem[] = []
    const done: DashboardTodayItem[] = []
    for (const item of todayItems) {
      const doneSet = new Set(completedByPet[item.petId] ?? [])
      if (item.completable && doneSet.has(item.id)) done.push(item)
      else pending.push(item)
    }
    return { pendingItems: pending, doneItems: done }
  }, [todayItems, completedByPet])

  const hasPending = pendingItems.length > 0
  const hasAnyToday = todayItems.length > 0
  const hasUpcoming = upcomingEvents.length > 0
  const showCareGrid = hasAnyToday || hasUpcoming

  const toggleDone = useCallback((petId: string, taskId: string) => {
    setCompletedByPet((prev) => {
      const current = prev[petId] ?? []
      const next = current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId]
      saveDailyCareCompleted(petId, next)
      return { ...prev, [petId]: next }
    })
  }, [])

  const openItem = useCallback(
    (item: DashboardTodayItem) => {
      if (item.kind === 'medication') {
        navigate(`/pets/${item.petId}?tab=health`)
        return
      }
      if (item.eventId) openEditCalendarEvent(item.eventId)
    },
    [navigate, openEditCalendarEvent],
  )

  return (
    <section className="space-y-5 sm:space-y-6">
      <CareSectionIntro caring={hasPending} />

      {!showCareGrid ? (
        <p className="text-center text-sm font-medium text-[#5A6660]">
          Žádné další úkoly na dnešek.
        </p>
      ) : (
        <div
          className={cn(
            'grid min-w-0 items-start gap-4 lg:gap-5',
            hasAnyToday && hasUpcoming && 'lg:grid-cols-2',
          )}
        >
          {hasAnyToday && (
            <Card
              variant="elevated"
              padding="none"
              className="min-w-0 overflow-hidden border-l-[3px] border-l-[#234B54]"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[#F0EDE6] bg-gradient-to-r from-[#FBF7F0] to-white px-5 py-3.5 sm:px-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#234B54]">
                  Dnes · {formatTodayHeader()}
                </p>
                <Link
                  to="/calendar"
                  className="text-[11px] font-semibold text-[#B8934A] transition-colors hover:text-[#A8833B]"
                >
                  Kalendář
                </Link>
              </div>
              <div className="px-4 py-3.5 sm:px-5 sm:py-4">
                {hasPending && (
                  <ul className="space-y-2">
                    {pendingItems.map((item) => (
                      <TodayCareRow
                        key={`${item.petId}-${item.id}`}
                        item={item}
                        done={false}
                        onToggle={() => toggleDone(item.petId, item.id)}
                        onOpen={() => openItem(item)}
                      />
                    ))}
                  </ul>
                )}

                {!hasPending && doneItems.length === 0 && (
                  <p className="text-sm font-medium text-[#5A6660]">
                    Dnes je o vaše mazlíčky postaráno. ♥
                  </p>
                )}

                {doneItems.length > 0 && (
                  <div className={cn(hasPending && 'mt-4 border-t border-[#F0EDE6] pt-3')}>
                    {hasPending && (
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#7D8B82]">
                        Splněno
                      </p>
                    )}
                    <ul className="space-y-2">
                      {doneItems.map((item) => (
                        <TodayCareRow
                          key={`done-${item.petId}-${item.id}`}
                          item={item}
                          done
                          onToggle={() => toggleDone(item.petId, item.id)}
                          onOpen={() => openItem(item)}
                        />
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}

          {hasUpcoming && (
            <Card variant="elevated" padding="none" className="min-w-0 overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-[#F0EDE6] bg-gradient-to-r from-[#FAF4E6]/80 to-[#FBF7F0] px-5 py-3.5 sm:px-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#234B54]">
                  Nadchází
                </p>
                <Link
                  to="/calendar"
                  className="text-[11px] font-semibold text-[#B8934A] transition-colors hover:text-[#A8833B]"
                >
                  Zobrazit vše
                </Link>
              </div>
              <div className="bg-[#FAF8F5]/40 px-4 py-3.5 sm:px-5 sm:py-4">
                <ul className="space-y-2">
                  {upcomingEvents.map((event, index) => (
                    <UpcomingEventRow
                      key={event.id}
                      event={event}
                      petImage={petImageByName.get(event.petName)}
                      highlightTime={index === 0}
                      onOpen={() => openEditCalendarEvent(event.id)}
                    />
                  ))}
                </ul>
              </div>
            </Card>
          )}
        </div>
      )}
    </section>
  )
}
