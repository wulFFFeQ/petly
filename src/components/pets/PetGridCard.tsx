import { ArrowUpRight, CalendarClock, MapPin, Scale, Stethoscope } from 'lucide-react'
import { Link } from 'react-router-dom'
import { petTypeLabel } from '../../data/mockData'
import type { CalendarEvent, HealthRecord, LostPetAnnouncement, LostPetReport, Pet } from '../../types'
import {
  formatNeuteredStatus,
  formatOptionalText,
  formatOptionalWeight,
  hasMicrochip,
} from '../../lib/petProfileDisplay'
import { maskMicrochip } from '../../lib/microchip'
import { formatAge } from '../../lib/dashboardDates'
import { formatCzechDateTime } from '../../lib/lostPet'
import {
  formatHealthStatusBrief,
  getLostCardSummary,
  getNextImportantHealthTerm,
  getPetHealthAttentionHint,
} from '../../lib/myPetsList'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { IconBox } from '../ui/IconBox'
import { PetPhotoCard } from '../ui/PetPhotoCard'
import { PetGridCardMenu } from './PetGridCardMenu'

interface PetGridCardProps {
  pet: Pet
  calendarEvents: CalendarEvent[]
  healthRecords: HealthRecord[]
  lostAnnouncements: LostPetAnnouncement[]
  lostReports: LostPetReport[]
}

export function PetGridCard({
  pet,
  calendarEvents,
  healthRecords,
  lostAnnouncements,
  lostReports,
}: PetGridCardProps) {
  const isLost = pet.lostStatus === 'lost'
  const nextTerm = getNextImportantHealthTerm(pet, calendarEvents)
  const healthHint = getPetHealthAttentionHint(pet, healthRecords, nextTerm)
  const lostSummary = getLostCardSummary(pet, lostAnnouncements, lostReports)

  const statusVariant =
    pet.healthStatus === 'excellent'
      ? 'success'
      : pet.healthStatus === 'good'
        ? 'primary'
        : pet.healthStatus === 'attention'
          ? 'warning'
          : pet.healthStatus === 'vet_check' || pet.healthStatus === 'urgent'
            ? 'danger'
            : 'default'

  const ageLabel =
    (pet.age != null && pet.age > 0) || (pet.ageMonths != null && pet.ageMonths > 0)
      ? formatAge(pet.age, pet.ageMonths)
      : undefined

  const profilePath = `/pets/${pet.id}`
  const primaryLabel = isLost ? 'Otevřít pátrání' : 'Zobrazit profil'

  return (
    <Card
      variant="elevated"
      padding="none"
      className={cn(
        'group flex flex-col justify-between overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-[#D1E0D8] hover:shadow-[0_15px_35px_rgba(25,30,27,0.1)]',
        isLost && 'border-rose-200/90 ring-1 ring-rose-300/50',
      )}
    >
      <div>
        <PetPhotoCard
          image={pet.image}
          name={pet.name}
          subtitle={pet.breed}
          ageLabel={ageLabel}
          aspect="4/3"
          topLeft={
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="default" size="sm" className="bg-white/90 shadow-xs backdrop-blur-md">
                {petTypeLabel[pet.type]}
              </Badge>
              {pet.breedingProfile && (
                <Badge
                  variant="gold"
                  size="sm"
                  className="bg-white/90 shadow-xs backdrop-blur-md"
                >
                  Chovný profil
                </Badge>
              )}
            </div>
          }
          topRight={
            <div className="flex items-start gap-1.5">
              {isLost ? (
                <Badge
                  variant="danger"
                  size="sm"
                  withDot
                  pulseDot
                  className="bg-white/95 font-bold uppercase tracking-wide shadow-xs backdrop-blur-md"
                >
                  Ztracený
                </Badge>
              ) : pet.healthStatus ? (
                <Badge
                  variant={statusVariant}
                  size="sm"
                  withDot
                  className="bg-white/95 shadow-xs backdrop-blur-md"
                >
                  {formatHealthStatusBrief(pet.healthStatus)}
                </Badge>
              ) : null}
              <PetGridCardMenu pet={pet} />
            </div>
          }
        />

        <div className="p-3.5 sm:p-4">
          {isLost && lostSummary && (
            <div className="mb-3 space-y-1.5 rounded-xl border border-rose-100 bg-rose-50/50 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 shrink-0 text-rose-700/80" />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-rose-800/70">Poslední výskyt</p>
                  <p className="truncate text-sm font-semibold text-[#191E1B]">
                    {lostSummary.lastSeenLabel}
                  </p>
                  <p className="text-[11px] text-[#5A6660]">
                    {formatCzechDateTime(lostSummary.lastSeenAt)}
                  </p>
                </div>
              </div>
              {lostSummary.newSightingCount > 0 && (
                <p className="text-[11px] font-semibold text-rose-800/90">
                  {lostSummary.newSightingCount === 1
                    ? '1 nové hlášení „Viděl/a jsem ho“'
                    : lostSummary.newSightingCount >= 2 && lostSummary.newSightingCount <= 4
                      ? `${lostSummary.newSightingCount} nová hlášení „Viděl/a jsem ho“`
                      : `${lostSummary.newSightingCount} nových hlášení „Viděl/a jsem ho“`}
                </p>
              )}
            </div>
          )}

          {!isLost && healthHint && (
            <p className="mb-3 rounded-lg bg-[#FAF8F5] px-2.5 py-1.5 text-[11px] font-semibold text-[#5A6660]">
              {healthHint}
            </p>
          )}

          <div className="mb-2.5 flex items-center gap-2.5">
            <IconBox icon={Scale} size="md" tone="green" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[#7D8B82]">Hmotnost</p>
              <p className="text-base font-bold tracking-tight text-[#191E1B]">
                {formatOptionalWeight(pet.weight)}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 rounded-xl bg-[#FAF8F5] px-3 py-2">
              <IconBox icon={Stethoscope} size="sm" tone="sky" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-[#7D8B82]">Poslední návštěva</p>
                <p className="truncate text-sm font-semibold text-[#191E1B]">
                  {formatOptionalText(pet.lastVetVisit)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl bg-[#FAF8F5] px-3 py-2">
              <IconBox icon={CalendarClock} size="sm" tone="muted" className="text-[#234B54]" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-[#7D8B82]">
                  Příští důležitý termín
                </p>
                <p className="truncate text-sm font-semibold text-[#234B54]">
                  {nextTerm
                    ? `${nextTerm.label} · ${nextTerm.dateLabel}`
                    : formatOptionalText(null)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-[10px] text-[#A3AEA7]">
              Mikročip{' '}
              <span className="font-mono text-[#B8C2BC]">
                {hasMicrochip(pet.microchip)
                  ? maskMicrochip(pet.microchip!)
                  : formatOptionalText(pet.microchip)}
              </span>
            </p>
            {pet.neutered != null && (
              <Badge variant="outline" size="sm" className="shrink-0">
                {formatNeuteredStatus(pet.neutered, pet.gender)}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="px-3.5 pb-3.5 pt-0 sm:px-4 sm:pb-4">
        <Link to={profilePath} className="block w-full">
          <Button
            variant={isLost ? 'danger' : 'outline'}
            fullWidth
            size="sm"
            className={cn(
              'justify-between transition-all',
              !isLost &&
                'group-hover:border-[#2C4A3E] group-hover:bg-[#2C4A3E] group-hover:text-white',
            )}
          >
            <span>{primaryLabel}</span>
            <ArrowUpRight
              size={14}
              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Button>
        </Link>
      </div>
    </Card>
  )
}
