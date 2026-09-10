import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../../../ui/Button'
import { Card } from '../../../ui/Card'

interface BreedingSectionProps {
  title: string
  description?: string
  icon?: ReactNode
  actionLabel?: string
  onAction?: () => void
  children: ReactNode
  empty?: boolean
  emptyLabel?: string
}

export function BreedingSection({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  children,
  empty,
  emptyLabel = 'Zatím bez záznamů',
}: BreedingSectionProps) {
  return (
    <Card variant="elevated">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[#F0EDE6] pb-4">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-lg font-bold text-[#191E1B]">
            {icon}
            {title}
          </h3>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-[#7D8B82]">{description}</p>
          )}
        </div>
        {onAction && actionLabel && (
          <Button size="sm" variant="primary" onClick={onAction}>
            {actionLabel === 'Upravit' ? null : <Plus size={15} />}
            {actionLabel}
          </Button>
        )}
      </div>
      {empty ? (
        <p className="py-2 text-sm text-[#7D8B82]">{emptyLabel}</p>
      ) : (
        children
      )}
    </Card>
  )
}

interface BreedingFieldRowProps {
  label: string
  value?: string
  onAdd?: () => void
  fromProfile?: boolean
}

/** Compact row: show value, or “Přidat údaj”, never “Neuvedeno”. */
export function BreedingFieldRow({ label, value, onAdd, fromProfile }: BreedingFieldRowProps) {
  const filled = Boolean(value?.trim())
  if (!filled && !onAdd) return null

  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#F0EDE6] py-2.5 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">{label}</p>
        {filled ? (
          <p className="mt-0.5 text-sm font-medium text-[#191E1B]">
            {value}
            {fromProfile && (
              <span className="ml-1.5 text-[10px] font-medium text-[#A3AEA7]">(z profilu)</span>
            )}
          </p>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            className="mt-0.5 text-sm font-medium text-[#234B54] hover:underline cursor-pointer"
          >
            Přidat údaj
          </button>
        )}
      </div>
    </div>
  )
}
