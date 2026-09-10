import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type {
  BreedingAncestor,
  BreedingHealthTest,
  BreedingLitterRecord,
  BreedingMatingRecord,
  BreedingShowRecord,
  BreedingTitleRecord,
  Pet,
  PetDocument,
} from '../../../../types'
import {
  canManageLitters,
  newBreedingRecordId,
  pruneEmptyStrings,
  removeListItem,
  setBreedingList,
  upsertListItem,
  upsertPedigreeAncestor,
  validateLitterCounts,
} from '../../../../lib/breedingData'
import { formatIsoDateToCzech } from '../../../../lib/petProfileUtils'
import { Button } from '../../../ui/Button'
import { Input, Textarea } from '../../../ui/Input'
import { Modal } from '../../../ui/Modal'
import { OptionSelect } from '../../../ui/OptionSelect'
import { DocumentLinkPicker, LinkedDocumentsList } from './DocumentLinkPicker'
import { PartnerFields, PetLinkPicker } from './PetLinkPicker'
import { BreedingSection } from './BreedingSection'

type SaveBreeding = (breeding: NonNullable<Pet['breeding']>) => void

function formatMaybeIso(iso?: string) {
  if (!iso?.trim()) return undefined
  return iso.includes('-') ? formatIsoDateToCzech(iso) : iso
}

