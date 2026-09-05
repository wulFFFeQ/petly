import { Compass } from 'lucide-react'
import { useMemo } from 'react'
import { DiscoverCard } from '../components/discover/DiscoverCard'
import { DiscoverFilters } from '../components/discover/DiscoverFilters'
import { discoverPets } from '../data/mockData'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { useApp } from '../context/AppContext'

export function DiscoverPage() {
  const { discoverSearch, discoverFilter } = useApp()

  const filtered = useMemo(() => {
    return discoverPets.filter((pet) => {
      const matchesSearch =
        !discoverSearch ||
        pet.name.toLowerCase().includes(discoverSearch.toLowerCase()) ||
        pet.breed.toLowerCase().includes(discoverSearch.toLowerCase()) ||
        pet.location.toLowerCase().includes(discoverSearch.toLowerCase()) ||
        (pet.ownerName && pet.ownerName.toLowerCase().includes(discoverSearch.toLowerCase()))

      const matchesFilter =
        discoverFilter === 'all' ||
        (discoverFilter === 'dog' && pet.type === 'dog') ||
        (discoverFilter === 'cat' && pet.type === 'cat') ||
        (discoverFilter === 'nearby' &&
          ['Kolín', 'Kutná Hora'].includes(pet.location)) ||
        (discoverFilter === 'popular' && pet.popular)

      return matchesSearch && matchesFilter
    })
  }, [discoverSearch, discoverFilter])

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Prozkoumat síť"
        meta="Střední Čechy a Praha"
        title="Objevovat"
        description="Poznávejte mazlíčky, lidi a místa ve vašem okolí."
      />

      <DiscoverFilters />

      <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Compass}
            title="Nenašli jsme mazlíčky odpovídající vašim kritériím"
            description="Zkuste zvolit jiný filtr nebo vymazat hledané výrazy."
            cardClassName="col-span-full"
          />
        ) : (
          filtered.map((pet) => <DiscoverCard key={pet.id} pet={pet} />)
        )}
      </div>
    </div>
  )
}
