import { Compass } from 'lucide-react'
import { useMemo } from 'react'
import { DiscoverCard } from '../components/discover/DiscoverCard'
import { DiscoverFilters } from '../components/discover/DiscoverFilters'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { useApp } from '../context/AppContext'
import { getDiscoverPets } from '../lib/discover/catalog'
import { petMatchesDiscoverCriteria } from '../lib/discoverCriteria'

export function DiscoverPage() {
  const { discoverSearch, discoverCriteria } = useApp()
  const catalog = useMemo(() => getDiscoverPets(), [])

  const filtered = useMemo(() => {
    return catalog.filter((pet) =>
      petMatchesDiscoverCriteria(pet, discoverCriteria, discoverSearch),
    )
  }, [catalog, discoverSearch, discoverCriteria])

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Prozkoumat síť"
        meta="Střední Čechy a Praha"
        title="Objevovat"
        description="Poznávejte mazlíčky, lidi a místa ve vašem okolí."
      />

      <DiscoverFilters resultCount={filtered.length} />

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-[#7D8B82]">
          {filtered.length === 0
            ? 'Žádné výsledky'
            : `Zobrazeno ${filtered.length} z ${catalog.length} profilů`}
        </p>
      </div>

      <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Compass}
            title="Nenašli jsme mazlíčky odpovídající vašim kritériím"
            description="Zkuste upravit kritéria, zvolit méně filtrů nebo vymazat hledané výrazy."
            cardClassName="col-span-full"
          />
        ) : (
          filtered.map((pet) => <DiscoverCard key={pet.id} pet={pet} />)
        )}
      </div>
    </div>
  )
}
