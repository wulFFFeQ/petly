import type { ProfessionalService } from '../../lib/booking'
import { formatServicePrice, isServiceBookable } from '../../lib/booking'
import { Button } from '../ui/Button'

export function BookingServiceCard({
  service,
  onBook,
  onContact,
  showActions = true,
  nextAvailableLabel,
}: {
  service: ProfessionalService
  onBook?: (service: ProfessionalService) => void
  onContact?: () => void
  showActions?: boolean
  /** Public-safe label e.g. "Dnes 14:00" — never include exception reasons. */
  nextAvailableLabel?: string | null
}) {
  const canBook = isServiceBookable(service)

  return (
    <div
      className="rounded-xl border border-[#E8E4DC] bg-white px-4 py-3"
      data-testid={`booking-service-card-${service.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#191E1B]">
            {service.name}
            {service.isDemo ? (
              <span
                className="ml-2 text-[10px] font-bold uppercase tracking-wide text-[#B8934A]"
                data-testid={`public-service-demo-${service.id}`}
              >
                DEMO
              </span>
            ) : null}
          </p>
          {service.description ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-[#7D8B82]">{service.description}</p>
          ) : null}
          <p className="mt-1.5 text-xs text-[#4A564F]">
            {service.durationMinutes} min ·{' '}
            {formatServicePrice(service.price, service.currency, service.priceType)}
          </p>
          {canBook ? (
            <p
              className="mt-1 text-[11px] text-[#7D8B82]"
              data-testid={`next-available-${service.id}`}
            >
              {nextAvailableLabel
                ? `Nejbližší dostupný termín: ${nextAvailableLabel}`
                : 'Momentálně nejsou dostupné termíny.'}
            </p>
          ) : null}
        </div>
        {showActions ? (
          <div className="shrink-0">
            {canBook && onBook ? (
              <Button
                variant="primary"
                size="sm"
                data-testid={`book-service-${service.id}`}
                onClick={() => onBook(service)}
              >
                Rezervovat
              </Button>
            ) : onContact ? (
              <Button
                variant="secondary"
                size="sm"
                data-testid={`contact-for-service-${service.id}`}
                onClick={onContact}
              >
                Kontaktovat
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
