import { PawPrint } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/utils'

interface LogoProps {
  className?: string
  compact?: boolean
  withSubtitle?: boolean
}

export function Logo({ className, compact, withSubtitle = true }: LogoProps) {
  return (
    <Link to="/" className={cn('flex items-center gap-3 group', className)}>
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2C4A3E] to-[#1A2E26] shadow-[0_2px_8px_rgba(44,74,62,0.25)] border border-[#3D5E51] transition-transform duration-300 group-hover:scale-105">
        <PawPrint size={19} className="text-[#FAF8F5]" strokeWidth={2.2} />
        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#B8934A] ring-2 ring-white" />
      </div>
      {!compact && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-bold tracking-[0.18em] text-[#191E1B] font-sans">
              PETLY
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#B8934A]" />
          </div>
          {withSubtitle && (
            <span className="text-[9px] font-semibold tracking-[0.22em] text-[#7D8B82] uppercase -mt-0.5">
              Péče a wellness
            </span>
          )}
        </div>
      )}
    </Link>
  )
}
