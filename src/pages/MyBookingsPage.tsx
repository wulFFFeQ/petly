import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck2 } from 'lucide-react'
import { BookingStatusBadge } from '../components/booking'
import { Card } from '../components/ui/Card'
import { Tabs } from '../components/ui/Tabs'
import { getSelfAccount } from '../lib/account'
import { partitionOwnerBookings, type Booking } from '../lib/booking'

const SECTIONS = [
  { id: 'upcoming', label: 'Nadcházející' },
  { id: 'pending', label: 'Čeká na potvrzení' },
  { id: 'past', label: 'Proběhlé' },
  { id: 'cancelled', label: 'Zrušené' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

const EMPTY: Record<SectionId, string> = {
  upcoming: 'Zatím nemáte žádné nadcházející rezervace.',
  pending: 'Nemáte žádné žádosti čekající na potvrzení.',
  past: 'Zatím nemáte žádné proběhlé rezervace.',
  cancelled: 'Nemáte žádné zrušené ani odmítnuté rezervace.',
}

function formatCardMeta(b: Booking): string {
  const d = new Date(b.startAt)
  if (Number.isNaN(d.getTime())) return ''
  const date = `${d.getDate()}. ${d.getMonth() + 1}.`
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const mins = Math.round((Date.parse(b.endAt) - Date.parse(b.startAt)) / 60_000)
  const duration = Number.isFinite(mins) && mins > 0 ? ` · ${mins} min` : ''
  return `${date} · ${time}${duration}`
}

export function MyBookingsPage() {
  const self = getSelfAccount()
  const [section, setSection] = useState<SectionId>('upcoming')
  const [tick, setTick] = useState(0)

  const partitioned = useMemo(() => {
    if (!self) {
      return { pending: [], upcoming: [], past: [], cancelled: [] }
    }
    return partitionOwnerBookings(self.id)
  }, [self, tick])

  // Prefer pending tab when there are waiting requests and nothing upcoming.
  const activeSection: SectionId =
    section === 'upcoming' &&
    partitioned.upcoming.length === 0 &&
    partitioned.pending.length > 0
      ? 'pending'
      : section

  const list =
    activeSection === 'upcoming'
      ? partitioned.upcoming
      : activeSection === 'pending'
        ? partitioned.pending
        : activeSection === 'past'
          ? partitioned.past
          : partitioned.cancelled

  const total =
    partitioned.upcoming.length +
    partitioned.pending.length +
    partitioned.past.length +
    partitioned.cancelled.length

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10" data-testid="my-bookings-page">
      <div>
        <h1 className="text-xl font-bold text-[#191E1B]">Moje rezervace</h1>
        <p className="mt-1 text-xs text-[#7D8B82]">
          Přehled žádostí a potvrzených termínů u profesionálů.
        </p>
      </div>

      {total === 0 ? (
        <Card variant="elevated" className="py-10 text-center" data-testid="bookings-empty-all">
          <CalendarCheck2 className="mx-auto text-[#A3AEA7]" size={28} strokeWidth={1.5} />
          <p className="mt-3 text-sm font-semibold text-[#191E1B]">
            Zatím nemáte žádné rezervace.
          </p>
          <p className="mt-1 text-xs text-[#7D8B82]">
            Rezervaci vytvoříte z veřejného profilu profesionála.
          </p>
          <Link
            to="/professionals"
            className="mt-4 inline-flex text-xs font-semibold text-[#2C4A3E] hover:underline"
          >
            Prohlédnout profesionály →
          </Link>
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto -mx-1 px-1">
            <Tabs
              variant="pills"
              tabs={SECTIONS.map((s) => ({
                id: s.id,
                label: s.label,
                count:
                  s.id === 'pending' && partitioned.pending.length > 0
                    ? partitioned.pending.length
                    : undefined,
              }))}
              activeTab={activeSection}
              onChange={(id) => setSection(id as SectionId)}
            />
          </div>

          <ul className="space-y-2" data-testid="my-bookings-list">
            {list.length === 0 ? (
              <p
                className="px-1 py-6 text-center text-xs text-[#7D8B82]"
                data-testid="bookings-section-empty"
              >
                {EMPTY[activeSection]}
              </p>
            ) : (
              list.map((b) => (
                <li key={b.id}>
                  <Link
                    to={`/bookings/${b.id}`}
                    data-testid={`my-booking-card-${b.id}`}
                    className="block rounded-2xl border border-[#E8E4DC] bg-white px-4 py-3 transition-colors hover:bg-[#FAF8F5]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#191E1B]">
                          {b.professionalName ?? 'Profesionál'}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[#4A564F]">
                          {b.serviceName ?? 'Služba'}
                          {b.petName ? ` · ${b.petName}` : ''}
                        </p>
                        <p className="mt-1 text-[11px] text-[#7D8B82]">{formatCardMeta(b)}</p>
                      </div>
                      <BookingStatusBadge status={b.status} />
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </>
      )}

      <button
        type="button"
        className="sr-only"
        data-testid="my-bookings-refresh"
        onClick={() => setTick((t) => t + 1)}
      >
        refresh
      </button>
    </div>
  )
}
