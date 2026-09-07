import { useState } from 'react'
import { useApp } from '../../../context/AppContext'
import { getOrCreateReporterAnonymousId } from '../../../lib/lostPet'
import { PET_IMAGE_ACCEPT, readImageFileAsDataUrl, takeSelectedFiles } from '../../../lib/readImageFile'
import type { ApproxLocation, FoundSafety } from '../../../types'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import { OptionSelect } from '../../ui/OptionSelect'
import { LocationPicker } from './LocationPicker'

interface ReportFoundModalProps {
  open: boolean
  onClose: () => void
  announcementId: string
  petName: string
  onContactOpened?: (conversationId: string) => void
}

const SAFETY_OPTIONS = [
  { value: 'with_me', label: 'Ano, je u mě' },
  { value: 'safe_elsewhere', label: 'Je v bezpečí na jiném místě' },
  { value: 'needs_vet', label: 'Potřebuje veterinární pomoc' },
  { value: 'unknown', label: 'Nevím' },
]

export function ReportFoundModal({
  open,
  onClose,
  announcementId,
  petName,
  onContactOpened,
}: ReportFoundModalProps) {
  const { submitLostFoundReport, showToast } = useApp()
  const [hasPet, setHasPet] = useState<'yes' | 'no' | ''>('')
  const [location, setLocation] = useState<ApproxLocation | null>(null)
  const [safety, setSafety] = useState<FoundSafety | ''>('')
  const [canKeep, setCanKeep] = useState<'yes' | 'no' | ''>('')
  const [note, setNote] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | undefined>()
  const [submitting, setSubmitting] = useState(false)

  const canSubmit =
    (hasPet === 'yes' || hasPet === 'no') &&
    !!location &&
    !!safety &&
    (canKeep === 'yes' || canKeep === 'no')

  const handlePhoto = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    try {
      setPhotoUrl(await readImageFileAsDataUrl(file))
    } catch {
      showToast('Nahrání se nezdařilo', undefined, 'info')
    }
  }

  const handleSubmit = () => {
    if (!canSubmit || !location || !safety) return
    setSubmitting(true)
    const result = submitLostFoundReport(announcementId, {
      reporterAnonymousId: getOrCreateReporterAnonymousId(),
      location,
      observedAt: new Date().toISOString(),
      hasPetWithThem: hasPet === 'yes',
      safetyStatus: safety,
      canKeepSafely: canKeep === 'yes',
      note: note.trim() || undefined,
      photoUrl,
    })
    setSubmitting(false)
    if (result) {
      onContactOpened?.(result.conversationId)
      onClose()
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Našel/a jsem ho"
      subtitle={`Kontaktovat majitele ${petName} přes LOVED & KNOWN`}
      maxWidth="md"
      closeOnBackdrop={false}
    >
      <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#7D8B82]">
            Máte mazlíčka právě u sebe?
          </p>
          <div className="flex gap-2">
            {(['yes', 'no'] as const).map((option) => (
              <Button
                key={option}
                type="button"
                variant={hasPet === option ? 'primary' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setHasPet(option)}
              >
                {option === 'yes' ? 'Ano' : 'Ne'}
              </Button>
            ))}
          </div>
        </div>

        <LocationPicker
          value={location}
          onChange={setLocation}
          label="Kde jste ho našel/a?"
          compact
          onError={(title, description) => showToast(title, description, 'info')}
        />

        <OptionSelect
          label="Je nyní v bezpečí?"
          value={safety}
          onChange={(v) => setSafety(v as FoundSafety)}
          options={SAFETY_OPTIONS}
          placeholder="Vyberte…"
        />

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#7D8B82]">
            Můžete ho bezpečně držet u sebe?
          </p>
          <div className="flex gap-2">
            {(['yes', 'no'] as const).map((option) => (
              <Button
                key={option}
                type="button"
                variant={canKeep === option ? 'primary' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setCanKeep(option)}
              >
                {option === 'yes' ? 'Ano' : 'Ne'}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#7D8B82]">
            Poznámka (volitelné)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Např. Luna je u mě a je v pořádku."
            className="w-full rounded-xl border border-[#E8E4DC] px-3 py-2 text-sm outline-none focus:border-[#2C4A3E]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#7D8B82]">
            Fotografie (volitelné)
          </label>
          <input
            type="file"
            accept={PET_IMAGE_ACCEPT}
            onChange={(e) => void handlePhoto(takeSelectedFiles(e.currentTarget))}
            className="block w-full text-xs text-[#7D8B82]"
          />
          {photoUrl && (
            <img src={photoUrl} alt="" className="mt-2 h-24 rounded-xl object-cover" />
          )}
        </div>

        <p className="rounded-xl bg-[#FAF4E6] px-3 py-2 text-xs text-[#7A6230]">
          Telefon, e-mail ani adresa se majiteli nezobrazí. Kontakt probíhá anonymně přes LOVED &amp;
          KNOWN.
        </p>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onClose}>
          Zrušit
        </Button>
        <Button
          type="button"
          variant="gold"
          disabled={!canSubmit || submitting}
          onClick={handleSubmit}
          className="font-bold"
        >
          Kontaktovat majitele
          <span className="text-[10px] font-normal opacity-90">· bezpečný kontakt</span>
        </Button>
      </div>
    </Modal>
  )
}
