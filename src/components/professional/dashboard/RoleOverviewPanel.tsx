import { Link } from 'react-router-dom'
import type { ProfessionalProfile } from '../../../lib/professional/types'
import type { ProfessionalDashboardStats } from '../../../lib/professional/dashboard'
import { Card } from '../../ui/Card'

/**
 * Role-specific UI emphasis — never grants health access by role alone.
 * Breeding / shelter / hotel are extension points without new domain models.
 */
export function RoleOverviewPanel({
  profile,
  stats,
}: {
  profile: ProfessionalProfile
  stats: ProfessionalDashboardStats
}) {
  const type = profile.type

  if (type === 'shelter') {
    return (
      <Card variant="elevated" data-testid="role-panel-shelter">
        <h2 className="text-sm font-bold text-[#191E1B]">Útulek — pracovní přehled</h2>
        <ul className="mt-2 space-y-1 text-xs text-[#5A6660]">
          <li>Aktivní propojení: {stats.activeConnections}</li>
          <li>Čekající žádosti: {stats.pendingRequests}</li>
          <li>Mazlíčci v péči: připraveno jako extension point (bez adopčního systému)</li>
        </ul>
        <Link
          to="/professional/profile"
          className="mt-3 inline-block text-xs font-semibold text-[#2C4A3E] hover:underline"
        >
          Veřejný profil útulku →
        </Link>
      </Card>
    )
  }

  if (type === 'breeder') {
    return (
      <Card variant="elevated" data-testid="role-panel-breeder">
        <h2 className="text-sm font-bold text-[#191E1B]">Chovná stanice</h2>
        <p className="mt-1 text-xs text-[#7D8B82]">
          Chovní mazlíčci, výstavy, zdravotní testy a vrhy se zobrazí u propojených mazlíčků
          s existujícími breeding daty. Role chovatele sama o sobě neuděluje zdravotní přístup.
        </p>
        <ul className="mt-2 space-y-1 text-xs text-[#5A6660]">
          <li>Aktivní propojení: {stats.activeConnections}</li>
          <li>Čekající žádosti: {stats.pendingRequests}</li>
        </ul>
      </Card>
    )
  }

  if (type === 'groomer' || type === 'trainer') {
    return (
      <Card variant="elevated" data-testid={`role-panel-${type}`}>
        <h2 className="text-sm font-bold text-[#191E1B]">
          {type === 'groomer' ? 'Groomer' : 'Trenér'} — přehled
        </h2>
        <p className="mt-1 text-xs text-[#7D8B82]">
          Zdravotní data pouze při explicitním permission. Žádný automatický health access.
        </p>
        <ul className="mt-2 space-y-1 text-xs text-[#5A6660]">
          <li>Aktivní propojení: {stats.activeConnections}</li>
          <li>Dnešní události: {stats.todaysEvents}</li>
        </ul>
        <Link
          to="/professional/bookings"
          className="mt-3 inline-block text-xs font-semibold text-[#2C4A3E] hover:underline"
        >
          Rezervace →
        </Link>
      </Card>
    )
  }

  if (type === 'pet_hotel') {
    return (
      <Card variant="elevated" data-testid="role-panel-pet-hotel">
        <h2 className="text-sm font-bold text-[#191E1B]">Pet hotel</h2>
        <p className="mt-1 text-xs text-[#7D8B82]">
          Rezervace pobytů a denní péče spravujete v sekci Rezervace.
        </p>
        <ul className="mt-2 space-y-1 text-xs text-[#5A6660]">
          <li>Aktivní propojení: {stats.activeConnections}</li>
          <li>Dnešní události: {stats.todaysEvents}</li>
        </ul>
        <Link
          to="/professional/bookings"
          className="mt-3 inline-block text-xs font-semibold text-[#2C4A3E] hover:underline"
        >
          Rezervace →
        </Link>
      </Card>
    )
  }

  if (type === 'pet_service') {
    return (
      <Card variant="elevated" data-testid="role-panel-pet-service">
        <h2 className="text-sm font-bold text-[#191E1B]">Profesionální služba</h2>
        <p className="mt-1 text-xs text-[#7D8B82]">
          Obecný přehled — připraveno pro pozdější rozšíření podle typu služby.
        </p>
      </Card>
    )
  }

  // veterinarian / veterinary_clinic / default
  return (
    <Card variant="elevated" data-testid="role-panel-vet">
      <h2 className="text-sm font-bold text-[#191E1B]">Veterinární přehled</h2>
      <p className="mt-1 text-xs text-[#7D8B82]">
        Zdravotní záznamy a zápisy pouze podle udělených permissions. Role sama o sobě nestačí.
      </p>
      <ul className="mt-2 space-y-1 text-xs text-[#5A6660]">
        <li>Aktivní propojení: {stats.activeConnections}</li>
        <li>Čekající žádosti: {stats.pendingRequests}</li>
        <li>Dnešní události: {stats.todaysEvents}</li>
      </ul>
    </Card>
  )
}
