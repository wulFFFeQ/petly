import { PawPrint } from 'lucide-react'
import {
  getConnectionSeekingLabel,
  hasPublicConnectionPreferences,
} from '../../../lib/connections'
import type { DiscoverPet } from '../../../types'
import { DiscoverProfileSection } from './DiscoverProfileSection'

interface DiscoverConnectionSectionProps {
  pet: DiscoverPet
}

export function DiscoverConnectionSection({ pet }: DiscoverConnectionSectionProps) {
  if (!hasPublicConnectionPreferences(pet.connectionPreferences)) return null
  const ids = pet.connectionPreferences!.lookingFor

  return (
    <DiscoverProfileSection
      title="Hledá svého parťáka"
      icon={<PawPrint size={14} className="text-[#B8934A]" />}
    >
      <div className="space-y-2">
        <p className="text-sm font-medium text-[#191E1B]">{pet.name} hledá:</p>
        <ul className="space-y-1.5">
          {ids.map((id) => (
            <li
              key={id}
              className="flex items-start gap-2 text-sm text-[#4A564F]"
            >
              <span className="mt-0.5 text-[#B8934A]" aria-hidden>
                ·
              </span>
              <span>{getConnectionSeekingLabel(id)}</span>
            </li>
          ))}
        </ul>
      </div>
    </DiscoverProfileSection>
  )
}
