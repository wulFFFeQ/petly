import { MapPin, Sparkles } from 'lucide-react'
import type { DiscoverPet } from '../../../types'
import { petTypeLabel } from '../../../lib/petTypes'
import { TrustBadges } from '../../verification/TrustBadges'
import { Badge } from '../../ui/Badge'
import { Card } from '../../ui/Card'

interface DiscoverProfileHeroProps {
  pet: DiscoverPet
}

export function DiscoverProfileHero({ pet }: DiscoverProfileHeroProps) {
  return (
    <Card variant="elevated" padding="none" className="overflow-hidden">
      <div className="relative aspect-[16/10] min-h-[240px] bg-stone-100 sm:aspect-[2/1]">
        <img src={pet.image} alt={pet.name} className="h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 text-white">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{pet.name}</h1>
            {pet.communityFavorite || pet.popular ? (
              <Badge variant="gold" size="sm" className="bg-white/95 text-[#191E1B]">
                <Sparkles size={11} className="mr-0.5 text-[#B8934A]" />
                Oblíbenec
              </Badge>
            ) : null}
            {pet.breedingProfile && (
              <Badge variant="outline" size="sm" className="border-white/40 bg-white/15 text-white backdrop-blur-sm">
                Chovný profil
              </Badge>
            )}
          </div>
          {pet.publicTrustBadges && pet.publicTrustBadges.length > 0 ? (
            <div className="mt-2">
              <TrustBadges badges={pet.publicTrustBadges} size="sm" />
            </div>
          ) : null}
          <p className="mt-1.5 text-sm text-white/90 font-medium">
            {pet.breed}
            <span className="mx-1.5 text-white/50">·</span>
            {petTypeLabel[pet.type]}
            {pet.gender ? (
              <>
                <span className="mx-1.5 text-white/50">·</span>
                {pet.gender}
              </>
            ) : null}
            <span className="mx-1.5 text-white/50">·</span>
            {pet.age} {pet.age === 1 ? 'rok' : pet.age < 5 ? 'roky' : 'let'}
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/85">
            <MapPin size={13} className="text-[#E8D8B5]" />
            {pet.location}
            {pet.distance ? ` · ${pet.distance}` : ''}
          </p>
        </div>
      </div>
    </Card>
  )
}
