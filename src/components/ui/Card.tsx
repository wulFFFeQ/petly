import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'elevated' | 'glass' | 'subtle' | 'gold'
  hoverable?: boolean
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
  xl: 'p-8 sm:p-10',
}

const variantMap = {
  default:
    'bg-white border border-[#E8E4DC] shadow-[0_1px_3px_rgba(25,30,27,0.02),0_4px_16px_rgba(25,30,27,0.03)]',
  elevated:
    'bg-white border border-[#E8E4DC] shadow-[0_4px_20px_-2px_rgba(25,30,27,0.06),0_1px_3px_rgba(25,30,27,0.03)]',
  glass:
    'bg-white/85 backdrop-blur-md border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
  subtle:
    'bg-[#FAF8F5] border border-[#E8E4DC]/80 shadow-none',
  gold:
    'bg-gradient-to-br from-white via-[#FCFBF8] to-[#FAF5EB] border border-[#E8D8B5] shadow-[0_4px_20px_rgba(184,147,74,0.06)]',
}

export function Card({
  children,
  className,
  padding = 'md',
  variant = 'default',
  hoverable = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl relative transition-all duration-300',
        variantMap[variant],
        paddingMap[padding],
        hoverable &&
          'hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(25,30,27,0.07)] hover:border-[#D1E0D8] cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