function RecordActions({
  onEdit,
  onDelete,
  readOnly,
}: {
  onEdit: () => void
  onDelete: () => void
  readOnly?: boolean
}) {
  if (readOnly) return null
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#7D8B82] hover:bg-[#EBF2EE] hover:text-[#2C4A3E] cursor-pointer"
        aria-label="Upravit"
      >
        <Pencil size={14} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#A3AEA7] hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
        aria-label="Smazat"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

/* ——— Pedigree ——— */

export function BreedingPedigreeSection({
  pet,
  pets,
  readOnly,
  onSave,
}: {
  pet: Pet
  pets: Pet[]
  readOnly?: boolean
  onSave: SaveBreeding
}) {
  const list = pet.breeding?.pedigree ?? []
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<BreedingAncestor | null>(null)
  const [form, setForm] = useState({
    role: 'sire' as BreedingAncestor['role'],
    name: '',
    breed: '',
    registrationNumber: '',
    linkedPetId: '' as string | undefined,
  })

  const openNew = (role: BreedingAncestor['role'] = 'sire') => {
    setEditing(null)
    setForm({ role, name: '', breed: '', registrationNumber: '', linkedPetId: undefined })
    setOpen(true)
  }

  const openEdit = (row: BreedingAncestor) => {
    setEditing(row)
    setForm({
      role: row.role,
      name: row.name ?? '',
      breed: row.breed ?? '',
      registrationNumber: row.registrationNumber ?? '',
      linkedPetId: row.linkedPetId,
    })
    setOpen(true)
  }

  const sire = list.find((a) => a.role === 'sire')
  const dam = list.find((a) => a.role === 'dam')
  const others = list.filter((a) => a.role === 'other')

  return (
    <>
      <BreedingSection
        title="Rodokmen"
        description="Otec, matka a další předci. Propojte existující profily, pokud jsou v aplikaci."
        actionLabel={readOnly ? undefined : 'Přidat předka'}
        onAction={readOnly ? undefined : () => openNew('other')}
        empty={list.length === 0}
        emptyLabel="Zatím bez záznamu rodičů."
      >
        <div className="space-y-2">
          {(['sire', 'dam'] as const).map((role) => {
            const row = role === 'sire' ? sire : dam
            const label = role === 'sire' ? 'Otec' : 'Matka'
            if (!row) {
              if (readOnly) return null
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => openNew(role)}
                  className="flex w-full items-center justify-between rounded-xl border border-dashed border-[#E8E4DC] bg-[#FAF8F5] px-3.5 py-3 text-left cursor-pointer hover:border-[#D1E0D8]"
                >
                  <span className="text-sm font-medium text-[#234B54]">{label} — Přidat údaj</span>
                </button>
              )
            }
            const linked = row.linkedPetId
              ? pets.find((p) => p.id === row.linkedPetId)
              : undefined
            return (
              <div
                key={row.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                    {label}
                  </p>
                  <p className="text-sm font-semibold text-[#191E1B]">
                    {row.name || linked?.name || 'Bez jména'}
                  </p>
                  <p className="text-xs text-[#7D8B82]">
                    {[row.breed, row.registrationNumber].filter(Boolean).join(' · ')}
                    {linked ? ` · propojeno: ${linked.name}` : ''}
                  </p>
                </div>
                <RecordActions
                  readOnly={readOnly}
                  onEdit={() => openEdit(row)}
                  onDelete={() =>
                    onSave(setBreedingList(pet.breeding, 'pedigree', removeListItem(list, row.id)))
                  }
                />
              </div>
            )
          })}
          {others.map((row) => {
            const linked = row.linkedPetId
              ? pets.find((p) => p.id === row.linkedPetId)
              : undefined
            return (
              <div
                key={row.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-[#E8E4DC] bg-white px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                    Další předek
                    {row.generation ? ` · gen. ${row.generation}` : ''}
                  </p>
                  <p className="text-sm font-semibold text-[#191E1B]">
                    {row.name || linked?.name || 'Bez jména'}
                  </p>
                  <p className="text-xs text-[#7D8B82]">
                    {[row.breed, row.registrationNumber].filter(Boolean).join(' · ')}
                    {linked ? ` · propojeno: ${linked.name}` : ''}
                  </p>
                </div>
                <RecordActions
                  readOnly={readOnly}
                  onEdit={() => openEdit(row)}
                  onDelete={() =>
                    onSave(setBreedingList(pet.breeding, 'pedigree', removeListItem(list, row.id)))
                  }
                />
              </div>
            )
          })}
        </div>
      </BreedingSection>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Upravit předka' : 'Přidat předka'}
        maxWidth="md"
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            const base: BreedingAncestor = {
              id: editing?.id ?? newBreedingRecordId('anc'),
              role: form.role,
              generation: form.role === 'other' ? editing?.generation ?? 2 : 1,
              side:
                form.role === 'sire' || form.role === 'dam'
                  ? form.role
                  : editing?.side,
              ...(pruneEmptyStrings({
                name: form.name,
                breed: form.breed,
                registrationNumber: form.registrationNumber,
                linkedPetId: form.linkedPetId,
              }) as Partial<BreedingAncestor>),
            }
            onSave(
              setBreedingList(
                pet.breeding,
                'pedigree',
                upsertPedigreeAncestor(list, base),
              ),
            )
            setOpen(false)
          }}
        >
          <OptionSelect
            id="anc-role"
            label="Role"
            value={form.role}
            onChange={(value) =>
              setForm((prev) => ({ ...prev, role: value as BreedingAncestor['role'] }))
            }
            options={[
              { value: 'sire', label: 'Otec' },
              { value: 'dam', label: 'Matka' },
              { value: 'other', label: 'Další předek' },
            ]}
          />
          {(form.role === 'sire' || form.role === 'dam') &&
            list.some(
              (a) =>
                a.role === form.role && a.id !== editing?.id,
            ) && (
              <p className="text-[11px] text-[#7D8B82]">
                U tohoto profilu už {form.role === 'sire' ? 'otec' : 'matka'} existuje — uložením
                se nahradí (nebude možné mít dva).
              </p>
            )}
          <Input
            id="anc-name"
            label="Jméno"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            id="anc-breed"
            label="Plemeno"
            value={form.breed}
            onChange={(e) => setForm((prev) => ({ ...prev, breed: e.target.value }))}
          />
          <Input
            id="anc-reg"
            label="Číslo PP / registrace"
            value={form.registrationNumber}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, registrationNumber: e.target.value }))
            }
          />
          <PetLinkPicker
            pets={pets}
            excludePetId={pet.id}
            selectedPetId={form.linkedPetId}
            onSelectPetId={(id) => setForm((prev) => ({ ...prev, linkedPetId: id }))}
            onSelectName={(name) => setForm((prev) => ({ ...prev, name: prev.name || name }))}
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

