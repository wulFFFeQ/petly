import { Sparkles } from 'lucide-react'
import type { PublicProfessionalProfile } from '../../../lib/professional'
import { Badge } from '../../ui/Badge'
import { ProfessionalProfileSection } from './ProfessionalProfileSection'

interface ProfessionalServicesProps {
  pub: PublicProfessionalProfile
}

export function ProfessionalServices({ pub }: ProfessionalServicesProps) {
  if (!pub.services?.length) return null

  return (
    <ProfessionalProfileSection
      title="Služby"
      id="professional-services"
      icon={<Sparkles size={14} className="text-[#B8934A]" />}
      testId="professional-services"
    >
      <ul className="flex flex-wrap gap-2">
        {pub.services.map((service) => (
          <li key={service}>
            <Badge variant="outline" size="sm" className="font-medium">
              {service}
            </Badge>
          </li>
        ))}
      </ul>
    </ProfessionalProfileSection>
  )
}
