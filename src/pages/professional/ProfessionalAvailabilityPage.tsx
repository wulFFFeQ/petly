import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/professional/dashboard/EmptyState'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { useApp } from '../../context/AppContext'
import {
  ensureDefaultAvailability,
  getAvailability,
  setWeeklyAvailability,
  type Weekday,
  type WeeklyAvailabilityRow,
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

export function ProfessionalAvailabilityPage() {
  const profile = getActiveSelfProfessionalProfile()
  const { showToast } = useApp()

  const initial = useMemo(() => {
    if (!profile) return [] as WeeklyAvailabilityRow[]
    ensureDefaultAvailability(profile.id)
    const rows = getAvailability(profile.id)
    return DAY_LABELS.map(({ weekday }) => {
      const row = rows.find((r) => r.weekday === weekday)
      return {
        weekday,
        active: row?.active ?? false,
        startTime: row?.startTime ?? '09:00',
        endTime: row?.endTime ?? '17:00',
      }
    })
  }, [profile])

  const [rows, setRows] = useState<WeeklyAvailabilityRow[]>(initial)

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

  const updateRow = (weekday: Weekday, patch: Partial<WeeklyAvailabilityRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)),
    )
  }

  const save = () => {
    const result = setWeeklyAvailability(profile.id, rows)
    if (!result.ok) {
      showToast('Uložení selhalo', result.message, 'error')
      return
    }
    showToast('Dostupnost uložena', 'Pracovní doba byla aktualizována.', 'success')
  }

  return (
    <div className="space-y-5 pb-8" data-testid="professional-availability-page">
      <div>
        <h1 className="text-lg font-bold text-[#191E1B]">Dostupnost</h1>
        <p className="text-xs text-[#7D8B82]">
          Základní týdenní pracovní doba. Výjimky, dovolená a více směn — připraveno pro
          backend.
        </p>
      </div>

      <Link
        to="/professional/services"
        className="inline-flex text-xs font-semibold text-[#2C4A3E] hover:underline"
      >
        ← Služby
      </Link>

      <Card variant="elevated">
        <ul className="space-y-3" data-testid="availability-week">
          {DAY_LABELS.map(({ weekday, label }) => {
            const row = rows.find((r) => r.weekday === weekday)!
            return (
              <li
                key={weekday}
                className="flex flex-wrap items-center gap-2 border-b border-[#E8E4DC]/70 pb-3 last:border-0 last:pb-0"
              >
                <span className="w-8 text-xs font-bold text-[#191E1B]">{label}</span>
                <label className="flex items-center gap-1.5 text-[11px] text-[#4A564F]">
                  <input
                    type="checkbox"
                    checked={row.active}
                    data-testid={`availability-active-${weekday}`}
                    onChange={(e) => updateRow(weekday, { active: e.target.checked })}
                  />
                  {row.active ? 'aktivní' : 'zavřeno'}
                </label>
                <Input
                  type="time"
                  value={row.startTime}
                  disabled={!row.active}
                  wrapperClassName="w-[7.5rem]"
                  onChange={(e) => updateRow(weekday, { startTime: e.target.value })}
                />
                <span className="text-xs text-[#7D8B82]">–</span>
                <Input
                  type="time"
                  value={row.endTime}
                  disabled={!row.active}
                  wrapperClassName="w-[7.5rem]"
                  onChange={(e) => updateRow(weekday, { endTime: e.target.value })}
                />
              </li>
            )
          })}
        </ul>
      </Card>

      <p className="text-[10px] text-[#A3AEA7]">
        Extension point: více směn za den, dovolená, svátky, individuální výjimky, více
        pracovníků kliniky.
      </p>

      <Button variant="primary" onClick={save} data-testid="availability-save">
        Uložit dostupnost
      </Button>
    </div>
  )
}
