import { useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import {
  getActiveSelfProfessionalProfile,
  listTodaysEventsForProfessional,
} from '../../lib/professional/dashboard'
import { isAccessEffective, getAccessListForProfessional } from '../../lib/professional'
import { APP_TODAY, parseEventDate } from '../../lib/dashboardDates'
import { EmptyState } from '../../components/professional/dashboard/EmptyState'
import { Card } from '../../components/ui/Card'

export function ProfessionalCalendarPage() {
  const { calendarEvents } = useApp()
  const profile = getActiveSelfProfessionalProfile()

  const todays = useMemo(() => {
    if (!profile) return []
    return listTodaysEventsForProfessional(profile.id, calendarEvents)
  }, [profile, calendarEvents])

  const upcoming = useMemo(() => {
    if (!profile) return []
    const activePetIds = new Set(
      getAccessListForProfessional(profile.id)
        .filter((a) => isAccessEffective(a))
        .map((a) => a.petId),
    )
    return calendarEvents
      .filter((ev) => ev.petId && activePetIds.has(ev.petId))
      .filter((ev) => {
        try {
          return parseEventDate(ev.date).getTime() >= APP_TODAY.getTime()
        } catch {
          return false
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 12)
  }, [profile, calendarEvents])

  if (!profile) {
    return (
      <EmptyState
        title="Chybí profesionální profil"
        description="Kalendář je dostupný po nastavení profilu."
        ctaTo="/professional/profile"
        ctaLabel="Profil"
      />
    )
  }

  return (
    <div className="space-y-5 pb-8" data-testid="professional-calendar-page">
      <div>
        <h1 className="text-lg font-bold text-[#191E1B]">Kalendář</h1>
        <p className="text-xs text-[#7D8B82]">
          Události propojených mazlíčků. Booking / synchronizace zatím není.
        </p>
      </div>

      <Card variant="elevated">
        <h2 className="text-sm font-bold text-[#191E1B]">Dnešní události</h2>
        {todays.length === 0 ? (
          <p className="mt-2 text-xs text-[#7D8B82]" data-testid="calendar-today-empty">
            Dnes nemáte žádné naplánované události.
          </p>
        ) : (
          <ul className="mt-3 space-y-2" data-testid="calendar-today-list">
            {todays.map((ev) => (
              <li key={ev.id} className="rounded-lg border border-[#E8E4DC] bg-[#FAF8F5] px-3 py-2">
                <p className="text-xs font-bold text-[#191E1B]">{ev.title}</p>
                <p className="text-[11px] text-[#7D8B82]">
                  {ev.petName}
                  {ev.time ? ` · ${ev.time}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card variant="elevated">
        <h2 className="text-sm font-bold text-[#191E1B]">Nadcházející</h2>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-xs text-[#7D8B82]">Žádné nadcházející události u propojených mazlíčků.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {upcoming.map((ev) => (
              <li key={ev.id} className="text-xs text-[#4A564F]">
                <span className="font-semibold">{ev.date}</span> · {ev.title} · {ev.petName}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
