import {
  Archive,
  ArrowLeft,
  ExternalLink,
  FileText,
  Phone,
  ShieldCheck,
  Video,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Conversation } from '../../types'
import type { DiscoverPet } from '../../types'
import { Avatar } from '../ui/Avatar'

interface ChatThreadHeaderProps {
  conversation: Conversation
  contactPet?: DiscoverPet
  onBack: () => void
  onOpenProfile: () => void
  onArchive: () => void
  onRestore: () => void
  onCall: () => void
  onVideoCall: () => void
}

export function ChatThreadHeader({
  conversation: active,
  contactPet,
  onBack,
  onOpenProfile,
  onArchive,
  onRestore,
  onCall,
  onVideoCall,
}: ChatThreadHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-[#E8E4DC] bg-white px-5 py-3.5 shadow-xs">
      <div className="flex items-center gap-3.5">
        <button
          onClick={onBack}
          className="rounded-xl p-1.5 text-[#7D8B82] hover:bg-[#FAF8F5] hover:text-[#191E1B] md:hidden cursor-pointer"
          aria-label="Zpět ke konverzacím"
        >
          <ArrowLeft size={18} />
        </button>
        <button
          type="button"
          onClick={onOpenProfile}
          className="rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4A3E]/30"
          aria-label={`Otevřít profil ${active.name}`}
        >
          <Avatar
            src={active.avatar}
            alt={active.name}
            size="sm"
            status={active.online ? 'online' : 'offline'}
          />
        </button>
        <div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenProfile}
              className="text-sm font-bold text-[#191E1B] hover:text-[#234B54] hover:underline underline-offset-2 transition-colors cursor-pointer text-left"
            >
              {active.name}
            </button>
            {active.role?.includes('veterinář') && (
              <ShieldCheck size={14} className="text-[#2C4A3E]" />
            )}
          </div>
          <p className="text-[11px] text-[#7D8B82]">
            {active.online ? 'Právě online' : 'Naposledy aktivní před 2 h'}
            {active.role && ` · ${active.role}`}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold text-[#234B54]">
            {active.petContext}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {contactPet && (
              <Link
                to={`/discover/${contactPet.id}`}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#234B54] hover:text-[#B8934A] transition-colors"
              >
                <ExternalLink size={10} />
                Profil {contactPet.name}
              </Link>
            )}
            {active.petId && active.contactType === 'vet' && (
              <>
                <Link
                  to={`/pets/${active.petId}`}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#234B54] hover:text-[#B8934A] transition-colors"
                >
                  <ExternalLink size={10} />
                  Profil mazlíčka
                </Link>
                <Link
                  to="/health"
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#234B54] hover:text-[#B8934A] transition-colors"
                >
                  <FileText size={10} />
                  Zdravotní záznamy
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {active.archived ? (
          <button
            type="button"
            onClick={onRestore}
            className="rounded-xl px-2.5 py-2 text-[11px] font-semibold text-[#234B54] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
            aria-label="Obnovit konverzaci"
            title="Obnovit konverzaci"
          >
            Obnovit
          </button>
        ) : (
          <button
            type="button"
            onClick={onArchive}
            className="rounded-xl p-2 text-[#7D8B82] hover:bg-[#FAF8F5] hover:text-[#2C4A3E] transition-colors cursor-pointer"
            aria-label="Archivovat konverzaci"
            title="Archivovat konverzaci"
          >
            <Archive size={17} />
          </button>
        )}
        <button
          onClick={onCall}
          className="rounded-xl p-2 text-[#7D8B82] hover:bg-[#FAF8F5] hover:text-[#2C4A3E] transition-colors cursor-pointer"
          aria-label="Hlasový hovor"
        >
          <Phone size={17} />
        </button>
        <button
          onClick={onVideoCall}
          className="rounded-xl p-2 text-[#7D8B82] hover:bg-[#FAF8F5] hover:text-[#2C4A3E] transition-colors cursor-pointer"
          aria-label="Videohovor"
        >
          <Video size={17} />
        </button>
      </div>
    </div>
  )
}
