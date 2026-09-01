import { Link } from 'react-router-dom'
import logoTransparent from '../../assets/loved-known-logo-transparent.png'
import { BRAND_NAME } from '../../lib/brand'
import { cn } from '../../lib/utils'

/** Sjednocená krémová s celou aplikací – bez boxu kolem loga */
export const SIDEBAR_SURFACE = '#FAF8F5'

interface LogoProps {
  className?: string
  compact?: boolean
  withSubtitle?: boolean
}

export function Logo({ className, compact, withSubtitle = true }: LogoProps) {
  if (compact) {
    return (
      <Link
        to="/"
        className={cn('group relative block h-10 w-10 overflow-hidden', className)}
        aria-label={BRAND_NAME}
      >
        <img
          src={logoTransparent}
          alt=""
          aria-hidden
          className="absolute left-1/2 top-0 h-[200px] w-[200px] max-w-none -translate-x-1/2 object-contain object-top"
        />
      </Link>
    )
  }

  return (
    <Link
      to="/"
      className={cn('group mx-auto block w-full max-w-[196px]', className)}
      aria-label={BRAND_NAME}
    >
      <img
        src={logoTransparent}
        alt={BRAND_NAME}
        draggable={false}
        className={cn(
          'block h-auto w-full object-contain transition-opacity duration-300 group-hover:opacity-85',
          !withSubtitle && 'max-h-[88px] object-top',
        )}
      />
    </Link>
  )
}

export function SidebarBrandHeader({ className }: { className?: string }) {
  return (
    <div
      className={cn('shrink-0 px-4 pt-6 pb-5 sm:pt-7 sm:pb-6', className)}
      style={{ backgroundColor: SIDEBAR_SURFACE }}
    >
      <Logo />
    </div>
  )
}
