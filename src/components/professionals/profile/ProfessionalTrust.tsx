import { BadgeCheck } from 'lucide-react'
import type { PublicProfessionalTrustItem } from '../../../lib/professional'
import { ProfessionalProfileSection } from './ProfessionalProfileSection'

interface ProfessionalTrustProps {
  items: PublicProfessionalTrustItem[]
}

export function ProfessionalTrust({ items }: ProfessionalTrustProps) {
  if (items.length === 0) return null

  return (
    <ProfessionalProfileSection
      title="Proč tomuto profilu věřit"
      icon={<BadgeCheck size={14} className="text-[#B8934A]" />}
      testId="professional-trust"
    >
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li
            key={item.id}
            data-testid={`professional-trust-${item.id}`}
            className="flex items-start gap-2.5 text-sm text-[#4A564F]"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EBF2EE] text-[#2C4A3E]">
              <BadgeCheck size={12} />
            </span>
            {item.label}
          </li>
        ))}
      </ul>
    </ProfessionalProfileSection>
  )
}
