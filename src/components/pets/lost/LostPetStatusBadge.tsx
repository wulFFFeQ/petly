import type { LostPetLifecycle } from '../../../types'
import { lostStatusEmoji, lostStatusLabel } from '../../../lib/lostPet'
import { Badge } from '../../ui/Badge'

interface LostPetStatusBadgeProps {
  status: LostPetLifecycle
  size?: 'sm' | 'md'
  className?: string
}

export function LostPetStatusBadge({ status, size = 'sm', className }: LostPetStatusBadgeProps) {
  const variant =
    status === 'lost' ? 'danger' : status === 'found' ? 'success' : 'default'

  return (
    <Badge variant={variant} size={size} withDot={status === 'lost'} pulseDot={status === 'lost'} className={className}>
      <span className="mr-1" aria-hidden>
        {lostStatusEmoji(status)}
      </span>
      {lostStatusLabel(status)}
    </Badge>
  )
}
