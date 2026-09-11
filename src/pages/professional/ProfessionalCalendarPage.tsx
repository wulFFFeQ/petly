import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import {
  getActiveSelfProfessionalProfile,
  listTodaysEventsForProfessional,
} from '../../lib/professional/dashboard'
import { isAccessEffective, getAccessListForProfessional } from '../../lib/professional'
import {
  ensureDefaultAvailability,
  getAvailability,
  getAvailabilityExceptions,
  listBookings,
  resolveDayWindows,
} from '../../lib/booking'
import { APP_TODAY, parseEventDate } from '../../lib/dashboardDates'
import { EmptyState } from '../../components/professional/dashboard/EmptyState'
import { Card } from '../../components/ui/Card'
import { BookingStatusBadge } from '../../components/booking'

function todayIsoFromApp(): string {
  return `${APP_TODAY.getFullYear()}-${String(APP_TODAY.getMonth() + 1).padStart(2, '0')}-${String(APP_TODAY.getDate()).padStart(2, '0')}`
}

export function ProfessionalCalendarPage() {
  const { calendarEvents } = useApp()
  const profile = getActiveSelfProfessionalProfile()

  const todays = useMemo(() => {
    if (!profile) return []
    return listTodaysEventsForProfessional(profile.id, calendarEvents)
  }, [profile, calendarEvents])

  const todayIso = todayIsoFromApp()

  const bookingEventsToday = useMemo(() => {
    if (!profile) return []
    return calendarEvents.filter(
      (ev) =>
        ev.type === 'booking' &&
        ev.professionalId === profile.id &&
        ev.date === todayIso,
    )
  }, [profile, calendarEvents, todayIso])

  const daySchedule = useMemo(() => {
    if (!profile) {
      return { kind: 'none' as const, windows: [] as { startTime: string; endTime: string }[] }
    }
    ensureDefaultAvailability(profile.id)
    const availability = getAvailability(profile.id)
    const exceptions = getAvailabilityExceptions(profile.id)
    const dayExc = exceptions.filter((e) => e.date === todayIso)
    const closed = dayExc.some((e) => e.type === 'closed')
    const windows = resolveDayWindows(profile.id, todayIso, availability, exceptions)
    if (closed) return { kind: 'blocked' as const, windows: [] }
    if (dayExc.some((e) => e.type === 'custom_hours')) {
      return { kind: 'custom' as const, windows }
    }
    if (windows.length === 0) return { kind: 'off' as const, windows: [] }
    return { kind: 'work' as const, windows }
  }, [profile, todayIso])

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
          Pracovní dostupnost, blokace a rezervace — odděleně. Osobní / zdravotní /
          booking zůstávají v jednom kalendáři.
        </p>
      </div>

      <Card variant="elevated" data-testid="calendar-availability-today">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[#191E1B]">Dnes — dostupnost</h2>
          <Link
            to="/professional/availability"
            className="text-[11px] font-semibold text-[#2C4A3E] hover:underline"
          >
            Upravit
          </Link>
        </div>
        <ul className="mt-3 space-y-2">
          {daySchedule.kind === 'blocked' ? (
            <li
              className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900"
              data-testid="calendar-layer-blocked"
            >
              <span className="rounded bg-rose-200 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                Blokováno
              </span>
              Celý den nedostupný (výjimka)
            </li>
          ) : null}
          {daySchedule.kind === 'off' ? (
            <li
              className="rounded-lg border border-[#E8E4DC] bg-[#FAF8F5] px-3 py-2 text-xs text-[#7D8B82]"
              data-testid="calendar-layer-off"
            >
              Dnes nemáte nastavenou pracovní dobu.
            </li>
          ) : null}
          {daySchedule.windows.map((w) => (
            <li
              key={`${w.startTime}-${w.endTime}`}
              className="flex items-center gap-2 rounded-lg border border-[#D5E5DC] bg-[#EBF2EE] px-3 py-2 text-xs text-[#2C4A3E]"
              data-testid="calendar-layer-work"
            >
              <span className="rounded bg-[#2C4A3E]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                {daySchedule.kind === 'custom' ? 'Vlastní hodiny' : 'Pracovní doba'}
              </span>
              {w.startTime}–{w.endTime}
            </li>
          ))}
          {bookingEventsToday.map((ev) => (
            <li
              key={ev.id}
              className="flex items-center gap-2 rounded-lg border border-[#E8D9B8] bg-[#FBF6EB] px-3 py-2 text-xs text-[#5C4A1F]"
              data-testid="calendar-layer-booking"
            >
              <span className="rounded bg-[#B8934A]/25 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                Rezervace
              </span>
              {ev.title}
              {ev.time ? ` · ${ev.time}` : ''}
            </li>
          ))}
        </ul>
      </Card>

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
