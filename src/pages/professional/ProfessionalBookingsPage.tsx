import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookingList } from '../../components/booking'
import { EmptyState } from '../../components/professional/dashboard/EmptyState'
import { Card } from '../../components/ui/Card'
import { Tabs } from '../../components/ui/Tabs'
import {
  ensureDefaultAvailability,
  ensureSeedServices,
  partitionProfessionalBookings,
} from '../../lib/booking'
import { getActiveSelfProfessionalProfile } from '../../lib/professional/dashboard'

const SECTIONS = [
  { id: 'new', label: 'Čekající žádosti' },
  { id: 'today', label: 'Dnes' },
  { id: 'upcoming', label: 'Nadcházející' },
  { id: 'confirmed', label: 'Potvrzené' },
  { id: 'history', label: 'Historie' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

const EMPTY: Record<SectionId, string> = {
  new: 'Nemáte žádné čekající žádosti.',
  today: 'Dnes nemáte žádné rezervace.',
  upcoming: 'Nemáte žádné nadcházející rezervace.',
  confirmed: 'Nemáte žádné potvrzené rezervace.',
  history: 'Historie rezervací je zatím prázdná.',
}

export function ProfessionalBookingsPage() {
  const profile = getActiveSelfProfessionalProfile()
  const [section, setSection] = useState<SectionId>('new')
  const [tick, setTick] = useState(0)

  const partitioned = useMemo(() => {
    if (!profile) {
      return { neue: [], confirmed: [], today: [], upcoming: [], history: [] }
    }
    ensureSeedServices(profile.id, profile.type)
    ensureDefaultAvailability(profile.id)
    return partitionProfessionalBookings(profile.id)
  }, [profile, tick])

  if (!profile) {
    return (
      <EmptyState
        title="Chybí profesionální profil"
        description="Rezervace jsou dostupné po nastavení profilu."
        ctaTo="/professional/profile"
        ctaLabel="Profil"
      />
    )
  }

  const list =
    section === 'new'
      ? partitioned.neue
      : section === 'confirmed'
        ? partitioned.confirmed
        : section === 'today'
          ? partitioned.today
          : section === 'upcoming'
            ? partitioned.upcoming
            : partitioned.history

  return (
    <div className="space-y-5 pb-8" data-testid="professional-bookings-page">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#191E1B]">Rezervace</h1>
          <p className="text-xs text-[#7D8B82]">
            Příchozí žádosti a potvrzené termíny. Booking ≠ přístup k datům mazlíčka.
          </p>
        </div>
        <div className="flex flex-col gap-1 text-right">
          <Link
            to="/professional/services"
            className="text-[11px] font-semibold text-[#2C4A3E] hover:underline"
          >
            Služby
          </Link>
          <Link
            to="/professional/availability"
            className="text-[11px] font-semibold text-[#2C4A3E] hover:underline"
          >
            Dostupnost
          </Link>
        </div>
      </div>

      <div
        className="grid grid-cols-3 gap-2"
        data-testid="professional-bookings-stats"
      >
        <StatCard
          label="Čekající žádosti"
          value={partitioned.neue.length}
          active={section === 'new'}
          onClick={() => setSection('new')}
        />
        <StatCard
          label="Dnes"
          value={partitioned.today.length}
          active={section === 'today'}
          onClick={() => setSection('today')}
        />
        <StatCard
          label="Nadcházející"
          value={partitioned.upcoming.length}
          active={section === 'upcoming'}
          onClick={() => setSection('upcoming')}
        />
      </div>

      <div className="overflow-x-auto">
        <Tabs
          variant="pills"
          tabs={SECTIONS.map((s) => ({
            id: s.id,
            label: s.label,
            count:
              s.id === 'new' && partitioned.neue.length > 0
                ? partitioned.neue.length
                : undefined,
          }))}
          activeTab={section}
          onChange={(id) => setSection(id as SectionId)}
        />
      </div>

      <Card variant="elevated">
        {section === 'new' && partitioned.neue.length > 0 ? (
          <p className="mb-3 text-xs font-semibold text-[#B8934A]">
            Nová žádost o rezervaci
          </p>
        ) : null}
        <BookingList
          bookings={list}
          emptyLabel={EMPTY[section]}
          linkTo={(b) => `/professional/bookings/${b.id}`}
        />
      </Card>

      <p className="text-[10px] text-[#A3AEA7]">
        Připomínky rezervací budou dostupné po napojení backendu.
      </p>

      <button
        type="button"
        className="sr-only"
        data-testid="bookings-refresh"
        onClick={() => setTick((t) => t + 1)}
      >
        refresh
      </button>
    </div>
  )
}

function StatCard({
  label,
  value,
  active,
  onClick,
}: {
  label: string
  value: number
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
        active
          ? 'border-[#2C4A3E] bg-[#EBF2EE]'
          : 'border-[#E8E4DC] bg-white hover:bg-[#FAF8F5]'
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-[#191E1B]">{value}</p>
    </button>
  )
}
