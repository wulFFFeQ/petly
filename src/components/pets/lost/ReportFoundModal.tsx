import { useState } from 'react'
import { useApp } from '../../../context/AppContext'
import {
  getOrCreateReporterAnonymousId,
  normalizeSharedPhone,
  resolveObservedAt,
} from '../../../lib/lostPet'
import { PET_IMAGE_ACCEPT, readImageFileAsDataUrl, takeSelectedFiles } from '../../../lib/readImageFile'
import type { ApproxLocation, FoundSafety, ObservedAtPreset } from '../../../types'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { Modal } from '../../ui/Modal'
import { OptionSelect } from '../../ui/OptionSelect'
import { LocationPicker } from './LocationPicker'

interface ReportFoundModalProps {
  open: boolean
  onClose: () => void
  announcementId: string
  petName: string
  /** When false, submit report only — no SafeContactChannel / Messages thread. */
  allowAppContact?: boolean
  onContactOpened?: (conversationId: string) => void
}

const SAFETY_OPTIONS = [
  { value: 'with_me', label: 'Ano, je u mě' },
  { value: 'safe_elsewhere', label: 'Je v bezpečí na jiném místě' },
  { value: 'needs_vet', label: 'Potřebuje veterinární pomoc' },
  { value: 'unknown', label: 'Nevím' },
]

const TIME_OPTIONS = [
  { value: 'now', label: 'Právě teď' },
  { value: 'under_hour', label: 'Před méně než hodinou' },
  { value: 'today', label: 'Dnes' },
  { value: 'custom', label: 'Vlastní čas' },
]

