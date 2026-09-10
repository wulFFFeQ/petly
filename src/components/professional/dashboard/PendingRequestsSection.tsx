import { Link } from 'react-router-dom'
import type { ProfessionalProfile } from '../../../lib/professional/types'
import type { ProfessionalPetCardModel } from '../../../lib/professional/dashboard'
import { cancelPetProfessionalAccessRequest } from '../../../lib/professional'
import { emitProfessionalAccessNotification } from '../../../lib/notifications'
import { useApp } from '../../../context/AppContext'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { EmptyState } from './EmptyState'

export function PendingRequestsSection({
  professional,
  cards,
  onChanged,
}: {
  professional: ProfessionalProfile
  cards: ProfessionalPetCardModel[]
  onChanged: () => void
}) {
  const { showToast, upsertNotification } = useApp()
  const pending = cards.filter((c) => c.access.status === 'pending')

  if (pending.length === 0) {
    return (
      <EmptyState
        title="Nemáte žádné čekající žádosti."
        description="Nové žádosti o propojení se zobrazí zde."
        testId="professional-pending-empty"
      />
    )
  }

  const cancel = (accessId: string, petName: string) => {
    const result = cancelPetProfessionalAccessRequest(accessId)
    if (result.access) {
      emitProfessionalAccessNotification(upsertNotification, {
        event: 'revoked',
        access: result.access,
        professional,
        petName,
      })
      showToast('Žádost zrušena', 'Čekající žádost byla zrušena.', 'info')
      onChanged()
    }
  }

  return (
    <Card variant="elevated" data-testid="professional-pending-requests">
      <h2 className="mb-3 text-sm font-bold text-[#191E1B]">Čekající žádosti</h2>
      <div className="space-y-3">
        {pending.map((card) => (
          <div
            key={card.access.id}
            className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3"
            data-testid={`pending-request-${card.access.petId}`}
          >
            <p className="text-sm font-bold text-[#191E1B]">{card.name}</p>
            <p className="text-xs text-[#7D8B82]">{card.breed ?? card.type ?? 'Mazlíček'}</p>
            <p className="mt-1 text-[11px] text-[#5A6660]">
              Žádá o propojení: {professional.displayName}
            </p>
            <p className="mt-1 text-[10px] text-[#A3AEA7]">
              Schválení provádí majitel. Můžete žádost zrušit.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to={`/professional/pets/${card.access.petId}`}>
                <Button size="sm" variant="outline" data-testid={`pending-view-${card.access.petId}`}>
                  Zobrazit
                </Button>
              </Link>
              <Button
                size="sm"
                variant="danger"
                data-testid={`pending-cancel-${card.access.petId}`}
                onClick={() => cancel(card.access.id, card.name)}
              >
                Zrušit žádost
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
