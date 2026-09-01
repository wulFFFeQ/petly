import { Link } from 'react-router-dom'
import { BRAND_NAME, BRAND_NAME_LINE_1, BRAND_NAME_LINE_2, BRAND_TAGLINE } from '../../lib/brand'
import { cn } from '../../lib/utils'

interface LogoProps {
  className?: string
  compact?: boolean
  withSubtitle?: boolean
}

function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M12 28c0-8 4-14 10-16 3-1 6 0 8 2 1-3 4-5 8-5 7 0 12 6 12 14 0 8-5 14-12 16-4 1-8 0-10-2-2 2-5 3-9 2-6-2-10-8-10-16Z"
        stroke="#234B54"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M22 18c-2 2-3 5-3 8M42 18c2 2 3 5 3 8"
        stroke="#234B54"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M26 24c1.5 1.5 3.5 2.5 6 2.5s4.5-1 6-2.5"
        stroke="#234B54"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M30 30c.8 1.2 2 2 3.5 2s2.7-.8 3.5-2"
        stroke="#B8934A"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M32 26.5c-.6-.8-1.6-1.3-2.8-1.3-1 0-1.9.4-2.5 1"
        stroke="#B8934A"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Logo({ className, compact, withSubtitle = true }: LogoProps) {
  return (
    <Link
      to="/"
      className={cn('group block', className)}
      aria-label={BRAND_NAME}
    >
      {compact ? (
        <BrandMark className="h-9 w-11 transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <div className="flex flex-col items-center text-center px-1">
          <BrandMark className="h-10 w-14 mb-2 transition-transform duration-300 group-hover:scale-105" />
          <div className="space-y-0.5">
            <p
              className="text-[15px] font-semibold tracking-[0.14em] text-[#234B54] leading-none"
              style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
            >
              {BRAND_NAME_LINE_1}
            </p>
            <div className="flex items-center justify-center gap-1.5 py-0.5">
              <span className="h-px w-3 bg-[#B8934A]" />
              <span
                className="text-sm text-[#B8934A] leading-none"
                style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
              >
                &
              </span>
              <span className="h-px w-3 bg-[#B8934A]" />
            </div>
            <p
              className="text-[15px] font-semibold tracking-[0.14em] text-[#234B54] leading-none"
              style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
            >
              {BRAND_NAME_LINE_2}
            </p>
          </div>
          {withSubtitle && (
            <p className="mt-2 text-[7px] font-semibold tracking-[0.18em] text-[#234B54]/80 uppercase">
              {BRAND_TAGLINE}
            </p>
          )}
        </div>
      )}
    </Link>
  )
}
