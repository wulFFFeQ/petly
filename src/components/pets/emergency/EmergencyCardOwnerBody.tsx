import { AlertTriangle, Copy, ExternalLink, Phone, Stethoscope } from 'lucide-react'
import { useMemo } from 'react'
import { importantContacts } from '../../../data/mockData'
import { useApp } from '../../../context/AppContext'
import { copyTextToClipboard } from '../../../lib/clipboard'
import { ensureEmergencyCardSettings } from '../../../lib/emergencyCard'
import {
  buildLostAnnouncementUrl,
  findActiveAnnouncementForPet,
} from '../../../lib/lostPet'
import {
  EMPTY_PROFILE_LABEL,
  formatOptionalAge,
  formatOptionalText,
  hasMicrochip,
} from '../../../lib/petProfileDisplay'
import { petTypeLabel } from '../../../lib/petTypes'
import type { Pet } from '../../../types'
import type { ImportantContact } from '../../../types'
import { Button } from '../../ui/Button'

interface EmergencyCardOwnerBodyProps {
  pet: Pet
}

function contactByType(type: ImportantContact['type']) {
  return importantContacts.find((c) => c.type === type)
}

export function EmergencyCardOwnerBody({ pet }: EmergencyCardOwnerBodyProps) {
  const { lostAnnouncements, showToast } = useApp()
  const card = ensureEmergencyCardSettings(pet)
  const emergencyVet = contactByType('emergency')
  const mainVet = contactByType('vet')
  const emergencyPerson = contactByType('emergency_person')
  const chip = pet.microchip?.trim()
  const ageLabel = formatOptionalAge(pet.age, pet.ageMonths)
  const meta = [
    pet.breed,
    petTypeLabel[pet.type],
    ageLabel !== EMPTY_PROFILE_LABEL ? ageLabel : null,
    pet.gender,
  ]
    .filter(Boolean)
    .join(' · ')

  const activeLost = useMemo(
    () => findActiveAnnouncementForPet(lostAnnouncements, pet.id),
    [lostAnnouncements, pet.id],
  )

  const health = card.health
  const healthLines: string[] = []
  if (health?.allergies) healthLines.push(`Alergie: ${health.allergies}`)
  if (health?.chronicConditions) healthLines.push(`Chronické: ${health.chronicConditions}`)
  if (health?.regularMedication) healthLines.push(`Léčba: ${health.regularMedication}`)
  if (health?.importantRestrictions) healthLines.push(`Omezení: ${health.importantRestrictions}`)
  if (health?.other) healthLines.push(health.other)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border-2 border-[#234B54]/20 bg-[#E0EAEC]/40 p-4">
        <div className="flex items-start gap-4">
          <img
            src={pet.image}
            alt={pet.name}
            className="h-20 w-20 shrink-0 rounded-xl border-2 border-white object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-[#191E1B]">{pet.name}</p>
            <p className="text-sm text-[#4A564F]">{meta}</p>
            <p className="mt-1 font-mono text-xs font-bold text-[#234B54]">
              Čip: {hasMicrochip(chip) ? chip : EMPTY_PROFILE_LABEL}
            </p>
            <p className="mt-1 text-[11px] text-[#5A6660]">
              Soukromý náhled — celé číslo čipu a kontakty vidíte jen vy.
            </p>
          </div>
        </div>
      </div>

      {activeLost && (
        <div className="space-y-2 rounded-xl border border-[#7A1F1F]/30 bg-[#7A1F1F]/08 px-3 py-3">
          <div className="flex items-start gap-2 text-xs text-[#7A1F1F]">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              Mazlíček je označen jako ztracený — veřejná karta je v režimu pátrání. Nálezce uvidí
              přibližnou lokalitu a důležité pokyny, ne vaši adresu ani telefon.
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={async () => {
                const url = buildLostAnnouncementUrl(activeLost.publicToken)
                const ok = await copyTextToClipboard(url)
                showToast(
                  ok ? 'Odkaz zkopírován' : 'Odkaz',
                  ok ? 'Sdílejte veřejné oznámení o ztrátě.' : url,
                  'gold',
                )
              }}
            >
              <Copy size={14} />
              Sdílet oznámení
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                window.open(buildLostAnnouncementUrl(activeLost.publicToken), '_blank')
              }
            >
              <ExternalLink size={14} />
              Veřejné oznámení
            </Button>
          </div>
          {(activeLost.importantInstructions || activeLost.respondsToName) && (
            <div className="rounded-lg bg-white/70 px-3 py-2 text-xs text-[#4A564F]">
              {activeLost.respondsToName && (
                <p>
                  <span className="font-semibold">Slyší na:</span> {activeLost.respondsToName}
                </p>
              )}
              {activeLost.importantInstructions && (
                <p className="mt-1">
                  <span className="font-semibold">Pokyny:</span> {activeLost.importantInstructions}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {!activeLost && pet.lostStatus === 'lost' && (
        <div className="flex items-start gap-2 rounded-xl border border-[#7A1F1F]/30 bg-[#7A1F1F]/08 px-3 py-2.5 text-xs text-[#7A1F1F]">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            Mazlíček je označen jako ztracený — veřejná karta se automaticky přepne do výraznějšího
            režimu „ZTRATIL SE“.
          </span>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {emergencyVet && (
          <a
            href={`tel:${emergencyVet.phone.replace(/\s/g, '')}`}
            className="flex items-center gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3 transition-colors hover:bg-white"
          >
            <AlertTriangle size={18} className="shrink-0 text-[#B8934A]" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]">
                {emergencyVet.label}
              </p>
              <p className="text-sm font-bold text-[#191E1B]">{emergencyVet.phone}</p>
            </div>
          </a>
        )}
        {(card.vet?.clinicOrName || mainVet) && (
          <div className="flex items-center gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3">
            <Stethoscope size={18} className="shrink-0 text-[#234B54]" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]">
                {card.vet?.label || mainVet?.label || 'Hlavní veterinář'}
              </p>
              <p className="text-sm font-bold text-[#191E1B]">
                {card.vet?.clinicOrName || mainVet?.name}
              </p>
              <p className="text-xs text-[#7D8B82]">
                {card.vet?.phone || mainVet?.phone}
              </p>
            </div>
          </div>
        )}
        {emergencyPerson && (
          <div className="flex items-center gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3 sm:col-span-2">
            <Phone size={18} className="shrink-0 text-[#234B54]" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]">
                {emergencyPerson.label}
              </p>
              <p className="text-sm font-bold text-[#191E1B]">
                {emergencyPerson.name} · {emergencyPerson.phone}
              </p>
              <p className="text-[11px] text-[#7D8B82]">
                Pouze ve vašem náhledu — na veřejné kartě se nezobrazí.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3 text-xs leading-relaxed text-[#5A6660]">
        <p className="mb-1 font-bold text-[#191E1B]">Zdravotní poznámky (soukromé + nouzové)</p>
        {healthLines.length > 0 ? (
          <ul className="space-y-0.5">
            {healthLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p>
            Alergie / léčba zatím nevyplněny v nouzové kartě · Další očkování:{' '}
            {formatOptionalText(pet.nextVaccination)}
          </p>
        )}
        <p className="mt-2 text-[11px] text-[#7D8B82]">
          Veřejně se zobrazí jen položky, které výslovně povolíte níže. Výchozí stav je soukromý.
        </p>
      </div>
    </div>
  )
}
