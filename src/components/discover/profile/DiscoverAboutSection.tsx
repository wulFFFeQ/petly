import { Heart, Search, ThumbsDown, ThumbsUp } from 'lucide-react'
import type { DiscoverPet } from '../../../types'
import { DiscoverProfileSection } from './DiscoverProfileSection'

interface DiscoverAboutSectionProps {
  pet: DiscoverPet
}

export function DiscoverAboutSection({ pet }: DiscoverAboutSectionProps) {
  const hasContent =
    pet.bio ||
    pet.personality ||
    (pet.likes && pet.likes.length > 0) ||
    (pet.dislikes && pet.dislikes.length > 0) ||
    pet.lookingFor

  if (!hasContent) return null

  return (
    <DiscoverProfileSection
      title="O mazlíčkovi"
      icon={<Heart size={14} className="text-[#B8934A]" />}
    >
      <div className="space-y-4">
        {pet.bio && (
          <p className="text-sm leading-relaxed text-[#4A564F]">{pet.bio}</p>
        )}

        {pet.personality && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">Povaha</p>
            <p className="mt-1 text-sm leading-relaxed text-[#191E1B]">{pet.personality}</p>
          </div>
        )}

        {pet.likes && pet.likes.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
              <ThumbsUp size={11} className="text-[#2C4A3E]" />
              Má rád
            </p>
            <div className="flex flex-wrap gap-1.5">
              {pet.likes.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-[#EBF2EE] px-2.5 py-1 text-xs font-medium text-[#2C4A3E]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {pet.dislikes && pet.dislikes.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
              <ThumbsDown size={11} className="text-[#7D8B82]" />
              Nemá rád
            </p>
            <div className="flex flex-wrap gap-1.5">
              {pet.dislikes.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-[#F3F0EA] px-2.5 py-1 text-xs font-medium text-[#5A6660]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {pet.lookingFor && (
          <div className="rounded-xl border border-[#E8D8B5]/70 bg-[#FAF4E6]/60 px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#B8934A]">
              <Search size={11} />
              Hledá
            </p>
            <p className="mt-1 text-sm font-medium text-[#191E1B]">{pet.lookingFor}</p>
          </div>
        )}
      </div>
    </DiscoverProfileSection>
  )
}
