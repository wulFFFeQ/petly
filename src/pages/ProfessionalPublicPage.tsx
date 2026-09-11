import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ConnectProfessionalModal } from '../components/professionals/ConnectProfessionalModal'
import { ProfessionalLinkedPetsSection } from '../components/professionals/ProfessionalLinkedPetsSection'
import { ProfessionalAbout } from '../components/professionals/profile/ProfessionalAbout'
import { ProfessionalBreedingSection } from '../components/professionals/profile/ProfessionalBreedingSection'
import { ProfessionalConnectCTA } from '../components/professionals/profile/ProfessionalConnectCTA'
import { ProfessionalContact } from '../components/professionals/profile/ProfessionalContact'
import { ProfessionalHero } from '../components/professionals/profile/ProfessionalHero'
import { ProfessionalLocation } from '../components/professionals/profile/ProfessionalLocation'
import { ProfessionalServices } from '../components/professionals/profile/ProfessionalServices'
import { ProfessionalSpecializations } from '../components/professionals/profile/ProfessionalSpecializations'
import { ProfessionalTrust } from '../components/professionals/profile/ProfessionalTrust'
import { ProfessionalReviewsSection } from '../components/professionals/profile/ProfessionalReviewsSection'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import {
  findProfessionalProfileById,
  getSelfAccount,
  listSelfProfessionalProfiles,
} from '../lib/account'
import {
  getAccessListForProfessional,
  getOpenAccessForPair,
  getRoleMeta,
  listPublicProfessionalTrustItems,
  requestPetProfessionalAccess,
  toPublicBreederShowcase,
  toPublicProfessionalProfile,
} from '../lib/professional'
import { emitProfessionalAccessNotification } from '../lib/notifications'
import { loadVerifications } from '../lib/verification'
import { useApp } from '../context/AppContext'

