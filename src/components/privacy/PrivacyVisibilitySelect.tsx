import { cn } from '../../lib/utils'
import type { PrivacyLevel } from '../../lib/privacy'

const LEVEL_OPTIONS: {
  value: PrivacyLevel
  icon: string
  label: string
  short: string
}[] = [
  { value: 'private', icon: '🔒', label: 'Soukromé', short: 'Soukromé' },
  { value: 'connections', icon: '👥', label: 'Propojení / kontakty', short: 'Propojení' },
  { value: 'public', icon: '🌍', label: 'Veřejné', short: 'Veřejné' },
]

type PrivacyVisibilitySelectProps = {
  id: string
  value: PrivacyLevel
  maxLevel: PrivacyLevel
  onChange: (level: PrivacyLevel) => void
  className?: string
}

export function PrivacyVisibilitySelect({
  id,
  value,
  maxLevel,
  onChange,
  className,
}: PrivacyVisibilitySelectProps) {
  const allowed =
    maxLevel === 'private'
      ? (['private'] as PrivacyLevel[])
      : maxLevel === 'connections'
        ? (['private', 'connections'] as PrivacyLevel[])
        : (['private', 'connections', 'public'] as PrivacyLevel[])

  return (
    <div
      className={cn('flex flex-wrap gap-1.5', className)}
      role="group"
      aria-label="Viditelnost"
      data-privacy-select={id}
    >
      {LEVEL_OPTIONS.map((opt) => {
        const enabled = allowed.includes(opt.value)
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            data-privacy-level={opt.value}
            data-privacy-field={id}
            disabled={!enabled}
            aria-pressed={selected}
            title={
              enabled
                ? opt.label
                : `${opt.label} není u tohoto údaje povoleno (max. ${maxLevel === 'connections' ? 'propojení' : 'soukromé'})`
            }
            onClick={() => enabled && onChange(opt.value)}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors',
              selected
                ? 'border-[#2C4A3E] bg-[#2C4A3E] text-white'
                : 'border-[#E8E4DC] bg-white text-[#4A564F]',
              enabled ? 'cursor-pointer hover:border-[#2C4A3E]/50' : 'cursor-not-allowed opacity-40',
            )}
          >
            <span aria-hidden>{opt.icon}</span>
            <span className="hidden sm:inline">{opt.short}</span>
          </button>
        )
      })}
    </div>
  )
}
