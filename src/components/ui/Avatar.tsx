import { cn } from '../../lib/utils'

interface AvatarProps {
  src: string
  alt: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  status?: 'online' | 'offline' | 'busy'
  goldRing?: boolean
  className?: string
}

const sizes = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
}

const statusPositions = {
  xs: 'bottom-0 right-0 h-1.5 w-1.5',
  sm: 'bottom-0 right-0 h-2 w-2',
  md: 'bottom-0.5 right-0.5 h-2.5 w-2.5',
  lg: 'bottom-0.5 right-0.5 h-3 w-3',
  xl: 'bottom-1 right-1 h-3.5 w-3.5',
}

export function Avatar({
  src,
  alt,
  size = 'md',
  status,
  goldRing = false,
  className,
}: AvatarProps) {
  return (
    <div className="relative inline-block shrink-0">
      <img
        src={src}
        alt={alt}
        className={cn(
          'rounded-full object-cover transition-transform duration-300',
          sizes[size],
          goldRing && 'ring-2 ring-[#B8934A] ring-offset-2 ring-offset-white',
          className,
        )}
      />
      {status && (
        <span
          className={cn(
            'absolute rounded-full border-2 border-white',
            statusPositions[size],
            status === 'online' && 'bg-emerald-500',
            status === 'offline' && 'bg-stone-300',
            status === 'busy' && 'bg-amber-500',
          )}
        />
      )}
    </div>
  )
}
