import { MapPin, Sparkles, MessageCircle, ShieldCheck, User } from 'lucide-react'
import { useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import {
  getConnectionActivityLabel,
  hasPublicConnectionPreferences,
} from '../../lib/connections'
import { isOwnDiscoverPet } from '../../lib/discover'
import type { DiscoverPet } from '../../types'
import { ConnectComposeModal } from './ConnectComposeModal'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { PetPhotoCard } from '../ui/PetPhotoCard'

interface DiscoverCardProps {
  pet: DiscoverPet
}

export function DiscoverCard({ pet }: DiscoverCardProps) {
  const { showToast, pets } = useApp()
  const [composeOpen, setComposeOpen] = useState(false)
  const profilePath = `/discover/${pet.id}`
  const isOwn = isOwnDiscoverPet(pet.id, pets)
  const showFavoriteBadge = Boolean(pet.communityFavorite || pet.popular)
  const seeksBuddy = hasPublicConnectionPreferences(pet.connectionPreferences)
  const buddyLabels = seeksBuddy
    ? (pet.connectionPreferences?.lookingFor ?? []).map(getConnectionActivityLabel)
    : []

  const handleConnect = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isOwn) {
      showToast(
        'Tohle je váš mazlíček',
        'Nemůžete oslovit sami sebe.',
        'info',
      )
      return
    }
    setComposeOpen(true)
  }

  return (
    <>
      <Card
        variant="elevated"
        padding="none"
        className="overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(25,30,27,0.08)] hover:border-[#D1E0D8] flex h-full flex-col"
      >
        <Link
          to={profilePath}
          className="flex flex-1 flex-col text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4A3E]/40 focus-visible:ring-inset"
          aria-label={`Zobrazit profil ${pet.name}`}
        >
          <PetPhotoCard
            image={pet.image}
            name={pet.name}
            subtitle={pet.breed}
            ageLabel={`${pet.age} let`}
            aspect="square"
            topLeft={
              showFavoriteBadge ? (
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

            {seeksBuddy && buddyLabels.length > 0 && (
              <div className="mt-3 rounded-lg border border-[#E8D8B5]/60 bg-[#FAF4E6]/50 px-2.5 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#B8934A]">
                  Hledá parťáka
                </p>
                <p className="mt-0.5 text-[11px] font-medium leading-snug text-[#4A564F] line-clamp-2">
                  {buddyLabels.join(' · ')}
                </p>
              </div>
            )}

            <p className="mt-3 min-h-[2.75rem] text-xs text-[#4A564F] line-clamp-2 leading-relaxed">
              {pet.bio || '\u00A0'}
            </p>
          </div>
        </Link>

        <div className="flex flex-col gap-2 px-4 pb-4 pt-0">
          {!isOwn && (
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
          )}
          <Link
            to={profilePath}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium text-[#5A6660] hover:bg-[#EBF2EE] hover:text-[#2C4A3E] transition-colors"
          >
            <User size={14} />
            Zobrazit profil
          </Link>
        </div>
      </Card>

      <ConnectComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        pet={pet}
      />
    </>
  )
}
