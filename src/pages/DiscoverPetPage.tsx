import { ArrowLeft, MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ConnectComposeModal } from '../components/discover/ConnectComposeModal'
import { DiscoverAboutSection } from '../components/discover/profile/DiscoverAboutSection'
import { DiscoverActivitiesSection } from '../components/discover/profile/DiscoverActivitiesSection'
import { DiscoverBadgesSection } from '../components/discover/profile/DiscoverBadgesSection'
import { DiscoverBreedingSection } from '../components/discover/profile/DiscoverBreedingSection'
import { DiscoverConnectionSection } from '../components/discover/profile/DiscoverConnectionSection'
import { DiscoverGallerySection } from '../components/discover/profile/DiscoverGallerySection'
import { DiscoverOwnerSection } from '../components/discover/profile/DiscoverOwnerSection'
import { DiscoverProfileHero } from '../components/discover/profile/DiscoverProfileHero'
import { DiscoverTimelineSection } from '../components/discover/profile/DiscoverTimelineSection'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'
import {
  bumpDiscoverEngagement,
  getDiscoverOwnerById,
  getDiscoverPetById,
  isOwnDiscoverPet,
} from '../lib/discover'

export function DiscoverPetPage() {
  const { petId } = useParams()
  const navigate = useNavigate()
  const { showToast, pets, earnedBadges, photos } = useApp()
  const [composeOpen, setComposeOpen] = useState(false)
  const pet = getDiscoverPetById(petId, pets, earnedBadges, photos)
  const owner = pet?.ownerId ? getDiscoverOwnerById(pet.ownerId, pets) : undefined
  const isOwn = pet ? isOwnDiscoverPet(pet.id, pets) : false

  useEffect(() => {
    if (!pet || isOwn) return
    bumpDiscoverEngagement(pet.id, { profileViews: 1 })
  }, [pet?.id, isOwn])

  const handleConnect = () => {
    if (!pet) return
    if (isOwn) {
      showToast(
        'Tohle je váš mazlíček',
        'Nemůžete oslovit sami sebe. Upravte veřejný profil v kartě mazlíčka.',
        'info',
      )
      return
    }
    setComposeOpen(true)
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

  const connectActions = !isOwn ? (
    <>
      <Button
        variant="primary"
        size="md"
        className="gap-1.5"
        onClick={handleConnect}
        data-testid="discover-connect-cta"
      >
        <MessageCircle size={15} />
        Oslovit a propojit se
      </Button>
      <Link
        to="/discover"
        className="inline-flex items-center rounded-xl border border-[#E8E4DC] px-4 py-2 text-xs font-semibold text-[#5A6660] hover:bg-[#FAF8F5] transition-colors"
      >
        Zpět na Objevovat
      </Link>
    </>
  ) : null

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-24 sm:pb-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#5A6660] hover:text-[#234B54] cursor-pointer"
      >
        <ArrowLeft size={14} />
        Zpět
      </button>

      <DiscoverProfileHero pet={pet} />

      <Card
        variant="elevated"
        padding="md"
        className="hidden flex-wrap items-center gap-2 sm:flex"
      >
        {connectActions}
        {isOwn && (
          <p className="text-xs font-medium text-[#7D8B82]">
            Toto je váš veřejný profil — ostatní vás mohou najít v Objevovat.
          </p>
        )}
        {isOwn && (
          <Link
            to="/discover"
            className="inline-flex items-center rounded-xl border border-[#E8E4DC] px-4 py-2 text-xs font-semibold text-[#5A6660] hover:bg-[#FAF8F5] transition-colors"
          >
            Zpět na Objevovat
          </Link>
        )}
      </Card>

      <DiscoverAboutSection pet={pet} />

      <DiscoverConnectionSection pet={pet} />

      {pet.publicBadges && pet.publicBadges.length > 0 && (
        <DiscoverBadgesSection badges={pet.publicBadges} />
      )}

      <DiscoverGallerySection photos={pet.gallery ?? []} petName={pet.name} />

      {pet.activities && pet.activities.length > 0 && (
        <DiscoverActivitiesSection activities={pet.activities} />
      )}

      {pet.publicTimeline && pet.publicTimeline.length > 0 && (
        <DiscoverTimelineSection events={pet.publicTimeline} />
      )}

      {pet.breedingProfile && pet.breeding && (
        <div data-testid="discover-breeding-section">
          <DiscoverBreedingSection breeding={pet.breeding} />
        </div>
      )}

      {owner && !isOwn && <DiscoverOwnerSection owner={owner} />}

      {!isOwn && (
        <Card
          variant="elevated"
          padding="md"
          className="hidden flex-wrap items-center gap-2 sm:flex"
        >
          {connectActions}
        </Card>
      )}

      {/* Mobile sticky CTA — existing Messages flow */}
      {!isOwn && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E8E4DC] bg-[#FAF8F5]/95 px-4 py-3 backdrop-blur-sm sm:hidden"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          data-testid="discover-connect-sticky"
        >
          <div className="mx-auto flex max-w-3xl gap-2">
            <Button
              variant="primary"
              size="md"
              className="flex-1 gap-1.5"
              onClick={handleConnect}
            >
              <MessageCircle size={15} />
              Oslovit a propojit se
            </Button>
          </div>
        </div>
      )}

      {pet && (
        <ConnectComposeModal
          open={composeOpen}
          onClose={() => setComposeOpen(false)}
          pet={pet}
        />
      )}
    </div>
  )
}
