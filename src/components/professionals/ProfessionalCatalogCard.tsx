import { BadgeCheck, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getRoleMeta, isOrganizationProfessionalType } from '../../lib/professional'
import type { CatalogProfessionalCard } from '../../lib/professional'
import { formatReviewAverage, ratingStars } from '../../lib/reviews'
import { cn } from '../../lib/utils'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

interface ProfessionalCatalogCardProps {
  profile: CatalogProfessionalCard
}

function truncate(text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trimEnd()}…`
}

export function ProfessionalCatalogCard({ profile }: ProfessionalCatalogCardProps) {
  const roleMeta = getRoleMeta(profile.type)
  const isOrg = isOrganizationProfessionalType(profile.type)
  const avatarSrc = isOrg
    ? profile.logoUrl || profile.profilePhotoUrl
    : profile.profilePhotoUrl || profile.logoUrl
  const detailPath = `/professionals/${profile.id}`
  const servicesLine = [
    ...(profile.specializations ?? []),
    ...(profile.services ?? []),
  ]
    .filter(Boolean)
    .slice(0, 4)
    .join(' • ')

  const typeHeadline = profile.verifiedBadge
    ? `Ověřený ${roleMeta.label}`.toUpperCase()
    : roleMeta.label.toUpperCase()

  const summary = profile.reviewSummary
  const hasReviews = Boolean(summary && summary.count > 0 && summary.average != null)

  return (
    <Card
      variant="elevated"
      padding="none"
      className="flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-[#D1E0D8] hover:shadow-[0_15px_35px_rgba(25,30,27,0.08)]"
      data-testid={`professional-catalog-card-${profile.id}`}
    >
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-3 flex items-start gap-3">
          {avatarSrc ? (
            <Avatar
              src={avatarSrc}
              alt={profile.displayName}
              size="lg"
              className="h-14 w-14 shrink-0"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#E8E4DC] bg-[#EBF2EE] text-lg font-bold text-[#2C4A3E]">
              {profile.displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p
                className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]"
                data-testid={`professional-catalog-type-${profile.id}`}
              >
                {typeHeadline}
              </p>
              {profile.verifiedBadge ? (
                <span data-testid={`professional-catalog-verified-${profile.id}`}>
                  <Badge variant="success" size="sm" className="inline-flex items-center gap-0.5">
                    <BadgeCheck size={11} />
                    Ověřeno
                  </Badge>
                </span>
              ) : null}
            </div>
            <h3 className="mt-0.5 truncate text-sm font-bold text-[#191E1B]">
              {profile.displayName}
            </h3>
            {profile.organizationName ? (
              <p className="truncate text-xs font-medium text-[#4A564F]">
                {profile.organizationName}
              </p>
            ) : null}
          </div>
        </div>

        {profile.city ? (
          <p className="mb-2 flex items-center gap-1 text-xs font-medium text-[#4A564F]">
            <MapPin size={13} className="shrink-0 text-[#B8934A]" />
            <span className="truncate" data-testid={`professional-catalog-city-${profile.id}`}>
              {profile.city}
            </span>
          </p>
        ) : null}

        <p
          className="mb-2 text-[11px] font-medium text-[#5A6660]"
          data-testid={`professional-catalog-rating-${profile.id}`}
        >
          {hasReviews ? (
            <>
              <span className="text-[#B8934A]">{ratingStars(Math.round(summary!.average!))}</span>{' '}
              <span>{formatReviewAverage(summary!.average)}</span>
              <span className="text-[#A3AEA7]"> · {summary!.count} hodnocení</span>
            </>
          ) : (
            <span className="text-[#A3AEA7]">Zatím bez hodnocení</span>
          )}
        </p>

        {profile.description ? (
          <p className="mb-2 text-[11px] leading-relaxed text-[#7D8B82]">
            {truncate(profile.description, 120)}
          </p>
        ) : null}

        {servicesLine ? (
          <p className="mb-3 text-[11px] font-medium text-[#5A6660]">{servicesLine}</p>
        ) : (
          <div className="mb-3 flex-1" />
        )}

        <div className="mt-auto pt-1">
          <Link
            to={detailPath}
            data-testid={`professional-catalog-open-${profile.id}`}
            className={cn(
              'inline-flex w-full items-center justify-center rounded-lg border border-[#E8E4DC]',
              'bg-[#EFECE6] px-3.5 py-1.5 text-xs font-medium text-[#191E1B]',
              'transition-all hover:bg-[#E5E1D8] active:scale-[0.98]',
            )}
          >
            Zobrazit profil
          </Link>
        </div>
      </div>
    </Card>
  )
}
