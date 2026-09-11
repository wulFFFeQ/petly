import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { EmptyState } from '../../components/professional/dashboard/EmptyState'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { useApp } from '../../context/AppContext'
import {
  availabilityToWeeklyDays,
  ensureDefaultAvailability,
  getAvailability,
  getAvailabilityExceptions,
  removeAvailabilityException,
  setWeeklyAvailability,
  upsertAvailabilityException,
  type AvailabilityExceptionType,
  type DayTimeWindow,
  type ProfessionalAvailabilityException,
  type Weekday,
  type WeeklyAvailabilityDay,
} from '../../lib/booking'
import { getActiveSelfProfessionalProfile } from '../../lib/professional/dashboard'

const DAY_LABELS: { weekday: Weekday; label: string }[] = [
  { weekday: 0, label: 'Po' },
  { weekday: 1, label: 'Út' },
  { weekday: 2, label: 'St' },
  { weekday: 3, label: 'Čt' },
  { weekday: 4, label: 'Pá' },
  { weekday: 5, label: 'So' },
  { weekday: 6, label: 'Ne' },
]

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function ProfessionalAvailabilityPage() {
  const profile = getActiveSelfProfessionalProfile()
  const { showToast } = useApp()

  const initialDays = useMemo(() => {
    if (!profile) return [] as WeeklyAvailabilityDay[]
    ensureDefaultAvailability(profile.id)
    return availabilityToWeeklyDays(getAvailability(profile.id))
  }, [profile])

  const [days, setDays] = useState<WeeklyAvailabilityDay[]>(initialDays)
  const [exceptions, setExceptions] = useState<ProfessionalAvailabilityException[]>(() =>
    profile ? getAvailabilityExceptions(profile.id) : [],
  )

  const [excDate, setExcDate] = useState(todayIso())
  const [excType, setExcType] = useState<AvailabilityExceptionType>('closed')
  const [excStart, setExcStart] = useState('09:00')
  const [excEnd, setExcEnd] = useState('12:00')
  const [excLabel, setExcLabel] = useState('')

  if (!profile) {
    return (
      <EmptyState
        title="Chybí profesionální profil"
        description="Dostupnost vyžaduje profesionální účet."
        ctaTo="/professional/profile"
        ctaLabel="Profil"
      />
    )
  }

  const updateDay = (weekday: Weekday, patch: Partial<WeeklyAvailabilityDay>) => {
    setDays((prev) =>
      prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)),
    )
  }

  const updateInterval = (
    weekday: Weekday,
    index: number,
    patch: Partial<DayTimeWindow>,
  ) => {
    setDays((prev) =>
      prev.map((d) => {
        if (d.weekday !== weekday) return d
        const intervals = d.intervals.map((iv, i) =>
          i === index ? { ...iv, ...patch } : iv,
        )
        return { ...d, intervals }
      }),
    )
  }

  const addInterval = (weekday: Weekday) => {
    setDays((prev) =>
      prev.map((d) => {
        if (d.weekday !== weekday) return d
        const last = d.intervals[d.intervals.length - 1]
        return {
          ...d,
          intervals: [
            ...d.intervals,
            {
              startTime: last?.endTime ?? '13:00',
              endTime: '17:00',
            },
          ],
        }
      }),
    )
  }

  const removeInterval = (weekday: Weekday, index: number) => {
    setDays((prev) =>
      prev.map((d) => {
        if (d.weekday !== weekday) return d
        if (d.intervals.length <= 1) return d
        return { ...d, intervals: d.intervals.filter((_, i) => i !== index) }
      }),
    )
  }

  const save = () => {
    const result = setWeeklyAvailability(profile.id, days)
    if (!result.ok) {
      showToast('Uložení selhalo', result.message, 'error')
      return
    }
    setDays(availabilityToWeeklyDays(result.value))
    showToast('Dostupnost uložena', 'Pracovní doba byla aktualizována.', 'success')
  }

  const refreshExceptions = () => {
    setExceptions(getAvailabilityExceptions(profile.id))
  }

  const addException = () => {
    const result = upsertAvailabilityException({
      professionalId: profile.id,
      date: excDate,
      type: excType,
      startTime: excType === 'custom_hours' ? excStart : undefined,
      endTime: excType === 'custom_hours' ? excEnd : undefined,
      label: excLabel.trim() || undefined,
    })
    if (!result.ok) {
      showToast('Výjimka', result.message, 'error')
      return
    }
    setExcLabel('')
    refreshExceptions()
    showToast('Výjimka uložena', 'Datum bude respektováno při rezervacích.', 'success')
  }

  const deleteException = (id: string) => {
    const result = removeAvailabilityException(profile.id, id)
    if (!result.ok) {
      showToast('Smazání selhalo', result.message, 'error')
      return
    }
    refreshExceptions()
    showToast('Výjimka odstraněna', undefined, 'success')
  }

  return (
    <div className="space-y-5 pb-8" data-testid="professional-availability-page">
      <div>
        <h1 className="text-lg font-bold text-[#191E1B]">Dostupnost</h1>
        <p className="text-xs text-[#7D8B82]">
          Týdenní pracovní doba a výjimky. Existující rezervace změna dostupnosti
          neruší.
        </p>
      </div>

      <Link
        to="/professional/services"
        className="inline-flex text-xs font-semibold text-[#2C4A3E] hover:underline"
      >
        ← Služby
      </Link>

      <Card variant="elevated">
        <h2 className="mb-3 text-sm font-bold text-[#191E1B]">Týdenní pracovní doba</h2>
        <ul className="space-y-4" data-testid="availability-week">
          {DAY_LABELS.map(({ weekday, label }) => {
            const day = days.find((r) => r.weekday === weekday)!
            return (
              <li
                key={weekday}
                className="border-b border-[#E8E4DC]/70 pb-4 last:border-0 last:pb-0"
                data-testid={`availability-day-${weekday}`}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="w-8 text-xs font-bold text-[#191E1B]">{label}</span>
                  <label className="flex items-center gap-1.5 text-[11px] text-[#4A564F]">
                    <input
                      type="checkbox"
                      checked={day.active}
                      data-testid={`availability-active-${weekday}`}
                      onChange={(e) =>
                        updateDay(weekday, {
                          active: e.target.checked,
                          intervals:
                            e.target.checked && day.intervals.length === 0
                              ? [{ startTime: '09:00', endTime: '17:00' }]
                              : day.intervals,
                        })
                      }
                    />
                    {day.active ? 'aktivní' : 'zavřeno'}
                  </label>
                </div>

                {day.active ? (
                  <div className="space-y-2 pl-8">
                    {day.intervals.map((iv, index) => (
                      <div
                        key={`${weekday}-${index}`}
                        className="flex flex-wrap items-center gap-2"
                        data-testid={`availability-interval-${weekday}-${index}`}
                      >
                        <Input
                          type="time"
                          value={iv.startTime}
                          wrapperClassName="w-[7.5rem]"
                          aria-label={`${label} od`}
                          onChange={(e) =>
                            updateInterval(weekday, index, { startTime: e.target.value })
                          }
                        />
                        <span className="text-xs text-[#7D8B82]">–</span>
                        <Input
                          type="time"
                          value={iv.endTime}
                          wrapperClassName="w-[7.5rem]"
                          aria-label={`${label} do`}
                          onChange={(e) =>
                            updateInterval(weekday, index, { endTime: e.target.value })
                          }
                        />
                        {day.intervals.length > 1 ? (
                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-[#7D8B82] hover:bg-[#FAF8F5] hover:text-rose-700"
                            aria-label="Odebrat interval"
                            data-testid={`availability-remove-interval-${weekday}-${index}`}
                            onClick={() => removeInterval(weekday, index)}
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2C4A3E] hover:underline"
                      data-testid={`availability-add-interval-${weekday}`}
                      onClick={() => addInterval(weekday)}
                    >
                      <Plus size={12} />
                      Přidat časový interval
                    </button>
                  </div>
                ) : (
                  <p className="pl-8 text-[11px] text-[#A3AEA7]">Den je vypnutý</p>
                )}
              </li>
            )
          })}
        </ul>
      </Card>

      <Button variant="primary" onClick={save} data-testid="availability-save">
        Uložit změny
      </Button>

      <Card variant="elevated" data-testid="availability-exceptions">
        <h2 className="mb-1 text-sm font-bold text-[#191E1B]">Výjimky</h2>
        <p className="mb-3 text-[11px] text-[#7D8B82]">
          Konkrétní datum má přednost před týdenní pracovní dobou. Důvod není vidět
          zákazníkům.
        </p>

        <div className="mb-4 space-y-2 rounded-xl bg-[#FAF8F5] p-3">
          <Input
            type="date"
            label="Datum"
            value={excDate}
            onChange={(e) => setExcDate(e.target.value)}
            data-testid="exception-date-input"
          />
          <label className="block text-xs font-semibold text-[#4A564F]">
            Typ
            <select
              className="mt-1 w-full rounded-xl border border-[#E8E4DC] bg-white px-3 py-2 text-sm"
              value={excType}
              onChange={(e) => setExcType(e.target.value as AvailabilityExceptionType)}
              data-testid="exception-type-select"
            >
              <option value="closed">Celý den zavřeno</option>
              <option value="custom_hours">Vlastní dostupnost</option>
            </select>
          </label>
          {excType === 'custom_hours' ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="time"
                value={excStart}
                wrapperClassName="w-[7.5rem]"
                onChange={(e) => setExcStart(e.target.value)}
                data-testid="exception-start-input"
              />
              <span className="text-xs text-[#7D8B82]">–</span>
              <Input
                type="time"
                value={excEnd}
                wrapperClassName="w-[7.5rem]"
                onChange={(e) => setExcEnd(e.target.value)}
                data-testid="exception-end-input"
              />
            </div>
          ) : null}
          <Input
            label="Důvod (volitelně)"
            placeholder="např. Dovolená, Školení"
            value={excLabel}
            onChange={(e) => setExcLabel(e.target.value)}
            data-testid="exception-label-input"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={addException}
            data-testid="exception-add"
          >
            Přidat výjimku
          </Button>
        </div>

        {exceptions.length === 0 ? (
          <p className="text-xs text-[#A3AEA7]" data-testid="exceptions-empty">
            Zatím žádné výjimky.
          </p>
        ) : (
          <ul className="space-y-2" data-testid="exceptions-list">
            {exceptions.map((ex) => (
              <li
                key={ex.id}
                className="flex items-start justify-between gap-2 rounded-xl border border-[#E8E4DC] bg-white px-3 py-2"
                data-testid={`exception-row-${ex.id}`}
              >
                <div className="min-w-0 text-xs">
                  <p className="font-semibold text-[#191E1B]">
                    {ex.date}
                    {ex.label ? (
                      <span className="ml-1 font-normal text-[#7D8B82]">· {ex.label}</span>
                    ) : null}
                  </p>
                  <p className="text-[#4A564F]">
                    {ex.type === 'closed'
                      ? 'Celý den nedostupný'
                      : `${ex.startTime ?? '—'}–${ex.endTime ?? '—'}`}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-lg p-1.5 text-[#7D8B82] hover:bg-rose-50 hover:text-rose-700"
                  aria-label="Smazat výjimku"
                  data-testid={`exception-remove-${ex.id}`}
                  onClick={() => deleteException(ex.id)}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
