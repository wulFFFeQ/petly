import { useId, useState } from 'react'
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
  /** Full pet callback for autofilling pedigree / partner fields. */
  onSelectPet?: (pet: Pet | undefined) => void
  label?: string
  allowNoneLabel?: string
  id?: string
}

export function PetLinkPicker({
  pets,
  excludePetId,
  selectedPetId,
  onSelectPetId,
  onSelectName,
  onSelectPet,
  label = 'Propojit s profilem v LOVED & KNOWN',
  allowNoneLabel = 'Bez propojení',
  id,
}: PetLinkPickerProps) {
  const autoId = useId()
  const options = pets
    .filter((pet) => pet.id !== excludePetId)
    .map((pet) => ({
      value: pet.id,
      label: `${pet.name} · ${pet.breed}`,
    }))

  return (
    <OptionSelect
      id={id ?? autoId}
      label={label}
      value={selectedPetId ?? ''}
      onChange={(value) => {
        if (!value) {
          onSelectPetId(undefined)
          onSelectPet?.(undefined)
          return
        }
        onSelectPetId(value)
        const match = pets.find((pet) => pet.id === value)
        if (match && onSelectName) onSelectName(match.name)
        onSelectPet?.(match)
      }}
      options={[{ value: '', label: allowNoneLabel }, ...options]}
      placeholder={allowNoneLabel}
    />
  )
}

type PartnerSource = 'external' | 'linked'

interface PartnerFieldsProps {
  pets: Pet[]
  excludePetId?: string
  partnerName: string
  partnerPetId?: string
  onPartnerNameChange: (name: string) => void
  onPartnerPetIdChange: (petId: string | undefined) => void
  /** Top label above the source switch (e.g. „Otec vrhu“). */
  sourceLabel?: string
  externalOptionLabel?: string
  linkedOptionLabel?: string
  /** Label for the external name input. */
  externalNameLabel?: string
  externalNamePlaceholder?: string
  linkedSelectLabel?: string
  /** @deprecated Prefer externalNameLabel — kept for mating default copy. */
  nameLabel?: string
}

/**
 * Explicit choice: either link an existing L&K pet, or enter an external partner.
 * Never shows both inputs as competing primary fields at once.
 */
export function PartnerFields({
  pets,
  excludePetId,
  partnerName,
  partnerPetId,
  onPartnerNameChange,
  onPartnerPetIdChange,
  sourceLabel = 'Zdroj partnera',
  externalOptionLabel = 'Externí partner (ručně)',
  linkedOptionLabel = 'Existující profil v LOVED & KNOWN',
  externalNameLabel,
  externalNamePlaceholder = 'Jméno externího partnera',
  linkedSelectLabel,
  nameLabel = 'Partner / partnerka',
}: PartnerFieldsProps) {
  const sourceId = useId()
  const [source, setSource] = useState<PartnerSource>(() =>
    partnerPetId ? 'linked' : 'external',
  )
  const resolvedExternalLabel = externalNameLabel ?? nameLabel
  const resolvedLinkedLabel = linkedSelectLabel ?? `Vybrat ${nameLabel.toLowerCase()}`

  return (
    <div className="space-y-3">
      <OptionSelect
        id={sourceId}
        label={sourceLabel}
        value={source}
        onChange={(value) => {
          const next = value as PartnerSource
          setSource(next)
          if (next === 'external') {
            onPartnerPetIdChange(undefined)
          } else if (next === 'linked' && partnerPetId) {
            const match = pets.find((pet) => pet.id === partnerPetId)
            if (match) onPartnerNameChange(match.name)
          }
        }}
        options={[
          { value: 'external', label: externalOptionLabel },
          { value: 'linked', label: linkedOptionLabel },
        ]}
      />

      {source === 'external' ? (
        <Input
          id={`${sourceId}-name`}
          label={resolvedExternalLabel}
          value={partnerName}
          onChange={(e) => onPartnerNameChange(e.target.value)}
          placeholder={externalNamePlaceholder}
          hint="Profil v aplikaci se nevytváří."
        />
      ) : (
        <PetLinkPicker
          id={`${sourceId}-pet`}
          pets={pets}
          excludePetId={excludePetId}
          selectedPetId={partnerPetId}
          onSelectPetId={(id) => {
            onPartnerPetIdChange(id)
            if (!id) return
            const match = pets.find((pet) => pet.id === id)
            if (match) onPartnerNameChange(match.name)
          }}
          label={resolvedLinkedLabel}
          allowNoneLabel="Vyberte mazlíčka…"
        />
      )}
    </div>
  )
}
