import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { defaultConnectIntro, saveConnectMessageDraft } from '../../lib/connections'
import type { DiscoverPet } from '../../types'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

interface ConnectComposeModalProps {
  open: boolean
  onClose: () => void
  pet: DiscoverPet
}

export function ConnectComposeModal({ open, onClose, pet }: ConnectComposeModalProps) {
  const navigate = useNavigate()
  const { showToast } = useApp()
  const [text, setText] = useState(() => defaultConnectIntro(pet.name))

  useEffect(() => {
    if (open) setText(defaultConnectIntro(pet.name))
  }, [open, pet.name])

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed) {
      showToast('Napište zprávu', 'Před odesláním upravte nebo potvrďte text.', 'info')
      return
    }
    saveConnectMessageDraft({ petId: pet.id, text: trimmed })
    showToast(
      'Žádost o propojení',
      pet.ownerName
        ? `Otevíráme konverzaci s ${pet.ownerName}.`
        : 'Otevíráme konverzaci ve zprávách.',
      'gold',
    )
    onClose()
    navigate(`/messages?contactPetId=${encodeURIComponent(pet.id)}`)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Oslovit a propojit se"
      subtitle={`Zpráva majiteli ${pet.name}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        <p className="text-xs text-[#7D8B82]">
          Kontakt vznikne až odesláním. Osobní údaje se nesdílí automaticky.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="w-full resize-y rounded-xl border border-[#E8E4DC] bg-white px-3.5 py-3 text-sm text-[#191E1B] outline-none focus:border-[#2C4A3E]/40 focus:ring-2 focus:ring-[#2C4A3E]/15"
          aria-label="Text žádosti o propojení"
        />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Zrušit
          </Button>
          <Button variant="primary" size="sm" onClick={handleSend}>
            Odeslat a otevřít zprávy
          </Button>
        </div>
      </div>
    </Modal>
  )
}
