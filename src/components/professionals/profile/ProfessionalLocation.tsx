import { Clock, MapPin } from 'lucide-react'
import type { PublicProfessionalProfile } from '../../../lib/professional'
import { ProfessionalProfileSection } from './ProfessionalProfileSection'

interface ProfessionalLocationProps {
  pub: PublicProfessionalProfile
}

export function ProfessionalLocation({ pub }: ProfessionalLocationProps) {
  if (!pub.city?.trim() && !pub.hoursSummary?.trim()) return null

  return (
    <ProfessionalProfileSection
      title="Kde působí"
      icon={<MapPin size={14} className="text-[#B8934A]" />}
      testId="professional-location"
    >
      <div className="space-y-3">
        {pub.city?.trim() ? (
          <p className="inline-flex items-center gap-2 text-sm text-[#4A564F]">
            <MapPin size={14} className="shrink-0 text-[#B8934A]" />
            {pub.city.trim()}
          </p>
        ) : null}
        {pub.hoursSummary?.trim() ? (
          <p className="inline-flex items-start gap-2 text-sm text-[#4A564F]">
            <Clock size={14} className="mt-0.5 shrink-0 text-[#B8934A]" />
            <span>{pub.hoursSummary.trim()}</span>
          </p>
        ) : null}
      </div>
    </ProfessionalProfileSection>
  )
}
