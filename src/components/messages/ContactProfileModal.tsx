import { ExternalLink, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Conversation, DiscoverPet } from '../../types'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

interface ContactProfileModalProps {
  conversation: Conversation
  contactPet?: DiscoverPet
  open: boolean
  onClose: () => void
}

export function ContactProfileModal({
  conversation: active,
  contactPet,
  open,
  onClose,
}: ContactProfileModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={active.name}
      subtitle="Profil uživatele"
      maxWidth="sm"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3.5">
          <Avatar
            src={active.avatar}
            alt={active.name}
            size="lg"
            status={active.online ? 'online' : 'offline'}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-base font-bold text-[#191E1B]">{active.name}</h3>
              {active.role?.includes('veterinář') && (
                <ShieldCheck size={15} className="text-[#2C4A3E]" />
              )}
            </div>
            <p className="mt-0.5 text-xs text-[#7D8B82]">
              {active.online ? 'Právě online' : 'Naposledy aktivní před 2 h'}
            </p>
            <Badge variant="outline" size="sm" className="mt-2">
              {active.contactType === 'vet'
                ? 'Veterinář'
                : active.contactType === 'trainer'
                  ? 'Trenér'
                  : 'Komunita'}
            </Badge>
          </div>
        </div>

        {contactPet ? (
          <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3.5 space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Mazlíček tohoto uživatele
              </p>
              {active.role && (
                <Link
                  to={`/discover/${contactPet.id}`}
                  onClick={onClose}
                  className="mt-1 inline-flex text-sm font-semibold text-[#234B54] hover:text-[#B8934A] hover:underline underline-offset-2 transition-colors"
                >
                  {active.role}
                </Link>
              )}
            </div>

            <Link
              to={`/discover/${contactPet.id}`}
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl border border-[#E8E4DC] bg-white p-2.5 transition-colors hover:border-[#234B54]/30 hover:bg-white"
            >
              <img
                src={contactPet.image}
                alt={contactPet.name}
                className="h-14 w-14 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#191E1B]">{contactPet.name}</p>
                <p className="mt-0.5 truncate text-[11px] text-[#5A6660]">
                  {contactPet.breed}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold text-[#234B54]">
                  Otevřít profil mazlíčka →
                </p>
              </div>
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
              Kontext
            </p>
            <p className="mt-0.5 text-sm font-medium text-[#234B54]">{active.petContext}</p>
            {active.role && (
              <p className="mt-2 text-xs text-[#5A6660]">{active.role}</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 pt-1">
          {contactPet && (
            <Link
              to={`/discover/${contactPet.id}`}
              onClick={onClose}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E8E4DC] bg-white px-3 py-2.5 text-xs font-semibold text-[#234B54] hover:border-[#234B54]/30 hover:bg-[#FAF8F5] transition-colors"
            >
              <ExternalLink size={13} />
              Otevřít profil {contactPet.name}
            </Link>
          )}
          <Button variant="primary" size="sm" fullWidth onClick={onClose}>
            Zpět ke konverzaci
          </Button>
        </div>
      </div>
    </Modal>
  )
}
