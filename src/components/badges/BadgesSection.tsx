import { useMemo, useState } from 'react'
import { Award, ChevronRight } from 'lucide-react'
import { BADGE_CATALOG, BADGE_CATEGORY_LABELS, getBadgeDefinition } from '../../lib/badges/catalog'
import { romanLevel } from '../../lib/badges/evaluate'
import { formatIsoDateToCzech } from '../../lib/petProfileUtils'
import type { EarnedBadge } from '../../types/badges'
import { Card } from '../ui/Card'
import { AchievementMedal } from './AchievementMedal'
import { BadgeCollectionModal } from './BadgeCollectionModal'

interface BadgesSectionProps {
  title?: string
  scope: 'pet' | 'user'
  petId?: string
  earnedBadges: EarnedBadge[]
  /** How many medals to preview before "see all". */
  previewCount?: number
}

function sortEarned(earned: EarnedBadge[]): EarnedBadge[] {
  return [...earned].sort((a, b) => {
    const da = getBadgeDefinition(a.badgeId)
    const db = getBadgeDefinition(b.badgeId)
    const secretBoost = (da?.secret ? 1 : 0) - (db?.secret ? 1 : 0)
    if (secretBoost !== 0) return -secretBoost
    if (b.level !== a.level) return b.level - a.level
    return b.earnedAt.localeCompare(a.earnedAt)
  })
}

export function BadgesSection({
  title = 'Odznaky',
  scope,
  petId,
  earnedBadges,
  previewCount = 6,
}: BadgesSectionProps) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const relevant = useMemo(() => {
    return sortEarned(
      earnedBadges.filter((b) => {
        const def = getBadgeDefinition(b.badgeId)
        if (!def || def.scope !== scope) return false
        if (scope === 'pet') return b.petId === petId
        return !b.petId
      }),
    )
  }, [earnedBadges, scope, petId])

  const preview = relevant.slice(0, previewCount)
  const catalogForScope = BADGE_CATALOG.filter((d) => d.scope === scope)

  return (
    <>
      <Card
        variant="elevated"
        className="cursor-pointer transition-colors hover:border-[#D1E0D8]"
        onClick={() => setOpen(true)}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7D8B82]">
              {title}
            </p>
            <p className="mt-1 text-sm font-semibold text-[#191E1B]">
              {relevant.length === 0
                ? 'Zatím žádné odznaky'
                : `${relevant.length} ${
                    relevant.length === 1
                      ? 'získaný odznak'
                      : relevant.length < 5
                        ? 'získané odznaky'
                        : 'získaných odznaků'
                  }`}
            </p>
          </div>
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] text-[#7D8B82]">
            {relevant.length > 0 ? (
              <ChevronRight size={16} />
            ) : (
              <Award size={16} className="text-[#B8934A]" />
            )}
          </span>
        </div>

        {preview.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1 sm:gap-2">
            {preview.map((earned) => {
              const def = getBadgeDefinition(earned.badgeId)
              if (!def) return null
              return (
                <AchievementMedal
                  key={`${earned.badgeId}-${earned.petId ?? 'user'}`}
                  icon={def.icon}
                  category={def.category}
                  name={def.name}
                  level={earned.level}
                  maxLevel={def.maxLevel ?? 1}
                  size="sm"
                  onClick={() => {
                    setSelectedId(earned.badgeId)
                    setOpen(true)
                  }}
                />
              )
            })}
          </div>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-[#7D8B82]">
            Odznaky se odemykají pečlivou péčí, milníky a aktivitou v aplikaci — elegantní
            ocenění, ne soutěž.
          </p>
        )}

        {relevant[0] && (
          <p className="mt-3 text-[11px] text-[#A3AEA7]">
            Naposledy:{' '}
            <span className="font-medium text-[#7D8B82]">
              {getBadgeDefinition(relevant[0].badgeId)?.name}
              {(getBadgeDefinition(relevant[0].badgeId)?.maxLevel ?? 1) > 1
                ? ` ${romanLevel(relevant[0].level)}`
                : ''}
            </span>
            {' · '}
            {formatIsoDateToCzech(relevant[0].earnedAt)}
          </p>
        )}
      </Card>

      <BadgeCollectionModal
        open={open}
        onClose={() => {
          setOpen(false)
          setSelectedId(null)
        }}
        scope={scope}
        petId={petId}
        earnedBadges={earnedBadges}
        catalog={catalogForScope}
        categoryLabels={BADGE_CATEGORY_LABELS}
        initialSelectedId={selectedId}
      />
    </>
  )
}
