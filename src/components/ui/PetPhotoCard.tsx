import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type Aspect = 'square' | '4/3' | 'video' | 'auto'

interface PetPhotoCardProps {
  image: string
  name: string
  subtitle?: string
  ageLabel?: string
  topLeft?: ReactNode
  topRight?: ReactNode
  aspect?: Aspect
  className?: string
  /** Extra overlay content below the name row */
  footer?: ReactNode
  children?: ReactNode
}

const aspectMap: Record<Aspect, string> = {
  square: 'aspect-square',
  '4/3': 'aspect-[4/3]',
  video: 'aspect-video',
  auto: '',
}

export function PetPhotoCard({
  image,
  name,
  subtitle,
  ageLabel,
  topLeft,
  topRight,
  aspect = '4/3',
  className,
  footer,
  children,
}: PetPhotoCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-stone-100',
        aspectMap[aspect],
        className,
      )}
    >
      <img
        src={image}
        alt={name}
        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

      {(topLeft || topRight) && (
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <div>{topLeft}</div>
          <div>{topRight}</div>
        </div>
      )}

      <div className="absolute bottom-3 left-3.5 right-3.5 z-10 text-white flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-xl font-bold tracking-tight drop-shadow-sm truncate">
            {name}
          </h3>
          {subtitle && (
            <p className="text-xs text-white/90 font-medium drop-shadow-sm truncate">
              {subtitle}
            </p>
          )}
          {footer}
        </div>
        {ageLabel && (
          <span className="shrink-0 text-xs font-semibold bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full">
            {ageLabel}
          </span>
        )}
      </div>

      {children}
    </div>
  )
}