function toLocalInputValue(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function ReportFoundModal({
  open,
  onClose,
  announcementId,
  petName,
  allowAppContact = true,
  onContactOpened,
}: ReportFoundModalProps) {
  const { submitLostFoundReport, showToast } = useApp()
  const [step, setStep] = useState<'details' | 'contact'>('details')
  const [hasPet, setHasPet] = useState<'yes' | 'no' | ''>('')
  const [location, setLocation] = useState<ApproxLocation | null>(null)
  const [timePreset, setTimePreset] = useState<ObservedAtPreset>('now')
  const [customTime, setCustomTime] = useState(toLocalInputValue)
  const [safety, setSafety] = useState<FoundSafety | ''>('')
  const [canKeep, setCanKeep] = useState<'yes' | 'no' | ''>('')
  const [note, setNote] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | undefined>()
  const [sharePhone, setSharePhone] = useState<'yes' | 'no' | ''>('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmitDetails =
    (hasPet === 'yes' || hasPet === 'no') &&
    !!location &&
    !!safety &&
    (canKeep === 'yes' || canKeep === 'no')

  const canSubmitContact =
    sharePhone === 'no' || (sharePhone === 'yes' && !!normalizeSharedPhone(phone))

  const resetAndClose = () => {
    setStep('details')
    setSharePhone('')
    setPhone('')
    onClose()
  }

  const handlePhoto = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    try {
      setPhotoUrl(await readImageFileAsDataUrl(file))
    } catch {
      showToast('Nahrání se nezdařilo', undefined, 'info')
    }
  }

  const observedAtIso = () => {
    const customIso =
      timePreset === 'custom' ? new Date(customTime).toISOString() : undefined
    return resolveObservedAt(timePreset, customIso)
  }

  const finishSubmit = (withPhone: boolean) => {
    if (!location || !safety) return
    if (withPhone && !normalizeSharedPhone(phone)) {
      showToast('Neplatné číslo', 'Zadejte telefonní číslo (alespoň 9 číslic).', 'info')
      return
    }
    setSubmitting(true)
    const result = submitLostFoundReport(announcementId, {
      reporterAnonymousId: getOrCreateReporterAnonymousId(),
      location,
      observedAt: observedAtIso(),
      hasPetWithThem: hasPet === 'yes',
      safetyStatus: safety,
      canKeepSafely: canKeep === 'yes',
      note: note.trim() || undefined,
      photoUrl,
      sharePhoneConsent: withPhone,
      sharedPhone: withPhone ? phone : undefined,
    })
    setSubmitting(false)
    if (result) {
      if (result.conversationId) onContactOpened?.(result.conversationId)
      resetAndClose()
    }
  }

  const detailsForm = (
    <div className="min-h-0 max-h-[60vh] space-y-4 overflow-y-auto pr-1">
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
        label="Kdy jste ho našel/a?"
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
          placeholder={`Např. ${petName} je u mě a je v pořádku.`}
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

      {allowAppContact ? (
        <p className="rounded-xl bg-[#FAF4E6] px-3 py-2 text-xs text-[#7A6230]">
          Ve výchozím stavu se telefon ani e-mail majiteli nezobrazí. V dalším kroku můžete
          dobrovolně nabídnout své číslo — majitel ho uvidí až po svém souhlasu.
        </p>
      ) : (
        <p className="rounded-xl bg-[#FAF8F5] px-3 py-2 text-xs text-[#5A6660]">
          Majitel momentálně nepřijímá přímý chat. Vaše hlášení nálezu se mu stejně doručí —
          identita zůstává anonymní.
        </p>
      )}
    </div>
  )

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title={
        step === 'details'
          ? 'Našel/a jsem ho'
          : 'Předat telefon majiteli?'
      }
      subtitle={
        step === 'details'
          ? allowAppContact
            ? `Nahlásit nález ${petName} a bezpečně kontaktovat majitele`
            : `Nahlásit nález ${petName} majiteli`
          : 'Volitelné — výchozí je anonymní bezpečný kontakt'
      }
      maxWidth="md"
      closeOnBackdrop={false}
    >
      {step === 'details' ? (
        <>
          {detailsForm}
          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[#E8E4DC] pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={resetAndClose}>
              Zrušit
            </Button>
            {allowAppContact ? (
              <Button
                type="button"
                variant="gold"
                disabled={!canSubmitDetails}
                onClick={() => setStep('contact')}
                className="font-bold"
              >
                Pokračovat
              </Button>
            ) : (
              <Button
                type="button"
                variant="gold"
                disabled={!canSubmitDetails || submitting}
                onClick={() => finishSubmit(false)}
                className="font-bold"
              >
                Odeslat hlášení nálezu
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-[#4A564F]">
              Chcete majiteli předat své telefonní číslo? Je to na vás. Pokud zvolíte ne, komunikace
              zůstane anonymní přes LOVED &amp; KNOWN — stejně jako teď.
            </p>

            <div className="flex gap-2">
              {(['yes', 'no'] as const).map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={sharePhone === option ? 'primary' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setSharePhone(option)}
                >
                  {option === 'yes' ? 'Ano, předat číslo' : 'Ne, zůstat anonymní'}
                </Button>
              ))}
            </div>

            {sharePhone === 'yes' && (
              <div className="space-y-2 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3">
                <Input
                  label="Vaše telefonní číslo"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+420 …"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <p className="text-[11px] leading-relaxed text-[#7D8B82]">
                  Číslo se majiteli zobrazí až poté, co to výslovně odsouhlasí. Do té doby zůstává
                  skryté.
                </p>
              </div>
            )}

            {sharePhone === 'no' && (
              <p className="rounded-xl bg-[#EBF2EE] px-3 py-2 text-xs text-[#2C4A3E]">
                Pokračujete v bezpečném anonymním chatu. Telefon se neodešle.
              </p>
            )}
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[#E8E4DC] pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setStep('details')}>
              Zpět
            </Button>
            <Button
              type="button"
              variant="gold"
              disabled={!canSubmitContact || submitting}
              onClick={() => finishSubmit(sharePhone === 'yes')}
              className="font-bold"
            >
              {sharePhone === 'yes' ? 'Odeslat a nabídnout číslo' : 'Kontaktovat majitele'}
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}
