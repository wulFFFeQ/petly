import { useState } from 'react'
import { Award, X } from 'lucide-react'
import { AchievementMedal } from '../../badges/AchievementMedal'
import { getBadgeDefinition } from '../../../lib/badges/catalog'
import { formatIsoDateToCzech } from '../../../lib/petProfileUtils'
import type { DiscoverPublicBadge } from '../../../types'
import { DiscoverProfileSection } from './DiscoverProfileSection'

interface DiscoverBadgesSectionProps {
  badges: DiscoverPublicBadge[]
}

export function DiscoverBadgesSection({ badges }: DiscoverBadgesSectionProps) {
  const [selected, setSelected] = useState<DiscoverPublicBadge | null>(null)

  if (!badges.length) return null

  const selectedDef = selected ? getBadgeDefinition(selected.badgeId) : undefined

  return (
    <>
      <DiscoverProfileSection
        title="Odznaky"
        icon={<Award size={14} className="text-[#B8934A]" />}
      >
        <div className="flex flex-wrap gap-3">
          {badges.map((badge) => {
            const def = getBadgeDefinition(badge.badgeId)
            if (!def) return null
            return (
              <AchievementMedal
                key={`${badge.badgeId}-${badge.earnedAt}`}
                icon={def.icon}
                category={def.category}
                name={def.name}
                level={badge.level}
                maxLevel={def.maxLevel ?? 1}
                size="md"
                onClick={() => setSelected(badge)}
              />
            )
          })}
        </div>
        <p className="mt-3 text-[11px] text-[#A3AEA7]">
          Odznaky vycházejí ze zaznamenaných aktivit a milníků — klepnutím zobrazíte detail.
        </p>
      </DiscoverProfileSection>

      {selected && selectedDef && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#171B18]/45 backdrop-blur-sm p-4 sm:items-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[#E8E4DC] bg-white p-5 shadow-[0_24px_48px_rgba(25,30,27,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <AchievementMedal
                  icon={selectedDef.icon}
                  category={selectedDef.category}
                  name={selectedDef.name}
                  level={selected.level}
                  maxLevel={selectedDef.maxLevel ?? 1}
                  size="lg"
                  showLabel={false}
                />
                <div>
                  <h3 className="text-base font-bold text-[#191E1B]">{selectedDef.name}</h3>
                  <p className="mt-0.5 text-xs text-[#7D8B82]">
                    Získáno {formatIsoDateToCzech(selected.earnedAt)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 text-[#7D8B82] hover:bg-[#FAF8F5] cursor-pointer"
                aria-label="Zavřít"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[#4A564F]">
              {selected.story || selectedDef.earnedFor}
            </p>
            {!selected.story && (
              <p className="mt-2 text-xs text-[#7D8B82]">{selectedDef.description}</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
