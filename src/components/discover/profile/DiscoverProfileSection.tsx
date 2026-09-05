import type { ReactNode } from 'react'
import { Card } from '../../ui/Card'
import { cn } from '../../../lib/utils'

interface DiscoverProfileSectionProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  className?: string
  action?: ReactNode
}

export function DiscoverProfileSection({
  title,
  icon,
  children,
  className,
  action,
}: DiscoverProfileSectionProps) {
  return (
    <Card variant="elevated" padding="none" className={cn('overflow-hidden', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-[#F0EDE6] px-5 py-3.5">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7D8B82]">
            {title}
          </h2>
        </div>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </Card>
  )
}
