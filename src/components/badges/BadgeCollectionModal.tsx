import { useEffect, useMemo, useState } from 'react'
import { BADGE_CATEGORY_LABELS, getBadgeDefinition } from '../../lib/badges/catalog'
import { romanLevel } from '../../lib/badges/evaluate'
import { formatIsoDateToCzech } from '../../lib/petProfileUtils'
import { cn } from '../../lib/utils'
import type { BadgeDefinition, EarnedBadge } from '../../types/badges'
import { Modal } from '../ui/Modal'
import { AchievementMedal } from './AchievementMedal'

interface BadgeCollectionModalProps {
  open: boolean
  onClose: () => void
  scope: 'pet' | 'user'
  petId?: string
  earnedBadges: EarnedBadge[]
  catalog: BadgeDefinition[]
  categoryLabels: typeof BADGE_CATEGORY_LABELS
  initialSelectedId?: string | null
}

function earnedKey(badgeId: string, petId?: string) {
  return petId ? `${badgeId}::${petId}` : badgeId
}

export function BadgeCollectionModal({
  open,
  onClose,
  scope,
  petId,
  earnedBadges,
  catalog,
  categoryLabels,
  initialSelectedId,
}: BadgeCollectionModalProps) {
  const earnedMap = useMemo(() => {
    const map = new Map<string, EarnedBadge>()
    for (const e of earnedBadges) {
      const def = getBadgeDefinition(e.badgeId)
      if (!def || def.scope !== scope) continue
      if (scope === 'pet' && e.petId !== petId) continue
      if (scope === 'user' && e.petId) continue
      map.set(earnedKey(e.badgeId, e.petId), e)
    }
    return map
  }, [earnedBadges, scope, petId])

  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (open) setSelectedId(initialSelectedId ?? null)
  }, [open, initialSelectedId])

  const categories = useMemo(() => {
    const order: BadgeDefinition['category'][] = [
      'milestone',
      'health',
      'care',
      'activity',
      'community',
      'secret',
    ]
    return order
      .map((category) => ({
        category,
        items: catalog.filter((b) => b.category === category),
      }))
      .filter((group) => group.items.length > 0)
  }, [catalog])

  const selectedDef = selectedId ? getBadgeDefinition(selectedId) : undefined
  const selectedEarned = selectedId
    ? earnedMap.get(earnedKey(selectedId, scope === 'pet' ? petId : undefined))
    : undefined

  const levelInfo =
    selectedDef?.levels?.find((l) => l.level === (selectedEarned?.level ?? 0)) ??
    selectedDef?.levels?.[0]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={scope === 'pet' ? 'Sbírka odznaků mazlíčka' : 'Vaše odznaky'}
      subtitle="Ocenění za péči, milníky a aktivitu — nikoliv za „nejlepšího“ mazlíčka."
      maxWidth="xl"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
        <div className="max-h-[60vh] space-y-6 overflow-y-auto pr-1">
          {categories.map(({ category, items }) => (
            <div key={category}>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#7D8B82]">
                {categoryLabels[category]}
              </p>
              <div className="flex flex-wrap gap-2">
                {items.map((def) => {
                  const earned = earnedMap.get(
                    earnedKey(def.id, scope === 'pet' ? petId : undefined),
                  )
                  const secretLocked = Boolean(def.secret && !earned)
                  const locked = !earned && !def.secret

                  return (
                    <AchievementMedal
                      key={def.id}
                      icon={def.icon}
                      category={def.category}
                      name={def.name}
                      level={earned?.level ?? 1}
                      maxLevel={def.maxLevel ?? 1}
                      locked={locked}
                      secretLocked={secretLocked}
                      size="md"
                      onClick={() => {
                        if (secretLocked) return
                        setSelectedId(def.id)
                      }}
                      className={cn(
                        selectedId === def.id && 'bg-[#FAF8F5] ring-1 ring-[#E8D8B5]',
                      )}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <aside className="rounded-2xl border border-[#E8E4DC] bg-[#FAF8F5] p-4">
          {selectedDef && (!selectedDef.secret || selectedEarned) ? (
            <div className="space-y-3">
              <div className="flex justify-center">
                <AchievementMedal
                  icon={selectedDef.icon}
                  category={selectedDef.category}
                  name={selectedDef.name}
                  level={selectedEarned?.level ?? 1}
                  maxLevel={selectedDef.maxLevel ?? 1}
                  locked={!selectedEarned}
                  size="lg"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-[#191E1B]">{selectedDef.name}</p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                  {categoryLabels[selectedDef.category]}
                  {selectedEarned && (selectedDef.maxLevel ?? 1) > 1
                    ? ` · Úroveň ${romanLevel(selectedEarned.level)}`
                    : ''}
                </p>
              </div>
              <p className="text-xs leading-relaxed text-[#4A564F]">
                {levelInfo?.description ?? selectedDef.description}
              </p>
              {selectedEarned ? (
                <p className="text-[11px] text-[#7D8B82]">
                  Získáno {formatIsoDateToCzech(selectedEarned.earnedAt)}
                  {(selectedDef.maxLevel ?? 1) > 1
                    ? ` · aktuálně ${romanLevel(selectedEarned.level)}`
                    : ''}
                </p>
              ) : (
                <p className="text-[11px] text-[#A3AEA7]">Zatím nezískáno</p>
              )}
              {selectedDef.levels && selectedDef.levels.length > 1 && (
                <ul className="space-y-1.5 border-t border-[#E8E4DC] pt-3">
                  {selectedDef.levels.map((lvl) => (
                    <li
                      key={lvl.level}
                      className={cn(
                        'text-[11px] leading-snug',
                        selectedEarned && selectedEarned.level >= lvl.level
                          ? 'text-[#2C4A3E]'
                          : 'text-[#A3AEA7]',
                      )}
                    >
                      <span className="font-semibold">{romanLevel(lvl.level)}</span>
                      {' — '}
                      {lvl.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-[#7D8B82]">
              Vyberte odznak ze sbírky. Tajné odznaky se odhalí až po získání.
            </p>
          )}
        </aside>
      </div>
    </Modal>
  )
}
