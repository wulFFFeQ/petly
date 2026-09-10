import { AlertTriangle, Eye, ExternalLink, HeartHandshake, Navigation, Phone, Shield, Stethoscope } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BRAND_NAME } from '../../../lib/brand'
import type { EmergencyCardPublicView } from '../../../lib/emergencyCard'
import { formatCzechDateTime, publicBehaviorLabel } from '../../../lib/lostPet'
import { petTypeLabel } from '../../../lib/petTypes'
import { Button } from '../../ui/Button'

interface EmergencyCardPublicBodyProps {
  view: EmergencyCardPublicView
  onContactOwner?: () => void
  onReportSighting?: () => void
  onReportFound?: () => void
  contactBusy?: boolean
}

export function EmergencyCardPublicBody({
  view,
  onContactOwner,
  onReportSighting,
  onReportFound,
  contactBusy,
}: EmergencyCardPublicBodyProps) {
  const typeLabel = petTypeLabel[view.type]
  const metaParts = [
    view.breed,
    typeLabel,
    view.ageLabel,
    view.gender,
  ].filter(Boolean)

  const healthItems: Array<{ label: string; value: string }> = []
  if (view.health?.allergies) healthItems.push({ label: 'Alergie', value: view.health.allergies })
  if (view.health?.chronicConditions) {
    healthItems.push({ label: 'Chronické onemocnění', value: view.health.chronicConditions })
  }
  if (view.health?.regularMedication) {
    healthItems.push({ label: 'Pravidelná léčba', value: view.health.regularMedication })
  }
  if (view.health?.importantRestrictions) {
    healthItems.push({ label: 'Důležitá omezení', value: view.health.importantRestrictions })
  }
  if (view.health?.other) healthItems.push({ label: 'Další', value: view.health.other })

  return (
    <div className="space-y-4">
      {view.isLost && (
        <div className="rounded-xl bg-[#7A1F1F] px-4 py-3 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white">
            Ztratil se
          </p>
          <p className="mt-1 text-sm font-semibold text-white/95">
            {view.name} se hledá.
          </p>
        </div>
      )}

      <div className="rounded-xl border-2 border-[#234B54]/20 bg-[#E0EAEC]/40 p-4">
        <div className="flex items-start gap-4">
          <img
            src={view.image}
            alt={view.name}
            className="h-20 w-20 shrink-0 rounded-xl border-2 border-white object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-[#191E1B]">{view.name}</p>
            <p className="text-sm text-[#4A564F]">{metaParts.join(' · ')}</p>
            {view.maskedMicrochip && (
              <div className="mt-1.5">
                <p className="font-mono text-xs font-bold text-[#234B54]">
                  Mikročip {view.maskedMicrochip}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[#5A6660]">
                  Číslo čipu je částečně skryté kvůli ochraně soukromí. Mikročip je registrován v
                  profilu mazlíčka — celé číslo není z bezpečnostních důvodů veřejné.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-4 py-3">
        <p className="text-sm font-semibold leading-relaxed text-[#191E1B]">
          Tento mazlíček má svého majitele.
          <br />
          Pomozte nám ho bezpečně vrátit domů.
        </p>
      </div>

      <div className="px-1">
        <p className="text-[11px] font-semibold text-[#5A6660]">Našli jste tohoto mazlíčka?</p>
        <p className="mt-1 text-[11px] leading-relaxed text-[#7D8B82]">
          Zůstaňte prosím v bezpečí a kontaktujte majitele přes {BRAND_NAME}. Pokud je zvíře
          zraněné nebo v bezprostředním ohrožení, obraťte se na nejbližší veterinární pohotovost.
        </p>
      </div>

      {view.isLost && view.lost && (
        <div className="grid gap-3 rounded-xl border border-[#E8E4DC] bg-white p-4 text-sm">
          {view.lost.lastSeenPublicLabel && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Poslední známá lokalita
              </p>
              <p className="mt-0.5 font-semibold text-[#191E1B]">{view.lost.lastSeenPublicLabel}</p>
              {view.lost.lastSeenAt && (
                <p className="text-xs text-[#7D8B82]">{formatCzechDateTime(view.lost.lastSeenAt)}</p>
              )}
            </div>
          )}
          {view.lost.possibleAreaPublicLabel && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Možná oblast
              </p>
              <p className="mt-0.5 font-semibold text-[#191E1B]">{view.lost.possibleAreaPublicLabel}</p>
            </div>
          )}
          {view.lost.respondsToName && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Na jaké jméno slyší
              </p>
              <p className="mt-0.5 font-semibold text-[#191E1B]">{view.lost.respondsToName}</p>
            </div>
          )}
          {view.lost.publicBehavior && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Je bezpečné se pokusit o odchyt?
              </p>
              <p className="mt-0.5 font-semibold text-[#191E1B]">
                {publicBehaviorLabel(view.lost.publicBehavior)}
              </p>
            </div>
          )}
          {view.lost.importantInstructions && (
            <div className="rounded-lg border border-amber-200/70 bg-amber-50/70 p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                <AlertTriangle size={12} />
                Důležité pokyny
              </div>
              <p className="mt-1 text-sm leading-relaxed text-amber-950">
                {view.lost.importantInstructions}
              </p>
            </div>
          )}
          {view.lost.specialCaution && (
            <p className="text-xs leading-relaxed text-[#5A6660]">{view.lost.specialCaution}</p>
          )}
          <Link
            to={`/lost/${view.lost.publicToken}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3 py-2 text-xs font-semibold text-[#2C4A3E] transition-colors hover:bg-[#EBF2EE]"
          >
            <ExternalLink size={14} />
            Otevřít veřejné oznámení
          </Link>
        </div>
      )}

      {healthItems.length > 0 && (
        <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3 text-xs leading-relaxed text-[#5A6660]">
          <p className="mb-1.5 font-bold text-[#191E1B]">Důležité zdravotní informace</p>
          <ul className="space-y-1">
            {healthItems.map((item) => (
              <li key={item.label}>
                <span className="font-semibold text-[#4A564F]">{item.label}:</span> {item.value}
              </li>
            ))}
          </ul>
        </div>
      )}

      {view.vet && (
        <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3">
          <div className="flex items-start gap-3">
            <Stethoscope size={18} className="mt-0.5 shrink-0 text-[#234B54]" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]">
                {view.vet.label}
              </p>
              <p className="text-sm font-bold text-[#191E1B]">{view.vet.clinicOrName}</p>
              {(view.vet.phone || view.vet.navigateQuery) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {view.vet.phone && (
                    <a
                      href={`tel:${view.vet.phone.replace(/\s/g, '')}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8E4DC] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#234B54] hover:bg-[#E0EAEC]/50"
                    >
                      <Phone size={13} />
                      Zavolat
                    </a>
                  )}
                  {view.vet.navigateQuery && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(view.vet.navigateQuery)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8E4DC] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#234B54] hover:bg-[#E0EAEC]/50"
                    >
                      <Navigation size={13} />
                      Navigovat
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {view.contactEnabled ? (
          <Button
            type="button"
            variant="gold"
            fullWidth
            size="lg"
            className="gap-1.5 font-bold"
            onClick={onContactOwner}
            disabled={contactBusy || !onContactOwner}
          >
            <HeartHandshake size={18} />
            Kontaktovat majitele
          </Button>
        ) : (
          <p className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3 py-2.5 text-xs text-[#7D8B82]">
            Majitel má bezpečný kontakt momentálně vypnutý.
          </p>
        )}

        {view.isLost && view.lost && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="primary"
              fullWidth
              className="gap-1.5 font-bold"
              onClick={onReportSighting}
              disabled={!onReportSighting}
            >
              <Eye size={16} />
              Viděl/a jsem ho
            </Button>
            <Button
              type="button"
              variant="outline"
              fullWidth
              className="gap-1.5 font-bold"
              onClick={onReportFound}
              disabled={!onReportFound}
            >
              <HeartHandshake size={16} />
              Našel/a jsem ho
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-[#EBF2EE]/70 px-3 py-2.5">
        <Shield size={15} className="mt-0.5 shrink-0 text-[#2C4A3E]" />
        <p className="text-[11px] leading-relaxed text-[#7D8B82]">
          Kontakt s majitelem je zprostředkován bezpečně přes {BRAND_NAME}. Nezobrazujeme telefon,
          e-mail ani adresu majitele.
        </p>
      </div>
    </div>
  )
}
