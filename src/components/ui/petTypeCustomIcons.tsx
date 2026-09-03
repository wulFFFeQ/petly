import { frogFace, spider } from '@lucide/lab'
import { createLucideIcon } from 'lucide-react'
import type { SVGProps } from 'react'

type CustomIconProps = SVGProps<SVGSVGElement> & {
  size?: number
  strokeWidth?: number
}

function iconProps({
  size = 24,
  strokeWidth = 1.75,
  className,
  ...props
}: CustomIconProps) {
  return {
    xmlns: 'http://www.w3.org/2000/svg',
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    ...props,
  }
}

/** Obojživelníci – oficiální ikona Lucide Lab (frog-face) */
export const FrogIcon = createLucideIcon('FrogFace', frogFace)

/** Koně a osli – hlava koně v profilu */
export function HorseHeadIcon(props: CustomIconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M5 18.5h9" />
      <path d="M6 18.5v-3.5" />
      <path d="M6 8.5c0-3.5 2.8-5.5 6.2-5.5 2.8 0 5 1.8 5.8 4.2" />
      <path d="M16 7.2c1.2.8 2 2.2 2 4.3 0 2.3-1.2 4-3 4.5" />
      <path d="M18 11.5c1.2.8 1.8 2 1.8 3.5" />
      <path d="M7.5 6.5 6.5 3.8" />
      <path d="M9.5 6.2 9 4" />
      <circle cx="13.5" cy="10" r="0.75" fill="currentColor" stroke="none" />
      <path d="M8.5 12.5c-.8 1.2-1 2.5-.8 3.8" />
    </svg>
  )
}

/** Hospodářská zvířata – koza v profilu */
export function GoatIcon(props: CustomIconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M7.5 5.5C6 4.5 4.8 5 5 6.8" />
      <path d="M16.5 5.5C18 4.5 19.2 5 19 6.8" />
      <path d="M7 9.5c1.2-2.2 3.2-3.5 5-3.5s3.8 1.3 5 3.5" />
      <path d="M8.5 14.5c0 2.2 1.6 4 3.5 4s3.5-1.8 3.5-4" />
      <circle cx="10.5" cy="11.5" r="0.75" fill="currentColor" stroke="none" />
      <path d="M9.5 18.5v1.5" />
      <path d="M11 18.5c0 1 .8 1.5 1.5 1.5" />
      <path d="M14.5 15.5l1.5 2.5" />
    </svg>
  )
}

/** Bezobratlí – oficiální ikona Lucide Lab (spider) */
export const SpiderIcon = createLucideIcon('Spider', spider)

export type PetTypeCustomIcon = typeof FrogIcon
