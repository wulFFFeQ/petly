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
  { id: 'new', label: 'Nové' },
  { id: 'confirmed', label: 'Potvrzené' },
  { id: 'today', label: 'Dnes' },
  { id: 'upcoming', label: 'Nadcházející' },
  { id: 'history', label: 'Historie' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

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

      <div className="overflow-x-auto">
        <Tabs
          variant="pills"
          tabs={SECTIONS.map((s) => ({
            id: s.id,
            label: s.label,
            count: s.id === 'new' ? partitioned.neue.length : undefined,
          }))}
          activeTab={section}
          onChange={(id) => setSection(id as SectionId)}
        />
      </div>

      <Card variant="elevated">
        <BookingList
          bookings={list}
          emptyLabel="V této sekci zatím nic není."
          linkTo={(b) => `/professional/bookings/${b.id}`}
        />
      </Card>

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
