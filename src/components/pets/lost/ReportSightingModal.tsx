import { useState } from 'react'
import { useApp } from '../../../context/AppContext'
import {
  getOrCreateReporterAnonymousId,
  resolveObservedAt,
} from '../../../lib/lostPet'
import { PET_IMAGE_ACCEPT, readImageFileAsDataUrl, takeSelectedFiles } from '../../../lib/readImageFile'
import type { ApproxLocation, ObservedAtPreset, SightingActivity } from '../../../types'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import { OptionSelect } from '../../ui/OptionSelect'
import { LocationPicker } from './LocationPicker'

interface ReportSightingModalProps {
  open: boolean
  onClose: () => void
  announcementId: string
  petName: string
}

const TIME_OPTIONS = [
  { value: 'now', label: 'Právě teď' },
  { value: 'under_hour', label: 'Před méně než hodinou' },
  { value: 'today', label: 'Dnes' },
  { value: 'custom', label: 'Vlastní čas' },
]

const ACTIVITY_OPTIONS = [
  { value: 'running', label: 'Běžel' },
  { value: 'walking', label: 'Šel' },
  { value: 'hiding', label: 'Schovával se' },
  { value: 'with_someone', label: 'Byl s někým' },
  { value: 'unknown', label: 'Nevím' },
]

function toLocalInputValue(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function ReportSightingModal({
  open,
  onClose,
  announcementId,
  petName,
}: ReportSightingModalProps) {
  const { submitLostSighting, showToast } = useApp()
  const [location, setLocation] = useState<ApproxLocation | null>(null)
  const [timePreset, setTimePreset] = useState<ObservedAtPreset>('now')
  const [customTime, setCustomTime] = useState(toLocalInputValue)
  const [activity, setActivity] = useState<SightingActivity | ''>('')
  const [note, setNote] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | undefined>()
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = !!location && !!activity

  const handlePhoto = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    try {
      setPhotoUrl(await readImageFileAsDataUrl(file))
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'read_failed'
      if (reason === 'unsupported_type') {
        showToast('Nepodporovaný formát', 'Použijte JPG, PNG nebo WEBP.', 'info')
      } else if (reason === 'too_large') {
        showToast('Soubor je příliš velký', 'Maximální velikost je 25 MB.', 'info')
      } else {
        showToast('Nahrání se nezdařilo', undefined, 'info')
      }
    }
  }

  const handleSubmit = () => {
    if (!location || !activity) return
    setSubmitting(true)
    const customIso =
      timePreset === 'custom' ? new Date(customTime).toISOString() : undefined
    const id = submitLostSighting(announcementId, {
      reporterAnonymousId: getOrCreateReporterAnonymousId(),
      location,
      observedAt: resolveObservedAt(timePreset, customIso),
      observedAtPreset: timePreset,
      activity,
      note: note.trim() || undefined,
      photoUrl,
    })
    setSubmitting(false)
    if (id) onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Viděl/a jsem ho"
      subtitle={`Krátké hlášení o ${petName}`}
      maxWidth="md"
      closeOnBackdrop={false}
    >
      <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
        <LocationPicker
          value={location}
          onChange={setLocation}
          label="Kde jste ho viděl/a?"
          compact
          onError={(title, description) => showToast(title, description, 'info')}
        />

        <OptionSelect
          label="Kdy jste ho viděl/a?"
          value={timePreset}
          onChange={(v) => setTimePreset(v as ObservedAtPreset)}
          options={TIME_OPTIONS}
        />

        {timePreset === 'custom' && (
          <input
            type="datetime-local"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            className="h-10 w-full rounded-xl border border-[#E8E4DC] px-3 text-sm"
          />
        )}

        <OptionSelect
          label="Co dělal?"
          value={activity}
          onChange={(v) => setActivity(v as SightingActivity)}
          options={ACTIVITY_OPTIONS}
          placeholder="Vyberte…"
        />

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#7D8B82]">
            Poznámka (volitelné)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
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
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onClose}>
          Zrušit
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={!canSubmit || submitting}
          onClick={handleSubmit}
        >
          Odeslat hlášení
        </Button>
      </div>
    </Modal>
  )
}
