import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import {
  formatPermissionList,
  getAccessListForProfessional,
  isAccessEffective,
  resolveAccessStatus,
  type PetProfessionalAccess,
} from '../../lib/professional'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

interface ProfessionalLinkedPetsSectionProps {
  professionalId: string
  professionalTypeLabel: string
  /** Bump to reload from localStorage after mutations. */
  refreshKey?: number
}

export function ProfessionalLinkedPetsSection({
  professionalId,
  professionalTypeLabel,
  refreshKey = 0,
}: ProfessionalLinkedPetsSectionProps) {
  const { pets } = useApp()

  const linked = useMemo(() => {
    return getAccessListForProfessional(professionalId).filter(
      (a) => a.status === 'active' || a.status === 'pending',
    )
  }, [professionalId, refreshKey])

  if (linked.length === 0) {
    return (
      <Card variant="elevated" data-testid="pro-linked-pets-empty">
        <h3 className="text-sm font-bold text-[#191E1B]">Moji propojení mazlíčci</h3>
        <p className="mt-1 text-xs text-[#7D8B82]">
          Zatím žádná propojení. Po schválení majitelem se zde zobrazí mazlíčci s uděleným
          přístupem.
        </p>
      </Card>
    )
  }

  return (
    <Card variant="elevated" data-testid="pro-linked-pets">
      <h3 className="mb-3 text-sm font-bold text-[#191E1B]">Moji propojení mazlíčci</h3>
      <div className="space-y-3">
        {linked.map((access: PetProfessionalAccess) => {
          const pet = pets.find((p) => p.id === access.petId)
          const status = resolveAccessStatus(access)
          const effective = isAccessEffective(access)
          return (
            <div
              key={access.id}
              data-testid={`pro-linked-pet-${access.petId}`}
              className="flex flex-col gap-2 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                {pet?.image ? (
                  <img
                    src={pet.image}
                    alt={pet.name}
                    className="h-12 w-12 rounded-full object-cover border border-[#E8E4DC]"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EBF2EE] text-sm font-bold text-[#2C4A3E]">
                    {(pet?.name ?? '?').slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#191E1B]">
                    {pet?.name ?? access.petId}
                  </p>
                  <p className="truncate text-xs text-[#7D8B82]">
                    {pet?.breed ?? 'Mazlíček'} · {professionalTypeLabel}
                  </p>
                  <p
                    className={
                      status === 'active'
                        ? 'mt-0.5 text-xs font-semibold text-emerald-700'
                        : 'mt-0.5 text-xs font-semibold text-amber-700'
                    }
                  >
                    ● {status === 'active' ? 'Aktivní přístup' : 'Čeká na schválení'}
                  </p>
                  {access.permissions.length > 0 ? (
                    <p className="mt-1 text-[11px] text-[#5A6660]">
                      {formatPermissionList(access.permissions).slice(0, 4).join(' · ')}
                    </p>
                  ) : null}
                </div>
              </div>
              {effective ? (
                <Link
                  to={`/professionals/${professionalId}/pets/${access.petId}`}
                  data-testid={`pro-open-pet-${access.petId}`}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-[#E8E4DC] bg-white px-3 py-1.5 text-xs font-semibold text-[#191E1B] hover:bg-[#EBF2EE]"
                >
                  Otevřít profesionální pohled
                </Link>
              ) : (
                <Badge variant="outline" size="sm">
                  Čeká na majitele
                </Badge>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
