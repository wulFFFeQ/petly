import { Link } from 'react-router-dom'
import { ProfessionalPaymentsSection } from '../../components/payments/ProfessionalPaymentsSection'
import { EmptyState } from '../../components/professional/dashboard/EmptyState'
import { getActiveSelfProfessionalProfile } from '../../lib/professional/dashboard'

export function ProfessionalPaymentsPage() {
  const profile = getActiveSelfProfessionalProfile()

  if (!profile) {
    return (
      <EmptyState
        title="Profil profesionála není aktivní"
        description="Nejdříve dokončete nastavení profesionálního profilu."
        ctaLabel="Nastavení"
        ctaTo="/settings"
      />
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6" data-testid="professional-payments-page">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#A3AEA7]">
          Nastavení
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[#191E1B]">Platby</h1>
        <p className="mt-2 text-sm text-[#7D8B82]">
          Připojení výplatního účtu pro online rezervace. Oddělené od členství (Membership).
        </p>
      </div>

      <ProfessionalPaymentsSection professionalId={profile.id} />

      <p className="text-xs text-[#7D8B82]">
        Členství platformy spravujete v{' '}
        <Link to="/settings#membership" className="font-semibold text-[#2C4A3E] underline-offset-2 hover:underline">
          Nastavení → Členství
        </Link>
        .
      </p>
    </div>
  )
}
