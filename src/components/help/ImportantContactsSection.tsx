import {
  AlertCircle,
  Home,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Scissors,
  Stethoscope,
  Trash2,
  User,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { contactTypeLabel } from '../../lib/contacts/normalize'
import { cn } from '../../lib/utils'
import type { ImportantContact, ImportantContactType } from '../../types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { IconBox } from '../ui/IconBox'
import { Input, Select, Textarea } from '../ui/Input'
import { Modal } from '../ui/Modal'

const CONTACT_TYPES: { value: ImportantContactType; label: string }[] = [
  { value: 'vet', label: 'Veterinář' },
  { value: 'emergency', label: 'Veterinární pohotovost' },
  { value: 'shelter', label: 'Útulek' },
  { value: 'groomer', label: 'Groomer' },
  { value: 'trainer', label: 'Trenér' },
  { value: 'custom', label: 'Vlastní kontakt' },
]

const CONTACT_ICONS: Record<ImportantContactType, typeof Phone> = {
  emergency: AlertCircle,
  vet: Stethoscope,
  shelter: Home,
  groomer: Scissors,
  trainer: User,
  custom: Phone,
}

type ContactFormState = {
  name: string
  type: ImportantContactType
  phone: string
  email: string
  address: string
  note: string
  petIds: string[]
  primaryPetId: string
}

const emptyForm = (): ContactFormState => ({
  name: '',
  type: 'vet',
  phone: '',
  email: '',
  address: '',
  note: '',
  petIds: [],
  primaryPetId: '',
})

function formFromContact(c: ImportantContact): ContactFormState {
  return {
    name: c.name,
    type: c.type,
    phone: c.phone ?? '',
    email: c.email ?? '',
    address: c.address ?? '',
    note: c.note ?? '',
    petIds: [...c.petIds],
    primaryPetId: c.primaryForPetIds[0] ?? '',
  }
}

function telHref(phone: string) {
  return `tel:${phone.replace(/\s/g, '')}`
}

function mapsHref(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

function mailHref(email: string) {
  return `mailto:${email}`
}

export function ImportantContactsSection({ hideHeader = false }: { hideHeader?: boolean }) {
  const {
    pets,
    importantContacts,
    addContact,
    updateContact,
    deleteContact,
    setPrimaryContact,
    showToast,
  } = useApp()

  const [filterPetId, setFilterPetId] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ContactFormState>(emptyForm)

  const filtered = useMemo(() => {
    if (!filterPetId) return importantContacts
    return importantContacts.filter(
      (c) => c.petIds.length === 0 || c.petIds.includes(filterPetId),
    )
  }, [importantContacts, filterPetId])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  const openEdit = (contact: ImportantContact) => {
    setEditingId(contact.id)
    setForm(formFromContact(contact))
    setModalOpen(true)
  }

  const togglePet = (petId: string) => {
    setForm((prev) => {
      const has = prev.petIds.includes(petId)
      const petIds = has ? prev.petIds.filter((id) => id !== petId) : [...prev.petIds, petId]
      const primaryPetId =
        prev.primaryPetId && !petIds.includes(prev.primaryPetId) && petIds.length > 0
          ? prev.primaryPetId
          : prev.primaryPetId && petIds.includes(prev.primaryPetId)
            ? prev.primaryPetId
            : prev.primaryPetId
      return { ...prev, petIds, primaryPetId: petIds.length === 0 ? prev.primaryPetId : primaryPetId }
    })
  }

  const handleSave = () => {
    if (!form.name.trim()) {
      showToast('Vyplňte název', 'Kontakt musí mít jméno.', 'info')
      return
    }
    const primaryForPetIds = form.primaryPetId ? [form.primaryPetId] : []
    const payload = {
      name: form.name.trim(),
      type: form.type,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      note: form.note.trim() || undefined,
      petIds: form.petIds,
      primaryForPetIds,
      label: undefined as string | undefined,
    }

    if (editingId) {
      updateContact(editingId, payload)
      if (form.primaryPetId) setPrimaryContact(form.primaryPetId, editingId)
      showToast('Kontakt upraven', form.name.trim(), 'success')
    } else {
      const created = addContact(payload)
      if (form.primaryPetId) setPrimaryContact(form.primaryPetId, created.id)
      showToast('Kontakt vytvořen', form.name.trim(), 'success')
    }
    setModalOpen(false)
  }

  const handleDelete = (contact: ImportantContact) => {
    deleteContact(contact.id)
    showToast('Kontakt smazán', contact.name, 'info')
    setModalOpen(false)
  }

  const petFilterOptions = [
    { value: '', label: 'Všichni mazlíčci' },
    ...pets.map((p) => ({ value: p.id, label: p.name })),
  ]

  const primaryOptions = [
    { value: '', label: 'Žádný (není primární)' },
    ...pets.map((p) => ({ value: p.id, label: `Primární pro ${p.name}` })),
  ]

  return (
    <>
      <Card variant="elevated">
        {!hideHeader && (
          <>
            <h3 className="text-base font-bold text-[#191E1B] mb-1 flex items-center gap-2">
              <Phone size={18} className="text-[#234B54]" />
              <span>Důležité kontakty</span>
            </h3>
            <p className="text-xs text-[#4A564F] mb-4">
              Rychlý přístup k veterináři, pohotovosti a dalším kontaktům. Primární kontakt se
              propisuje do nouzové karty.
            </p>
          </>
        )}

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <Select
              id="contacts-pet-filter"
              label="Filtrovat podle mazlíčka"
              value={filterPetId}
              onChange={(e) => setFilterPetId(e.target.value)}
              options={petFilterOptions}
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={openCreate}
            data-testid="contacts-add"
          >
            <Plus size={14} />
            Přidat kontakt
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2" data-testid="contacts-list">
          {filtered.map((contact) => {
            const Icon = CONTACT_ICONS[contact.type]
            const isPrimary =
              contact.primaryForPetIds.length > 0 &&
              (!filterPetId || contact.primaryForPetIds.includes(filterPetId))
            return (
              <div
                key={contact.id}
                data-testid={`contact-card-${contact.id}`}
                className="flex flex-col gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3.5"
              >
                <div className="flex items-start gap-3">
                  <IconBox icon={Icon} size="md" tone="teal" className="h-9 w-9" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]">
                        {contactTypeLabel(contact.type, contact.label)}
                      </p>
                      {isPrimary && (
                        <span data-testid={`contact-primary-${contact.id}`}>
                          <Badge variant="gold" size="sm">
                            Primární
                          </Badge>
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm font-bold text-[#191E1B]">{contact.name}</p>
                    {contact.note && (
                      <p className="mt-0.5 text-[11px] text-[#7D8B82]">{contact.note}</p>
                    )}
                    {contact.address && (
                      <p className="mt-1 flex items-start gap-1 text-[11px] text-[#5A6660]">
                        <MapPin size={12} className="mt-0.5 shrink-0" />
                        {contact.address}
                      </p>
                    )}
                    {contact.petIds.length > 0 && (
                      <p className="mt-1 text-[10px] text-[#7D8B82]">
                        Mazlíčci:{' '}
                        {contact.petIds
                          .map((id) => pets.find((p) => p.id === id)?.name ?? id)
                          .join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {contact.phone && (
                    <a
                      href={telHref(contact.phone)}
                      data-testid={`contact-call-${contact.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E8E4DC] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#234B54] hover:border-[#234B54]/40"
                    >
                      <Phone size={12} />
                      Zavolat
                    </a>
                  )}
                  {contact.address && (
                    <a
                      href={mapsHref(contact.address)}
                      target="_blank"
                      rel="noreferrer"
                      data-testid={`contact-maps-${contact.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E8E4DC] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#234B54] hover:border-[#234B54]/40"
                    >
                      <MapPin size={12} />
                      Trasa
                    </a>
                  )}
                  {contact.email && (
                    <a
                      href={mailHref(contact.email)}
                      data-testid={`contact-mail-${contact.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E8E4DC] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#234B54] hover:border-[#234B54]/40"
                    >
                      <Mail size={12} />
                      Napsat
                    </a>
                  )}
                  <button
                    type="button"
                    data-testid={`contact-edit-${contact.id}`}
                    onClick={() => openEdit(contact)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#E8E4DC] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#4A564F] hover:border-[#B8934A]/50"
                  >
                    <Pencil size={12} />
                    Upravit
                  </button>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p className="col-span-full text-sm text-[#7D8B82]">
              Žádné kontakty pro vybraný filtr. Přidejte první kontakt.
            </p>
          )}
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Upravit kontakt' : 'Nový kontakt'}
        subtitle="Kontakty zůstávají soukromé — nepublikují se do Discover ani Komunity."
        maxWidth="lg"
      >
        <div className="space-y-4" data-testid="contact-form">
          <Input
            id="contact-name"
            label="Název"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Např. Klinika PetCare"
          />
          <Select
            id="contact-type"
            label="Typ"
            value={form.type}
            onChange={(e) =>
              setForm((p) => ({ ...p, type: e.target.value as ImportantContactType }))
            }
            options={CONTACT_TYPES}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="contact-phone"
              label="Telefon"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+420 …"
            />
            <Input
              id="contact-email"
              label="E-mail"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
          </div>
          <Input
            id="contact-address"
            label="Adresa"
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
          />
          <Textarea
            id="contact-note"
            label="Poznámka"
            value={form.note}
            onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
          />

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#4A564F]">
              Vazba na mazlíčky
            </p>
            <p className="mb-2 text-[11px] text-[#7D8B82]">
              Prázdné = kontakt platí pro všechny. Jinak zaškrtněte konkrétní mazlíčky.
            </p>
            <div className="flex flex-wrap gap-2">
              {pets.map((pet) => {
                const active = form.petIds.includes(pet.id)
                return (
                  <button
                    key={pet.id}
                    type="button"
                    onClick={() => togglePet(pet.id)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-bold border transition-colors',
                      active
                        ? 'border-[#234B54] bg-[#234B54] text-white'
                        : 'border-[#E8E4DC] bg-white text-[#4A564F]',
                    )}
                  >
                    {pet.name}
                  </button>
                )
              })}
            </div>
          </div>

          <Select
            id="contact-primary"
            label="Primární kontakt pro mazlíčka"
            value={form.primaryPetId}
            onChange={(e) => setForm((p) => ({ ...p, primaryPetId: e.target.value }))}
            options={primaryOptions}
          />

          <div className="flex flex-wrap justify-between gap-2 pt-2">
            {editingId ? (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-[#8B5E4B]"
                onClick={() => {
                  const c = importantContacts.find((x) => x.id === editingId)
                  if (c) handleDelete(c)
                }}
              >
                <Trash2 size={14} />
                Smazat
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Zrušit
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} data-testid="contact-save">
                Uložit
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
