import {
  AlertCircle,
  Check,
  Download,
  FileText,
  Globe,
  Plane,
  ScanLine,
  Share2,
  Stethoscope,
  Syringe,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { petTravelPackages, travelDestinations } from '../../data/mockData'
import { useApp } from '../../context/AppContext'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { BRAND_NAME } from '../../lib/brand'
import { cn } from '../../lib/utils'
import type {
  PetTravelPackage,
  TravelDestination,
  TravelRequirementCheck,
} from '../../types'

type RequirementStatus = 'ready' | 'attention' | 'missing'

function getRequirementStatus(
  check: TravelRequirementCheck,
  pack: PetTravelPackage,
): { status: RequirementStatus; hint: string } {
  const insuranceDoc = pack.documents.find((d) => d.label.includes('Pojišťovací'))
  const healthDoc = pack.documents.find((d) => d.label.includes('Zdravotní'))

  switch (check) {
    case 'eu_passport':
      if (pack.euPassport.status === 'valid') {
        return { status: 'ready', hint: `Platný do ${pack.euPassport.validUntil}` }
      }
      if (pack.euPassport.status === 'expiring') {
        return { status: 'attention', hint: `Platnost končí ${pack.euPassport.validUntil}` }
      }
      return { status: 'missing', hint: 'EU pas chybí nebo expiroval' }
    case 'rabies':
      return { status: 'ready', hint: pack.vaccinationSummary }
    case 'microchip':
      return pack.microchip
        ? { status: 'ready', hint: pack.microchip }
        : { status: 'missing', hint: 'Čip není zapsán v systému' }
    case 'tapeworm':
      return { status: 'attention', hint: 'Nutné 24–120 h před vstupem u veterináře' }
    case 'health_cert':
      return healthDoc?.ready
        ? { status: 'ready', hint: 'Zdravotní souhrn je v balíčku' }
        : { status: 'missing', hint: 'Vyžaduje se oficiální certifikát od veterináře' }
    case 'insurance':
      return insuranceDoc?.ready
        ? { status: 'ready', hint: 'Pojištění je součástí balíčku' }
        : { status: 'attention', hint: 'Doporučeno doplnit před cestou' }
    case 'import_permit':
      return { status: 'attention', hint: 'Nutno vyřídit online před odletem' }
  }
}

function getDestinationReadiness(
  destination: TravelDestination,
  pack: PetTravelPackage,
) {
  const evaluated = destination.requirements.map((req) => ({
    req,
    ...getRequirementStatus(req.check, pack),
  }))
  const ready = evaluated.filter((e) => e.status === 'ready').length
  const attention = evaluated.filter((e) => e.status === 'attention').length
  const missing = evaluated.filter((e) => e.status === 'missing').length
  const overall: RequirementStatus =
    missing > 0 ? 'missing' : attention > 0 ? 'attention' : 'ready'

  return { evaluated, ready, attention, missing, overall }
}

const REQUIREMENT_STATUS_LABEL: Record<RequirementStatus, string> = {
  ready: 'Splněno',
  attention: 'K doplnění',
  missing: 'Chybí',
}

export function TravelPackageSection() {
  const { pets, showToast } = useApp()
  const [activeTravelPetId, setActiveTravelPetId] = useState(pets[0]?.id ?? '')
  const [selectedDestinationId, setSelectedDestinationId] = useState(travelDestinations[0]?.id ?? '')

  const activeTravelPackage = petTravelPackages.find((p) => p.petId === activeTravelPetId)
  const activeTravelPet = pets.find((p) => p.id === activeTravelPetId)
  const activeDestination = travelDestinations.find((d) => d.id === selectedDestinationId)
  const destinationReadiness =
    activeTravelPackage && activeDestination
      ? getDestinationReadiness(activeDestination, activeTravelPackage)
      : null

  const handleDownloadTravelPack = () => {
    if (!activeTravelPet) return
    showToast(
      'Balíček pro cestování',
      `Dokumenty pro ${activeTravelPet.name} byly připraveny ke stažení.`,
      'gold',
    )
  }

  const handleShareTravelPack = () => {
    if (!activeTravelPet) return
    showToast(
      'Balíček sdílen',
      `Cestovní dokumenty ${activeTravelPet.name} jsou připraveny ke sdílení.`,
      'info',
    )
  }

  return (
    <Card variant="elevated">
      <h3 className="text-base font-bold text-[#191E1B] mb-1 flex items-center gap-2">
        <Plane size={18} className="text-[#B8934A]" />
        <span>Balíček pro cestování</span>
      </h3>
      <p className="text-xs text-[#4A564F] mb-4">
        EU pas, očkování, čip, zdravotní záznamy a dokumenty pohromadě u každého mazlíčka.
        Vyberte destinaci a {BRAND_NAME} zobrazí požadavky pro danou zemi.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]">
            Mazlíček
          </label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {pets.map((pet) => (
              <button
                key={pet.id}
                type="button"
                onClick={() => setActiveTravelPetId(pet.id)}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer',
                  activeTravelPetId === pet.id
                    ? 'bg-[#234B54] text-white'
                    : 'bg-[#FAF8F5] text-[#4A564F] border border-[#E8E4DC] hover:border-[#234B54]/30',
                )}
              >
                {pet.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="travel-destination"
            className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]"
          >
            Destinace cesty
          </label>
          <div className="relative mt-1.5">
            <Globe
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7D8B82] pointer-events-none"
            />
            <select
              id="travel-destination"
              value={selectedDestinationId}
              onChange={(e) => setSelectedDestinationId(e.target.value)}
              className="w-full h-10 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] pl-9 pr-3 text-xs font-medium text-[#191E1B] outline-none focus:border-[#234B54] focus:bg-white"
            >
              {travelDestinations.map((dest) => (
                <option key={dest.id} value={dest.id}>
                  {dest.emoji} {dest.country}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {activeTravelPackage && activeTravelPet && activeDestination && destinationReadiness && (
        <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-[#E8E4DC] bg-white p-4">
            <img
              src={activeTravelPet.image}
              alt={activeTravelPet.name}
              className="h-16 w-16 rounded-xl object-cover shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#191E1B]">
                {activeTravelPet.name} · {activeTravelPet.breed}
              </p>
              <p className="mt-0.5 text-[11px] text-[#7D8B82]">
                Cíl: {activeDestination.emoji} {activeDestination.country}
              </p>
            </div>
            <Badge
              variant={
                destinationReadiness.overall === 'ready'
                  ? 'gold'
                  : 'outline'
              }
              size="sm"
            >
              {destinationReadiness.overall === 'ready'
                ? 'Připraveno k cestě'
                : destinationReadiness.overall === 'attention'
                  ? 'Téměř připraveno'
                  : 'Doplnit požadavky'}
            </Badge>
          </div>

          <div className="border-b border-[#E8E4DC] bg-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54] mb-1">
              Požadavky pro {activeDestination.country}
            </p>
            <p className="text-[11px] text-[#5A6660] leading-relaxed">
              {activeDestination.summary}
            </p>
            <p className="mt-2 text-[10px] font-medium text-[#7D8B82]">
              {destinationReadiness.ready} splněno · {destinationReadiness.attention} k doplnění
              · {destinationReadiness.missing} chybí
            </p>
          </div>

          <div className="border-b border-[#E8E4DC] bg-[#FAF8F5] px-4 py-3">
            <ul className="space-y-2">
              {destinationReadiness.evaluated.map(({ req, status, hint }) => (
                <li
                  key={req.id}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border px-3.5 py-3',
                    status === 'ready'
                      ? 'border-[#E8E4DC] bg-white'
                      : status === 'attention'
                        ? 'border-[#E8D8B5] bg-[#FCFBF8]'
                        : 'border-[#E8D8B5]/60 bg-white/80',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full mt-0.5',
                      status === 'ready'
                        ? 'bg-[#E0EAEC] text-[#234B54]'
                        : status === 'attention'
                          ? 'bg-[#FAF4E6] text-[#B8934A]'
                          : 'bg-[#F0EDE6] text-[#A3AEA7]',
                    )}
                  >
                    {status === 'ready' ? (
                      <Check size={11} />
                    ) : (
                      <AlertCircle size={11} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-bold text-[#191E1B]">{req.label}</p>
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                          status === 'ready'
                            ? 'bg-[#E0EAEC] text-[#234B54]'
                            : status === 'attention'
                              ? 'bg-[#FAF4E6] text-[#B8934A]'
                              : 'bg-[#F0EDE6] text-[#7D8B82]',
                        )}
                      >
                        {REQUIREMENT_STATUS_LABEL[status]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#5A6660] leading-relaxed">
                      {req.detail}
                    </p>
                    <p className="mt-1 text-[10px] font-medium text-[#234B54]">{hint}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#E8E4DC] bg-white p-3.5">
              <div className="flex items-center gap-2 text-[#234B54]">
                <FileText size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">EU pas</span>
              </div>
              <p className="mt-1.5 text-xs font-bold text-[#191E1B]">
                {activeTravelPackage.euPassport.number}
              </p>
              <p className="mt-0.5 text-[11px] text-[#7D8B82]">
                Platnost do {activeTravelPackage.euPassport.validUntil}
              </p>
            </div>

            <div className="rounded-xl border border-[#E8E4DC] bg-white p-3.5">
              <div className="flex items-center gap-2 text-[#234B54]">
                <Syringe size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Očkování</span>
              </div>
              <p className="mt-1.5 text-xs font-bold text-[#191E1B]">
                {activeTravelPackage.vaccinationSummary}
              </p>
              <p className="mt-0.5 text-[11px] text-[#7D8B82]">
                Další termín: {activeTravelPet.nextVaccination}
              </p>
            </div>

            <div className="rounded-xl border border-[#E8E4DC] bg-white p-3.5">
              <div className="flex items-center gap-2 text-[#234B54]">
                <ScanLine size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Čip</span>
              </div>
              <p className="mt-1.5 text-xs font-bold text-[#191E1B] tabular-nums">
                {activeTravelPackage.microchip}
              </p>
              <p className="mt-0.5 text-[11px] text-[#7D8B82]">Registrován v systému {BRAND_NAME}</p>
            </div>

            <div className="rounded-xl border border-[#E8E4DC] bg-white p-3.5">
              <div className="flex items-center gap-2 text-[#234B54]">
                <Stethoscope size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Zdravotní záznamy
                </span>
              </div>
              <p className="mt-1.5 text-xs font-bold text-[#191E1B]">
                {activeTravelPackage.healthRecordCount} klinických záznamů
              </p>
              <p className="mt-0.5 text-[11px] text-[#7D8B82]">
                Poslední návštěva: {activeTravelPet.lastVetVisit}
              </p>
            </div>
          </div>

          <div className="border-t border-[#E8E4DC] bg-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54] mb-2">
              Dokumenty v balíčku
            </p>
            <ul className="space-y-1.5">
              {activeTravelPackage.documents.map((doc) => (
                <li key={doc.label} className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                      doc.ready ? 'bg-[#E0EAEC] text-[#234B54]' : 'bg-[#F0EDE6] text-[#A3AEA7]',
                    )}
                  >
                    {doc.ready ? <Check size={10} /> : '–'}
                  </span>
                  <span className={doc.ready ? 'text-[#191E1B] font-medium' : 'text-[#7D8B82]'}>
                    {doc.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-[#E8E4DC] bg-[#FAF8F5] p-4">
            <Button variant="primary" size="sm" onClick={handleDownloadTravelPack} className="gap-1.5">
              <Download size={14} />
              Stáhnout balíček
            </Button>
            <Button variant="outline" size="sm" onClick={handleShareTravelPack} className="gap-1.5">
              <Share2 size={14} />
              Sdílet
            </Button>
            <Link to={`/pets/${activeTravelPet.id}`}>
              <Button variant="ghost" size="sm">
                Otevřít profil mazlíčka
              </Button>
            </Link>
          </div>
        </div>
      )}
    </Card>
  )
}
