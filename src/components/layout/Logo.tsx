import { Link } from 'react-router-dom'
import logoTransparent from '../../assets/loved-known-logo-transparent.png'
import { BRAND_NAME, BRAND_NAME_LINE_1, BRAND_NAME_LINE_2 } from '../../lib/brand'
import { cn } from '../../lib/utils'

/** Sjednocená krémová s celou aplikací */
export const SIDEBAR_SURFACE = '#FAF8F5'

const BRAND_GREEN = '#234B54'
const BRAND_GOLD = '#B8934A'

/** Symbol z horní části existujícího loga – bez extra asset souboru */
function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative h-[36px] w-[36px] shrink-0 overflow-hidden',
        className,
      )}
    >
      <img
        src={logoTransparent}
        alt=""
        aria-hidden
        draggable={false}
        className="absolute left-1/2 top-0 h-[95px] w-[77px] max-w-none -translate-x-1/2 object-contain object-top"
      />
    </div>
  )
}

function SidebarBrandWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-serif text-[19px] font-semibold leading-none tracking-[0.03em] whitespace-nowrap',
        className,
      )}
      style={{ color: BRAND_GREEN }}
    >
      {BRAND_NAME_LINE_1}{' '}
      <span className="font-medium" style={{ color: BRAND_GOLD }}>
        &amp;
      </span>{' '}
      {BRAND_NAME_LINE_2}
    </span>
  )
}

/** Kompaktní horizontální lockup pro sidebar: [symbol] LOVED & KNOWN */
export function SidebarBrandHeader({ className }: { className?: string }) {
  return (
    <div
      className={cn('shrink-0 px-5 pt-6 pb-5', className)}
      style={{ backgroundColor: SIDEBAR_SURFACE }}
    >
      <Link
        to="/"
        className="group mx-auto flex w-[236px] max-w-full items-center gap-3.5 rounded-xl py-1 transition-opacity duration-200 hover:opacity-85"
        aria-label={BRAND_NAME}
      >
        <BrandMark />
        <SidebarBrandWordmark />
      </Link>
    </div>
  )
}

interface LogoProps {
  className?: string
  compact?: boolean
}

/** Symbol-only mark (mobilní header apod.) */
export function Logo({ className, compact }: LogoProps) {
  if (!compact) {
    return <SidebarBrandHeader className={className} />
  }

  return (
    <Link
      to="/"
      className={cn('group inline-flex items-center', className)}
      aria-label={BRAND_NAME}
    >
      <BrandMark />
    </Link>
  )
}
