import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../../../context/AppContext'
import type {
  ApproxLocation,
  CreateLostAnnouncementInput,
  Pet,
  PublicBehavior,
  TemperamentHint,
} from '../../../types'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { Modal } from '../../ui/Modal'
import { OptionSelect } from '../../ui/OptionSelect'
import { LocationPicker } from './LocationPicker'

interface MarkLostModalProps {
  pet: Pet
  open: boolean
  onClose: () => void
  onCreated?: (announcementId: string) => void
}

const BEHAVIOR_OPTIONS = [
  { value: 'catch', label: 'Pokusit se ho odchytit' },
  { value: 'report_only', label: 'Nepokoušet se ho chytat, pouze nahlásit místo' },
  { value: 'situational', label: 'Záleží na situaci' },
]

const TEMPERAMENT_PEOPLE = [
  { value: '', label: 'Neuvedeno' },
  { value: 'friendly', label: 'Přátelský' },
  { value: 'fearful', label: 'Bojí se lidí' },
  { value: 'aggressive', label: 'Může být agresivní' },
  { value: 'uncertain', label: 'Nejisté' },
]

const TEMPERAMENT_ANIMALS = [
  { value: '', label: 'Neuvedeno' },
  { value: 'friendly', label: 'Přátelský' },
  { value: 'fearful', label: 'Bojí se' },
  { value: 'aggressive', label: 'Může být agresivní' },
  { value: 'uncertain', label: 'Nejisté' },
]

