import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import { Badge } from './Badge'
import { cn } from '../../lib/utils'

interface PageHeaderProps {
  badge: string
  title: string
  description?: string
  meta?: ReactNode
  actions?: ReactNode
  className?: string
  /** Hide on small screens (e.g. Messages uses mobile-specific chrome) */
  hideOnMobile?: boolean
}

export function PageHeader({
  badge,
  title,
  description,
  meta,
  actions,
  className,
  hideOnMobile = false,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2',
        hideOnMobile ? 'hidden md:flex' : 'flex',
        className,
      )}
    >
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="gold" size="sm">
            <Sparkles size={11} className="mr-0.5 text-[#B8934A]" />
            {badge}
          </Badge>
          {meta != null && (
            <span className="text-xs text-[#7D8B82] font-medium">{meta}</span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191E1B]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-[#4A564F]">{description}</p>
        )}
      </div>
      {actions}
    </div>
  )
}
