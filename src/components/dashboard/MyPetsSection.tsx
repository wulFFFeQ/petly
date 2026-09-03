import { Link } from 'react-router-dom'
import { PawPrint } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { Pet } from '../../types'
import { formatAge, getPetStatusBadge } from '../../lib/dashboardDates'
import { AddMenuButton } from './AddMenuButton'
import { cn } from '../../lib/utils'

function statusDotClass(variant: ReturnType<typeof getPetStatusBadge>['variant']) {
  if (variant === 'success') return 'bg-emerald-400'
  if (variant === 'warning') return 'bg-amber-400'
  if (variant === 'gold') return 'bg-[#B8934A]'
  return 'bg-white/90'
}

function EditorialPetTile({
  pet,
  className,
  imageClassName,
  featured = false,
}: {
  pet: Pet
  className?: string
  imageClassName?: string
  featured?: boolean
}) {
  const { calendarEvents } = useApp()
  const status = getPetStatusBadge(pet, calendarEvents)

  return (
    <Link
      to={`/pets/${pet.id}`}
      className={cn(
        'group relative block overflow-hidden rounded-2xl sm:rounded-3xl',
        className,
      )}
    >
      <img
        src={pet.image}
        alt={pet.name}
        className={cn(
          'absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]',
          imageClassName,
        )}
      />
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-black/5',
          featured && 'from-black/70 via-black/25',
        )}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#2C4A3E]/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      {featured && (
        <PawPrint
          size={48}
          strokeWidth={1.25}
          className="pointer-events-none absolute right-4 top-4 text-white/15"
          aria-hidden
        />
      )}

      <div
        className={cn(
          'absolute inset-x-0 bottom-0',
          featured ? 'p-5 sm:p-6 lg:p-7' : 'p-3.5 sm:p-4',
        )}
      >
        <h3
          className={cn(
            'font-bold tracking-tight text-white drop-shadow-sm',
            featured
              ? 'text-2xl sm:text-3xl lg:text-[2rem]'
              : 'text-lg sm:text-xl',
          )}
        >
          {pet.name}
        </h3>
        <p
          className={cn(
            'mt-0.5 font-medium text-white/85',
            featured ? 'text-sm sm:text-base' : 'text-xs sm:text-sm',
          )}
        >
          {pet.breed} · {formatAge(pet.age)}
        </p>
        <p
          className={cn(
            'mt-2 flex items-center gap-2 font-medium text-white/75',
            featured ? 'text-xs sm:text-sm' : 'text-[11px] sm:text-xs',
          )}
        >
          <span
            className={cn('h-1.5 w-1.5 shrink-0 rounded-full', statusDotClass(status.variant))}
          />
          {status.label}
        </p>
      </div>
    </Link>
  )
}

export function MyPetsSection() {
  const { pets } = useApp()
  const featured = pets[0]
  const secondary = pets.slice(1, 3)
  const extra = pets.slice(3)

  if (!featured) return null

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
        <h2 className="text-xl font-bold tracking-tight text-[#191E1B] sm:text-2xl">
          Moji mazlíčci
        </h2>
        <AddMenuButton />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-12 lg:grid-rows-2 lg:gap-4">
        <EditorialPetTile
          pet={featured}
          featured
          className="col-span-2 min-h-[300px] sm:min-h-[340px] lg:col-span-8 lg:row-span-2 lg:min-h-[400px] lg:max-h-[460px]"
        />
        {secondary.map((pet) => (
          <EditorialPetTile
            key={pet.id}
            pet={pet}
            className="min-h-[150px] sm:min-h-[170px] lg:col-span-4 lg:min-h-0 lg:h-full"
          />
        ))}
      </div>

      {extra.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-4">
          {extra.map((pet) => (
            <EditorialPetTile
              key={pet.id}
              pet={pet}
              className="min-h-[150px] sm:min-h-[170px]"
            />
          ))}
        </div>
      )}
    </section>
  )
}
