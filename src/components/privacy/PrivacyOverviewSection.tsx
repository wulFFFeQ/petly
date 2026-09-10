import { Eye, Lock } from 'lucide-react'
import {
  ACCOUNT_PRIVACY_FIELDS,
  PET_PRIVACY_FIELDS,
  getEffectiveAccountLevel,
  getEffectivePetLevel,
  type AccountPrivacyFieldId,
  type PetPrivacyFieldId,
  type PrivacyLevel,
  type PrivacySettings,
} from '../../lib/privacy'
import type { Pet } from '../../types'
import { PrivacyVisibilitySelect } from './PrivacyVisibilitySelect'

type PrivacyOverviewSectionProps = {
  pets: Pet[]
  settings: PrivacySettings
  onPetFieldChange: (petId: string, fieldId: PetPrivacyFieldId, level: PrivacyLevel) => void
  onAccountFieldChange: (fieldId: AccountPrivacyFieldId, level: PrivacyLevel) => void
}

export function PrivacyOverviewSection({
  pets,
  settings,
  onPetFieldChange,
  onAccountFieldChange,
}: PrivacyOverviewSectionProps) {
  return (
    <div
      className="space-y-5"
      data-testid="privacy-overview-section"
      id="privacy-overview"
    >
      <div>
        <h3 className="text-base font-bold text-[#191E1B] mb-1 flex items-center gap-2">
          <Eye size={18} className="text-[#2C4A3E]" />
          <span>Co o mně a mých mazlíčcích ostatní vidí</span>
        </h3>
        <p className="text-xs text-[#4A564F] leading-relaxed">
          Každý citlivý údaj má vlastní viditelnost. Výchozí stav je soukromý — nic citlivého
          se nestane veřejným samo od sebe. Přesná adresa a zdravotní údaje nelze nastavit jako
          veřejné.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-[#7D8B82]">
          <span>🔒 Soukromé</span>
          <span>👥 Propojení / kontakty</span>
          <span>🌍 Veřejné</span>
        </div>
      </div>

      <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-4 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54] flex items-center gap-1.5">
          <Lock size={12} />
          Účet a domácnost
        </p>
        {ACCOUNT_PRIVACY_FIELDS.map((field) => {
          const level = getEffectiveAccountLevel(settings.account, field.id as AccountPrivacyFieldId)
          return (
            <div
              key={`account-${field.id}`}
              className="flex flex-col gap-2 rounded-xl border border-[#E8E4DC] bg-white px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
              data-privacy-row={`account:${field.id}`}
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#191E1B]">{field.label}</p>
                <p className="mt-0.5 text-[11px] text-[#7D8B82]">{field.description}</p>
                {field.maxLevel !== 'public' ? (
                  <p className="mt-1 text-[10px] text-[#B8934A]">
                    Maximálně pro propojení — nelze nastavit jako veřejné.
                  </p>
                ) : null}
              </div>
              <PrivacyVisibilitySelect
                id={`account:${field.id}`}
                value={level}
                maxLevel={field.maxLevel}
                onChange={(next) =>
                  onAccountFieldChange(field.id as AccountPrivacyFieldId, next)
                }
              />
            </div>
          )
        })}
      </div>

      {pets.map((pet) => (
        <div
          key={pet.id}
          className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-4 space-y-3"
          data-privacy-pet={pet.id}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]">
            {pet.name}
            {pet.publicDiscover ? ' · v Objevovat' : ''}
          </p>
          {PET_PRIVACY_FIELDS.map((field) => {
            const level = getEffectivePetLevel(
              settings.pets[pet.id],
              field.id as PetPrivacyFieldId,
            )
            return (
              <div
                key={`${pet.id}-${field.id}`}
                className="flex flex-col gap-2 rounded-xl border border-[#E8E4DC] bg-white px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
                data-privacy-row={`pet:${pet.id}:${field.id}`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#191E1B]">{field.label}</p>
                  <p className="mt-0.5 text-[11px] text-[#7D8B82]">{field.description}</p>
                  {field.maxLevel !== 'public' ? (
                    <p className="mt-1 text-[10px] text-[#B8934A]">
                      Maximálně pro propojení — nelze nastavit jako veřejné.
                    </p>
                  ) : null}
                </div>
                <PrivacyVisibilitySelect
                  id={`pet:${pet.id}:${field.id}`}
                  value={level}
                  maxLevel={field.maxLevel}
                  onChange={(next) =>
                    onPetFieldChange(pet.id, field.id as PetPrivacyFieldId, next)
                  }
                />
              </div>
            )
          })}
        </div>
      ))}

      {pets.length === 0 ? (
        <p className="text-xs text-[#7D8B82]">
          Zatím nemáte žádné mazlíčky — nastavení pro mazlíčky se zobrazí po jejich přidání.
        </p>
      ) : null}
    </div>
  )
}
