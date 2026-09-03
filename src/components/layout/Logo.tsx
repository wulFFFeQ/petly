import { Link } from 'react-router-dom'
import logoMark from '../../assets/loved-known-mark.png'
import { BRAND_NAME, BRAND_NAME_LINE_1, BRAND_NAME_LINE_2 } from '../../lib/brand'
import { cn } from '../../lib/utils'

/** Sjednocená krémová s celou aplikací */
export const SIDEBAR_SURFACE = '#FAF8F5'

const BRAND_GREEN = '#234B54'
const BRAND_GOLD = '#B8934A'

/** Samostatný asset symbolu – bez overflow clip z plného loga */
function BrandSymbol({ className }: { className?: string }) {
  return (
    <img
      src={logoMark}
      alt=""
      aria-hidden
      draggable={false}
      className={cn('mx-auto block h-auto w-[52px] shrink-0', className)}
    />
  )
}

function VerticalBrandWordmark({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-0.5 text-center', className)}>
      <span
        className="font-serif text-[32px] font-semibold leading-none tracking-[0.08em]"
        style={{ color: BRAND_GREEN }}
      >
        {BRAND_NAME_LINE_1}
      </span>

      <div className="flex w-full max-w-[120px] items-center justify-center gap-1.5">
        <span className="h-px flex-1 max-w-[40px] bg-[#B8934A]/75" aria-hidden />
        <span
          className="font-serif text-[30px] font-medium leading-none"
          style={{ color: BRAND_GOLD }}
        >
          &amp;
        </span>
        <span className="h-px flex-1 max-w-[40px] bg-[#B8934A]/75" aria-hidden />
      </div>

      <span
        className="font-serif text-[32px] font-semibold leading-none tracking-[0.08em]"
        style={{ color: BRAND_GREEN }}
      >
        {BRAND_NAME_LINE_2}
      </span>
    </div>
  )
}

/** Vertikální lockup pro sidebar – renderuje SidebarBrandHeader v Sidebar.tsx */
export function SidebarBrandHeader({ className }: { className?: string }) {
  return (
    <div
      className={cn('shrink-0 px-4 pt-4 pb-9', className)}
      style={{ backgroundColor: SIDEBAR_SURFACE }}
    >
      <Link
        to="/"
        className="group mx-auto flex w-full max-w-[180px] flex-col items-center transition-opacity duration-200 hover:opacity-85"
        aria-label={BRAND_NAME}
      >
        <BrandSymbol className="mb-2" />
        <VerticalBrandWordmark />
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
      <BrandSymbol />
    </Link>
  )
}
