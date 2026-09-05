import { cn } from '../../lib/utils'
import type { BadgeCategory, BadgeIconKey } from '../../types/badges'
import { romanLevel } from '../../lib/badges/evaluate'
import { BADGE_ICONS, SEAL_PALETTE } from '../../lib/badges/icons'

interface AchievementMedalProps {
  icon: BadgeIconKey
  category: BadgeCategory
  name: string
  level?: number
  maxLevel?: number
  /** Not yet earned (visible badge). */
  locked?: boolean
  /** Secret not yet discovered. */
  secretLocked?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showLabel?: boolean
  onClick?: () => void
  className?: string
  selected?: boolean
}

const sizes = {
  sm: { outer: 'h-[3.25rem] w-[3.25rem]', icon: 15, label: 'text-[10px]', width: 'w-[4.5rem]' },
  md: { outer: 'h-[4.25rem] w-[4.25rem]', icon: 20, label: 'text-[11px]', width: 'w-[5.5rem]' },
  lg: { outer: 'h-[5.25rem] w-[5.25rem]', icon: 24, label: 'text-xs', width: 'w-[6.25rem]' },
  xl: { outer: 'h-28 w-28', icon: 32, label: 'text-sm', width: 'w-32' },
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
  showLabel = true,
  onClick,
  className,
  selected = false,
}: AchievementMedalProps) {
  const Icon = BADGE_ICONS[icon]
  const palette = SEAL_PALETTE[category] ?? SEAL_PALETTE.care
  const dim = sizes[size]
  const showLevel = maxLevel > 1 && !locked && !secretLocked
  const earned = !locked && !secretLocked

  const seal = (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full p-[3px]',
        dim.outer,
        earned
          ? cn('bg-gradient-to-br', palette.outer, palette.glow)
          : secretLocked
            ? 'bg-gradient-to-br from-[#3A4A42] via-[#2C4A3E] to-[#1E352C] shadow-[0_4px_14px_rgba(25,30,27,0.2)]'
            : 'bg-gradient-to-br from-[#D8D2C8] via-[#E8E4DC] to-[#C8C2B8] shadow-[0_2px_8px_rgba(25,30,27,0.06)]',
      )}
      aria-hidden
    >
      {/* Mid ring */}
      <span
        className={cn(
          'flex h-full w-full items-center justify-center rounded-full p-[3px]',
          earned ? palette.mid : secretLocked ? 'bg-[#243830]' : 'bg-[#F3F0EA]',
        )}
      >
        {/* Inner disc */}
        <span
          className={cn(
            'relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-b',
            earned
              ? palette.disc
              : secretLocked
                ? 'from-[#1A2420] to-[#2A3830]'
                : 'from-[#E5E1D8] to-[#D4CFC4]',
          )}
        >
          {/* Subtle inner highlight */}
          <span className="pointer-events-none absolute inset-[12%] rounded-full border border-white/10" />

          {secretLocked ? (
            <span className="flex flex-col items-center gap-0.5">
              <span className="h-1 w-1 rounded-full bg-[#B8934A]/80" />
              <span className="h-0.5 w-4 rounded-full bg-[#B8934A]/40" />
              <span className="h-1 w-1 rounded-full bg-[#B8934A]/80" />
            </span>
          ) : (
            <Icon
              size={dim.icon}
              strokeWidth={earned ? 1.75 : 1.4}
              className={cn(
                earned ? palette.ink : 'text-[#9AA39C]',
                locked && 'opacity-70',
              )}
            />
          )}

          {showLevel && (
            <span
              className={cn(
                'absolute -bottom-1 left-1/2 z-10 -translate-x-1/2 rounded-full border border-[#E8D8B5] bg-[#FAF4E6] px-1.5 py-px font-semibold tracking-wide text-[#7A6230]',
                size === 'sm' ? 'text-[8px]' : 'text-[9px]',
              )}
            >
              {romanLevel(level)}
            </span>
          )}
        </span>
      </span>
    </span>
  )

  const label = showLabel ? (
    <span
      className={cn(
        'mt-2.5 line-clamp-2 text-center font-medium leading-snug tracking-tight',
        dim.label,
        earned ? 'text-[#2C4A3E]' : secretLocked ? 'text-[#7D8B82]' : 'text-[#8A928A]',
      )}
    >
      {secretLocked ? 'Neodhaleno' : name}
    </span>
  ) : null

  const wrapperClass = cn(
    'flex flex-col items-center',
    dim.width,
    onClick && 'cursor-pointer rounded-2xl p-1.5 transition-colors hover:bg-[#FAF8F5]/80',
    selected && 'bg-[#FAF8F5] ring-1 ring-[#E8D8B5]',
    className,
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        className={wrapperClass}
        title={secretLocked ? 'Tajný objev — zatím neodhaleno' : name}
      >
        {seal}
        {label}
      </button>
    )
  }

  return (
    <div className={wrapperClass} title={secretLocked ? 'Neodhaleno' : name}>
      {seal}
      {label}
    </div>
  )
}
