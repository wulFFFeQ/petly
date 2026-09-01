import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'gold' | 'danger'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
  fullWidth?: boolean
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-[#2C4A3E] text-white hover:bg-[#20362E] active:bg-[#182923] shadow-sm hover:shadow-md border border-[#20362E]/20',
  secondary:
    'bg-[#EFECE6] text-[#191E1B] hover:bg-[#E5E1D8] active:bg-[#DBD5C9] border border-[#E8E4DC]',
  ghost:
    'text-[#4A564F] hover:bg-[#EBF2EE] hover:text-[#2C4A3E] active:bg-[#DFECE5]',
  outline:
    'border border-[#E8E4DC] bg-white text-[#191E1B] hover:bg-[#FAF8F5] hover:border-[#D1E0D8] active:bg-[#F3F0E9] shadow-[0_1px_2px_rgba(0,0,0,0.02)]',
  gold:
    'bg-gradient-to-r from-[#B8934A] to-[#C9A55B] text-white hover:from-[#A8833B] hover:to-[#B8934A] active:from-[#94732E] active:to-[#A8833B] shadow-sm hover:shadow-md border border-[#B8934A]/30',
  danger:
    'bg-rose-50 text-rose-700 hover:bg-rose-100 active:bg-rose-200 border border-rose-200/60',
}

const sizes: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1 text-xs rounded-md gap-1.5 font-medium',
  sm: 'px-3.5 py-1.5 text-xs font-medium rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm font-medium rounded-xl gap-2',
  lg: 'px-5 py-2.5 text-sm font-semibold rounded-xl gap-2.5',
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center tracking-tight transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
