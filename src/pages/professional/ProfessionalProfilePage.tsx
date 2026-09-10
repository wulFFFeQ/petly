import { Link } from 'react-router-dom'
import { loadVerifications } from '../../lib/verification'
import { hasProfessionalVerifiedBadge } from '../../lib/professional'
import { getActiveSelfProfessionalProfile, professionalRoleLabel } from '../../lib/professional/dashboard'
import { EmptyState } from '../../components/professional/dashboard/EmptyState'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'

export function ProfessionalProfilePage() {
  const profile = getActiveSelfProfessionalProfile()

  if (!profile) {
    return (
      <EmptyState
        title="Chybí profesionální profil"
        description="Přidejte profesionální roli v nastavení účtu."
        ctaLabel="Nastavení"
        ctaTo="/settings"
        testId="professional-profile-missing"
      />
    )
  }

  const verifications = loadVerifications()
  const trusted = hasProfessionalVerifiedBadge(profile, verifications)
  const isPublic = profile.publicVisibility === 'public'
  const roleLabel = professionalRoleLabel(profile.type)

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-8" data-testid="professional-profile-page">
      <div>
        <h1 className="text-lg font-bold text-[#191E1B]">Veřejný profil</h1>
        <p className="text-xs text-[#7D8B82]">
          ProfessionalProfile + verification / trust. Bez automatického zveřejnění.
        </p>
      </div>

      <Card variant="elevated">
        <div className="flex items-start gap-4">
          {profile.profilePhotoUrl || profile.logoUrl ? (
            <img
              src={profile.profilePhotoUrl || profile.logoUrl}
              alt=""
              className="h-16 w-16 rounded-2xl object-cover border border-[#E8E4DC]"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EBF2EE] text-lg font-bold text-[#2C4A3E]">
              {profile.displayName.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-[#191E1B]" data-testid="pro-profile-name">
              {profile.displayName}
            </h2>
            <p className="text-sm text-[#7D8B82]">{roleLabel}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {trusted ? (
                <span data-testid="pro-profile-verified">
                  <Badge>Ověřený profesionál</Badge>
                </span>
              ) : (
                <span data-testid="pro-profile-unverified">
                  <Badge variant="warning">Profil není ověřen</Badge>
                </span>
              )}
              {isPublic ? (
                <Badge variant="success">Veřejný</Badge>
              ) : (
                <span data-testid="pro-profile-not-public">
                  <Badge variant="outline">Profil není veřejný.</Badge>
                </span>
              )}
            </div>
          </div>
        </div>

        {profile.description ? (
          <p className="mt-4 text-sm text-[#4A564F]">{profile.description}</p>
        ) : null}

        {profile.city ? (
          <p className="mt-2 text-xs text-[#7D8B82]">Lokalita: {profile.city}</p>
        ) : null}

        {profile.services && profile.services.length > 0 ? (
          <div className="mt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
              Služby
            </p>
            <p className="mt-1 text-xs text-[#4A564F]">{profile.services.join(' · ')}</p>
          </div>
        ) : null}

        {profile.specializations && profile.specializations.length > 0 ? (
          <div className="mt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
              Specializace
            </p>
            <p className="mt-1 text-xs text-[#4A564F]">
              {profile.specializations.join(' · ')}
            </p>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/settings">
            <Button size="sm" variant="secondary" data-testid="pro-profile-edit">
              Upravit profil
            </Button>
          </Link>
          {isPublic ? (
            <Link to={`/professionals/${profile.id}`}>
              <Button size="sm" variant="outline" data-testid="pro-profile-view-public">
                Zobrazit veřejný profil
              </Button>
            </Link>
          ) : (
            <p className="self-center text-xs text-[#A3AEA7]">
              Profil není veřejný — zveřejnění proveďte v nastavení.
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
