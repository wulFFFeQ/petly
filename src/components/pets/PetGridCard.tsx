import { ArrowUpRight, Scale, Stethoscope, Syringe } from 'lucide-react'
import { Link } from 'react-router-dom'
import { petTypeLabel } from '../../data/mockData'
import type { Pet } from '../../types'
import {
  formatHealthStatus,
  formatNeuteredStatus,
  formatOptionalText,
  formatOptionalWeight,
  hasMicrochip,
} from '../../lib/petProfileDisplay'
import { formatAge } from '../../lib/dashboardDates'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { IconBox } from '../ui/IconBox'
import { PetPhotoCard } from '../ui/PetPhotoCard'

interface PetGridCardProps {
  pet: Pet
}

export function PetGridCard({ pet }: PetGridCardProps) {
  const statusVariant =
    pet.healthStatus === 'excellent'
      ? 'success'
      : pet.healthStatus === 'good'
        ? 'primary'
        : pet.healthStatus === 'attention'
          ? 'warning'
          : pet.healthStatus === 'vet_check' || pet.healthStatus === 'urgent'
            ? 'danger'
            : 'default'

  const ageLabel =
    (pet.age != null && pet.age > 0) || (pet.ageMonths != null && pet.ageMonths > 0)
      ? formatAge(pet.age, pet.ageMonths)
      : undefined

  return (
    <Card
      variant="elevated"
      padding="none"
      className="overflow-hidden group transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_15px_35px_rgba(25,30,27,0.1)] hover:border-[#D1E0D8] flex flex-col justify-between"
    >
      <div>
        <PetPhotoCard
          image={pet.image}
          name={pet.name}
          subtitle={pet.breed}
          ageLabel={ageLabel}
          aspect="4/3"
          topLeft={
            <Badge variant="default" size="sm" className="bg-white/90 backdrop-blur-md shadow-xs">
              {petTypeLabel[pet.type]}
            </Badge>
          }
          topRight={
            pet.healthStatus ? (
              <Badge
                variant={statusVariant}
                size="sm"
                withDot
                className="bg-white/95 backdrop-blur-md shadow-xs"
              >
                {formatHealthStatus(pet.healthStatus)}
              </Badge>
            ) : undefined
          }
        />

        <div className="p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <IconBox icon={Scale} size="lg" tone="green" />
            <div>
              <p className="text-xs font-medium text-[#7D8B82]">Hmotnost</p>
              <p className="text-lg font-bold tracking-tight text-[#191E1B]">
                {formatOptionalWeight(pet.weight)}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 rounded-xl bg-[#FAF8F5] px-3 py-2">
              <IconBox icon={Stethoscope} size="sm" tone="sky" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-[#7D8B82]">Poslední návštěva</p>
                <p className="text-sm font-semibold text-[#191E1B]">
                  {formatOptionalText(pet.lastVetVisit)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl bg-[#FAF8F5] px-3 py-2">
              <IconBox icon={Syringe} size="sm" tone="muted" className="text-[#234B54]" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-[#7D8B82]">Příští očkování</p>
                <p className="text-sm font-semibold text-[#234B54]">
                  {formatOptionalText(pet.nextVaccination)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-[10px] text-[#A3AEA7]">
              Mikročip{' '}
              <span className="font-mono text-[#B8C2BC]">
                {hasMicrochip(pet.microchip) ? pet.microchip : formatOptionalText(pet.microchip)}
              </span>
            </p>
            {pet.neutered != null && (
              <Badge variant="outline" size="sm" className="shrink-0">
                {formatNeuteredStatus(pet.neutered, pet.gender)}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 pt-0">
        <Link to={`/pets/${pet.id}`} className="block w-full">
          <Button
            variant="outline"
            fullWidth
            size="sm"
            className="group-hover:bg-[#2C4A3E] group-hover:text-white group-hover:border-[#2C4A3E] transition-all justify-between"
          >
            <span>Zobrazit profil a zdravotní záznamy</span>
            <ArrowUpRight
              size={14}
              className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
            />
          </Button>
        </Link>
      </div>
    </Card>
  )
}
