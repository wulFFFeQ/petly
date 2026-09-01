import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  Calendar as CalendarIcon,
  BellRing,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import type { CalendarEvent, EventType } from '../../types'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

const eventCategoryStyles: Record<
  EventType,
  { bg: string; text: string; border: string; dot: string; label: string }
> = {
  vet: {
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200/60',
    dot: 'bg-sky-500',
    label: 'Veterinární klinika',
  },
  vaccination: {
    bg: 'bg-[#EBF2EE]',
    text: 'text-[#2C4A3E]',
    border: 'border-[#D1E0D8]',
    dot: 'bg-[#2C4A3E]',
    label: 'Očkování',
  },
  medication: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200/60',
    dot: 'bg-amber-500',
    label: 'Léky',
  },
  grooming: {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200/60',
    dot: 'bg-purple-500',
    label: 'Spa a péče o srst',
  },
  feeding: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200/60',
    dot: 'bg-emerald-500',
    label: 'Stravovací režim',
  },
}

const DAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

export function CalendarGrid() {
  const { calendarEvents, setActiveModal, showToast } = useApp()
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 1))
  const [selectedDay, setSelectedDay] = useState<number | null>(1)
  const [filterType, setFilterType] = useState<EventType | 'all'>('all')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const monthLabel = currentDate.toLocaleDateString('cs-CZ', {
    month: 'long',
    year: 'numeric',
  })

  const filteredEvents = useMemo(() => {
    return calendarEvents.filter(
      (e) => filterType === 'all' || e.type === filterType,
    )
  }, [calendarEvents, filterType])

  const eventsByDay = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {}
    filteredEvents.forEach((event) => {
      const eventDate = new Date(event.date)
      if (eventDate.getFullYear() === year && eventDate.getMonth() === month) {
        const day = eventDate.getDate()
        if (!map[day]) map[day] = []
        map[day].push(event)
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
    showToast('Kalendář synchronizován', 'Události PETLY synchronizovány s kalendářem Apple / Google.', 'gold')
  }

  return (
    <div className="space-y-6">
      {/* Filter Category Chips */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-[#E8E4DC]">
        <button
          onClick={() => setFilterType('all')}
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer',
            filterType === 'all'
              ? 'bg-[#2C4A3E] text-white shadow-xs'
              : 'text-[#7D8B82] hover:text-[#191E1B] hover:bg-[#FAF8F5]',
          )}
        >
          Všechny události ({calendarEvents.length})
        </button>
        {(['vet', 'vaccination', 'medication', 'grooming', 'feeding'] as EventType[]).map(
          (type) => {
            const style = eventCategoryStyles[type]
            const count = calendarEvents.filter((e) => e.type === type).length
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer',
                  filterType === type
                    ? `${style.bg} ${style.text} ${style.border} border font-bold`
                    : 'text-[#7D8B82] hover:text-[#191E1B] hover:bg-[#FAF8F5]',
                )}
              >
                <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                <span>{style.label}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            )
          },
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Month Grid (2 cols) */}
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
                onClick={prevMonth}
                className="rounded-lg p-1.5 text-[#7D8B82] hover:bg-white hover:text-[#191E1B] transition-colors cursor-pointer"
                aria-label="Předchozí měsíc"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setCurrentDate(new Date(2026, 8, 1))}
                className="px-2.5 py-1 text-xs font-semibold text-[#2C4A3E] hover:bg-white rounded-lg transition-colors cursor-pointer"
              >
                Dnes
              </button>
              <button
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

                  {/* Day Events Indicator Pills */}
                  <div className="mt-1.5 flex flex-col gap-1 w-full overflow-hidden">
                    {dayEvents.slice(0, 2).map((event) => {
                      const style = eventCategoryStyles[event.type]
                      return (
                        <div
                          key={event.id}
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
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] font-bold text-[#7D8B82] pl-1">
                        +{dayEvents.length - 2} dalších
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </Card>

        {/* Selected Day Agenda Sidebar (1 col) */}
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
                <p className="mt-0.5">Klikněte na „Přidat událost“ pro záznam schůzky nebo rutiny.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((event) => {
                  const style = eventCategoryStyles[event.type]
                  return (
                    <div
                      key={event.id}
                      className="rounded-2xl border border-[#E8E4DC] p-4 bg-[#FAF8F5] hover:bg-white hover:shadow-xs transition-all"
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
                          {style.label}
                        </span>
                        {event.time && (
                          <span className="text-xs font-mono font-bold text-[#2C4A3E] flex items-center gap-1">
                            <Clock size={12} />
                            {event.time}
                          </span>
                        )}
                      </div>

                      <h5 className="mt-2 text-sm font-bold text-[#191E1B]">
                        {event.title}
                      </h5>

                      <p className="mt-1 text-xs text-[#4A564F] font-medium">
                        Mazlíček: <strong className="text-[#191E1B]">{event.petName}</strong>
                      </p>

                      {event.location && (
                        <p className="mt-1.5 text-[11px] text-[#7D8B82] flex items-center gap-1">
                          <MapPin size={11} className="text-[#B8934A]" />
                          {event.location}
                        </p>
                      )}

                      {event.notes && (
                        <p className="mt-2 text-[11px] text-[#7D8B82] bg-white p-2 rounded-lg border border-[#E8E4DC]">
                          {event.notes}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-[#F0EDE6]">
              <button
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
