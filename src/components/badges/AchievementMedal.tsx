import { cn } from '../../lib/utils'
import type { BadgeCategory, BadgeIconKey } from '../../types/badges'
import { romanLevel } from '../../lib/badges/evaluate'
import { BADGE_ICONS, CATEGORY_ACCENT } from '../../lib/badges/icons'

interface AchievementMedalProps {
  icon: BadgeIconKey
  category: BadgeCategory
  name: string
  level?: number
  maxLevel?: number
  locked?: boolean
  secretLocked?: boolean
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  className?: string
}

const sizes = {
  sm: { medal: 'h-12 w-12', icon: 16, text: 'text-[9px]' },
  md: { medal: 'h-14 w-14', icon: 18, text: 'text-[10px]' },
  lg: { medal: 'h-16 w-16', icon: 20, text: 'text-[10px]' },
}

export function AchievementMedal({
  icon,
  category,
  name,
  level = 1,
  maxLevel = 1,
  locked = false,
  secretLocked = false,
  size = 'md',
  onClick,
  className,
}: AchievementMedalProps) {
  const Icon = BADGE_ICONS[icon]
  const accent = CATEGORY_ACCENT[category] ?? CATEGORY_ACCENT.care
  const dim = sizes[size]
  const showLevel = maxLevel > 1 && !locked && !secretLocked

  const content = (
    <>
      <span
        className={cn(
          'relative flex shrink-0 items-center justify-center rounded-full border-2 bg-gradient-to-b shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]',
          dim.medal,
          locked || secretLocked
            ? 'border-[#E8E4DC] from-[#F5F2EC] to-[#EFECE6]'
            : cn(accent.ring, accent.fill),
          secretLocked && 'border-dashed',
        )}
        aria-hidden
      >
        {secretLocked ? (
          <span className="text-sm font-semibold text-[#A3AEA7]">?</span>
        ) : (
          <Icon
            size={dim.icon}
            strokeWidth={1.6}
            className={cn(
              locked ? 'text-[#C5CBC6]' : accent.ink,
              category === 'secret' && !locked && 'opacity-95',
            )}
          />
        )}
        {showLevel && (
          <span
            className={cn(
              'absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full border bg-white px-1.5 py-px font-semibold tracking-wide text-[#6B5A45]',
              dim.text,
              'border-[#E8D8B5]',
            )}
          >
            {romanLevel(level)}
          </span>
        )}
      </span>
      <span
        className={cn(
          'mt-2 line-clamp-2 text-center font-medium leading-tight',
          dim.text === 'text-[9px]' ? 'text-[10px]' : 'text-[11px]',
          locked || secretLocked ? 'text-[#A3AEA7]' : 'text-[#4A564F]',
        )}
      >
        {secretLocked ? 'Tajný odznak' : name}
      </span>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        className={cn(
          'flex w-[4.75rem] cursor-pointer flex-col items-center rounded-xl p-1 transition-colors hover:bg-[#FAF8F5]',
          className,
        )}
        title={secretLocked ? 'Tajný odznak' : name}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={cn('flex w-[4.75rem] flex-col items-center p-1', className)} title={name}>
      {content}
    </div>
  )
}
