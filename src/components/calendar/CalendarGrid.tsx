import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  Calendar as CalendarIcon,
  BellRing,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { BRAND_NAME } from '../../lib/brand'
import {
  CALENDAR_CATEGORY_OPTIONS,
  eachIsoDateInclusive,
  getCategoryLabel,
  getEventCategory,
  getEventCategoryStyle,
  getEventVisualStyle,
  getHeatPeriodEndDate,
} from '../../lib/calendarEventTypes'
import { useApp } from '../../context/AppContext'
import type { CalendarEvent, CalendarEventCategory } from '../../types'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

const DAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

type CalendarDayEvent = CalendarEvent & {
  calendarRole?: 'start' | 'due' | 'heat-active' | 'heat-end' | 'heat-actual'
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

function addEventToDayMap(
  map: Record<number, CalendarDayEvent[]>,
  isoDate: string,
  year: number,
  month: number,
  event: CalendarDayEvent,
) {
  const eventDate = new Date(`${isoDate}T12:00:00`)
  if (eventDate.getFullYear() !== year || eventDate.getMonth() !== month) return
  const day = eventDate.getDate()
  if (!map[day]) map[day] = []
  map[day].push(event)
}

export function CalendarGrid() {
  const {
    calendarEvents,
    setActiveModal,
    showToast,
    calendarFocusDate,
    clearCalendarFocusDate,
    openEditCalendarEvent,
    deleteCalendarEvent,
  } = useApp()
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 1))
  const [selectedDay, setSelectedDay] = useState<number | null>(1)
  const [filterCategory, setFilterCategory] = useState<CalendarEventCategory | 'all'>('all')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  useEffect(() => {
    if (!calendarFocusDate) return
    const match = calendarFocusDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!match) {
      clearCalendarFocusDate()
      return
    }
    const focusYear = Number(match[1])
    const focusMonth = Number(match[2]) - 1
    const focusDay = Number(match[3])
    setCurrentDate(new Date(focusYear, focusMonth, 1))
    setSelectedDay(focusDay)
    setFilterCategory('all')
    clearCalendarFocusDate()
  }, [calendarFocusDate, clearCalendarFocusDate])

  const monthLabel = currentDate.toLocaleDateString('cs-CZ', {
    month: 'long',
    year: 'numeric',
  })

  const filteredEvents = useMemo(() => {
    return calendarEvents.filter(
      (e) => filterCategory === 'all' || getEventCategory(e.type) === filterCategory,
    )
  }, [calendarEvents, filterCategory])

  const eventsByDay = useMemo(() => {
    const map: Record<number, CalendarDayEvent[]> = {}
    filteredEvents.forEach((event) => {
      const isPregnancy = event.type === 'pregnancy'
      const isHeat = event.type === 'heat'

      if (isHeat) {
        const endIso = getHeatPeriodEndDate(event)
        const span = eachIsoDateInclusive(event.date, endIso)
        const lastIso = span[span.length - 1] ?? event.date
        span.forEach((iso) => {
          const isStart = iso === event.date
          const isLast = iso === lastIso
          let calendarRole: CalendarDayEvent['calendarRole'] = 'heat-active'
          let title = 'Hárání'
          if (isStart) {
            calendarRole = 'start'
            title = event.title || 'Hárání'
          } else if (isLast && event.actualEndDate) {
            calendarRole = 'heat-actual'
            title = 'Hárání skončilo'
          } else if (isLast) {
            calendarRole = 'heat-end'
            title = 'Konec hárání'
          }
          addEventToDayMap(map, iso, year, month, {
            ...event,
            title,
            calendarRole,
          })
        })
        return
      }

      addEventToDayMap(map, event.date, year, month, {
        ...event,
        calendarRole: isPregnancy ? 'start' : undefined,
      })
      if (isPregnancy && event.expectedBirthDate) {
        addEventToDayMap(map, event.expectedBirthDate, year, month, {
          ...event,
          title: `Předpoklad porodu · ${event.petName}`,
          calendarRole: 'due',
        })
      }
    })
    return map
  }, [filteredEvents, year, month])

  const selectedEvents = selectedDay ? eventsByDay[selectedDay] || [] : []

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const handleSyncCalendar = () => {
    showToast(
      'Kalendář synchronizován',
      `Události ${BRAND_NAME} synchronizovány s kalendářem Apple / Google.`,
      'gold',
    )
  }

  const filterCategories = CALENDAR_CATEGORY_OPTIONS

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-[#E8E4DC]">
        <button
          type="button"
          onClick={() => setFilterCategory('all')}
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer',
            filterCategory === 'all'
              ? 'bg-[#2C4A3E] text-white shadow-xs'
              : 'text-[#7D8B82] hover:text-[#191E1B] hover:bg-[#FAF8F5]',
          )}
        >
          Všechny události ({calendarEvents.length})
        </button>
        {filterCategories.map((option) => {
          const style = getEventCategoryStyle(option.value)
          const count = calendarEvents.filter(
            (e) => getEventCategory(e.type) === option.value,
          ).length
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilterCategory(option.value)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer',
                filterCategory === option.value
                  ? `${style.bg} ${style.text} ${style.border} border font-bold`
                  : 'text-[#7D8B82] hover:text-[#191E1B] hover:bg-[#FAF8F5]',
              )}
            >
              <span className={`h-2 w-2 rounded-full ${style.dot}`} />
              <span>{option.label}</span>
              <span className="text-[10px] opacity-70">({count})</span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card variant="elevated" padding="lg" className="lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold tracking-tight text-[#191E1B]">
                {monthLabel}
              </h3>
              <Badge variant="gold" size="sm">
                Harmonogram 2026
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 bg-[#FAF8F5] p-1 rounded-xl border border-[#E8E4DC]">
              <button
                type="button"
                onClick={prevMonth}
                className="rounded-lg p-1.5 text-[#7D8B82] hover:bg-white hover:text-[#191E1B] transition-colors cursor-pointer"
                aria-label="Předchozí měsíc"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentDate(new Date(2026, 8, 1))}
                className="px-2.5 py-1 text-xs font-semibold text-[#2C4A3E] hover:bg-white rounded-lg transition-colors cursor-pointer"
              >
                Dnes
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="rounded-lg p-1.5 text-[#7D8B82] hover:bg-white hover:text-[#191E1B] transition-colors cursor-pointer"
                aria-label="Další měsíc"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-xs font-bold uppercase tracking-wider text-[#A3AEA7]"
              >
                {day}
              </div>
            ))}

            {cells.map((day, i) => {
              if (day === null) {
                return (
                  <div
                    key={`empty-${i}`}
                    className="min-h-[85px] rounded-xl bg-[#FAF8F5]/30 border border-transparent"
                  />
                )
              }
              const dayEvents = eventsByDay[day] || []
              const isSelected = selectedDay === day
              const isToday = day === 1 && month === 8 && year === 2026

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    'relative flex min-h-[85px] flex-col items-start rounded-xl p-2 text-left transition-all duration-200 cursor-pointer border',
                    isSelected
                      ? 'bg-[#EBF2EE] border-[#2C4A3E] shadow-sm ring-2 ring-[#2C4A3E]/20'
                      : isToday
                        ? 'bg-white border-[#B8934A] shadow-xs'
                        : 'bg-white border-[#E8E4DC] hover:border-[#D1E0D8] hover:bg-[#FAF8F5]',
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={cn(
                        'text-xs font-bold',
                        isToday
                          ? 'text-[#B8934A]'
                          : isSelected
                            ? 'text-[#2C4A3E]'
                            : 'text-[#191E1B]',
                      )}
                    >
                      {day}
                    </span>
                    {isToday && (
                      <span className="text-[9px] font-bold uppercase text-[#B8934A] bg-[#FAF4E6] px-1 rounded">
                        Teď
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 flex flex-col gap-1 w-full overflow-hidden">
                    {dayEvents.slice(0, 3).map((event) => {
                      const style = getEventVisualStyle(event.type)
                      return (
                        <div
                          key={`${event.id}-${event.calendarRole ?? 'main'}`}
                          className={cn(
                            'text-[10px] font-semibold truncate rounded px-1.5 py-0.5 border leading-tight',
                            style.bg,
                            style.text,
                            style.border,
                          )}
                        >
                          {event.title}
                        </div>
                      )
                    })}
                    {dayEvents.length > 3 && (
                      <span className="text-[9px] font-bold text-[#7D8B82] pl-1">
                        +{dayEvents.length - 3} dalších
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card variant="elevated" padding="md">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F0EDE6]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                  Program na
                </span>
                <h4 className="text-base font-bold text-[#191E1B]">
                  {selectedDay
                    ? `${monthLabel.split(' ')[0]} ${selectedDay}, ${year}`
                    : 'Vyberte datum'}
                </h4>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => setActiveModal('bookVet')}
                className="gap-1 shadow-xs"
              >
                <Plus size={14} />
                <span>Přidat událost</span>
              </Button>
            </div>

            {selectedEvents.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#7D8B82]">
                <CalendarIcon size={24} className="mx-auto text-[#A3AEA7] mb-2" />
                <p className="font-semibold text-[#191E1B]">Žádné naplánované události</p>
                <p className="mt-0.5">
                  Klikněte na „Přidat událost“ pro záznam důležitého termínu.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((event) => {
                  const style = getEventVisualStyle(event.type)
                  const isPregnancyDue = event.calendarRole === 'due'
                  const isPregnancyStart =
                    event.type === 'pregnancy' && event.calendarRole === 'start'
                  const isHeatStart = event.type === 'heat' && event.calendarRole === 'start'
                  const isHeatActive = event.calendarRole === 'heat-active'
                  const isHeatEnd = event.calendarRole === 'heat-end'
                  const isHeatActual = event.calendarRole === 'heat-actual'
                  const roleLabel = isPregnancyDue
                    ? 'Předpoklad porodu'
                    : isHeatActive
                      ? 'Hárání probíhá'
                      : isHeatEnd
                        ? 'Odhad konce hárání'
                        : isHeatActual
                          ? 'Skutečný konec hárání'
                          : isHeatStart
                            ? 'Začátek hárání'
                            : getCategoryLabel(getEventCategory(event.type))
                  const heading = isPregnancyDue
                    ? 'Předpokládaný porod'
                    : isHeatActive
                      ? 'Hárání'
                      : isHeatEnd
                        ? 'Pravděpodobný konec hárání'
                        : isHeatActual
                          ? 'Hárání skončilo'
                          : event.title

                  return (
                    <div
                      key={`${event.id}-${event.calendarRole ?? 'main'}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => openEditCalendarEvent(event.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openEditCalendarEvent(event.id)
                        }
                      }}
                      className="rounded-2xl border border-[#E8E4DC] p-4 bg-[#FAF8F5] hover:bg-white hover:border-[#D1E0D8] hover:shadow-xs transition-all cursor-pointer text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                            style.bg,
                            style.text,
                            style.border,
                          )}
                        >
                          {roleLabel}
                        </span>
                        <div className="flex items-center gap-1">
                          {event.time && (
                            <span className="text-xs font-mono font-bold text-[#2C4A3E] flex items-center gap-1 mr-1">
                              <Clock size={12} />
                              {event.time}
                            </span>
                          )}
                          <button
                            type="button"
                            aria-label="Upravit událost"
                            title="Upravit"
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditCalendarEvent(event.id)
                            }}
                            className="rounded-lg p-1.5 text-[#7D8B82] hover:bg-[#EBF2EE] hover:text-[#2C4A3E] transition-colors cursor-pointer"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            aria-label="Smazat událost"
                            title="Smazat"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteCalendarEvent(event.id)
                            }}
                            className="rounded-lg p-1.5 text-[#7D8B82] hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <h5 className="mt-2 text-sm font-bold text-[#191E1B]">{heading}</h5>

                      <p className="mt-1 text-xs text-[#4A564F] font-medium">
                        Mazlíček: <strong className="text-[#191E1B]">{event.petName}</strong>
                      </p>

                      {isPregnancyStart && event.expectedBirthDate && (
                        <p className="mt-1.5 text-[11px] text-[#5A6660]">
                          Předpoklad porodu:{' '}
                          <strong className="text-[#191E1B]">
                            {new Date(`${event.expectedBirthDate}T12:00:00`).toLocaleDateString(
                              'cs-CZ',
                            )}
                          </strong>
                        </p>
                      )}

                      {isPregnancyDue && (
                        <p className="mt-1.5 text-[11px] text-[#5A6660]">
                          Začátek březosti:{' '}
                          <strong className="text-[#191E1B]">
                            {new Date(`${event.date}T12:00:00`).toLocaleDateString('cs-CZ')}
                          </strong>
                        </p>
                      )}

                      {isHeatStart && event.expectedEndDate && (
                        <p className="mt-1.5 text-[11px] text-[#5A6660]">
                          Pravděpodobný konec:{' '}
                          <strong className="text-[#191E1B]">
                            {new Date(`${event.expectedEndDate}T12:00:00`).toLocaleDateString(
                              'cs-CZ',
                            )}
                          </strong>
                        </p>
                      )}

                      {isHeatActive && (
                        <p className="mt-1.5 text-[11px] text-[#5A6660]">
                          Období:{' '}
                          <strong className="text-[#191E1B]">
                            {new Date(`${event.date}T12:00:00`).toLocaleDateString('cs-CZ')}
                            {' – '}
                            {new Date(
                              `${getHeatPeriodEndDate(event)}T12:00:00`,
                            ).toLocaleDateString('cs-CZ')}
                          </strong>
                        </p>
                      )}

                      {isHeatStart && event.actualEndDate && (
                        <p className="mt-1 text-[11px] text-[#5A6660]">
                          Skutečný konec:{' '}
                          <strong className="text-[#191E1B]">
                            {new Date(`${event.actualEndDate}T12:00:00`).toLocaleDateString(
                              'cs-CZ',
                            )}
                          </strong>
                        </p>
                      )}

                      {(isHeatEnd || isHeatActual) && (
                        <p className="mt-1.5 text-[11px] text-[#5A6660]">
                          Začátek hárání:{' '}
                          <strong className="text-[#191E1B]">
                            {new Date(`${event.date}T12:00:00`).toLocaleDateString('cs-CZ')}
                          </strong>
                        </p>
                      )}

                      {event.location && (
                        <p className="mt-1.5 text-[11px] text-[#7D8B82] flex items-center gap-1">
                          <MapPin size={11} className="text-[#B8934A]" />
                          {event.location}
                        </p>
                      )}

                      {event.notes &&
                        event.calendarRole !== 'due' &&
                        !isHeatEnd &&
                        !isHeatActual &&
                        !isHeatActive && (
                        <p className="mt-2 text-[11px] text-[#7D8B82] bg-white p-2 rounded-lg border border-[#E8E4DC]">
                          {event.notes}
                        </p>
                      )}

                      <p className="mt-2 text-[10px] font-medium text-[#A3AEA7]">
                        Klepnutím upravíte
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-[#F0EDE6]">
              <button
                type="button"
                onClick={handleSyncCalendar}
                className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-[#2C4A3E] hover:underline cursor-pointer"
              >
                <BellRing size={14} className="text-[#B8934A]" />
                Synchronizovat s externím kalendářem
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
