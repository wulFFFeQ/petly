import { BadgeCheck, MapPin } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { findProfessionalProfileById } from '../lib/account'
import { getRoleMeta, toPublicProfessionalProfile } from '../lib/professional'
import { loadVerifications } from '../lib/verification'

export function ProfessionalPublicPage() {
  const { professionalId } = useParams()
  const navigate = useNavigate()
  const profile = professionalId ? findProfessionalProfileById(professionalId) : null
  const verifications = loadVerifications()
  const pub =
    profile != null ? toPublicProfessionalProfile(profile, { verifications }) : null

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
          onClick={() => navigate('/discover')}
        >
          Zpět na Objevovat
        </Button>
      </Card>
    )
  }

  const roleLabel = getRoleMeta(pub.type).label
  const avatarSrc = pub.profilePhotoUrl || pub.logoUrl

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-8" data-testid="professional-public-page">
      <Link
        to="/discover"
        className="inline-flex text-xs font-semibold text-[#5A6660] hover:text-[#234B54]"
      >
        ← Objevovat
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
        </div>
      </Card>
    </div>
  )
}
