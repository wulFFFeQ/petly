import { Link } from 'react-router-dom'
import { canAccessProfessionalDashboard } from '../../lib/professional/dashboard'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Outlet } from 'react-router-dom'

/**
 * Gates /professional/* — requires professional role on self account.
 * Does NOT grant pet data access.
 */
export function ProfessionalGate() {
  if (!canAccessProfessionalDashboard()) {
    return (
      <div
        className="mx-auto flex min-h-[60vh] max-w-md items-center px-4"
        data-testid="professional-gate-denied"
      >
        <Card className="w-full text-center" variant="elevated">
          <h1 className="text-lg font-bold text-[#191E1B]">Profesionální dashboard</h1>
          <p className="mt-2 text-sm text-[#7D8B82]">
            Tento prostor je dostupný pouze účtům s profesionální rolí.
          </p>
          <Link to="/" className="mt-4 inline-block">
            <Button size="sm">Zpět na přehled majitele</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return <Outlet />
}