/* ——— Health tests ——— */

export function BreedingHealthTestsSection({
  pet,
  documents,
  readOnly,
  onSave,
}: {
  pet: Pet
  documents: PetDocument[]
  readOnly?: boolean
  onSave: SaveBreeding
}) {
  const list = pet.breeding?.healthTests ?? []
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<BreedingHealthTest | null>(null)
  const [form, setForm] = useState({
    name: '',
    result: '',
    date: '',
    laboratory: '',
    protocolNumber: '',
    notes: '',
    documentIds: [] as string[],
  })

  const openNew = () => {
    setEditing(null)
    setForm({
      name: '',
      result: '',
      date: '',
      laboratory: '',
      protocolNumber: '',
      notes: '',
      documentIds: [],
    })
    setOpen(true)
  }

  const openEdit = (row: BreedingHealthTest) => {
    setEditing(row)
    setForm({
      name: row.name,
      result: row.result ?? '',
      date: row.date ?? '',
      laboratory: row.laboratory ?? '',
      protocolNumber: row.protocolNumber ?? '',
      notes: row.notes ?? '',
      documentIds: row.documentIds ?? [],
    })
    setOpen(true)
  }

  return (
    <>
      <BreedingSection
        title="Zdravotní a genetické testy"
        description="Vlastní typy vyšetření (DKK, DLK, DNA, oči…). Dokumenty propojte z Dokumentů."
        actionLabel={readOnly ? undefined : 'Přidat vyšetření'}
        onAction={readOnly ? undefined : openNew}
        empty={list.length === 0}
      >
        <ul className="space-y-2">
          {list.map((row) => (
            <li
              key={row.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3.5 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#191E1B]">{row.name}</p>
                <p className="text-xs text-[#7D8B82]">
                  {[row.result, formatMaybeIso(row.date), row.laboratory, row.protocolNumber]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {row.notes && <p className="mt-1 text-xs text-[#4A564F]">{row.notes}</p>}
                <LinkedDocumentsList documents={documents} documentIds={row.documentIds} />
              </div>
              <RecordActions
                readOnly={readOnly}
                onEdit={() => openEdit(row)}
                onDelete={() =>
                  onSave(
                    setBreedingList(pet.breeding, 'healthTests', removeListItem(list, row.id)),
                  )
                }
              />
            </li>
          ))}
        </ul>
      </BreedingSection>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Upravit vyšetření' : 'Přidat vyšetření'}
        maxWidth="lg"
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!form.name.trim()) return
            const item: BreedingHealthTest = {
              id: editing?.id ?? newBreedingRecordId('ht'),
              name: form.name.trim(),
              ...(pruneEmptyStrings({
                result: form.result,
                date: form.date,
                laboratory: form.laboratory,
                protocolNumber: form.protocolNumber,
                notes: form.notes,
              }) as Partial<BreedingHealthTest>),
              documentIds: form.documentIds.length ? form.documentIds : undefined,
            }
            onSave(setBreedingList(pet.breeding, 'healthTests', upsertListItem(list, item)))
            setOpen(false)
          }}
        >
          <Input
            id="ht-name"
            label="Název vyšetření / testu"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="např. DKK, DNA, oční vyšetření…"
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="ht-result"
              label="Výsledek"
              value={form.result}
              onChange={(e) => setForm((prev) => ({ ...prev, result: e.target.value }))}
            />
            <Input
              id="ht-date"
              label="Datum"
              type="date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
            />
            <Input
              id="ht-lab"
              label="Laboratoř / veterinář / pracoviště"
              value={form.laboratory}
              onChange={(e) => setForm((prev) => ({ ...prev, laboratory: e.target.value }))}
            />
            <Input
              id="ht-protocol"
              label="Číslo protokolu"
              value={form.protocolNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, protocolNumber: e.target.value }))}
            />
          </div>
          <Textarea
            id="ht-notes"
            label="Poznámka"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
          <DocumentLinkPicker
            documents={documents}
            selectedIds={form.documentIds}
            onChange={(documentIds) => setForm((prev) => ({ ...prev, documentIds }))}
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

