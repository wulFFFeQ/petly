import type { Pet } from '../../../../types'
import { OptionSelect } from '../../../ui/OptionSelect'
import { Input } from '../../../ui/Input'

interface PetLinkPickerProps {
  pets: Pet[]
  excludePetId?: string
  selectedPetId?: string
  onSelectPetId: (petId: string | undefined) => void
  /** When a pet is selected, optionally sync a display name field. */
  onSelectName?: (name: string) => void
  label?: string
  allowNoneLabel?: string
}

export function PetLinkPicker({
  pets,
  excludePetId,
  selectedPetId,
  onSelectPetId,
  onSelectName,
  label = 'Propojit s profilem v LOVED & KNOWN',
  allowNoneLabel = 'Bez propojení (externí)',
}: PetLinkPickerProps) {
  const options = pets
    .filter((pet) => pet.id !== excludePetId)
    .map((pet) => ({
      value: pet.id,
      label: `${pet.name} · ${pet.breed}`,
    }))

  return (
    <OptionSelect
      id="breeding-pet-link"
      label={label}
      value={selectedPetId ?? ''}
      onChange={(value) => {
        if (!value) {
          onSelectPetId(undefined)
          return
        }
        onSelectPetId(value)
        const match = pets.find((pet) => pet.id === value)
        if (match && onSelectName) onSelectName(match.name)
      }}
      options={[{ value: '', label: allowNoneLabel }, ...options]}
      placeholder={allowNoneLabel}
    />
  )
}

interface PartnerFieldsProps {
  pets: Pet[]
  excludePetId?: string
  partnerName: string
  partnerPetId?: string
  onPartnerNameChange: (name: string) => void
  onPartnerPetIdChange: (petId: string | undefined) => void
  nameLabel?: string
}

/** External name + optional L&K pet link (does not require creating a profile). */
export function PartnerFields({
  pets,
  excludePetId,
  partnerName,
  partnerPetId,
  onPartnerNameChange,
  onPartnerPetIdChange,
  nameLabel = 'Partner / partnerka',
}: PartnerFieldsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Input
        id="breeding-partner-name"
        label={nameLabel}
        value={partnerName}
        onChange={(e) => onPartnerNameChange(e.target.value)}
        placeholder="Jméno (i externí)"
      />
      <PetLinkPicker
        pets={pets}
        excludePetId={excludePetId}
        selectedPetId={partnerPetId}
        onSelectPetId={onPartnerPetIdChange}
        onSelectName={onPartnerNameChange}
        label="Nebo vybrat existujícího mazlíčka"
      />
    </div>
  )
}
