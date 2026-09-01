import { Compass, Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { DiscoverCard } from '../components/discover/DiscoverCard'
import { DiscoverFilters } from '../components/discover/DiscoverFilters'
import { discoverPets } from '../data/mockData'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
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
        (discoverFilter === 'other' && pet.type === 'other') ||
        (discoverFilter === 'nearby' &&
          ['Kolín', 'Kutná Hora'].includes(pet.location)) ||
        (discoverFilter === 'popular' && pet.popular)

      return matchesSearch && matchesFilter
    })
  }, [discoverSearch, discoverFilter])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="gold" size="sm">
              <Sparkles size={11} className="mr-0.5 text-[#B8934A]" />
              Prozkoumat síť
            </Badge>
            <span className="text-xs text-[#7D8B82] font-medium">
              Střední Čechy a Praha
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191E1B]">
            Objevovat
          </h1>
          <p className="mt-1 text-sm text-[#4A564F]">
            Poznávejte mazlíčky, lidi a místa ve vašem okolí.
          </p>
        </div>
      </div>

      <DiscoverFilters />

      {/* Grid of Discover Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <Card className="col-span-full text-center py-16">
            <Compass size={36} className="mx-auto text-[#A3AEA7] mb-3" />
            <p className="text-base font-bold text-[#191E1B]">
              Nenašli jsme mazlíčky odpovídající vašim kritériím
            </p>
            <p className="text-xs text-[#7D8B82] mt-1">
              Zkuste zvolit jiný filtr nebo vymazat hledané výrazy.
            </p>
          </Card>
        ) : (
          filtered.map((pet) => <DiscoverCard key={pet.id} pet={pet} />)
        )}
      </div>
    </div>
  )
}
