import { Compass } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { DiscoverCard } from '../components/discover/DiscoverCard'
import { DiscoverFilters } from '../components/discover/DiscoverFilters'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { useApp } from '../context/AppContext'
import {
  getDiscoverPets,
  getDiscoverPetsIncludingOwn,
  SELF_OWNER_ID,
} from '../lib/discover'
import { petMatchesDiscoverCriteria } from '../lib/discoverCriteria'

export function DiscoverPage() {
  const { discoverSearch, discoverCriteria, pets } = useApp()

  const catalog = useMemo(() => {
    const ownIds = pets.map((pet) => pet.id)
    return getDiscoverPets({
      ownedPets: pets,
      excludePetIds: ownIds,
      excludeOwnerIds: [SELF_OWNER_ID],
    })
  }, [pets])

  const filtered = useMemo(() => {
    return catalog.filter((pet) =>
      petMatchesDiscoverCriteria(pet, discoverCriteria, discoverSearch),
    )
  }, [catalog, discoverSearch, discoverCriteria])

  const totalPublic = useMemo(
    () => getDiscoverPets({ ownedPets: pets, excludePetIds: pets.map((p) => p.id) }).length,
    [pets],
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const api = {
      getCatalogIncludingOwn: () => getDiscoverPetsIncludingOwn(pets),
      getVisibleForOwner: () =>
        getDiscoverPets({
          ownedPets: pets,
          excludePetIds: pets.map((p) => p.id),
          excludeOwnerIds: [SELF_OWNER_ID],
        }),
      popularityScore: (petId: string) => {
        const pet = getDiscoverPetsIncludingOwn(pets).find((p) => p.id === petId)
        return pet?.popularityScore ?? null
      },
    }
    ;(window as Window & { __LK_DISCOVER__?: typeof api }).__LK_DISCOVER__ = api
    return () => {
      delete (window as Window & { __LK_DISCOVER__?: typeof api }).__LK_DISCOVER__
    }
  }, [pets])

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
            : `Zobrazeno ${filtered.length} z ${totalPublic} profilů`}
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
