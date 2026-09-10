import {
  Building2,
  Cat,
  Home,
  PawPrint,
  Scissors,
  Stethoscope,
  GraduationCap,
  Hotel,
  Wrench,
} from 'lucide-react'
import { getActiveSelfProfessionalProfile, professionalRoleLabel } from '../../../lib/professional/dashboard'
import type { ProfessionalType } from '../../../lib/professional/types'

function roleIcon(type: ProfessionalType | string) {
  switch (type) {
    case 'veterinarian':
      return Stethoscope
    case 'veterinary_clinic':
      return Building2
    case 'shelter':
      return Home
    case 'breeder':
      return PawPrint
    case 'groomer':
      return Scissors
    case 'trainer':
      return GraduationCap
    case 'pet_hotel':
      return Hotel
    case 'pet_service':
      return Wrench
    default:
      return Cat
  }
}

export function ProfessionalRoleHeader() {
  const profile = getActiveSelfProfessionalProfile()
  if (!profile) return null

  const Icon = roleIcon(profile.type)
  const label = professionalRoleLabel(profile.type)

  return (
    <div
      className="mb-5 flex items-center gap-3 rounded-2xl border border-[#E8E4DC] bg-white/80 px-4 py-3"
      data-testid="professional-role-header"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EBF2EE] text-[#2C4A3E]">
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">Role</p>
        <p className="truncate text-sm font-bold text-[#191E1B]" data-testid="professional-role-label">
          {label}
        </p>
      </div>
    </div>
  )
}
