import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'gold'
  | 'success'
  | 'warning'
  | 'danger'
  | 'outline'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  withDot?: boolean
  pulseDot?: boolean
  size?: 'sm' | 'md'
  className?: string
}

const variants: Record<BadgeVariant, { container: string; dot: string }> = {
  default: {
    container: 'bg-[#FAF8F5] text-[#4A564F] border border-[#E8E4DC]',
    dot: 'bg-[#7D8B82]',
  },
  primary: {
    container: 'bg-[#EBF2EE] text-[#2C4A3E] border border-[#D1E0D8]',
    dot: 'bg-[#2C4A3E]',
  },
  gold: {
    container: 'bg-[#FAF4E6] text-[#B8934A] border border-[#E8D8B5]',
    dot: 'bg-[#B8934A]',
  },
  success: {
    container: 'bg-emerald-50 text-emerald-800 border border-emerald-200/60',
    dot: 'bg-emerald-500',
  },
  warning: {
    container: 'bg-amber-50 text-amber-800 border border-amber-200/60',
    dot: 'bg-amber-500',
  },
  danger: {
    container: 'bg-rose-50 text-rose-800 border border-rose-200/60',
    dot: 'bg-rose-500',
  },
  outline: {
    container: 'bg-transparent text-[#4A564F] border border-[#E8E4DC]',
    dot: 'bg-[#4A564F]',
  },
}

export function Badge({
  children,
  variant = 'default',
  withDot = false,
  pulseDot = false,
  size = 'md',
  className,
}: BadgeProps) {
  const current = variants[variant]

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium tracking-tight rounded-full transition-colors',
        size === 'sm' ? 'px-2 py-0.5 text-[11px] gap-1.5' : 'px-2.5 py-1 text-xs gap-1.5',
        current.container,
        className,
      )}
    >
      {withDot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full shrink-0',
            current.dot,
            pulseDot && 'animate-pulse',
          )}
        />
      )}
      {children}
    </span>
  )
}
