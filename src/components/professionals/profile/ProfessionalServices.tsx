import { Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { PublicProfessionalProfile } from '../../../lib/professional'
import {
  ensureDefaultAvailability,
  ensureSeedServices,
  listPublicServices,
  type ProfessionalService,
} from '../../../lib/booking'
import { loadProfessionalProfiles } from '../../../lib/professional/storage'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { BookingRequestModal } from '../../booking/BookingRequestModal'
import { BookingServiceCard } from '../../booking/BookingServiceCard'
import { ProfessionalProfileSection } from './ProfessionalProfileSection'

interface ProfessionalServicesProps {
  pub: PublicProfessionalProfile
  onContact?: () => void
}

export function ProfessionalServices({ pub, onContact }: ProfessionalServicesProps) {
  const [bookingOpen, setBookingOpen] = useState(false)
  const [initialServiceId, setInitialServiceId] = useState<string | undefined>()

  const publicServices = useMemo(() => {
    const profile = loadProfessionalProfiles().find((p) => p.id === pub.id)
    if (!profile) return [] as ProfessionalService[]
    ensureSeedServices(pub.id, profile.type)
    ensureDefaultAvailability(pub.id)
    return listPublicServices(pub.id)
  }, [pub.id])

  const marketingFallback = pub.services ?? []
  const hasPublic = publicServices.length > 0
  const hasBookable = publicServices.some(
    (s) => s.active && s.bookingEnabled && s.publicVisibility === 'public',
  )
  const hasAnything = hasPublic || marketingFallback.length > 0

  if (!hasAnything) return null

  const openBooking = (serviceId?: string) => {
    setInitialServiceId(serviceId)
    setBookingOpen(true)
  }

  return (
    <>
      <ProfessionalProfileSection
        title="Služby"
        id="professional-services"
        icon={<Sparkles size={14} className="text-[#B8934A]" />}
        testId="professional-services"
      >
        {hasPublic ? (
          <div className="space-y-2">
            {publicServices.map((service) => (
              <BookingServiceCard
                key={service.id}
                service={service}
                onBook={(s) => openBooking(s.id)}
                onContact={onContact}
              />
            ))}
            {hasBookable ? (
              <Button
                variant="secondary"
                size="sm"
                className="mt-1"
                data-testid="book-any-service"
                onClick={() => openBooking()}
              >
                Rezervovat termín
              </Button>
            ) : onContact ? (
              <Button
                variant="secondary"
                size="sm"
                data-testid="contact-professional-services"
                onClick={onContact}
              >
                Kontaktovat profesionála
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <ul className="flex flex-wrap gap-2">
              {marketingFallback.map((service) => (
                <li key={service}>
                  <Badge variant="outline" size="sm" className="font-medium">
                    {service}
                  </Badge>
                </li>
              ))}
            </ul>
            {onContact ? (
              <Button
                variant="secondary"
                size="sm"
                data-testid="contact-professional-services"
                onClick={onContact}
              >
                Kontaktovat profesionála
              </Button>
            ) : null}
          </div>
        )}
      </ProfessionalProfileSection>

      <BookingRequestModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        professionalId={pub.id}
        initialServiceId={initialServiceId}
      />
    </>
  )
}
