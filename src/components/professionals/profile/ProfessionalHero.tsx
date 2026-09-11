import type { ReactNode } from 'react'
import { BadgeCheck, MapPin } from 'lucide-react'
import type { PublicProfessionalProfile } from '../../../lib/professional'
import { Avatar } from '../../ui/Avatar'
import { Badge } from '../../ui/Badge'
import { Card } from '../../ui/Card'

interface ProfessionalHeroProps {
  pub: PublicProfessionalProfile
  roleLabel: string
  primaryCta?: ReactNode
  secondaryCta?: ReactNode
}

export function ProfessionalHero({
  pub,
  roleLabel,
  primaryCta,
  secondaryCta,
}: ProfessionalHeroProps) {
  const avatarSrc = pub.profilePhotoUrl || pub.logoUrl
  const leadSpec = pub.specializations?.[0]

  return (
    <Card
      variant="elevated"
      padding="none"
      className="overflow-hidden"
      data-testid="professional-hero"
    >
      <div className="h-28 bg-gradient-to-br from-[#2C4A3E] via-[#3A5C4E] to-[#B8934A]/35" />
      <div className="relative px-5 pb-5 sm:px-6">
        <div className="-mt-12 mb-4">
          {avatarSrc ? (
            <Avatar
              src={avatarSrc}
              alt={pub.displayName}
              size="xl"
              goldRing
              className="h-24 w-24 border-4 border-white shadow-md"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-[#EBF2EE] text-2xl font-bold text-[#2C4A3E] shadow-md ring-2 ring-[#B8934A]/40">
              {pub.displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#191E1B] sm:text-[1.75rem]">
            {pub.displayName}
          </h1>
          {pub.verifiedBadge ? (
            <span data-testid="professional-verified-badge">
              <Badge variant="success" size="sm" className="inline-flex items-center gap-1">
                <BadgeCheck size={12} />
                Ověřeno
              </Badge>
            </span>
          ) : null}
        </div>

        <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#7D8B82]">
          {roleLabel}
        </p>

        {pub.organizationName ? (
          <p className="mt-1 text-sm font-medium text-[#4A564F]">{pub.organizationName}</p>
        ) : null}

        {pub.city ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-[#5A6660]">
            <MapPin size={14} className="shrink-0 text-[#B8934A]" />
            {pub.city}
          </p>
        ) : null}

        {leadSpec ? (
          <p className="mt-3 text-sm font-medium text-[#2C4A3E]">{leadSpec}</p>
        ) : null}

        {pub.description ? (
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-[#4A564F] line-clamp-3">
            {pub.description}
          </p>
        ) : null}

        {(primaryCta || secondaryCta) && (
          <div className="mt-5 flex flex-wrap gap-2">{primaryCta}{secondaryCta}</div>
        )}
      </div>
    </Card>
  )
}