export function ProfessionalPublicPage() {
  const { professionalId } = useParams()
  const navigate = useNavigate()
  const { pets, showToast, upsertNotification } = useApp()
  const [connectOpen, setConnectOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [shareLabel, setShareLabel] = useState('Sdílet profil')

  const profile = professionalId ? findProfessionalProfileById(professionalId) : null
  const verifications = loadVerifications()
  const pub =
    profile != null ? toPublicProfessionalProfile(profile, { verifications }) : null

  const selfPros = listSelfProfessionalProfiles()
  const isOwnProfile = Boolean(profile && selfPros.some((p) => p.id === profile.id))
  const selfAccount = getSelfAccount()

  const trustItems = useMemo(() => {
    if (!profile) return []
    return listPublicProfessionalTrustItems(profile, verifications)
  }, [profile, verifications])

  const breedingShowcase = useMemo(() => {
    if (!profile) return null
    return toPublicBreederShowcase(profile, pets, {
      viewerAccountId: selfAccount?.id ?? null,
      verifications,
    })
  }, [profile, pets, selfAccount?.id, verifications])

  const pendingOrActiveForFirstPet = useMemo(() => {
    if (!profile || pets.length === 0) return null
    for (const pet of pets) {
      const open = getOpenAccessForPair(pet.id, profile.id)
      if (open) return open
    }
    return null
  }, [profile, pets, refreshKey])

  const hasAnyOpenForSelfPets = Boolean(pendingOrActiveForFirstPet)

  if (!profile || !pub) {
    return (
      <Card
        variant="elevated"
        className="mx-auto max-w-lg text-center"
        data-testid="professional-public-missing"
      >
        <p className="text-sm font-bold text-[#191E1B]">Profil není veřejný</p>
        <p className="mt-2 text-xs text-[#7D8B82]">
          Tento profesionální profil neexistuje nebo není nastaven jako veřejný.
        </p>
        <Button
          variant="primary"
          size="sm"
          className="mt-4"
          onClick={() => navigate('/professionals')}
        >
          Zpět na katalog
        </Button>
      </Card>
    )
  }

  const roleLabel = getRoleMeta(pub.type).label

  const handleProfessionalRequest = () => {
    if (pets.length === 0) {
      showToast('Přidejte mazlíčka', 'Nejdříve potřebujete mazlíčka k propojení.', 'info')
      return
    }
    const pet = pets[0]!
    const existing = getOpenAccessForPair(pet.id, profile.id)
    if (existing) {
      showToast(
        existing.status === 'pending' ? 'Žádost čeká na schválení' : 'Už propojeno',
        pet.name,
        'info',
      )
      setRefreshKey((k) => k + 1)
      return
    }
    try {
      const { access } = requestPetProfessionalAccess({
        petId: pet.id,
        professionalId: profile.id,
        grantedByAccountId: getSelfAccount()?.id || 'owner_self',
        permissions: [],
      })
      emitProfessionalAccessNotification(upsertNotification, {
        access,
        event: 'requested',
        petName: pet.name,
        professional: profile,
        roleLabel,
      })
      showToast('Žádost odeslána', `${pet.name} · čeká na schválení majitele`, 'success')
      setRefreshKey((k) => k + 1)
    } catch (err) {
      showToast(
        'Nelze vytvořit žádost',
        err instanceof Error ? err.message : 'Duplicitní žádost',
        'info',
      )
    }
  }

  const openRequestExists = getAccessListForProfessional(profile.id).some(
    (a) => a.status === 'pending' || a.status === 'active',
  )

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: pub.displayName,
          text: `${pub.displayName} · ${roleLabel}`,
          url,
        })
        return
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        setShareLabel('Odkaz zkopírován')
        showToast('Odkaz zkopírován', 'Profil můžete sdílet.', 'success')
        window.setTimeout(() => setShareLabel('Sdílet profil'), 2000)
        return
      }
    } catch {
      // user cancelled share or clipboard failed
    }
    showToast('Sdílení', url || 'Otevřete adresu z prohlížeče.', 'info')
  }

  const requestActive =
    hasAnyOpenForSelfPets && pendingOrActiveForFirstPet?.status === 'active'
  const requestPending =
    hasAnyOpenForSelfPets && pendingOrActiveForFirstPet?.status === 'pending'

  const hasServicesSection =
    Boolean(pub.services && pub.services.length > 0) ||
    Boolean(professionalId)

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8" data-testid="professional-public-page">
      <Link
        to="/professionals"
        className="inline-flex text-xs font-semibold text-[#5A6660] hover:text-[#234B54]"
        data-testid="professional-public-back"
      >
        ← Katalog profesionálů
      </Link>

      <ProfessionalHero pub={pub} roleLabel={roleLabel} />

      <ProfessionalConnectCTA
        onConnect={() => setConnectOpen(true)}
        onRequest={handleProfessionalRequest}
        requestLabel={requestActive ? 'Již propojeno' : 'Požádat o propojení'}
        requestDisabled={Boolean(requestActive)}
        requestPending={Boolean(requestPending)}
        hasServices={hasServicesSection}
        onShare={handleShare}
        shareLabel={shareLabel}
      />

      <ProfessionalTrust items={trustItems} />
      <ProfessionalReviewsSection
        professionalId={profile.id}
        isOwnProfile={isOwnProfile}
        viewerAccountId={selfAccount?.id}
        upsertNotification={upsertNotification}
      />
      <ProfessionalAbout pub={pub} />
      <ProfessionalServices pub={pub} onContact={() => setConnectOpen(true)} />
      <ProfessionalSpecializations pub={pub} />
      {breedingShowcase ? <ProfessionalBreedingSection showcase={breedingShowcase} /> : null}
      <ProfessionalLocation pub={pub} />
      <ProfessionalContact pub={pub} />

      {isOwnProfile ? (
        <ProfessionalLinkedPetsSection
          professionalId={profile.id}
          professionalTypeLabel={roleLabel}
          refreshKey={refreshKey + (openRequestExists ? 1 : 0)}
        />
      ) : null}

      <ProfessionalConnectCTA
        onConnect={() => setConnectOpen(true)}
        onRequest={handleProfessionalRequest}
        requestLabel={requestActive ? 'Již propojeno' : 'Požádat o propojení'}
        requestDisabled={Boolean(requestActive)}
        requestPending={Boolean(requestPending)}
        hasServices={hasServicesSection}
        onShare={handleShare}
        shareLabel={shareLabel}
        withTestIds={false}
      />

      <ConnectProfessionalModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        professional={profile}
        onCompleted={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}
