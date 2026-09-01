import { Link } from 'react-router-dom'
import logoImage from '../../assets/loved-known-logo.png'
import { BRAND_NAME } from '../../lib/brand'
import { cn } from '../../lib/utils'

interface LogoProps {
  className?: string
  compact?: boolean
  withSubtitle?: boolean
}

export function Logo({ className, compact, withSubtitle = true }: LogoProps) {
  return (
    <Link
      to="/"
      className={cn('group block', className)}
      aria-label={BRAND_NAME}
    >
      {compact ? (
        <div className="relative h-11 w-11 overflow-hidden rounded-xl bg-[#FAF8F5]">
          <img
            src={logoImage}
            alt=""
            aria-hidden
            className="absolute left-1/2 top-0 h-[220px] w-[220px] max-w-none -translate-x-1/2 object-contain object-top transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      ) : (
        <img
          src={logoImage}
          alt={BRAND_NAME}
          className={cn(
            'mx-auto h-auto w-full max-w-[210px] object-contain transition-transform duration-300 group-hover:scale-[1.02]',
            !withSubtitle && 'max-h-[88px] object-top object-cover',
          )}
        />
      )}
    </Link>
  )
}
