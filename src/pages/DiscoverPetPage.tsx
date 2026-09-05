import { ArrowLeft, MessageCircle } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DiscoverAboutSection } from '../components/discover/profile/DiscoverAboutSection'
import { DiscoverActivitiesSection } from '../components/discover/profile/DiscoverActivitiesSection'
import { DiscoverBadgesSection } from '../components/discover/profile/DiscoverBadgesSection'
import { DiscoverBreedingSection } from '../components/discover/profile/DiscoverBreedingSection'
import { DiscoverGallerySection } from '../components/discover/profile/DiscoverGallerySection'
import { DiscoverOwnerSection } from '../components/discover/profile/DiscoverOwnerSection'
import { DiscoverProfileHero } from '../components/discover/profile/DiscoverProfileHero'
import { DiscoverTimelineSection } from '../components/discover/profile/DiscoverTimelineSection'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'
import { discoverOwners, discoverPets } from '../data/mockData'

export function DiscoverPetPage() {
  const { petId } = useParams()
  const navigate = useNavigate()
  const { showToast } = useApp()
  const pet = discoverPets.find((item) => item.id === petId)
  const owner = pet?.ownerId
    ? discoverOwners.find((item) => item.id === pet.ownerId)
    : undefined

  const handleConnect = () => {
    if (!pet) return
    showToast(
      `Propojeno s ${pet.name}`,
      pet.ownerName
        ? `Otevíráme konverzaci s ${pet.ownerName}.`
        : 'Otevíráme konverzaci ve zprávách.',
      'gold',
    )
    navigate(`/messages?contactPetId=${encodeURIComponent(pet.id)}`)
  }

  if (!pet) {
    return (
      <Card variant="elevated" className="mx-auto max-w-lg text-center">
        <p className="text-sm font-bold text-[#191E1B]">Profil mazlíčka nenalezen</p>
        <p className="mt-1 text-xs text-[#7D8B82]">Tento profil v Objevovat už není dostupný.</p>
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
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#5A6660] hover:text-[#234B54] cursor-pointer"
      >
        <ArrowLeft size={14} />
        Zpět
      </button>

      <DiscoverProfileHero pet={pet} />

      <Card variant="elevated" padding="md" className="flex flex-wrap items-center gap-2">
        <Button variant="primary" size="md" className="gap-1.5" onClick={handleConnect}>
          <MessageCircle size={15} />
          Oslovit a propojit se
        </Button>
        <Link
          to="/discover"
          className="inline-flex items-center rounded-xl border border-[#E8E4DC] px-4 py-2 text-xs font-semibold text-[#5A6660] hover:bg-[#FAF8F5] transition-colors"
        >
          Zpět na Objevovat
        </Link>
      </Card>

      <DiscoverAboutSection pet={pet} />

      {pet.publicBadges && pet.publicBadges.length > 0 && (
        <DiscoverBadgesSection badges={pet.publicBadges} />
      )}

      {pet.gallery && pet.gallery.length > 0 && (
        <DiscoverGallerySection photos={pet.gallery} petName={pet.name} />
      )}

      {pet.activities && pet.activities.length > 0 && (
        <DiscoverActivitiesSection activities={pet.activities} />
      )}

      {pet.publicTimeline && pet.publicTimeline.length > 0 && (
        <DiscoverTimelineSection events={pet.publicTimeline} />
      )}

      {pet.breedingProfile && pet.breeding && (
        <DiscoverBreedingSection breeding={pet.breeding} />
      )}

      {owner && <DiscoverOwnerSection owner={owner} />}

      <Card variant="elevated" padding="md" className="flex flex-wrap items-center gap-2">
        <Button variant="primary" size="md" className="gap-1.5" onClick={handleConnect}>
          <MessageCircle size={15} />
          Oslovit a propojit se
        </Button>
        <Link
          to="/discover"
          className="inline-flex items-center rounded-xl border border-[#E8E4DC] px-4 py-2 text-xs font-semibold text-[#5A6660] hover:bg-[#FAF8F5] transition-colors"
        >
          Zpět na Objevovat
        </Link>
      </Card>
    </div>
  )
}
