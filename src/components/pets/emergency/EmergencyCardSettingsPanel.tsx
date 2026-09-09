import { ensureEmergencyCardSettings, mergeEmergencyVisibility } from '../../../lib/emergencyCard'
import { hasMicrochip } from '../../../lib/petProfileDisplay'
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
  disabled,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'flex w-full items-center justify-between gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3 py-2.5 text-left transition-colors',
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-white',
      ].join(' ')}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#191E1B]">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] leading-relaxed text-[#7D8B82]">{hint}</p>}
      </div>
      <span
        className={[
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked && !disabled ? 'bg-[#2C4A3E]' : 'bg-[#D1D9D4]',
        ].join(' ')}
        aria-hidden
      >
        <span
          className={[
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
            checked && !disabled ? 'left-5' : 'left-0.5',
          ].join(' ')}
        />
      </span>
      <span className="sr-only">{checked ? 'Ano' : 'Ne'}</span>
    </button>
  )
}

function HealthField({
  label,
  placeholder,
  value,
  published,
  onCommit,
}: {
  label: string
  placeholder: string
  value: string
  published: boolean
  onCommit: (nextValue: string, nextPublished: boolean) => void
}) {
  const filled = value.trim().length > 0

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="text-[11px] font-semibold text-[#5A6660]">{label}</span>
        <Input
          value={value}
          onChange={(e) => {
            const next = e.target.value
            onCommit(next, next.trim() ? published : false)
          }}
          placeholder={placeholder}
          className="mt-1"
        />
      </label>
      {filled && (
        <ToggleRow
          label={`Zobrazit: ${label}`}
          checked={published}
          onChange={(nextPublished) => onCommit(value, nextPublished)}
        />
      )}
    </div>
  )
}

export function EmergencyCardSettingsPanel({ pet, onChange }: EmergencyCardSettingsPanelProps) {
  const card = ensureEmergencyCardSettings(pet)
  const v = card.visibility
  const health = card.health ?? {}
  const chipAvailable = hasMicrochip(pet.microchip)

  const setVisibility = (patch: Partial<EmergencyCardVisibility>) => {
    onChange({
      ...card,
      visibility: mergeEmergencyVisibility({ ...v, ...patch }),
    })
  }

  const setHealthField = (
    key: keyof EmergencyCardHealthContent,
    visibilityKey:
      | 'showHealthAllergies'
      | 'showHealthChronic'
      | 'showHealthMedication'
      | 'showHealthRestrictions'
      | 'showHealthOther',
    nextValue: string,
    nextPublished: boolean,
  ) => {
    onChange({
      ...card,
      health: { ...health, [key]: nextValue },
      visibility: mergeEmergencyVisibility({
        ...v,
        [visibilityKey]: nextValue.trim() ? nextPublished : false,
      }),
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
          Foto, jméno, druh, plemeno, věk a pohlaví jsou vždy veřejné. Citlivé údaje výchozí NE.
        </p>
      </div>

      <div className="space-y-2">
        <ToggleRow
          label="Mikročip (pouze maskovaný)"
          hint={
            chipAvailable
              ? 'Veřejně nikdy celé číslo — jen např. ••••••••7890'
              : 'Nejdříve doplňte číslo čipu v profilu'
          }
          checked={v.showMaskedMicrochip}
          disabled={!chipAvailable}
          onChange={(showMaskedMicrochip) => setVisibility({ showMaskedMicrochip })}
        />
      </div>

      <div className="space-y-3 border-t border-[#E8E4DC] pt-3">
        <p className="text-xs font-bold uppercase tracking-wider text-[#234B54]">
          Akutní zdravotní informace
        </p>
        <HealthField
          label="Alergie"
          placeholder="např. penicilin"
          value={health.allergies ?? ''}
          published={v.showHealthAllergies}
          onCommit={(value, published) =>
            setHealthField('allergies', 'showHealthAllergies', value, published)
          }
        />
        <HealthField
          label="Chronické onemocnění"
          placeholder="např. epilepsie"
          value={health.chronicConditions ?? ''}
          published={v.showHealthChronic}
          onCommit={(value, published) =>
            setHealthField('chronicConditions', 'showHealthChronic', value, published)
          }
        />
        <HealthField
          label="Pravidelná léčba"
          placeholder="např. potřebuje léky 2× denně"
          value={health.regularMedication ?? ''}
          published={v.showHealthMedication}
          onCommit={(value, published) =>
            setHealthField('regularMedication', 'showHealthMedication', value, published)
          }
        />
        <HealthField
          label="Důležitá omezení"
          placeholder="např. nesmí čokoládu / hrozny"
          value={health.importantRestrictions ?? ''}
          published={v.showHealthRestrictions}
          onCommit={(value, published) =>
            setHealthField('importantRestrictions', 'showHealthRestrictions', value, published)
          }
        />
        <HealthField
          label="Další akutní poznámka"
          placeholder="Volitelně"
          value={health.other ?? ''}
          published={v.showHealthOther}
          onCommit={(value, published) =>
            setHealthField('other', 'showHealthOther', value, published)
          }
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
          hint="Hlavní přepínač — bez něj není veřejný ani telefon, ani navigace"
          checked={v.showVet}
          onChange={(showVet) =>
            setVisibility(
              showVet
                ? { showVet: true }
                : { showVet: false, showVetPhone: false, showVetNavigate: false },
            )
          }
        />
        <ToggleRow
          label="Povolit tlačítko Zavolat"
          hint="Pouze telefon kliniky — nikoli váš osobní"
          checked={v.showVet && v.showVetPhone}
          disabled={!v.showVet}
          onChange={(showVetPhone) => setVisibility({ showVetPhone })}
        />
        <ToggleRow
          label="Povolit tlačítko Navigovat"
          checked={v.showVet && v.showVetNavigate}
          disabled={!v.showVet}
          onChange={(showVetNavigate) => setVisibility({ showVetNavigate })}
        />
      </div>

      <div className="space-y-2 border-t border-[#E8E4DC] pt-3">
        <p className="text-xs font-bold uppercase tracking-wider text-[#234B54]">Tisk</p>
        <label className="block">
          <span className="text-[11px] font-semibold text-[#5A6660]">
            Telefon na tištěné kartě (volitelné)
          </span>
          <Input
            value={card.ownerPhoneForPrint ?? ''}
            onChange={(e) => onChange({ ...card, ownerPhoneForPrint: e.target.value })}
            placeholder="Výchozí: prázdné — doporučujeme QR kód a bezpečný kontakt."
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
