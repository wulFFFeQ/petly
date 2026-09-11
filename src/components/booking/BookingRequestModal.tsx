import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useApp } from '../../context/AppContext'
import { getSelfAccount } from '../../lib/account'
import {
  ensureDefaultAvailability,
  ensureSeedServices,
  formatServicePrice,
  getAvailableSlotsForService,
  listBookableServices,
  requestBooking,
  type Booking,
  type ProfessionalService,
  type TimeSlot,
} from '../../lib/booking'
import { loadProfessionalProfiles } from '../../lib/professional/storage'
import { BookingCalendar } from './BookingCalendar'
import { BookingConfirmation } from './BookingConfirmation'
import { BookingServiceCard } from './BookingServiceCard'

type Step = 'service' | 'pet' | 'slot' | 'note' | 'summary' | 'done'

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function BookingRequestModal({
  open,
  onClose,
  professionalId,
  initialServiceId,
}: {
  open: boolean
  onClose: () => void
  professionalId: string
  initialServiceId?: string
}) {
  const { pets, showToast, upsertNotification, syncCalendarEvents } = useApp()
  const profile = loadProfessionalProfiles().find((p) => p.id === professionalId)

  const [step, setStep] = useState<Step>(initialServiceId ? 'pet' : 'service')
  const [serviceId, setServiceId] = useState<string | null>(initialServiceId ?? null)
  const [petId, setPetId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayIso)
  const [slot, setSlot] = useState<TimeSlot | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<Booking | null>(null)
  const [clientRequestId, setClientRequestId] = useState(
    () => `cr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  )

  useEffect(() => {
    if (!open) return
    setStep(initialServiceId ? 'pet' : 'service')
    setServiceId(initialServiceId ?? null)
    setPetId(null)
    setSlot(null)
    setNote('')
    setBusy(false)
    setCreated(null)
    setSelectedDate(todayIso())
    setClientRequestId(`cr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
  }, [open, initialServiceId])

  const services = useMemo(() => {
    if (!profile || !open) return [] as ProfessionalService[]
    ensureSeedServices(professionalId, profile.type)
    ensureDefaultAvailability(professionalId)
    return listBookableServices(professionalId)
  }, [professionalId, profile, open])

  const selectedService = services.find((s) => s.id === serviceId) ?? null
  const selectedPet = pets.find((p) => p.id === petId) ?? null

  const slots = useMemo(() => {
    if (!serviceId || !open) return []
    return getAvailableSlotsForService(professionalId, serviceId, selectedDate)
  }, [professionalId, serviceId, selectedDate, open])

  const handleClose = () => {
    onClose()
  }

  const submit = () => {
    if (busy || !selectedService || !selectedPet || !slot) return
    const self = getSelfAccount()
    if (!self) {
      showToast('Přihlášení', 'Pro rezervaci je potřeba účet majitele.', 'error')
      return
    }
    setBusy(true)
    const result = requestBooking(
      {
        ownerAccountId: self.id,
        professionalId,
        serviceId: selectedService.id,
        petId: selectedPet.id,
        startAt: slot.startAt,
        note: note.trim() || undefined,
        clientRequestId,
        petName: selectedPet.name,
        professionalName: profile?.displayName,
        ownerDisplayName: self.displayName,
        petExists: true,
      },
      {
        upsertNotification,
        syncCalendar: syncCalendarEvents,
      },
    )
    setBusy(false)
    if (!result.ok) {
      showToast('Rezervace se nepodařila', result.message, 'error')
      return
    }
    setCreated(result.value)
    setStep('done')
    showToast('Žádost odeslána', 'Profesionál obdrží notifikaci.', 'success')
  }

  const title =
    step === 'done'
      ? 'Hotovo'
      : step === 'summary'
        ? 'Souhrn rezervace'
        : step === 'note'
          ? 'Poznámka'
          : step === 'slot'
            ? 'Vyberte termín'
            : step === 'pet'
              ? 'Vyberte mazlíčka'
              : 'Vyberte službu'

  return (
    <Modal open={open} onClose={handleClose} title={title} maxWidth="md" closeOnBackdrop={!busy}>
      {step === 'done' && created ? (
        <BookingConfirmation booking={created} onClose={handleClose} />
      ) : null}

      {step === 'service' ? (
        <div className="space-y-3" data-testid="booking-step-service">
          {services.length === 0 ? (
            <p className="text-xs text-[#7D8B82]">Tento profesionál nemá rezervovatelné služby.</p>
          ) : (
            services.map((s) => (
              <BookingServiceCard
                key={s.id}
                service={s}
                onBook={(svc) => {
                  setServiceId(svc.id)
                  setStep('pet')
                }}
              />
            ))
          )}
        </div>
      ) : null}

      {step === 'pet' ? (
        <div className="space-y-3" data-testid="booking-step-pet">
          {pets.length === 0 ? (
            <p className="text-xs text-[#7D8B82]">Nejdříve přidejte mazlíčka.</p>
          ) : (
            <ul className="space-y-2">
              {pets.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    data-testid={`booking-pet-${p.id}`}
                    onClick={() => {
                      setPetId(p.id)
                      setStep('slot')
                    }}
                    className="w-full rounded-xl border border-[#E8E4DC] bg-white px-4 py-3 text-left text-sm font-semibold text-[#191E1B] hover:bg-[#FAF8F5]"
                  >
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!initialServiceId ? (
            <Button variant="ghost" size="sm" onClick={() => setStep('service')}>
              Zpět
            </Button>
          ) : null}
        </div>
      ) : null}

      {step === 'slot' && selectedService ? (
        <div className="space-y-3" data-testid="booking-step-slot">
          <p className="text-xs text-[#7D8B82]">
            {selectedService.name} · {selectedService.durationMinutes} min ·{' '}
            {formatServicePrice(selectedService.price, selectedService.currency)}
          </p>
          <BookingCalendar
            selectedDate={selectedDate}
            onSelectDate={(d) => {
              setSelectedDate(d)
              setSlot(null)
            }}
            slots={slots}
            selectedStartAt={slot?.startAt ?? null}
            onSelectSlot={setSlot}
          />
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep('pet')}>
              Zpět
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!slot}
              onClick={() => setStep('note')}
              data-testid="booking-slot-continue"
            >
              Pokračovat
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'note' ? (
        <div className="space-y-3" data-testid="booking-step-note">
          <label className="block text-xs font-semibold text-[#4A564F]">
            Volitelná poznámka
            <textarea
              className="mt-1.5 w-full rounded-xl border border-[#E8E4DC] bg-white px-3 py-2 text-sm text-[#191E1B] outline-none focus:border-[#2C4A3E]"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Např. důvod návštěvy (bez citlivých zdravotních údajů)."
              data-testid="booking-note-input"
            />
          </label>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep('slot')}>
              Zpět
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setStep('summary')}
              data-testid="booking-note-continue"
            >
              Pokračovat
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'summary' && selectedService && selectedPet && slot ? (
        <div className="space-y-4" data-testid="booking-step-summary">
          <div className="space-y-1 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-4 py-3 text-sm">
            <p className="font-semibold text-[#191E1B]">{selectedService.name}</p>
            <p className="text-xs text-[#4A564F]">{selectedPet.name}</p>
            <p className="text-xs text-[#4A564F]">
              {new Date(slot.startAt).toLocaleString('cs-CZ')}
            </p>
            <p className="text-xs text-[#4A564F]">
              {formatServicePrice(selectedService.price, selectedService.currency)}
            </p>
            {note.trim() ? (
              <p className="text-xs text-[#7D8B82]">Poznámka: {note.trim()}</p>
            ) : null}
            <p className="pt-2 text-[10px] text-[#A3AEA7]">
              Platba zatím neprobíhá. Cena je pouze informativní.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep('note')}>
              Zpět
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={busy}
              onClick={submit}
              data-testid="booking-submit"
            >
              Požádat o rezervaci
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
