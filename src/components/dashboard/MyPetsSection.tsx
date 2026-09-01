import { Link } from 'react-router-dom'
import { healthStatusLabel, petTypeLabel } from '../../data/mockData'
import { useApp } from '../../context/AppContext'
import type { Pet } from '../../types'
import { formatAge, formatWeight } from '../../lib/dashboardDates'
import { AddMenuButton } from './AddMenuButton'
import { Card } from '../ui/Card'
import { cn } from '../../lib/utils'

function healthDotColor(status: Pet['healthStatus']) {
  if (status === 'excellent') return 'bg-emerald-500'
  if (status === 'good') return 'bg-[#2C4A3E]'
  return 'bg-amber-500'
}

function PetCardCompact({ pet }: { pet: Pet }) {
  return (
    <Link to={`/pets/${pet.id}`} className="group block">
      <Card
        variant="elevated"
        padding="none"
        className="overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(25,30,27,0.06)] hover:border-[#D1E0D8]"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
          <img
            src={pet.image}
            alt={pet.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span
            className={cn(
              'absolute top-2.5 right-2.5 h-2.5 w-2.5 rounded-full ring-2 ring-white',
              healthDotColor(pet.healthStatus),
            )}
            title={healthStatusLabel[pet.healthStatus]}
          />
        </div>

        <div className="p-3.5">
          <h3 className="text-base font-bold text-[#191E1B] group-hover:text-[#2C4A3E] transition-colors">
            {pet.name}
          </h3>
          <p className="mt-0.5 text-xs text-[#7D8B82] truncate">
            {petTypeLabel[pet.type]} · {pet.breed}
          </p>
          <p className="mt-1 text-xs font-medium text-[#4A564F]">
            {formatAge(pet.age)} · {formatWeight(pet.weight)}
          </p>
        </div>
      </Card>
    </Link>
  )
}

export function MyPetsSection() {
  const { pets } = useApp()

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight text-[#191E1B]">Moji mazlíčci</h2>
        <AddMenuButton />
      </div>
      <div className="mt-4 grid gap-4 grid-cols-2 sm:grid-cols-3">
        {pets.slice(0, 3).map((pet) => (
          <PetCardCompact key={pet.id} pet={pet} />
        ))}
      </div>
    </section>
  )
}
