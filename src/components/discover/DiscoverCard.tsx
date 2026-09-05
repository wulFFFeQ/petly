import { MapPin, Sparkles, MessageCircle, ShieldCheck } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { DiscoverPet } from '../../types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { PetPhotoCard } from '../ui/PetPhotoCard'

interface DiscoverCardProps {
  pet: DiscoverPet
}

export function DiscoverCard({ pet }: DiscoverCardProps) {
  const { showToast } = useApp()

  const handleConnect = () => {
    showToast(
      `Propojeno s ${pet.name} a ${pet.ownerName || 'majitelem'}`,
      'Nyní můžete domlouvat schůzky a procházky ve zprávách.',
      'gold',
    )
  }

  return (
    <Card
      variant="elevated"
      padding="none"
      className="overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(25,30,27,0.08)] hover:border-[#D1E0D8] flex h-full flex-col"
    >
      <div className="flex flex-1 flex-col">
        <PetPhotoCard
          image={pet.image}
          name={pet.name}
          subtitle={pet.breed}
          ageLabel={`${pet.age} let`}
          aspect="square"
          topLeft={
            pet.popular ? (
              <Badge variant="gold" size="sm" className="bg-white/95 backdrop-blur-md shadow-xs">
                <Sparkles size={11} className="mr-0.5 text-[#B8934A]" />
                Oblíbenec komunity
              </Badge>
            ) : (
              <Badge variant="default" size="sm" className="bg-white/90 backdrop-blur-md">
                {pet.distance || 'V okolí'}
              </Badge>
            )
          }
          topRight={
            pet.verified ? (
              <span className="h-6 w-6 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[#2C4A3E] shadow-xs">
                <ShieldCheck size={14} />
              </span>
            ) : undefined
          }
        />

        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-center justify-between gap-2 text-xs text-[#7D8B82] pb-3 border-b border-[#F0EDE6]">
            <span className="flex min-w-0 items-center gap-1 font-medium text-[#4A564F]">
              <MapPin size={13} className="shrink-0 text-[#B8934A]" />
              <span className="truncate">
                {pet.location} {pet.distance && `(${pet.distance})`}
              </span>
            </span>
            {pet.ownerName && (
              <span className="shrink-0 text-[11px] font-medium text-[#7D8B82]">
                Majitel: {pet.ownerName}
              </span>
            )}
          </div>

          <p className="mt-3 min-h-[2.75rem] text-xs text-[#4A564F] line-clamp-2 leading-relaxed">
            {pet.bio || '\u00A0'}
          </p>
        </div>
      </div>

      <div className="px-4 pb-4 pt-0">
        <Button
          variant="outline"
          fullWidth
          size="sm"
          onClick={handleConnect}
          className="group-hover:bg-[#2C4A3E] group-hover:text-white group-hover:border-[#2C4A3E] transition-all gap-1.5"
        >
          <MessageCircle size={14} />
          <span>Oslovit a propojit se</span>
        </Button>
      </div>
    </Card>
  )
}
