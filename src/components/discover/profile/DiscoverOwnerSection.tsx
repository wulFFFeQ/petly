import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { DiscoverOwner } from '../../../types'
import { Avatar } from '../../ui/Avatar'
import { DiscoverProfileSection } from './DiscoverProfileSection'

interface DiscoverOwnerSectionProps {
  owner: DiscoverOwner
}

export function DiscoverOwnerSection({ owner }: DiscoverOwnerSectionProps) {
  return (
    <DiscoverProfileSection title="Majitel">
      <Link
        to={`/owners/${owner.id}`}
        className="group flex items-center gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3.5 transition-colors hover:border-[#D1E0D8] hover:bg-[#EBF2EE]/50"
      >
        <Avatar src={owner.avatar} alt={owner.name} size="lg" goldRing />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#191E1B] group-hover:text-[#2C4A3E] transition-colors">
            {owner.name}
          </p>
          {owner.location && (
            <p className="text-xs text-[#7D8B82]">{owner.location}</p>
          )}
          {owner.bio && (
            <p className="mt-1 text-xs text-[#5A6660] line-clamp-2 leading-relaxed">{owner.bio}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#2C4A3E]">
          Profil
          <ChevronRight size={14} />
        </div>
      </Link>
    </DiscoverProfileSection>
  )
}
