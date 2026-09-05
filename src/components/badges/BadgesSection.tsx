import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import {
  BADGE_CATEGORY_LABELS,
  catalogForPet,
  getBadgeDefinition,
} from '../../lib/badges/catalog'
import { romanLevel } from '../../lib/badges/evaluate'
import { useApp } from '../../context/AppContext'
import type { EarnedBadge } from '../../types/badges'
import { Card } from '../ui/Card'
import { AchievementMedal } from './AchievementMedal'
import { BadgeCollectionModal } from './BadgeCollectionModal'

interface BadgesSectionProps {
  title?: string
  scope: 'pet' | 'user'
  petId?: string
  earnedBadges: EarnedBadge[]
  previewCount?: number
  household?: boolean
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
  previewCount = 5,
  household = false,
}: BadgesSectionProps) {
  const { pets } = useApp()
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const pet = useMemo(
    () => (petId ? pets.find((p) => p.id === petId) : undefined),
    [pets, petId],
  )

  const catalogForScope = useMemo(() => {
    if (household) {
      const seen = new Set<string>()
      const list = []
      for (const p of pets) {
        for (const b of catalogForPet(p)) {
          if (!seen.has(b.id)) {
            seen.add(b.id)
            list.push(b)
          }
        }
      }
      return list
    }
    if (pet) return catalogForPet(pet)
    return []
  }, [household, pets, pet])

  const relevant = useMemo(() => {
    const catalogIds = new Set(catalogForScope.map((c) => c.id))
    if (household) {
      const byBadge = new Map<string, EarnedBadge>()
      for (const b of earnedBadges) {
        if (!catalogIds.has(b.badgeId)) continue
        const prev = byBadge.get(b.badgeId)
        if (!prev || b.level > prev.level || b.earnedAt > prev.earnedAt) {
          byBadge.set(b.badgeId, { ...b, petId: undefined })
        }
      }
      return sortEarned(Array.from(byBadge.values()))
    }
    return sortEarned(
      earnedBadges.filter((b) => {
        if (!catalogIds.has(b.badgeId)) return false
        if (scope === 'pet') return b.petId === petId
        return !b.petId
      }),
    )
  }, [earnedBadges, scope, petId, household, catalogForScope])

  const preview = relevant.slice(0, previewCount)
  const totalDisplay = catalogForScope.length

  return (
    <>
      <Card
        variant="elevated"
        className="cursor-pointer overflow-hidden transition-colors hover:border-[#E8D8B5]"
        onClick={() => setOpen(true)}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9E7D3A]">
              {title}
            </p>
            <p className="mt-1.5 text-lg font-semibold tracking-tight text-[#191E1B]">
              {relevant.length}{' '}
              <span className="text-sm font-medium text-[#7D8B82]">
                / {totalDisplay} získáno
              </span>
            </p>
          </div>
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E8D8B5] bg-[#FAF4E6] text-[#9E7D3A]">
            <ChevronRight size={16} />
          </span>
        </div>

        <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#EFECE6]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2C4A3E] to-[#B8934A]"
            style={{
              width: `${totalDisplay ? Math.round((relevant.length / totalDisplay) * 100) : 0}%`,
            }}
          />
        </div>

        {preview.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2 sm:gap-3">
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
                  size="md"
                  onClick={() => {
                    setSelectedId(earned.badgeId)
                    setOpen(true)
                  }}
                />
              )
            })}
            {relevant.length > previewCount && (
              <div className="flex w-[5.5rem] flex-col items-center justify-center p-1.5">
                <span className="flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full border border-dashed border-[#E8D8B5] bg-[#FAF8F5] text-xs font-semibold text-[#9E7D3A]">
                  +{relevant.length - previewCount}
                </span>
                <span className="mt-2.5 text-[11px] font-medium text-[#A3AEA7]">další</span>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-4 text-xs leading-relaxed text-[#7D8B82]">
            Sbírka pečetí vypráví, co jste spolu zažili — výlety, tréninky, milníky.
          </p>
        )}

        {relevant[0] && (
          <p className="mt-4 border-t border-[#E8E4DC] pt-3 text-[11px] text-[#A3AEA7]">
            Naposledy{' '}
            <span className="font-medium text-[#5A6660]">
              {getBadgeDefinition(relevant[0].badgeId)?.name}
              {(getBadgeDefinition(relevant[0].badgeId)?.maxLevel ?? 1) > 1
                ? ` ${romanLevel(relevant[0].level)}`
                : ''}
            </span>
          </p>
        )}
      </Card>

      <BadgeCollectionModal
        open={open}
        onClose={() => {
          setOpen(false)
          setSelectedId(null)
        }}
        scope={household ? 'pet' : scope}
        petId={household ? undefined : petId}
        household={household}
        earnedBadges={earnedBadges}
        catalog={catalogForScope}
        categoryLabels={BADGE_CATEGORY_LABELS}
        initialSelectedId={selectedId}
      />
    </>
  )
}
