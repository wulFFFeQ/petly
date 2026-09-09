import { ensureEmergencyCardSettings, mergeEmergencyVisibility } from '../../../lib/emergencyCard'
import type { Pet } from '../../../types'
import type {
  EmergencyCardHealthContent,
  EmergencyCardSettings,
  EmergencyCardVisibility,
} from '../../../types/emergencyCard'
import { Input } from '../../ui/Input'

interface EmergencyCardSettingsPanelProps {
  pet: Pet
  onChange: (next: EmergencyCardSettings) => void
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3 py-2.5 text-left transition-colors hover:bg-white"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#191E1B]">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] leading-relaxed text-[#7D8B82]">{hint}</p>}
      </div>
      <span
        className={[
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-[#2C4A3E]' : 'bg-[#D1D9D4]',
        ].join(' ')}
        aria-hidden
      >
        <span
          className={[
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
            checked ? 'left-5' : 'left-0.5',
          ].join(' ')}
        />
      </span>
      <span className="sr-only">{checked ? 'Ano' : 'Ne'}</span>
    </button>
  )
}

export function EmergencyCardSettingsPanel({ pet, onChange }: EmergencyCardSettingsPanelProps) {
  const card = ensureEmergencyCardSettings(pet)
  const v = card.visibility
  const health = card.health ?? {}

  const setVisibility = (patch: Partial<EmergencyCardVisibility>) => {
    onChange({
      ...card,
      visibility: mergeEmergencyVisibility({ ...v, ...patch }),
    })
  }

  const setHealth = (patch: Partial<EmergencyCardHealthContent>) => {
    onChange({
      ...card,
      health: { ...health, ...patch },
    })
  }

  const setVet = (patch: Partial<NonNullable<EmergencyCardSettings['vet']>>) => {
    onChange({
      ...card,
      vet: {
        clinicOrName: card.vet?.clinicOrName ?? '',
        ...card.vet,
        ...patch,
      },
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#234B54]">
          Zobrazit v nouzové kartě
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-[#7D8B82]">
          Každý citlivý údaj je výchozí NE. Základní identifikace (foto, jméno, druh, plemeno) je
          vždy veřejná.
        </p>
      </div>

      <div className="space-y-2">
        <ToggleRow
          label="Věk"
          checked={v.showAge}
          onChange={(showAge) => setVisibility({ showAge })}
        />
        <ToggleRow
          label="Pohlaví"
          checked={v.showGender}
          onChange={(showGender) => setVisibility({ showGender })}
        />
        <ToggleRow
          label="Mikročip (pouze maskovaný)"
          hint="Veřejně nikdy celé číslo — jen např. ••••••••7890"
          checked={v.showMaskedMicrochip}
          onChange={(showMaskedMicrochip) => setVisibility({ showMaskedMicrochip })}
        />
      </div>

      <div className="space-y-2 border-t border-[#E8E4DC] pt-3">
        <p className="text-xs font-bold uppercase tracking-wider text-[#234B54]">
          Akutní zdravotní informace
        </p>
        <label className="block">
          <span className="text-[11px] font-semibold text-[#5A6660]">Alergie</span>
          <Input
            value={health.allergies ?? ''}
            onChange={(e) => setHealth({ allergies: e.target.value })}
            placeholder="např. penicilin"
            className="mt-1"
          />
        </label>
        <ToggleRow
          label="Zobrazit alergie"
          checked={v.showHealthAllergies}
          onChange={(showHealthAllergies) => setVisibility({ showHealthAllergies })}
        />
        <label className="block">
          <span className="text-[11px] font-semibold text-[#5A6660]">Chronické onemocnění</span>
          <Input
            value={health.chronicConditions ?? ''}
            onChange={(e) => setHealth({ chronicConditions: e.target.value })}
            placeholder="např. epilepsie"
            className="mt-1"
          />
        </label>
        <ToggleRow
          label="Zobrazit chronické onemocnění"
          checked={v.showHealthChronic}
          onChange={(showHealthChronic) => setVisibility({ showHealthChronic })}
        />
        <label className="block">
          <span className="text-[11px] font-semibold text-[#5A6660]">Pravidelná léčba</span>
          <Input
            value={health.regularMedication ?? ''}
            onChange={(e) => setHealth({ regularMedication: e.target.value })}
            placeholder="např. potřebuje léky 2× denně"
            className="mt-1"
          />
        </label>
        <ToggleRow
          label="Zobrazit léčbu"
          checked={v.showHealthMedication}
          onChange={(showHealthMedication) => setVisibility({ showHealthMedication })}
        />
        <label className="block">
          <span className="text-[11px] font-semibold text-[#5A6660]">Důležitá omezení</span>
          <Input
            value={health.importantRestrictions ?? ''}
            onChange={(e) => setHealth({ importantRestrictions: e.target.value })}
            placeholder="např. nesmí čokoládu / hrozny"
            className="mt-1"
          />
        </label>
        <ToggleRow
          label="Zobrazit omezení"
          checked={v.showHealthRestrictions}
          onChange={(showHealthRestrictions) => setVisibility({ showHealthRestrictions })}
        />
        <label className="block">
          <span className="text-[11px] font-semibold text-[#5A6660]">Další akutní poznámka</span>
          <Input
            value={health.other ?? ''}
            onChange={(e) => setHealth({ other: e.target.value })}
            placeholder="Volitelně"
            className="mt-1"
          />
        </label>
        <ToggleRow
          label="Zobrazit další poznámku"
          checked={v.showHealthOther}
          onChange={(showHealthOther) => setVisibility({ showHealthOther })}
        />
      </div>

      <div className="space-y-2 border-t border-[#E8E4DC] pt-3">
        <p className="text-xs font-bold uppercase tracking-wider text-[#234B54]">
          Veterinární kontakt
        </p>
        <label className="block">
          <span className="text-[11px] font-semibold text-[#5A6660]">Klinika / veterinář</span>
          <Input
            value={card.vet?.clinicOrName ?? ''}
            onChange={(e) => setVet({ clinicOrName: e.target.value })}
            placeholder="např. PetCare Central Praha"
            className="mt-1"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold text-[#5A6660]">Telefon kliniky</span>
          <Input
            value={card.vet?.phone ?? ''}
            onChange={(e) => setVet({ phone: e.target.value })}
            placeholder="+420 …"
            className="mt-1"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold text-[#5A6660]">Adresa pro navigaci</span>
          <Input
            value={card.vet?.navigateQuery ?? ''}
            onChange={(e) => setVet({ navigateQuery: e.target.value })}
            placeholder="Adresa kliniky (ne domov)"
            className="mt-1"
          />
        </label>
        <ToggleRow
          label="Zobrazit veterináře na veřejné kartě"
          checked={v.showVet}
          onChange={(showVet) => setVisibility({ showVet })}
        />
        <ToggleRow
          label="Povolit tlačítko Zavolat"
          hint="Pouze telefon kliniky — nikoli váš osobní"
          checked={v.showVetPhone}
          onChange={(showVetPhone) => setVisibility({ showVetPhone })}
        />
        <ToggleRow
          label="Povolit tlačítko Navigovat"
          checked={v.showVetNavigate}
          onChange={(showVetNavigate) => setVisibility({ showVetNavigate })}
        />
      </div>

      <div className="space-y-2 border-t border-[#E8E4DC] pt-3">
        <p className="text-xs font-bold uppercase tracking-wider text-[#234B54]">Tisk</p>
        <label className="block">
          <span className="text-[11px] font-semibold text-[#5A6660]">
            Váš telefon jen na tištěnou kartu (volitelné)
          </span>
          <Input
            value={card.ownerPhoneForPrint ?? ''}
            onChange={(e) => onChange({ ...card, ownerPhoneForPrint: e.target.value })}
            placeholder="Výchozí: prázdné — preferujte QR"
            className="mt-1"
          />
        </label>
        <ToggleRow
          label="Vložit telefon na tištěnou kartu"
          hint="Digitální veřejná stránka telefon majitele nikdy neukáže automaticky"
          checked={v.showOwnerPhoneOnPrint}
          onChange={(showOwnerPhoneOnPrint) => setVisibility({ showOwnerPhoneOnPrint })}
        />
      </div>
    </div>
  )
}
