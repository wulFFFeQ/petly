import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { getActiveSelfProfessionalProfile, listProfessionalPetCards } from '../../lib/professional/dashboard'
import { EmptyState } from '../../components/professional/dashboard/EmptyState'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'

export function ProfessionalPetsPage() {
  const { pets, healthRecords, documents } = useApp()
  const profile = getActiveSelfProfessionalProfile()

  const cards = useMemo(() => {
    if (!profile) return []
    return listProfessionalPetCards(profile.id, pets, {
      healthRecords,
      documents,
      statuses: ['active', 'pending'],
    })
  }, [profile, pets, healthRecords, documents])

  if (!profile) {
    return (
      <EmptyState
        title="Chybí profesionální profil"
        description="Nejdříve dokončete profesionální profil."
        ctaLabel="Profil"
        ctaTo="/professional/profile"
      />
    )
  }

  return (
    <div className="space-y-5 pb-8" data-testid="professional-pets-page">
      <div>
        <h1 className="text-lg font-bold text-[#191E1B]">Moji propojení mazlíčci</h1>
        <p className="text-xs text-[#7D8B82]">
          Pouze mazlíčci s PetProfessionalAccess. Role sama o sobě nestačí.
        </p>
      </div>

      {cards.length === 0 ? (
        <EmptyState
          title="Zatím nemáte propojené žádné mazlíčky."
          description="Až vám majitel udělí přístup, objeví se zde."
          ctaLabel="Prohlédnout katalog"
          ctaTo="/professionals"
          testId="professional-pets-empty"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map((card) => (
            <Card
              key={card.access.id}
              variant="elevated"
              data-testid={`pro-dash-pet-${card.access.petId}`}
            >
              <div className="flex items-start gap-3">
                {card.image ? (
                  <img
                    src={card.image}
                    alt=""
                    className="h-14 w-14 rounded-full object-cover border border-[#E8E4DC]"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EBF2EE] text-sm font-bold text-[#2C4A3E]">
                    {card.name.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#191E1B]">{card.name}</p>
                  <p className="truncate text-xs text-[#7D8B82]">
                    {card.breed ?? card.type ?? 'Mazlíček'}
                  </p>
                  <p
                    className={
                      card.effective
                        ? 'mt-1 text-xs font-semibold text-emerald-700'
                        : 'mt-1 text-xs font-semibold text-amber-700'
                    }
                  >
                    {card.effective ? '🟢 Aktivní přístup' : '🟡 Čeká na schválení'}
                  </p>
                  <p className="mt-1 text-[11px] text-[#5A6660]">
                    Přístup: {card.permissionCount} oprávnění
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge>{card.status}</Badge>
                  </div>
                  {card.effective ? (
                    <Link to={`/professional/pets/${card.access.petId}`} className="mt-3 inline-block">
                      <Button size="sm" variant="outline" data-testid={`open-pet-${card.access.petId}`}>
                        Otevřít profil
                      </Button>
                    </Link>
                  ) : (
                    <p className="mt-2 text-[11px] text-[#A3AEA7]">
                      Data mazlíčka budou dostupná po schválení majitelem.
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
