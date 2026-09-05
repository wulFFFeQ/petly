import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type IconBoxSize = 'sm' | 'md' | 'lg'

interface IconBoxProps {
  icon?: LucideIcon
  children?: ReactNode
  size?: IconBoxSize
  className?: string
  tone?: 'green' | 'teal' | 'sky' | 'amber' | 'muted'
}

const sizeMap: Record<IconBoxSize, { box: string; icon: number }> = {
  sm: { box: 'h-7 w-7 rounded-lg', icon: 14 },
  md: { box: 'h-8 w-8 rounded-lg', icon: 15 },
  lg: { box: 'h-10 w-10 rounded-xl', icon: 17 },
}

const toneMap = {
  green: 'bg-[#EBF2EE] text-[#2C4A3E]',
  teal: 'bg-[#E0EAEC] text-[#234B54]',
  sky: 'bg-white text-sky-700 shadow-sm',
  amber: 'bg-[#FAF4E6] text-[#B8934A]',
  muted: 'bg-white text-[#234B54] shadow-sm',
}

export function IconBox({
  icon: Icon,
  children,
  size = 'md',
  className,
  tone = 'green',
}: IconBoxProps) {
  const s = sizeMap[size]
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center',
        s.box,
        toneMap[tone],
        className,
      )}
    >
      {Icon ? <Icon size={s.icon} strokeWidth={1.75} /> : children}
    </div>
  )
}