function toLocalInputValue(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function MarkLostModal({ pet, open, onClose, onCreated }: MarkLostModalProps) {
  const { createLostAnnouncement, showToast } = useApp()
  const [lastSeen, setLastSeen] = useState<ApproxLocation | null>(null)
  const [seenAtLocal, setSeenAtLocal] = useState(toLocalInputValue)
  const [knowsArea, setKnowsArea] = useState<'yes' | 'no' | ''>('')
  const [possibleArea, setPossibleArea] = useState<ApproxLocation | null>(null)
  const [behavior, setBehavior] = useState<PublicBehavior | ''>('')
  const [instructions, setInstructions] = useState('')
  const [respondsToName, setRespondsToName] = useState(pet.name)
  const [nickname, setNickname] = useState('')
  const [allowContact, setAllowContact] = useState(true)
  const [optionalOpen, setOptionalOpen] = useState(false)
  const [reactionPeople, setReactionPeople] = useState('')
  const [reactionAnimals, setReactionAnimals] = useState('')
  const [specialCaution, setSpecialCaution] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit =
    !!lastSeen &&
    !!seenAtLocal &&
    (knowsArea === 'yes' || knowsArea === 'no') &&
    !!behavior &&
    respondsToName.trim().length > 0 &&
    (knowsArea === 'no' || !!possibleArea)

  const handleSubmit = () => {
    if (!canSubmit || !lastSeen || !behavior || (knowsArea === 'yes' && !possibleArea)) return
    setSubmitting(true)
    const seenAt = new Date(seenAtLocal)
    const input: CreateLostAnnouncementInput = {
      lastSeen: {
        ...lastSeen,
        seenAt: Number.isNaN(seenAt.getTime()) ? new Date().toISOString() : seenAt.toISOString(),
      },
      knowsPossibleArea: knowsArea === 'yes',
      possibleArea: knowsArea === 'yes' && possibleArea ? possibleArea : undefined,
      publicBehavior: behavior,
      importantInstructions: instructions.trim() || undefined,
      respondsToName: respondsToName.trim(),
      nickname: nickname.trim() || undefined,
      allowAppContact: allowContact,
      reactionToPeople: (reactionPeople || undefined) as TemperamentHint | undefined,
      reactionToAnimals: (reactionAnimals || undefined) as TemperamentHint | undefined,
      specialCaution: specialCaution.trim() || undefined,
    }
    const id = createLostAnnouncement(pet.id, input)
    setSubmitting(false)
    if (id) {
      onCreated?.(id)
      onClose()
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ztratil se!"
      subtitle={`${pet.name} — rychlé oznámení pro veřejnost`}
      maxWidth="lg"
      closeOnBackdrop={false}
    >
      <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
        <div className="rounded-xl border border-red-200/70 bg-red-50/60 px-3 py-2 text-xs text-red-900/80">
          Veřejně se nezobrazí adresa domova, telefon, e-mail ani mikročip — jen bezpečná přibližná
          lokalita.
        </div>

        <LocationPicker
          value={lastSeen}
          onChange={setLastSeen}
          onError={(title, description) => showToast(title, description, 'info')}
        />

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#7D8B82]">
            Přibližné datum a čas posledního spatření
          </label>
          <Input
            type="datetime-local"
            value={seenAtLocal}
            onChange={(e) => setSeenAtLocal(e.target.value)}
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#7D8B82]">
            Víte, kde by se mohl/a nacházet?
          </p>
          <div className="flex gap-2">
            {(['yes', 'no'] as const).map((option) => (
              <Button
                key={option}
                type="button"
                variant={knowsArea === option ? 'primary' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setKnowsArea(option)}
              >
                {option === 'yes' ? 'Ano' : 'Ne'}
              </Button>
            ))}
          </div>
        </div>

        {knowsArea === 'yes' && (
          <LocationPicker
            value={possibleArea}
            onChange={setPossibleArea}
            label="Přibližná oblast, kde by se mohl/a nacházet"
            compact
            onError={(title, description) => showToast(title, description, 'info')}
          />
        )}

        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-[#7D8B82]">
            Pokud ho někdo uvidí
          </p>
          <OptionSelect
            value={behavior}
            onChange={(v) => setBehavior(v as PublicBehavior)}
            options={BEHAVIOR_OPTIONS}
            placeholder="Jak se má veřejnost zachovat?"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#7D8B82]">
            Důležité pokyny <span className="font-medium normal-case tracking-normal">(volitelné)</span>
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={2}
            placeholder="Např. Neběhat za ním. Bojí se lidí."
            className="w-full rounded-xl border border-[#E8E4DC] bg-white px-3 py-2 text-sm text-[#191E1B] outline-none focus:border-[#2C4A3E]"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#7D8B82]">
              Na jaké jméno slyší?
            </label>
            <Input
              value={respondsToName}
              onChange={(e) => setRespondsToName(e.target.value)}
              placeholder={pet.name}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#7D8B82]">
              Přezdívka <span className="font-medium normal-case tracking-normal">(volitelné)</span>
            </label>
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Volitelné"
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3 py-3">
          <input
            type="checkbox"
            checked={allowContact}
            onChange={(e) => setAllowContact(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-semibold text-[#191E1B]">
              Povolit kontakt přes LOVED & KNOWN
            </span>
            <span className="mt-0.5 block text-xs text-[#7D8B82]">
              Nálezce neuvidí váš telefon ani e-mail. Komunikace probíhá anonymně v aplikaci.
            </span>
          </span>
        </label>

        <button
          type="button"
          className="flex w-full items-center justify-between rounded-xl border border-[#E8E4DC] px-3 py-2.5 text-left text-sm font-semibold text-[#4A564F] hover:bg-[#FAF8F5] cursor-pointer"
          onClick={() => setOptionalOpen((v) => !v)}
        >
          Další informace (volitelné)
          {optionalOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {optionalOpen && (
          <div className="space-y-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5]/80 p-3">
            <OptionSelect
              label="Jak reaguje na lidi?"
              value={reactionPeople}
              onChange={setReactionPeople}
              options={TEMPERAMENT_PEOPLE}
            />
            <OptionSelect
              label="Jak reaguje na ostatní zvířata?"
              value={reactionAnimals}
              onChange={setReactionAnimals}
              options={TEMPERAMENT_ANIMALS}
            />
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#7D8B82]">
                Je potřeba při nálezu zvláštní opatrnost?
              </label>
              <textarea
                value={specialCaution}
                onChange={(e) => setSpecialCaution(e.target.value)}
                rows={2}
                placeholder="Volitelné"
                className="w-full rounded-xl border border-[#E8E4DC] bg-white px-3 py-2 text-sm text-[#191E1B] outline-none focus:border-[#2C4A3E]"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onClose}>
          Zrušit
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={!canSubmit || submitting}
          onClick={handleSubmit}
          className="font-bold"
        >
          Zveřejnit oznámení
        </Button>
      </div>
    </Modal>
  )
}
