import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import {
  getActiveSelfProfessionalProfile,
  listTodaysEventsForProfessional,
} from '../../lib/professional/dashboard'
import { isAccessEffective, getAccessListForProfessional } from '../../lib/professional'
import { listBookings } from '../../lib/booking'
import { APP_TODAY, parseEventDate } from '../../lib/dashboardDates'
import { EmptyState } from '../../components/professional/dashboard/EmptyState'
import { Card } from '../../components/ui/Card'
import { BookingStatusBadge } from '../../components/booking'

export function ProfessionalCalendarPage() {
  const { calendarEvents } = useApp()
  const profile = getActiveSelfProfessionalProfile()

  const todays = useMemo(() => {
    if (!profile) return []
    return listTodaysEventsForProfessional(profile.id, calendarEvents)
  }, [profile, calendarEvents])

  const bookingEventsToday = useMemo(() => {
    if (!profile) return []
    return calendarEvents.filter(
      (ev) =>
        ev.type === 'booking' &&
        ev.professionalId === profile.id &&
        ev.date ===
          `${APP_TODAY.getFullYear()}-${String(APP_TODAY.getMonth() + 1).padStart(2, '0')}-${String(APP_TODAY.getDate()).padStart(2, '0')}`,
    )
  }, [profile, calendarEvents])

  const upcoming = useMemo(() => {
    if (!profile) return []
    const activePetIds = new Set(
      getAccessListForProfessional(profile.id)
        .filter((a) => isAccessEffective(a))
        .map((a) => a.petId),
    )
    const fromAccess = calendarEvents
      .filter((ev) => ev.petId && activePetIds.has(ev.petId) && ev.type !== 'booking')
      .filter((ev) => {
        try {
          return parseEventDate(ev.date).getTime() >= APP_TODAY.getTime()
        } catch {
          return false
        }
      })

    const fromBookings = calendarEvents.filter(
      (ev) =>
        ev.type === 'booking' &&
        ev.professionalId === profile.id &&
        (() => {
          try {
            return parseEventDate(ev.date).getTime() >= APP_TODAY.getTime()
          } catch {
            return false
          }
        })(),
    )

    const merged = [...fromAccess, ...fromBookings]
    const seen = new Set<string>()
    return merged
      .filter((ev) => {
        if (seen.has(ev.id)) return false
        seen.add(ev.id)
        return true
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 12)
  }, [profile, calendarEvents])

  const openBookings = useMemo(() => {
    if (!profile) return []
    return listBookings({
      professionalId: profile.id,
      status: ['requested', 'confirmed'],
    }).slice(0, 5)
  }, [profile])

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

  const todayCombined = (() => {
    const map = new Map<string, (typeof todays)[number]>()
    for (const ev of [...todays, ...bookingEventsToday]) {
      map.set(ev.id, ev)
    }
    return [...map.values()]
  })()

  return (
    <div className="space-y-5 pb-8" data-testid="professional-calendar-page">
      <div>
        <h1 className="text-lg font-bold text-[#191E1B]">Kalendář</h1>
        <p className="text-xs text-[#7D8B82]">
          Události propojených mazlíčků a vaše rezervace. Osobní / zdravotní / booking jsou
          v jednom kalendáři.
        </p>
      </div>

      <Card variant="elevated">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[#191E1B]">Rezervace</h2>
          <Link
            to="/professional/bookings"
            className="text-[11px] font-semibold text-[#2C4A3E] hover:underline"
          >
            Spravovat
          </Link>
        </div>
        {openBookings.length === 0 ? (
          <p className="mt-2 text-xs text-[#7D8B82]">Žádné otevřené rezervace.</p>
        ) : (
          <ul className="mt-3 space-y-2" data-testid="calendar-bookings-preview">
            {openBookings.map((b) => (
              <li key={b.id}>
                <Link
                  to={`/professional/bookings/${b.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[#E8E4DC] bg-[#FAF8F5] px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-bold text-[#191E1B]">
                      {b.serviceName ?? 'Služba'}
                    </p>
                    <p className="text-[11px] text-[#7D8B82]">
                      {b.petName ?? 'Mazlíček'}
                      {b.startAt
                        ? ` · ${new Date(b.startAt).toLocaleString('cs-CZ', {
                            day: 'numeric',
                            month: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}`
                        : ''}
                    </p>
                  </div>
                  <BookingStatusBadge status={b.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card variant="elevated">
        <h2 className="text-sm font-bold text-[#191E1B]">Dnešní události</h2>
        {todayCombined.length === 0 ? (
          <p className="mt-2 text-xs text-[#7D8B82]" data-testid="calendar-today-empty">
            Dnes nemáte žádné naplánované události.
          </p>
        ) : (
          <ul className="mt-3 space-y-2" data-testid="calendar-today-list">
            {todayCombined.map((ev) => (
              <li key={ev.id} className="rounded-lg border border-[#E8E4DC] bg-[#FAF8F5] px-3 py-2">
                <p className="text-xs font-bold text-[#191E1B]">
                  {ev.type === 'booking' ? 'Rezervace · ' : ''}
                  {ev.title}
                </p>
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
          <p className="mt-2 text-xs text-[#7D8B82]">Žádné nadcházející události.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {upcoming.map((ev) => (
              <li key={ev.id} className="text-xs text-[#4A564F]">
                <span className="font-semibold">{ev.date}</span> ·{' '}
                {ev.type === 'booking' ? 'Rezervace · ' : ''}
                {ev.title} · {ev.petName}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
