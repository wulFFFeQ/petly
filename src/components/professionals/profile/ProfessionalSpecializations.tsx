import { Star } from 'lucide-react'
import type { PublicProfessionalProfile } from '../../../lib/professional'
import { Badge } from '../../ui/Badge'
import { ProfessionalProfileSection } from './ProfessionalProfileSection'

interface ProfessionalSpecializationsProps {
  pub: PublicProfessionalProfile
}

export function ProfessionalSpecializations({ pub }: ProfessionalSpecializationsProps) {
  if (!pub.specializations?.length) return null

  return (
    <ProfessionalProfileSection
      title="Specializace"
      icon={<Star size={14} className="text-[#B8934A]" />}
      testId="professional-specializations"
    >
      <ul className="flex flex-wrap gap-2">
        {pub.specializations.map((spec) => (
          <li key={spec}>
            <Badge
              variant="outline"
              size="sm"
              className="border-[#E8D8B5] bg-[#FAF4E6]/60 font-medium text-[#191E1B]"
            >
              {spec}
            </Badge>
          </li>
        ))}
      </ul>
    </ProfessionalProfileSection>
  )
}
