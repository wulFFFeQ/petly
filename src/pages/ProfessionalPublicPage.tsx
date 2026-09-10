import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ConnectProfessionalModal } from '../components/professionals/ConnectProfessionalModal'
import { ProfessionalLinkedPetsSection } from '../components/professionals/ProfessionalLinkedPetsSection'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
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
  requestPetProfessionalAccess,
  toPublicProfessionalProfile,
} from '../lib/professional'
import { emitProfessionalAccessNotification } from '../lib/notifications'
import { loadVerifications } from '../lib/verification'
import { useApp } from '../context/AppContext'
import { BadgeCheck, MapPin } from 'lucide-react'

export function ProfessionalPublicPage() {
  const { professionalId } = useParams()
  const navigate = useNavigate()
  const { pets, showToast, upsertNotification } = useApp()
  const [connectOpen, setConnectOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const profile = professionalId ? findProfessionalProfileById(professionalId) : null
  const verifications = loadVerifications()
  const pub =
    profile != null ? toPublicProfessionalProfile(profile, { verifications }) : null

  const selfPros = listSelfProfessionalProfiles()
  const isOwnProfile = Boolean(profile && selfPros.some((p) => p.id === profile.id))

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
      <Card variant="elevated" className="mx-auto max-w-lg text-center" data-testid="professional-public-missing">
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
  const avatarSrc = pub.profilePhotoUrl || pub.logoUrl

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

  // For DEMO hybrid accounts: "Požádat o propojení" from pro side uses first pet.
  // Owner CTA opens full permission modal.
  const openRequestExists = getAccessListForProfessional(profile.id).some(
    (a) => a.status === 'pending' || a.status === 'active',
  )

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-8" data-testid="professional-public-page">
      <Link
        to="/professionals"
        className="inline-flex text-xs font-semibold text-[#5A6660] hover:text-[#234B54]"
        data-testid="professional-public-back"
      >
        ← Katalog profesionálů
      </Link>

      <Card variant="elevated" padding="none" className="overflow-hidden">
        <div className="h-24 bg-gradient-to-br from-[#2C4A3E] via-[#3A5C4E] to-[#B8934A]/40" />
        <div className="relative px-5 pb-5">
          <div className="-mt-10 mb-3">
            {avatarSrc ? (
              <Avatar
                src={avatarSrc}
                alt={pub.displayName}
                size="xl"
                goldRing
                className="h-20 w-20"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#B8934A]/50 bg-[#EBF2EE] text-xl font-bold text-[#2C4A3E]">
                {pub.displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-[#191E1B]">{pub.displayName}</h1>
            {pub.verifiedBadge ? (
              <span data-testid="professional-verified-badge">
                <Badge variant="success" size="sm" className="inline-flex items-center gap-1">
                  <BadgeCheck size={12} />
                  Ověřeno
                </Badge>
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs font-semibold text-[#7D8B82]">{roleLabel}</p>
          {pub.organizationName ? (
            <p className="mt-1 text-sm text-[#4A564F]">{pub.organizationName}</p>
          ) : null}
          {pub.city ? (
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-[#7D8B82]">
              <MapPin size={12} className="text-[#B8934A]" />
              {pub.city}
            </p>
          ) : null}
          {pub.description ? (
            <p className="mt-3 text-sm leading-relaxed text-[#4A564F]">{pub.description}</p>
          ) : null}
          {pub.services && pub.services.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {pub.services.map((s) => (
                <li key={s}>
                  <Badge variant="outline" size="sm">
                    {s}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}
          {(pub.publicEmail || pub.publicPhone || pub.website) && (
            <div className="mt-4 space-y-1 text-xs text-[#5A6660]">
              {pub.website ? (
                <p>
                  <a
                    href={pub.website}
                    className="font-semibold text-[#2C4A3E] underline-offset-2 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {pub.website}
                  </a>
                </p>
              ) : null}
              {pub.publicEmail ? <p>{pub.publicEmail}</p> : null}
              {pub.publicPhone ? <p>{pub.publicPhone}</p> : null}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              data-testid="pro-connect-with-pet"
              onClick={() => setConnectOpen(true)}
            >
              Propojit s mazlíčkem
            </Button>
            {hasAnyOpenForSelfPets && pendingOrActiveForFirstPet?.status === 'pending' ? (
              <Button variant="secondary" size="sm" disabled data-testid="pro-request-pending">
                Žádost čeká na schválení
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                data-testid="pro-request-connect"
                onClick={handleProfessionalRequest}
                disabled={Boolean(
                  hasAnyOpenForSelfPets && pendingOrActiveForFirstPet?.status === 'active',
                )}
              >
                {hasAnyOpenForSelfPets && pendingOrActiveForFirstPet?.status === 'active'
                  ? 'Již propojeno'
                  : 'Požádat o propojení'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {isOwnProfile ? (
        <ProfessionalLinkedPetsSection
          professionalId={profile.id}
          professionalTypeLabel={roleLabel}
          refreshKey={refreshKey + (openRequestExists ? 1 : 0)}
        />
      ) : null}

      <ConnectProfessionalModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        professional={profile}
        onCompleted={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}
