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
  initialSelectedId,
}: BadgeCollectionModalProps) {
  const scopePetId = scope === 'pet' ? petId : undefined

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

  const { earnedList, nextOnPath, secretHidden, totalCount, earnedCount } = useMemo(() => {
    const visible = catalog.filter((b) => !b.secret)
    const secrets = catalog.filter((b) => b.secret)

    const earned: Array<{ def: BadgeDefinition; earned: EarnedBadge }> = []
    const next: BadgeDefinition[] = []
    const hiddenSecrets: BadgeDefinition[] = []

    for (const def of visible) {
      const e = earnedMap.get(earnedKey(def.id, scopePetId))
      if (e) earned.push({ def, earned: e })
      else next.push(def)
    }

    for (const def of secrets) {
      const e = earnedMap.get(earnedKey(def.id, scopePetId))
      if (e) {
        earned.push({ def, earned: e })
      } else {
        hiddenSecrets.push(def)
      }
    }

    earned.sort((a, b) => {
      if (a.def.secret !== b.def.secret) return a.def.secret ? -1 : 1
      return b.earned.earnedAt.localeCompare(a.earned.earnedAt)
    })

    const total = catalog.length
    const count = earned.length

    return {
      earnedList: earned,
      nextOnPath: next.slice(0, 5),
      secretHidden: hiddenSecrets,
      totalCount: total,
      earnedCount: count,
    }
  }, [catalog, earnedMap, scopePetId])

  const selectedDef = selectedId ? getBadgeDefinition(selectedId) : undefined
  const selectedEarned = selectedId
    ? earnedMap.get(earnedKey(selectedId, scopePetId))
    : undefined

  const levelInfo =
    selectedDef?.levels?.find((l) => l.level === (selectedEarned?.level ?? 0)) ??
    selectedDef?.levels?.find((l) => l.level === (selectedEarned?.level ?? 0) + 1)

  const progressPct = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0

  const detailOpen = Boolean(
    selectedDef && (!selectedDef.secret || selectedEarned),
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sbírka odznaků"
      subtitle={
        scope === 'pet'
          ? 'Milníky a pečetě péče — sbírka, ne soutěž.'
          : 'Vaše ocenění za péči, milníky a přítomnost v komunitě.'
      }
      maxWidth="xl"
    >
      <div className="max-h-[70vh] space-y-8 overflow-y-auto pr-1">
        {/* Header */}
        <header className="rounded-2xl border border-[#E8D8B5]/60 bg-gradient-to-br from-[#FAF8F5] via-white to-[#FAF4E6]/50 px-5 py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9E7D3A]">
            Sbírka odznaků
          </p>
          <p className="mt-1.5 font-serif text-2xl font-semibold tracking-tight text-[#191E1B]">
            {earnedCount}{' '}
            <span className="text-lg font-medium text-[#7D8B82]">/ {totalCount} získáno</span>
          </p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#EFECE6]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2C4A3E] via-[#B8934A] to-[#C9A55B] transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </header>

        <div className={cn('grid gap-8', detailOpen && 'lg:grid-cols-[1fr_260px]')}>
          <div className="space-y-8">
            {/* Earned collection */}
            <section>
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-bold text-[#191E1B]">Vaše pečetě</h3>
                <p className="text-[11px] text-[#A3AEA7]">
                  {earnedCount === 0 ? 'Zatím prázdná sbírka' : 'Získané milníky'}
                </p>
              </div>

              {earnedList.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#E8E4DC] bg-[#FAF8F5] px-4 py-8 text-center text-xs leading-relaxed text-[#7D8B82]">
                  Pečetě se objeví, až zaznamenáte péči, milníky nebo společné chvíle.
                </p>
              ) : (
                <div className="flex flex-wrap justify-start gap-3 sm:gap-4">
                  {earnedList.map(({ def, earned }) => (
                    <AchievementMedal
                      key={def.id}
                      icon={def.icon}
                      category={def.category}
                      name={def.name}
                      level={earned.level}
                      maxLevel={def.maxLevel ?? 1}
                      size="lg"
                      selected={selectedId === def.id}
                      onClick={() => setSelectedId(def.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Next on the path */}
            {nextOnPath.length > 0 && (
              <section>
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-[#191E1B]">Další na cestě</h3>
                  <p className="mt-0.5 text-[11px] text-[#7D8B82]">
                    Jemné kroky péče, které odemknou další pečeť.
                  </p>
                </div>
                <ul className="space-y-2.5">
                  {nextOnPath.map((def) => (
                    <li key={def.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(def.id)}
                        className={cn(
                          'flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border px-3.5 py-3 text-left transition-colors',
                          selectedId === def.id
                            ? 'border-[#E8D8B5] bg-[#FAF4E6]/50'
                            : 'border-[#E8E4DC] bg-[#FAF8F5]/70 hover:border-[#D1E0D8] hover:bg-white',
                        )}
                      >
                        <AchievementMedal
                          icon={def.icon}
                          category={def.category}
                          name={def.name}
                          locked
                          size="sm"
                          showLabel={false}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#4A564F]">{def.name}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-[#7D8B82]">
                            {def.hint}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Secret discoveries */}
            {secretHidden.length > 0 && (
              <section>
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-[#191E1B]">Tajné objevy</h3>
                  <p className="mt-0.5 text-[11px] text-[#7D8B82]">
                    Některé pečetě se odhalí samy — bez nápovědy, bez seznamu úkolů.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {secretHidden.map((def, index) => (
                    <div
                      key={def.id}
                      className="relative overflow-hidden rounded-2xl border border-[#2C4A3E]/15 bg-gradient-to-br from-[#1E352C] to-[#2C4A3E] px-4 py-4"
                    >
                      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#B8934A]/10 blur-2xl" />
                      <div className="relative flex items-center gap-3">
                        <AchievementMedal
                          icon={def.icon}
                          category="secret"
                          name={def.name}
                          secretLocked
                          size="sm"
                          showLabel={false}
                        />
                        <div>
                          <p className="text-xs font-semibold tracking-wide text-[#E8D8B5]">
                            Objev {index + 1}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-[#A3AEA7]">
                            Zapečetěno. Odhalí se ve chvíli, kdy na něj přijde čas.
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Detail panel */}
          {detailOpen && selectedDef && (
            <aside className="h-fit rounded-2xl border border-[#E8E4DC] bg-[#FAF8F5] p-5 lg:sticky lg:top-0">
              <div className="flex justify-center">
                <AchievementMedal
                  icon={selectedDef.icon}
                  category={selectedDef.category}
                  name={selectedDef.name}
                  level={selectedEarned?.level ?? 1}
                  maxLevel={selectedDef.maxLevel ?? 1}
                  locked={!selectedEarned}
                  size="xl"
                  showLabel={false}
                />
              </div>
              <div className="mt-4 text-center">
                <p className="text-base font-bold text-[#191E1B]">{selectedDef.name}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9E7D3A]">
                  {BADGE_CATEGORY_LABELS[selectedDef.category]}
                  {selectedEarned && (selectedDef.maxLevel ?? 1) > 1
                    ? ` · ${romanLevel(selectedEarned.level)}`
                    : ''}
                </p>
              </div>
              <p className="mt-3 text-center text-xs leading-relaxed text-[#4A564F]">
                {selectedDef.description}
              </p>
              {selectedEarned ? (
                <div className="mt-4 space-y-2 rounded-xl border border-[#E8D8B5]/70 bg-white/70 px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9E7D3A]">
                    Za co
                  </p>
                  <p className="text-xs leading-relaxed text-[#4A564F]">
                    {selectedDef.levels?.find((l) => l.level === selectedEarned.level)
                      ?.description ?? selectedDef.earnedFor}
                  </p>
                  <p className="text-[11px] text-[#7D8B82]">
                    Získáno {formatIsoDateToCzech(selectedEarned.earnedAt)}
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-[#E8E4DC] bg-white/60 px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                    Na cestě
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#4A564F]">
                    {selectedDef.hint}
                  </p>
                </div>
              )}
              {selectedDef.levels && selectedDef.levels.length > 1 && (
                <ul className="mt-4 space-y-2 border-t border-[#E8E4DC] pt-3">
                  {selectedDef.levels.map((lvl) => {
                    const reached = Boolean(
                      selectedEarned && selectedEarned.level >= lvl.level,
                    )
                    const nextLevel =
                      !reached &&
                      levelInfo?.level === lvl.level &&
                      selectedEarned &&
                      selectedEarned.level === lvl.level - 1
                    return (
                      <li
                        key={lvl.level}
                        className={cn(
                          'text-[11px] leading-snug',
                          reached ? 'text-[#2C4A3E]' : 'text-[#A3AEA7]',
                          nextLevel && 'text-[#7A6230]',
                        )}
                      >
                        <span className="font-semibold">{romanLevel(lvl.level)}</span>
                        {' — '}
                        {lvl.title}
                      </li>
                    )
                  })}
                </ul>
              )}
            </aside>
          )}
        </div>
      </div>
    </Modal>
  )
}
