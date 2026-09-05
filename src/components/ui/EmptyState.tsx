import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from './Card'
import { cn } from '../../lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
  /** Extra Card className (e.g. col-span-full) */
  cardClassName?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  cardClassName,
}: EmptyStateProps) {
  return (
    <Card
      className={cn('text-center py-12 sm:py-16', cardClassName, className)}
    >
      <Icon size={36} className="mx-auto text-[#A3AEA7] mb-3" />
      <p className="text-base font-bold text-[#191E1B]">{title}</p>
      {description && (
        <p className="text-xs text-[#7D8B82] mt-1">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  )
}
