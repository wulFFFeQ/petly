import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Avatar } from '../ui/Avatar'
import { useApp } from '../../context/AppContext'
import { getSelfAccount } from '../../lib/account'
import {
  ensureDefaultAvailability,
  ensureSeedServices,
  formatServicePrice,
  getAvailableSlotsForService,
  hasAnyAvailableSlotForService,
  isSlotAvailable,
  getAvailability,
  getAvailabilityExceptions,
  loadBookings,
  listBookableServices,
  requestBooking,
  type Booking,
  type ProfessionalService,
  type TimeSlot,
} from '../../lib/booking'
import { getProfessionalService } from '../../lib/booking'
import { loadProfessionalProfiles } from '../../lib/professional/storage'
import { BookingCalendar } from './BookingCalendar'
import { BookingConfirmation } from './BookingConfirmation'
import { BookingServiceCard } from './BookingServiceCard'

type Step = 'service' | 'pet' | 'slot' | 'note' | 'summary' | 'done'

const PET_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" fill="%23E8E4DC"><rect width="80" height="80" rx="40"/><circle cx="40" cy="34" r="14" fill="%23A3AEA7"/><ellipse cx="40" cy="62" rx="22" ry="14" fill="%23A3AEA7"/></svg>',
  )

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatSlotTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatSlotDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function BookingRequestModal({
  open,
  onClose,
  professionalId,
  initialServiceId,
  onContact,
}: {
  open: boolean
  onClose: () => void
  professionalId: string
  initialServiceId?: string
  onContact?: () => void
}) {
  const navigate = useNavigate()
  const { pets, showToast, upsertNotification, syncCalendarEvents, setActiveModal } = useApp()
  const profile = loadProfessionalProfiles().find((p) => p.id === professionalId)

  const [step, setStep] = useState<Step>(initialServiceId ? 'pet' : 'service')
  const [serviceId, setServiceId] = useState<string | null>(initialServiceId ?? null)
  const [petId, setPetId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayIso)
  const [slot, setSlot] = useState<TimeSlot | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<Booking | null>(null)
  const [slotError, setSlotError] = useState<string | null>(null)
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
    setSlotError(null)
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

  const hasHorizonSlots = useMemo(() => {
    if (!serviceId || !open) return true
    return hasAnyAvailableSlotForService(professionalId, serviceId, 14)
  }, [professionalId, serviceId, open])

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

    const service = getProfessionalService(selectedService.id)
    if (
      !service ||
      !isSlotAvailable({
        professionalId,
        service,
        startAt: slot.startAt,
        endAt: slot.endAt,
        availability: getAvailability(professionalId),
        exceptions: getAvailabilityExceptions(professionalId),
        bookings: loadBookings(),
      })
    ) {
      setSlotError('Tento termín už není dostupný. Vyberte prosím jiný.')
      setStep('slot')
      setSlot(null)
      return
    }

    setBusy(true)
    setSlotError(null)
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
      if (result.error === 'slot_unavailable' || result.error === 'overlap') {
        setSlotError('Tento termín už není dostupný. Vyberte prosím jiný.')
        setStep('slot')
        setSlot(null)
        return
      }
      showToast('Rezervace se nepodařila', result.message, 'error')
      return
    }
    setCreated(result.value)
    setStep('done')
  }

  const title =
    step === 'done'
      ? 'Hotovo'
      : step === 'summary'
        ? 'Souhrn'
        : step === 'note'
          ? 'Poznámka'
          : step === 'slot'
            ? 'Termín'
            : step === 'pet'
              ? 'Mazlíček'
              : 'Služba'

  return (
    <Modal open={open} onClose={handleClose} title={title} maxWidth="md" closeOnBackdrop={!busy}>
      {step === 'done' && created ? (
        <BookingConfirmation
          booking={created}
          onViewBooking={() => {
            handleClose()
            navigate(`/bookings/${created.id}`)
          }}
          onBackToProfile={() => {
            handleClose()
            navigate(`/professionals/${professionalId}`)
          }}
        />
      ) : null}

      {step === 'service' ? (
        <div className="space-y-3" data-testid="booking-step-service">
          {services.length === 0 ? (
            <p className="text-xs text-[#7D8B82]">
              Tento profesionál nemá rezervovatelné služby.
            </p>
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
            <div className="space-y-3 rounded-2xl border border-[#E8E4DC] bg-[#FAF8F5] px-4 py-5 text-center">
              <p className="text-sm font-semibold text-[#191E1B]">
                Nejdříve přidejte mazlíčka
              </p>
              <p className="text-xs text-[#7D8B82]">
                Rezervace je vždy navázaná na konkrétního mazlíčka.
              </p>
              <Button
                variant="primary"
                size="sm"
                data-testid="booking-add-pet-cta"
                onClick={() => {
                  handleClose()
                  setActiveModal('addPet')
                }}
              >
                Přidat mazlíčka
              </Button>
            </div>
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
                    className="flex w-full items-center gap-3 rounded-2xl border border-[#E8E4DC] bg-white px-3 py-3 text-left transition-colors hover:bg-[#FAF8F5]"
                  >
                    <Avatar src={p.image || PET_PLACEHOLDER} alt={p.name} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#191E1B]">{p.name}</p>
                      <p className="truncate text-xs text-[#7D8B82]">
                        {[p.type, p.breed].filter(Boolean).join(' · ')}
                      </p>
                    </div>
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
            {formatServicePrice(
              selectedService.price,
              selectedService.currency,
              selectedService.priceType,
            )}
          </p>
          {slotError ? (
            <p
              className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800"
              data-testid="booking-slot-unavailable"
            >
              {slotError}
            </p>
          ) : null}
          {!hasHorizonSlots ? (
            <div
              className="space-y-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3 py-4"
              data-testid="booking-no-availability"
            >
              <p className="text-sm text-[#4A564F]">
                Tento profesionál momentálně nemá dostupné termíny.
              </p>
              {onContact ? (
                <Button
                  variant="secondary"
                  size="sm"
                  data-testid="booking-contact-no-slots"
                  onClick={() => {
                    onContact()
                    handleClose()
                  }}
                >
                  Kontaktovat profesionála
                </Button>
              ) : null}
            </div>
          ) : (
            <BookingCalendar
              selectedDate={selectedDate}
              onSelectDate={(d) => {
                setSelectedDate(d)
                setSlot(null)
                setSlotError(null)
              }}
              slots={slots}
              selectedStartAt={slot?.startAt ?? null}
              onSelectSlot={(s) => {
                setSlot(s)
                setSlotError(null)
              }}
            />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep('pet')}>
              Zpět
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!slot || !hasHorizonSlots}
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
          <div className="space-y-3 rounded-2xl border border-[#E8E4DC] bg-[#FAF8F5] px-4 py-4 text-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
              Rezervace
            </p>
            <SummaryRow label="Profesionál" value={profile?.displayName ?? 'Profesionál'} />
            <SummaryRow label="Služba" value={selectedService.name} />
            <SummaryRow label="Mazlíček" value={selectedPet.name} />
            <SummaryRow label="Datum" value={formatSlotDate(slot.startAt)} />
            <SummaryRow label="Čas" value={formatSlotTime(slot.startAt)} />
            <SummaryRow label="Délka" value={`${selectedService.durationMinutes} min`} />
            <SummaryRow
              label="Cena"
              value={formatServicePrice(
                selectedService.price,
                selectedService.currency,
                selectedService.priceType,
              )}
            />
            {note.trim() ? <SummaryRow label="Poznámka" value={note.trim()} /> : null}
          </div>
          <p className="text-center text-[11px] text-[#7D8B82]">
            Rezervace bude potvrzena až profesionálem.
          </p>
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-[#7D8B82]">{label}</span>
      <span className="text-right text-xs font-semibold text-[#191E1B]">{value}</span>
    </div>
  )
}
