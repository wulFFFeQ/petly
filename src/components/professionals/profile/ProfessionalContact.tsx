import { Globe, Mail, Phone } from 'lucide-react'
import type { PublicProfessionalProfile } from '../../../lib/professional'
import { ProfessionalProfileSection } from './ProfessionalProfileSection'

interface ProfessionalContactProps {
  pub: PublicProfessionalProfile
}

export function ProfessionalContact({ pub }: ProfessionalContactProps) {
  const hasEmail = Boolean(pub.publicEmail?.trim())
  const hasPhone = Boolean(pub.publicPhone?.trim())
  const hasWeb = Boolean(pub.website?.trim())
  if (!hasEmail && !hasPhone && !hasWeb) return null

  return (
    <ProfessionalProfileSection
      title="Kontakt"
      icon={<Mail size={14} className="text-[#B8934A]" />}
      testId="professional-contact"
    >
      <ul className="space-y-3">
        {hasPhone ? (
          <li>
            <a
              href={`tel:${pub.publicPhone!.trim()}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#2C4A3E] hover:underline"
            >
              <Phone size={14} className="text-[#B8934A]" />
              {pub.publicPhone!.trim()}
            </a>
          </li>
        ) : null}
        {hasEmail ? (
          <li>
            <a
              href={`mailto:${pub.publicEmail!.trim()}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#2C4A3E] hover:underline"
            >
              <Mail size={14} className="text-[#B8934A]" />
              {pub.publicEmail!.trim()}
            </a>
          </li>
        ) : null}
        {hasWeb ? (
          <li>
            <a
              href={pub.website!.trim()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#2C4A3E] hover:underline"
            >
              <Globe size={14} className="text-[#B8934A]" />
              {pub.website!.trim()}
            </a>
          </li>
        ) : null}
      </ul>
    </ProfessionalProfileSection>
  )
}
