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
          : 'default'

  return (
    <Card
      variant="elevated"
      padding="none"
      className="overflow-hidden group transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_15px_35px_rgba(25,30,27,0.1)] hover:border-[#D1E0D8] flex flex-col justify-between"
    >
      <div>
        {/* Photo with gradient vignette */}
        <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
          <img
            src={pet.image}
            alt={pet.name}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

          {/* Top Floating Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
            <Badge variant="default" size="sm" className="bg-white/90 backdrop-blur-md shadow-xs">
              {petTypeLabel[pet.type]}
            </Badge>
            {pet.healthStatus && (
              <Badge variant={statusVariant} size="sm" withDot className="bg-white/95 backdrop-blur-md shadow-xs">
                {formatHealthStatus(pet.healthStatus)}
              </Badge>
            )}
          </div>

          {/* Bottom Floating Info inside photo */}
          <div className="absolute bottom-3 left-3.5 right-3.5 z-10 text-white flex items-baseline justify-between">
            <div>
              <h3 className="text-xl font-bold tracking-tight drop-shadow-sm flex items-center gap-1.5">
                <span>{pet.name}</span>
              </h3>
              <p className="text-xs text-white/90 font-medium drop-shadow-sm">{pet.breed}</p>
            </div>
            {pet.age != null && pet.age > 0 && (
              <span className="text-xs font-semibold bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full">
                {formatAge(pet.age)}
              </span>
            )}
          </div>
        </div>

        {/* Content details */}
        <div className="p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EBF2EE] text-[#2C4A3E]">
              <Scale size={17} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xs font-medium text-[#7D8B82]">Hmotnost</p>
              <p className="text-lg font-bold tracking-tight text-[#191E1B]">
                {formatOptionalWeight(pet.weight)}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 rounded-xl bg-[#FAF8F5] px-3 py-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-sky-700 shadow-sm">
                <Stethoscope size={14} strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-[#7D8B82]">Poslední návštěva</p>
                <p className="text-sm font-semibold text-[#191E1B]">
                  {formatOptionalText(pet.lastVetVisit)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl bg-[#FAF8F5] px-3 py-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#234B54] shadow-sm">
                <Syringe size={14} strokeWidth={1.75} />
              </div>
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
            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Button>
        </Link>
      </div>
    </Card>
  )
}