/* ——— Shows ——— */

export function BreedingShowsSection({
  pet,
  documents,
  readOnly,
  onSave,
}: {
  pet: Pet
  documents: PetDocument[]
  readOnly?: boolean
  onSave: SaveBreeding
}) {
  const list = pet.breeding?.shows ?? []
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<BreedingShowRecord | null>(null)
  const [form, setForm] = useState({
    name: '',
    date: '',
    location: '',
    showType: '',
    showClass: '',
    judge: '',
    result: '',
    titleAwarded: '',
    notes: '',
    documentIds: [] as string[],
  })

  const openNew = () => {
    setEditing(null)
    setForm({
      name: '',
      date: '',
      location: '',
      showType: '',
      showClass: '',
      judge: '',
      result: '',
      titleAwarded: '',
      notes: '',
      documentIds: [],
    })
    setOpen(true)
  }

  const openEdit = (row: BreedingShowRecord) => {
    setEditing(row)
    setForm({
      name: row.name,
      date: row.date ?? '',
      location: row.location ?? '',
      showType: row.showType ?? '',
      showClass: row.showClass ?? '',
      judge: row.judge ?? '',
      result: row.result ?? '',
      titleAwarded: row.titleAwarded ?? '',
      notes: row.notes ?? '',
      documentIds: row.documentIds ?? [],
    })
    setOpen(true)
  }

  return (
    <>
      <BreedingSection
        title="Výstavy a soutěže"
        description="Chovatelská výstavní historie. Výsledky a tituly můžete zadat volně."
        actionLabel={readOnly ? undefined : 'Přidat výstavu'}
        onAction={readOnly ? undefined : openNew}
        empty={list.length === 0}
      >
        <ul className="space-y-2">
          {list.map((row) => (
            <li
              key={row.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3.5 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#191E1B]">{row.name}</p>
                <p className="text-xs text-[#7D8B82]">
                  {[
                    formatMaybeIso(row.date),
                    row.location,
                    row.showType,
                    row.showClass,
                    row.result,
                    row.titleAwarded,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {row.judge && (
                  <p className="text-[11px] text-[#7D8B82]">Rozhodčí: {row.judge}</p>
                )}
                {row.notes && <p className="mt-1 text-xs text-[#4A564F]">{row.notes}</p>}
                <LinkedDocumentsList documents={documents} documentIds={row.documentIds} />
              </div>
              <RecordActions
                readOnly={readOnly}
                onEdit={() => openEdit(row)}
                onDelete={() =>
                  onSave(setBreedingList(pet.breeding, 'shows', removeListItem(list, row.id)))
                }
              />
            </li>
          ))}
        </ul>
      </BreedingSection>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Upravit výstavu' : 'Přidat výstavu'}
        maxWidth="lg"
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!form.name.trim()) return
            const item: BreedingShowRecord = {
              id: editing?.id ?? newBreedingRecordId('show'),
              name: form.name.trim(),
              calendarEventId: editing?.calendarEventId,
              photoIds: editing?.photoIds,
              ...(pruneEmptyStrings({
                date: form.date,
                location: form.location,
                showType: form.showType,
                showClass: form.showClass,
                judge: form.judge,
                result: form.result,
                titleAwarded: form.titleAwarded,
                notes: form.notes,
              }) as Partial<BreedingShowRecord>),
              documentIds: form.documentIds.length ? form.documentIds : undefined,
            }
            onSave(setBreedingList(pet.breeding, 'shows', upsertListItem(list, item)))
            setOpen(false)
          }}
        >
          <Input
            id="show-name"
            label="Název výstavy"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="show-date"
              label="Datum"
              type="date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
            />
            <Input
              id="show-loc"
              label="Místo"
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
            />
            <Input
              id="show-type"
              label="Typ výstavy"
              value={form.showType}
              onChange={(e) => setForm((prev) => ({ ...prev, showType: e.target.value }))}
            />
            <Input
              id="show-class"
              label="Třída"
              value={form.showClass}
              onChange={(e) => setForm((prev) => ({ ...prev, showClass: e.target.value }))}
            />
            <Input
              id="show-judge"
              label="Rozhodčí"
              value={form.judge}
              onChange={(e) => setForm((prev) => ({ ...prev, judge: e.target.value }))}
            />
            <Input
              id="show-result"
              label="Výsledek / ocenění"
              value={form.result}
              onChange={(e) => setForm((prev) => ({ ...prev, result: e.target.value }))}
              placeholder="Výborná, CAC, BOB…"
            />
            <Input
              id="show-title"
              label="Získaný titul"
              value={form.titleAwarded}
              onChange={(e) => setForm((prev) => ({ ...prev, titleAwarded: e.target.value }))}
            />
          </div>
          <Textarea
            id="show-notes"
            label="Poznámka"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
          <DocumentLinkPicker
            documents={documents}
            selectedIds={form.documentIds}
            onChange={(documentIds) => setForm((prev) => ({ ...prev, documentIds }))}
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

/* ——— Matings ——— */

export function BreedingMatingsSection({
  pet,
  pets,
  documents,
  readOnly,
  onSave,
}: {
  pet: Pet
  pets: Pet[]
  documents: PetDocument[]
  readOnly?: boolean
  onSave: SaveBreeding
}) {
  const list = pet.breeding?.matings ?? []
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<BreedingMatingRecord | null>(null)
  const [form, setForm] = useState({
    date: '',
    partnerName: '',
    partnerPetId: undefined as string | undefined,
    location: '',
    notes: '',
    documentIds: [] as string[],
  })

  const openNew = () => {
    setEditing(null)
    setForm({
      date: '',
      partnerName: '',
      partnerPetId: undefined,
      location: '',
      notes: '',
      documentIds: [],
    })
    setOpen(true)
  }

  const openEdit = (row: BreedingMatingRecord) => {
    setEditing(row)
    setForm({
      date: row.date ?? '',
      partnerName: row.partnerName ?? '',
      partnerPetId: row.partnerPetId,
      location: row.location ?? '',
      notes: row.notes ?? '',
      documentIds: row.documentIds ?? [],
    })
    setOpen(true)
  }

  return (
    <>
      <BreedingSection
        title="Krytí"
        description="Záznamy o krytí. Partner může být z aplikace nebo externí (bez nutnosti profilu)."
        actionLabel={readOnly ? undefined : 'Přidat krytí'}
        onAction={readOnly ? undefined : openNew}
        empty={list.length === 0}
      >
        <ul className="space-y-2">
          {list.map((row) => {
            const linked = row.partnerPetId
              ? pets.find((p) => p.id === row.partnerPetId)
              : undefined
            return (
              <li
                key={row.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#191E1B]">
                    {formatMaybeIso(row.date) || 'Datum neuvedeno'}
                    {row.partnerName || linked
                      ? ` · ${row.partnerName || linked?.name}`
                      : ''}
                  </p>
                  <p className="text-xs text-[#7D8B82]">
                    {[row.location, linked ? `profil: ${linked.name}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {row.notes && <p className="mt-1 text-xs text-[#4A564F]">{row.notes}</p>}
                  <LinkedDocumentsList documents={documents} documentIds={row.documentIds} />
                </div>
                <RecordActions
                  readOnly={readOnly}
                  onEdit={() => openEdit(row)}
                  onDelete={() =>
                    onSave(
                      setBreedingList(pet.breeding, 'matings', removeListItem(list, row.id)),
                    )
                  }
                />
              </li>
            )
          })}
        </ul>
      </BreedingSection>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Upravit krytí' : 'Přidat krytí'}
        maxWidth="lg"
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            const item: BreedingMatingRecord = {
              id: editing?.id ?? newBreedingRecordId('mat'),
              calendarEventId: editing?.calendarEventId,
              photoIds: editing?.photoIds,
              ...(pruneEmptyStrings({
                date: form.date,
                partnerName: form.partnerName,
                partnerPetId: form.partnerPetId,
                location: form.location,
                notes: form.notes,
              }) as Partial<BreedingMatingRecord>),
              documentIds: form.documentIds.length ? form.documentIds : undefined,
            }
            onSave(setBreedingList(pet.breeding, 'matings', upsertListItem(list, item)))
            setOpen(false)
          }}
        >
          <Input
            id="mat-date"
            label="Datum krytí"
            type="date"
            value={form.date}
            onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
          />
          <PartnerFields
            key={editing?.id ?? 'new-mating'}
            pets={pets}
            excludePetId={pet.id}
            partnerName={form.partnerName}
            partnerPetId={form.partnerPetId}
            onPartnerNameChange={(partnerName) => setForm((prev) => ({ ...prev, partnerName }))}
            onPartnerPetIdChange={(partnerPetId) =>
              setForm((prev) => ({ ...prev, partnerPetId }))
            }
          />
          <Input
            id="mat-loc"
            label="Místo"
            value={form.location}
            onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
          />
          <Textarea
            id="mat-notes"
            label="Poznámka"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
          <DocumentLinkPicker
            documents={documents}
            selectedIds={form.documentIds}
            onChange={(documentIds) => setForm((prev) => ({ ...prev, documentIds }))}
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

/* ——— Litters ——— */

export function BreedingLittersSection({
  pet,
  pets,
  documents,
  readOnly,
  onSave,
}: {
  pet: Pet
  pets: Pet[]
  documents: PetDocument[]
  readOnly?: boolean
  onSave: SaveBreeding
}) {
  const allowed = canManageLitters(pet)
  const list = pet.breeding?.litters ?? []
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<BreedingLitterRecord | null>(null)
  const [countError, setCountError] = useState<string | null>(null)
  const [form, setForm] = useState({
    birthDate: '',
    totalCount: '',
    maleCount: '',
    femaleCount: '',
    sireName: '',
    sirePetId: undefined as string | undefined,
    notes: '',
    documentIds: [] as string[],
  })

  if (!allowed && list.length === 0) return null

  const openNew = () => {
    setEditing(null)
    setCountError(null)
    setForm({
      birthDate: '',
      totalCount: '',
      maleCount: '',
      femaleCount: '',
      sireName: '',
      sirePetId: undefined,
      notes: '',
      documentIds: [],
    })
    setOpen(true)
  }

  const openEdit = (row: BreedingLitterRecord) => {
    setEditing(row)
    setCountError(null)
    setForm({
      birthDate: row.birthDate ?? '',
      totalCount: row.totalCount != null ? String(row.totalCount) : '',
      maleCount: row.maleCount != null ? String(row.maleCount) : '',
      femaleCount: row.femaleCount != null ? String(row.femaleCount) : '',
      sireName: row.sireName ?? '',
      sirePetId: row.sirePetId,
      notes: row.notes ?? '',
      documentIds: row.documentIds ?? [],
    })
    setOpen(true)
  }

  return (
    <>
      <BreedingSection
        title="Vrhy"
        description="Evidence vrhů. Profily mláďat se nevytvářejí automaticky — později je půjde propojit ručně."
        actionLabel={readOnly || !allowed ? undefined : 'Přidat vrh'}
        onAction={readOnly || !allowed ? undefined : openNew}
        empty={list.length === 0}
      >
        <ul className="space-y-2">
          {list.map((row) => {
            const linked = row.sirePetId
              ? pets.find((p) => p.id === row.sirePetId)
              : undefined
            return (
              <li
                key={row.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#191E1B]">
                    {formatMaybeIso(row.birthDate) || 'Datum neuvedeno'}
                    {row.totalCount != null ? ` · ${row.totalCount} mláďat` : ''}
                  </p>
                  <p className="text-xs text-[#7D8B82]">
                    {[
                      row.maleCount != null ? `${row.maleCount} samců` : null,
                      row.femaleCount != null ? `${row.femaleCount} fen` : null,
                      row.sireName || linked?.name
                        ? `otec: ${row.sireName || linked?.name}`
                        : null,
                      row.offspringPetIds?.length
                        ? `propojeno mláďat: ${row.offspringPetIds.length}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {row.notes && <p className="mt-1 text-xs text-[#4A564F]">{row.notes}</p>}
                  <LinkedDocumentsList documents={documents} documentIds={row.documentIds} />
                </div>
                <RecordActions
                  readOnly={readOnly}
                  onEdit={() => openEdit(row)}
                  onDelete={() =>
                    onSave(
                      setBreedingList(pet.breeding, 'litters', removeListItem(list, row.id)),
                    )
                  }
                />
              </li>
            )
          })}
        </ul>
      </BreedingSection>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Upravit vrh' : 'Přidat vrh'}
        maxWidth="lg"
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            const toNum = (raw: string) => {
              const n = Number(raw)
              return raw.trim() && !Number.isNaN(n) ? Math.max(0, Math.floor(n)) : undefined
            }
            const totalCount = toNum(form.totalCount)
            const maleCount = toNum(form.maleCount)
            const femaleCount = toNum(form.femaleCount)
            const countsCheck = validateLitterCounts({ totalCount, maleCount, femaleCount })
            if (!countsCheck.ok) {
              setCountError(countsCheck.message)
              return
            }
            setCountError(null)
            const item: BreedingLitterRecord = {
              id: editing?.id ?? newBreedingRecordId('lit'),
              calendarEventId: editing?.calendarEventId,
              photoIds: editing?.photoIds,
              offspringPetIds: editing?.offspringPetIds,
              totalCount,
              maleCount,
              femaleCount,
              ...(pruneEmptyStrings({
                birthDate: form.birthDate,
                sireName: form.sireName,
                sirePetId: form.sirePetId,
                notes: form.notes,
              }) as Partial<BreedingLitterRecord>),
              documentIds: form.documentIds.length ? form.documentIds : undefined,
            }
            onSave(setBreedingList(pet.breeding, 'litters', upsertListItem(list, item)))
            setOpen(false)
          }}
        >
          <Input
            id="lit-date"
            label="Datum narození"
            type="date"
            value={form.birthDate}
            onChange={(e) => setForm((prev) => ({ ...prev, birthDate: e.target.value }))}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              id="lit-total"
              label="Počet mláďat"
              type="number"
              min={0}
              value={form.totalCount}
              onChange={(e) => {
                setCountError(null)
                setForm((prev) => ({ ...prev, totalCount: e.target.value }))
              }}
            />
            <Input
              id="lit-m"
              label="Počet samců"
              type="number"
              min={0}
              value={form.maleCount}
              onChange={(e) => {
                setCountError(null)
                setForm((prev) => ({ ...prev, maleCount: e.target.value }))
              }}
              hint="Volitelné, pokud ještě není známé"
            />
            <Input
              id="lit-f"
              label="Počet fen"
              type="number"
              min={0}
              value={form.femaleCount}
              onChange={(e) => {
                setCountError(null)
                setForm((prev) => ({ ...prev, femaleCount: e.target.value }))
              }}
              hint="Volitelné, pokud ještě není známé"
            />
          </div>
          {countError && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800"
            >
              {countError}
            </p>
          )}
          <PartnerFields
            key={editing?.id ?? 'new-litter'}
            pets={pets}
            excludePetId={pet.id}
            partnerName={form.sireName}
            partnerPetId={form.sirePetId}
            onPartnerNameChange={(sireName) => setForm((prev) => ({ ...prev, sireName }))}
            onPartnerPetIdChange={(sirePetId) => setForm((prev) => ({ ...prev, sirePetId }))}
            nameLabel="Otec vrhu"
          />
          <Textarea
            id="lit-notes"
            label="Poznámka"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
          <DocumentLinkPicker
            documents={documents}
            selectedIds={form.documentIds}
            onChange={(documentIds) => setForm((prev) => ({ ...prev, documentIds }))}
          />
          <p className="text-[11px] text-[#7D8B82]">
            Propojení jednotlivých mláďat s profily LOVED & KNOWN bude možné později — teď se
            profily automaticky nevytvářejí.
          </p>
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

/* ——— Titles ——— */

export function BreedingTitlesSection({
  pet,
  documents,
  readOnly,
  onSave,
}: {
  pet: Pet
  documents: PetDocument[]
  readOnly?: boolean
  onSave: SaveBreeding
}) {
  const list = pet.breeding?.titles ?? []
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<BreedingTitleRecord | null>(null)
  const [form, setForm] = useState({
    name: '',
    date: '',
    showName: '',
    organization: '',
    notes: '',
    documentIds: [] as string[],
  })

  const openNew = () => {
    setEditing(null)
    setForm({
      name: '',
      date: '',
      showName: '',
      organization: '',
      notes: '',
      documentIds: [],
    })
    setOpen(true)
  }

  const openEdit = (row: BreedingTitleRecord) => {
    setEditing(row)
    setForm({
      name: row.name,
      date: row.date ?? '',
      showName: row.showName ?? '',
      organization: row.organization ?? '',
      notes: row.notes ?? '',
      documentIds: row.documentIds ?? [],
    })
    setOpen(true)
  }

  return (
    <>
      <BreedingSection
        title="Tituly a ocenění"
        description="Samostatná evidence titulů (mimo jednotlivé výstavní záznamy)."
        actionLabel={readOnly ? undefined : 'Přidat titul'}
        onAction={readOnly ? undefined : openNew}
        empty={list.length === 0}
      >
        <ul className="space-y-2">
          {list.map((row) => (
            <li
              key={row.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3.5 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#191E1B]">{row.name}</p>
                <p className="text-xs text-[#7D8B82]">
                  {[formatMaybeIso(row.date), row.showName, row.organization]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {row.notes && <p className="mt-1 text-xs text-[#4A564F]">{row.notes}</p>}
                <LinkedDocumentsList documents={documents} documentIds={row.documentIds} />
              </div>
              <RecordActions
                readOnly={readOnly}
                onEdit={() => openEdit(row)}
                onDelete={() =>
                  onSave(setBreedingList(pet.breeding, 'titles', removeListItem(list, row.id)))
                }
              />
            </li>
          ))}
        </ul>
      </BreedingSection>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Upravit titul' : 'Přidat titul'}
        maxWidth="md"
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!form.name.trim()) return
            const item: BreedingTitleRecord = {
              id: editing?.id ?? newBreedingRecordId('title'),
              name: form.name.trim(),
              ...(pruneEmptyStrings({
                date: form.date,
                showName: form.showName,
                organization: form.organization,
                notes: form.notes,
              }) as Partial<BreedingTitleRecord>),
              documentIds: form.documentIds.length ? form.documentIds : undefined,
            }
            onSave(setBreedingList(pet.breeding, 'titles', upsertListItem(list, item)))
            setOpen(false)
          }}
        >
          <Input
            id="title-name"
            label="Název titulu"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="title-date"
              label="Datum získání"
              type="date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
            />
            <Input
              id="title-show"
              label="Výstava / soutěž"
              value={form.showName}
              onChange={(e) => setForm((prev) => ({ ...prev, showName: e.target.value }))}
            />
            <Input
              id="title-org"
              label="Organizace"
              value={form.organization}
              onChange={(e) => setForm((prev) => ({ ...prev, organization: e.target.value }))}
            />
          </div>
          <Textarea
            id="title-notes"
            label="Poznámka"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
          <DocumentLinkPicker
            documents={documents}
            selectedIds={form.documentIds}
            onChange={(documentIds) => setForm((prev) => ({ ...prev, documentIds }))}
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
