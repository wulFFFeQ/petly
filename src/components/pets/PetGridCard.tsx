import { ArrowUpRight, ShieldCheck, Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { healthStatusLabel, petTypeLabel } from '../../data/mockData'
import type { Pet } from '../../types'
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
        : 'warning'

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
            <Badge variant={statusVariant} size="sm" withDot className="bg-white/95 backdrop-blur-md shadow-xs">
              {healthStatusLabel[pet.healthStatus]}
            </Badge>
          </div>

          {/* Bottom Floating Info inside photo */}
          <div className="absolute bottom-3 left-3.5 right-3.5 z-10 text-white flex items-baseline justify-between">
            <div>
              <h3 className="text-xl font-bold tracking-tight drop-shadow-sm flex items-center gap-1.5">
                <span>{pet.name}</span>
              </h3>
              <p className="text-xs text-white/90 font-medium drop-shadow-sm">{pet.breed}</p>
            </div>
            <span className="text-xs font-semibold bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full">
              {pet.age} let
            </span>
          </div>
        </div>

        {/* Content details */}
        <div className="p-5">
          <div className="grid grid-cols-2 gap-3 py-2 border-b border-[#F0EDE6] text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">Hmotnost</span>
              <p className="font-semibold text-[#191E1B] mt-0.5">{pet.weight} kg</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">Mikročip</span>
              <p className="font-mono text-[11px] text-[#4A564F] mt-0.5 truncate">{pet.microchip}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">Poslední návštěva</span>
              <p className="font-medium text-[#191E1B] mt-0.5">{pet.lastVetVisit}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">Očkování</span>
              <p className="font-medium text-[#2C4A3E] mt-0.5">{pet.nextVaccination}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-[#7D8B82]">
            <span className="flex items-center gap-1">
              <ShieldCheck size={13} className="text-[#2C4A3E]" />
              Zdravotní skóre: <strong className="text-[#191E1B]">{pet.healthScore || 95}%</strong>
            </span>
            <span className="flex items-center gap-1">
              <Heart size={13} className="text-[#B8934A]" />
              {pet.neutered ? 'Kastrovaný' : 'Nekastrovaný'}
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 pt-1">
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
