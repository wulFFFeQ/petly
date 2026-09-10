import { ArrowLeft, MapPin, PawPrint } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { getDiscoverOwnerById, getDiscoverPetsByOwnerId } from '../lib/discover/catalog'
import { petTypeLabel } from '../lib/petTypes'
import { useApp } from '../context/AppContext'

export function OwnerPublicPage() {
  const { ownerId } = useParams()
  const navigate = useNavigate()
  const { pets: ownedPets, earnedBadges } = useApp()
  const owner = getDiscoverOwnerById(ownerId, ownedPets)
  const pets = getDiscoverPetsByOwnerId(ownerId, ownedPets, earnedBadges)

  if (!owner) {
    return (
      <Card variant="elevated" className="mx-auto max-w-lg text-center">
        <p className="text-sm font-bold text-[#191E1B]">Profil majitele nenalezen</p>
        <Button
          variant="primary"
          size="sm"
          className="mt-4"
          onClick={() => navigate('/discover')}
        >
          Zpět na Objevovat
        </Button>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#5A6660] hover:text-[#234B54] cursor-pointer"
      >
        <ArrowLeft size={14} />
        Zpět
      </button>

      <Card variant="elevated" padding="none" className="overflow-hidden">
        <div className="h-24 bg-gradient-to-br from-[#2C4A3E] via-[#3A5C4E] to-[#B8934A]/40" />
        <div className="relative px-5 pb-5">
          <div className="-mt-10 mb-3">
            <Avatar src={owner.avatar} alt={owner.name} size="xl" goldRing className="h-20 w-20" />
          </div>
          <h1 className="text-xl font-bold text-[#191E1B]">{owner.name}</h1>
          {owner.location && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#7D8B82]">
              <MapPin size={12} className="text-[#B8934A]" />
              {owner.location}
            </p>
          )}
          {owner.bio && (
            <p className="mt-3 text-sm leading-relaxed text-[#4A564F]">{owner.bio}</p>
          )}
        </div>
      </Card>

      <Card variant="elevated" padding="md">
        <div className="mb-3 flex items-center gap-2">
          <PawPrint size={14} className="text-[#B8934A]" />
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7D8B82]">
            Veřejní mazlíčci
          </h2>
        </div>
        {pets.length === 0 ? (
          <p className="text-xs text-[#7D8B82]">Žádný veřejný profil mazlíčka.</p>
        ) : (
          <ul className="space-y-2">
            {pets.map((pet) => (
              <li key={pet.id}>
                <Link
                  to={`/discover/${pet.id}`}
                  className="flex items-center gap-3 rounded-xl border border-[#E8E4DC] p-2.5 transition-colors hover:border-[#D1E0D8] hover:bg-[#FAF8F5]"
                >
                  <img
                    src={pet.image}
                    alt={pet.name}
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#191E1B]">{pet.name}</p>
                    <p className="text-xs text-[#7D8B82]">
                      {pet.breed} · {petTypeLabel[pet.type]}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
