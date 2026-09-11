import { UserRound } from 'lucide-react'
import { isOrganizationProfessionalType } from '../../../lib/professional'
import type { PublicProfessionalProfile } from '../../../lib/professional'
import { ProfessionalProfileSection } from './ProfessionalProfileSection'

interface ProfessionalAboutProps {
  pub: PublicProfessionalProfile
}

export function ProfessionalAbout({ pub }: ProfessionalAboutProps) {
  if (!pub.description?.trim()) return null

  const title = isOrganizationProfessionalType(pub.type) ? 'O nás' : 'O mně'

  return (
    <ProfessionalProfileSection
      title={title}
      icon={<UserRound size={14} className="text-[#B8934A]" />}
      testId="professional-about"
    >
      <p className="text-sm leading-relaxed text-[#4A564F] whitespace-pre-wrap">
        {pub.description.trim()}
      </p>
      {pub.organizationName && pub.organizationName !== pub.displayName ? (
        <p className="mt-3 text-xs font-medium text-[#7D8B82]">{pub.organizationName}</p>
      ) : null}
    </ProfessionalProfileSection>
  )
}
