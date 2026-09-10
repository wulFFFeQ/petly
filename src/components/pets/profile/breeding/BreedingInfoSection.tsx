import { useEffect, useState } from 'react'
import type { BreedingInfo, Pet } from '../../../../types'
import {
  resolveBreedingDisplayBreed,
  resolveBreedingDisplayDob,
  resolveBreedingDisplayGender,
  setBreedingInfo,
} from '../../../../lib/breedingData'
import { formatIsoDateToCzech } from '../../../../lib/petProfileUtils'
import { Button } from '../../../ui/Button'
import { Input, Textarea } from '../../../ui/Input'
import { Modal } from '../../../ui/Modal'
import { BreedingFieldRow, BreedingSection } from './BreedingSection'

interface BreedingInfoSectionProps {
  pet: Pet
  readOnly?: boolean
  onSave: (breeding: ReturnType<typeof setBreedingInfo>) => void
}

export function BreedingInfoSection({ pet, readOnly, onSave }: BreedingInfoSectionProps) {
  const [open, setOpen] = useState(false)
  const info = pet.breeding?.info
  const [form, setForm] = useState<BreedingInfo>({})

  useEffect(() => {
    if (!open) return
    setForm({
      kennelName: info?.kennelName ?? '',
      registrationNumber: info?.registrationNumber ?? '',
      breed: info?.breed ?? '',
      gender: info?.gender ?? '',
      dateOfBirth: info?.dateOfBirth ?? '',
      pedigreeNumber: info?.pedigreeNumber ?? '',
      breeder: info?.breeder ?? '',
      owner: info?.owner ?? '',
      countryOfOrigin: info?.countryOfOrigin ?? '',
      coatColor: info?.coatColor ?? '',
      notes: info?.notes ?? '',
    })
  }, [open, info])

  const displayBreed = resolveBreedingDisplayBreed(pet)
  const displayGender = resolveBreedingDisplayGender(pet)
  const displayDobRaw = resolveBreedingDisplayDob(pet)
  const displayDob = displayDobRaw
    ? displayDobRaw.includes('-')
      ? formatIsoDateToCzech(displayDobRaw)
      : displayDobRaw
    : undefined
  const breedFromProfile = !info?.breed?.trim() && Boolean(pet.breed?.trim())
  const genderFromProfile = !info?.gender?.trim() && Boolean(pet.gender?.trim())
  const dobFromProfile = !info?.dateOfBirth?.trim() && Boolean(pet.dateOfBirth?.trim())

  const openEditor = () => {
    if (readOnly) return
    setOpen(true)
  }

  const optionalRows: { label: string; value?: string }[] = [
    { label: 'Chovná stanice', value: info?.kennelName },
    { label: 'Číslo zápisu / registrace', value: info?.registrationNumber },
    { label: 'Číslo průkazu původu', value: info?.pedigreeNumber },
    { label: 'Chovatel', value: info?.breeder },
    { label: 'Majitel', value: info?.owner },
    { label: 'Země původu', value: info?.countryOfOrigin },
    { label: 'Barva / varianta srsti', value: info?.coatColor },
    { label: 'Poznámka k chovu', value: info?.notes },
  ]
  const filledOptional = optionalRows.filter((row) => row.value?.trim())

  return (
    <>
      <BreedingSection
        title="Chovatelské informace"
        description="Údaje specifické pro chov — neupravují běžný profil mazlíčka."
        actionLabel={readOnly ? undefined : 'Upravit'}
        onAction={readOnly ? undefined : openEditor}
      >
        <div>
          <BreedingFieldRow
            label="Plemeno"
            value={displayBreed}
            fromProfile={breedFromProfile}
            onAdd={readOnly || displayBreed ? undefined : openEditor}
          />
          <BreedingFieldRow
            label="Pohlaví"
            value={displayGender}
            fromProfile={genderFromProfile}
            onAdd={readOnly || displayGender ? undefined : openEditor}
          />
          <BreedingFieldRow
            label="Datum narození"
            value={displayDob}
            fromProfile={dobFromProfile}
            onAdd={readOnly || displayDob ? undefined : openEditor}
          />
          {filledOptional.map((row) => (
            <BreedingFieldRow key={row.label} label={row.label} value={row.value} />
          ))}
          {!readOnly && filledOptional.length < optionalRows.length && (
            <button
              type="button"
              onClick={openEditor}
              className="mt-2 text-sm font-medium text-[#234B54] hover:underline cursor-pointer"
            >
              Přidat údaj
            </button>
          )}
        </div>
      </BreedingSection>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Chovatelské informace"
        subtitle="Volitelné údaje pro chov — běžný profil mazlíčka se nemění."
        maxWidth="lg"
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            onSave(setBreedingInfo(pet.breeding, form))
            setOpen(false)
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="bi-kennel"
              label="Chovná stanice"
              value={form.kennelName ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, kennelName: e.target.value }))}
            />
            <Input
              id="bi-reg"
              label="Číslo zápisu / registrace"
              value={form.registrationNumber ?? ''}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, registrationNumber: e.target.value }))
              }
            />
            <Input
              id="bi-breed"
              label="Plemeno (chovný kontext)"
              value={form.breed ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, breed: e.target.value }))}
              hint={pet.breed ? `V profilu: ${pet.breed}` : undefined}
            />
            <Input
              id="bi-gender"
              label="Pohlaví (chovný kontext)"
              value={form.gender ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value }))}
              hint={pet.gender ? `V profilu: ${pet.gender}` : undefined}
            />
            <Input
              id="bi-dob"
              label="Datum narození"
              type="date"
              value={form.dateOfBirth ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
            />
            <Input
              id="bi-pp"
              label="Číslo průkazu původu"
              value={form.pedigreeNumber ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, pedigreeNumber: e.target.value }))}
            />
            <Input
              id="bi-breeder"
              label="Chovatel"
              value={form.breeder ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, breeder: e.target.value }))}
            />
            <Input
              id="bi-owner"
              label="Majitel"
              value={form.owner ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, owner: e.target.value }))}
            />
            <Input
              id="bi-country"
              label="Země původu"
              value={form.countryOfOrigin ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, countryOfOrigin: e.target.value }))}
            />
            <Input
              id="bi-color"
              label="Barva / varianta srsti"
              value={form.coatColor ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, coatColor: e.target.value }))}
            />
          </div>
          <Textarea
            id="bi-notes"
            label="Poznámka k chovu"
            value={form.notes ?? ''}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Zrušit
            </Button>
            <Button type="submit" variant="primary">
              Uložit
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
