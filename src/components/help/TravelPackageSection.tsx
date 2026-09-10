import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Plane,
  ScanLine,
  Share2,
  Stethoscope,
  Syringe,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { travelDestinations } from '../../data/mockData'
import { useApp } from '../../context/AppContext'
import {
  buildPetTravelPackage,
  getDestinationReadiness,
  overallReadinessLabel,
} from '../../lib/travel/buildTravelReadiness'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { CountryFlag } from '../ui/CountryFlag'
import { OptionSelect } from '../ui/OptionSelect'
import { BRAND_NAME } from '../../lib/brand'
import {
  buildTravelPackShareText,
  downloadTravelPackagePdf,
} from '../../lib/travelPackagePdf'
import { cn } from '../../lib/utils'
import type { TravelRequirementStatus } from '../../types'

const REQUIREMENT_STATUS_LABEL: Record<TravelRequirementStatus, string> = {
  ready: 'Splněno',
  attention: 'K doplnění',
  missing: 'Chybí',
}

export function TravelPackageSection({ hideHeader = false }: { hideHeader?: boolean }) {
  const {
    pets,
    documents,
    healthRecords,
    travelPrefs,
    setTravelPrefs,
    confirmTravelCheck,
    showToast,
  } = useApp()

  const [activeTravelPetId, setActiveTravelPetId] = useState(
    travelPrefs.lastPetId && pets.some((p) => p.id === travelPrefs.lastPetId)
      ? travelPrefs.lastPetId
      : (pets[0]?.id ?? ''),
  )
  const [selectedDestinationId, setSelectedDestinationId] = useState(
    travelPrefs.lastDestinationId &&
      travelDestinations.some((d) => d.id === travelPrefs.lastDestinationId)
      ? travelPrefs.lastDestinationId
      : (travelDestinations[0]?.id ?? ''),
  )
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    setTravelPrefs((prev) => ({
      ...prev,
      lastPetId: activeTravelPetId || prev.lastPetId,
      lastDestinationId: selectedDestinationId || prev.lastDestinationId,
    }))
  }, [activeTravelPetId, selectedDestinationId, setTravelPrefs])

  const activeTravelPet = pets.find((p) => p.id === activeTravelPetId)
  const activeDestination = travelDestinations.find((d) => d.id === selectedDestinationId)

  const activeTravelPackage = useMemo(() => {
    if (!activeTravelPet) return null
    return buildPetTravelPackage(activeTravelPet, documents, healthRecords)
  }, [activeTravelPet, documents, healthRecords])

  const destinationReadiness =
    activeTravelPackage && activeDestination && activeTravelPet
      ? getDestinationReadiness(
          activeDestination,
          activeTravelPackage,
          travelPrefs,
          activeTravelPet.id,
        )
      : null

  const destinationOptions = travelDestinations.map((dest) => ({
    value: dest.id,
    label: dest.country,
    leading: <CountryFlag code={dest.flagCode} country={dest.country} />,
  }))

  const getTravelPackPdfInput = () => {
    if (!activeTravelPet || !activeTravelPackage || !activeDestination || !destinationReadiness) {
      return null
    }
    return {
      pet: activeTravelPet,
      pack: activeTravelPackage,
      destination: activeDestination,
      overall: destinationReadiness.overall,
      evaluated: destinationReadiness.evaluated.map(({ req, status }) => ({
        id: req.id,
        check: req.check,
        status,
      })),
    }
  }

  const handleDownloadTravelPack = async () => {
    if (!activeTravelPet) return
    const input = getTravelPackPdfInput()
    if (!input) return
    try {
      await downloadTravelPackagePdf(input)
      showToast('PDF staženo', `Balíček pro ${activeTravelPet.name} je uložený jako PDF.`, 'gold')
    } catch {
      showToast('Stažení se nezdařilo', 'Zkuste to prosím znovu za chvíli.', 'info')
    }
  }

  const handleShareTravelPack = async () => {
    if (!activeTravelPet) return
    const input = getTravelPackPdfInput()
    if (!input) return
    const content = buildTravelPackShareText(input)
    const shareData = {
      title: `Cestovní balíček — ${activeTravelPet.name}`,
      text: content,
    }
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share(shareData)
        showToast('Balíček sdílen', `Cestovní dokumenty ${activeTravelPet.name} byly odeslány.`, 'info')
        return
      }
      await navigator.clipboard.writeText(content)
      showToast(
        'Zkopírováno do schránky',
        `Cestovní dokumenty ${activeTravelPet.name} můžete vložit kamkoli.`,
        'info',
      )
    } catch {
      showToast('Sdílení se nezdařilo', 'Zkuste balíček stáhnout a odeslat ručně.', 'info')
    }
  }

  const stepHref = (deepLink: string, petId: string) => {
    if (deepLink === 'documents') return `/pets/${petId}?tab=documents`
    if (deepLink === 'health') return `/pets/${petId}?tab=health`
    return `/pets/${petId}`
  }

  const readinessBanner =
    destinationReadiness &&
    (() => {
      const { overall, incompleteSteps } = destinationReadiness
      const label = overallReadinessLabel(overall, incompleteSteps)
      if (overall === 'ready') {
        return {
          label,
          className: 'border-[#C5D4C9] bg-[#EBF2EE] text-[#2C4A3E]',
          dot: 'bg-[#2C4A3E]',
        }
      }
      if (overall === 'attention') {
        return {
          label,
          className: 'border-[#E8D8B5] bg-[#FAF4E6] text-[#8A6E2F]',
          dot: 'bg-[#B8934A]',
        }
      }
      return {
        label,
        className: 'border-[#D4C8C0] bg-[#F5EDE8] text-[#6B4A3A]',
        dot: 'bg-[#8B5E4B]',
      }
    })()

  return (
    <Card variant="elevated">
      {!hideHeader && (
        <>
          <h3 className="text-base font-bold text-[#191E1B] mb-1 flex items-center gap-2">
            <Plane size={18} className="text-[#B8934A]" />
            <span>Balíček pro cestování</span>
          </h3>
          <p className="text-xs text-[#4A564F] mb-4">
            EU pas, očkování, čip, zdravotní záznamy a dokumenty pohromadě u každého mazlíčka.
            Vyberte destinaci a {BRAND_NAME} zobrazí požadavky pro danou zemi.
          </p>
        </>
      )}

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
          <div className="mt-1.5">
            <OptionSelect
              id="travel-destination"
              value={selectedDestinationId}
              onChange={setSelectedDestinationId}
              options={destinationOptions}
              placeholder="Vyberte zemi…"
              maxListHeightClassName="max-h-72"
              className="[&_button]:bg-[#FAF8F5] [&_button]:shadow-none [&_button]:text-xs"
            />
          </div>
        </div>
      </div>

      {activeTravelPackage && activeTravelPet && activeDestination && destinationReadiness && readinessBanner && (
        <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] overflow-hidden">
          <div
            data-testid="travel-readiness-banner"
            className={cn(
              'flex items-start gap-3 border-b px-4 py-3.5',
              readinessBanner.className,
            )}
          >
            <span
              className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', readinessBanner.dot)}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-sm font-bold" data-testid="travel-readiness-label">
                {readinessBanner.label}
              </p>
              <p className="mt-0.5 text-[11px] opacity-80">
                Stav je odvozený z uložených dokumentů, zdraví a čipu mazlíčka.
              </p>
            </div>
          </div>

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
              <p className="mt-0.5 text-[11px] text-[#7D8B82] flex items-center gap-1.5">
                <span>Cíl:</span>
                <CountryFlag
                  code={activeDestination.flagCode}
                  country={activeDestination.country}
                />
                <span>{activeDestination.country}</span>
              </p>
            </div>
            <Badge
              variant={destinationReadiness.overall === 'ready' ? 'gold' : 'outline'}
              size="sm"
            >
              {destinationReadiness.overall === 'ready'
                ? 'Připraveno'
                : destinationReadiness.overall === 'attention'
                  ? 'K dokončení'
                  : 'Chybí údaje'}
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
            <ul className="space-y-2" data-testid="travel-checklist">
              {destinationReadiness.evaluated.map(({ req, status, hint, deepLink }) => {
                const incomplete = status !== 'ready'
                const canConfirm = deepLink === 'confirm' && incomplete
                const inner = (
                  <>
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
                      {status === 'ready' ? <Check size={11} /> : <AlertCircle size={11} />}
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
                      {incomplete && deepLink !== 'confirm' && (
                        <p className="mt-1 text-[10px] font-semibold text-[#B8934A]">
                          Otevřít příslušnou část →
                        </p>
                      )}
                      {canConfirm && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          data-testid={`travel-confirm-${req.check}`}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            confirmTravelCheck(activeTravelPet.id, activeDestination.id, req.check)
                            showToast('Krok potvrzen', req.label, 'success')
                          }}
                        >
                          Označit jako hotové
                        </Button>
                      )}
                    </div>
                  </>
                )

                if (incomplete && deepLink !== 'confirm') {
                  return (
                    <li key={req.id}>
                      <Link
                        to={stepHref(deepLink, activeTravelPet.id)}
                        data-testid={`travel-step-${req.check}`}
                        className={cn(
                          'flex items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors hover:border-[#B8934A]/50',
                          status === 'attention'
                            ? 'border-[#E8D8B5] bg-[#FCFBF8]'
                            : 'border-[#E8D8B5]/60 bg-white/80',
                        )}
                      >
                        {inner}
                      </Link>
                    </li>
                  )
                }

                return (
                  <li
                    key={req.id}
                    data-testid={`travel-step-${req.check}`}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border px-3.5 py-3',
                      status === 'ready'
                        ? 'border-[#E8E4DC] bg-white'
                        : status === 'attention'
                          ? 'border-[#E8D8B5] bg-[#FCFBF8]'
                          : 'border-[#E8D8B5]/60 bg-white/80',
                    )}
                  >
                    {inner}
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="border-b border-[#E8E4DC] bg-white">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left"
              onClick={() => setDetailsOpen((v) => !v)}
              data-testid="travel-details-toggle"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]">
                Detaily balíčku
              </span>
              {detailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {detailsOpen && (
              <div className="space-y-3 px-4 pb-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3.5">
                    <div className="flex items-center gap-2 text-[#234B54]">
                      <FileText size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">EU pas</span>
                    </div>
                    <p className="mt-1.5 text-xs font-bold text-[#191E1B]">
                      {activeTravelPackage.euPassport.number || 'Není v dokumentech'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#7D8B82]">
                      Platnost do {activeTravelPackage.euPassport.validUntil || '—'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3.5">
                    <div className="flex items-center gap-2 text-[#234B54]">
                      <Syringe size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Očkování</span>
                    </div>
                    <p className="mt-1.5 text-xs font-bold text-[#191E1B]">
                      {activeTravelPackage.vaccinationSummary}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3.5">
                    <div className="flex items-center gap-2 text-[#234B54]">
                      <ScanLine size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Čip</span>
                    </div>
                    <p className="mt-1.5 text-xs font-bold text-[#191E1B] tabular-nums">
                      {activeTravelPackage.microchip || 'Nezadáno'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3.5">
                    <div className="flex items-center gap-2 text-[#234B54]">
                      <Stethoscope size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        Zdravotní záznamy
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs font-bold text-[#191E1B]">
                      {activeTravelPackage.healthRecordCount} klinických záznamů
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54] mb-2">
                    Dokumenty
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
              </div>
            )}
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
