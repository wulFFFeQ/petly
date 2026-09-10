import { Compass, Stethoscope } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { DiscoverCard } from '../components/discover/DiscoverCard'
import { DiscoverFilters } from '../components/discover/DiscoverFilters'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { useApp } from '../context/AppContext'
import {
  applyConnectionRanking,
  CONNECTION_EMPTY_DESCRIPTION,
  CONNECTION_EMPTY_TITLE,
  shouldShowConnectionEmptyState,
  type ConnectionActivityId,
} from '../lib/connections'
import {
  getDiscoverPets,
  getDiscoverPetsIncludingOwn,
  SELF_OWNER_ID,
} from '../lib/discover'
import { petMatchesDiscoverCriteria } from '../lib/discoverCriteria'

export function DiscoverPage() {
  const { discoverSearch, discoverCriteria, pets, earnedBadges } = useApp()

  const catalog = useMemo(() => {
    const ownIds = pets.map((pet) => pet.id)
    return getDiscoverPets({
      ownedPets: pets,
      earnedBadges,
      excludePetIds: ownIds,
      excludeOwnerIds: [SELF_OWNER_ID],
    })
  }, [pets, earnedBadges])

  const contextPet = useMemo(() => {
    return (
      pets.find(
        (pet) =>
          pet.connectionPreferences?.enabled &&
          (pet.connectionPreferences.lookingFor?.length ?? 0) > 0,
      ) ?? null
    )
  }, [pets])

  const filtered = useMemo(() => {
    const matched = catalog.filter((pet) =>
      petMatchesDiscoverCriteria(pet, discoverCriteria, discoverSearch),
    )
    const filterActivityIds =
      discoverCriteria.connectionActivities.filter(Boolean) as ConnectionActivityId[]
    return applyConnectionRanking(matched, {
      contextPet,
      filterActivityIds,
    })
  }, [catalog, discoverSearch, discoverCriteria, contextPet])

  const totalPublic = useMemo(
    () =>
      getDiscoverPets({
        ownedPets: pets,
        earnedBadges,
        excludePetIds: pets.map((p) => p.id),
      }).length,
    [pets, earnedBadges],
  )

  const connectionEmpty = shouldShowConnectionEmptyState(
    filtered.length,
    discoverCriteria.connectionActivities as ConnectionActivityId[],
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const api = {
      getCatalogIncludingOwn: () => getDiscoverPetsIncludingOwn(pets, earnedBadges),
      getVisibleForOwner: () =>
        getDiscoverPets({
          ownedPets: pets,
          earnedBadges,
          excludePetIds: pets.map((p) => p.id),
          excludeOwnerIds: [SELF_OWNER_ID],
        }),
      popularityScore: (petId: string) => {
        const pet = getDiscoverPetsIncludingOwn(pets, earnedBadges).find((p) => p.id === petId)
        return pet?.popularityScore ?? null
      },
    }
    ;(window as Window & { __LK_DISCOVER__?: typeof api }).__LK_DISCOVER__ = api
    return () => {
      delete (window as Window & { __LK_DISCOVER__?: typeof api }).__LK_DISCOVER__
    }
  }, [pets, earnedBadges])

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Prozkoumat síť"
        meta="Střední Čechy a Praha"
        title="Objevovat"
        description="Poznávejte mazlíčky, lidi a místa ve vašem okolí. Najděte svého pet parťáka."
      />

      <Card
        variant="elevated"
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        data-testid="discover-professionals-cta"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EBF2EE] text-[#2C4A3E]">
            <Stethoscope size={18} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]">
              Profesionálové
            </p>
            <h3 className="text-sm font-bold text-[#191E1B]">
              Profesionálové ve vašem okolí
            </h3>
            <p className="mt-0.5 text-xs text-[#7D8B82]">
              Veterinář, groomer, trenér a další služby pro mazlíčky.
            </p>
          </div>
        </div>
        <Link
          to="/professionals"
          data-testid="discover-find-professional"
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-[#20362E]/20 bg-[#2C4A3E] px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-[#20362E] active:scale-[0.98]"
        >
          Najít profesionála
        </Link>
      </Card>

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
            title={
              connectionEmpty
                ? CONNECTION_EMPTY_TITLE
                : 'Nenašli jsme mazlíčky odpovídající vašim kritériím'
            }
            description={
              connectionEmpty
                ? CONNECTION_EMPTY_DESCRIPTION
                : 'Zkuste upravit kritéria, zvolit méně filtrů nebo vymazat hledané výrazy.'
            }
            cardClassName="col-span-full"
          />
        ) : (
          filtered.map((pet) => <DiscoverCard key={pet.id} pet={pet} />)
        )}
      </div>
    </div>
  )
}
