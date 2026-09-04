import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import {
  eventSupportsReminder,
  getAvailableCategories,
  getDefaultEventLocation,
  getDefaultEventTitle,
  getEventTypesForCategory,
  getLocationFieldLabel,
} from '../../lib/calendarEventTypes'
import {
  getGenderOptions,
  normalizeGenderForType,
} from '../../lib/petTypes'
import { todayIsoDate } from '../../lib/petProfileUtils'
import { PET_IMAGE_ACCEPT, readImageFileAsDataUrl, takeSelectedFiles } from '../../lib/readImageFile'
import type {
  CalendarEventCategory,
  EventType,
  HealthRecordType,
  NewPetForm,
} from '../../types'
import { Button } from '../ui/Button'
import { BreedSelect } from '../ui/BreedSelect'
import { Input, Select, Textarea } from '../ui/Input'
import { OptionSelect } from '../ui/OptionSelect'
import { PetTypeSelect } from '../ui/PetTypeSelect'
import { Modal } from '../ui/Modal'
import { Upload } from 'lucide-react'

function getDefaultPetForm(): NewPetForm {
  return {
    name: '',
    type: 'dog',
    breed: '',
  }
}

function getDefaultEventForm(petName = 'Luna') {
  return {
    category: 'health' as CalendarEventCategory,
    type: 'vet' as EventType,
    title: getDefaultEventTitle('vet'),
    petName,
    date: todayIsoDate(),
    time: '14:30',
    location: getDefaultEventLocation('vet'),
    notes: '',
    reminderEnabled: false,
  }
}

export function Modals() {
  const {
    activeModal,
    setActiveModal,
    addPet,
    addCalendarEvent,
    addPetPhotos,
    addHealthRecord,
    showToast,
    pets,
    modalPetId,
  } = useApp()
  const location = useLocation()
  const pendingPhotoPetIdRef = useRef('')
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoDragOver, setPhotoDragOver] = useState(false)
  const [selectedPhotoPetId, setSelectedPhotoPetId] = useState('')
  const [fileDialogOpen, setFileDialogOpen] = useState(false)

  const [petForm, setPetForm] = useState<NewPetForm>(getDefaultPetForm())

  const [healthForm, setHealthForm] = useState({
    type: 'vaccination' as HealthRecordType,
    title: '',
    petId: '',
    date: todayIsoDate(),
    doctor: '',
  })

  const [eventForm, setEventForm] = useState(() => getDefaultEventForm())

  const handleAddPet = (e: React.FormEvent) => {
    e.preventDefault()
    if (!petForm.name || !petForm.breed) return
    addPet(petForm)
    setPetForm(getDefaultPetForm())
  }

  const routePetId = location.pathname.match(/^\/pets\/([^/]+)/)?.[1]

  useEffect(() => {
    if (activeModal !== 'addHealthRecord') return
    const preferredId = modalPetId || routePetId || pets[0]?.id || ''
    const pet = pets.find((item) => item.id === preferredId) ?? pets[0]
    setHealthForm((prev) => ({
      ...prev,
      petId: pet?.id ?? '',
      date: prev.date || todayIsoDate(),
    }))
  }, [activeModal, modalPetId, routePetId, pets])

  useEffect(() => {
    if (activeModal !== 'bookVet') return
    const preferredId = modalPetId || routePetId || pets[0]?.id || ''
    const pet = pets.find((item) => item.id === preferredId) ?? pets[0]
    setEventForm(getDefaultEventForm(pet?.name ?? pets[0]?.name ?? 'Luna'))
    // Reset only when the modal opens, not on every pets update while editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModal])

  const selectedEventPet = useMemo(
    () => pets.find((pet) => pet.name === eventForm.petName) ?? pets[0],
    [pets, eventForm.petName],
  )

  const hasBreedingProfile = Boolean(selectedEventPet?.breedingProfile)

  const categoryOptions = useMemo(
    () =>
      getAvailableCategories(hasBreedingProfile).map((option) => ({
        value: option.value,
        label: option.label,
      })),
    [hasBreedingProfile],
  )

  const typeOptions = useMemo(
    () =>
      getEventTypesForCategory(eventForm.category).map((option) => ({
        value: option.value,
        label: option.label,
      })),
    [eventForm.category],
  )

  useEffect(() => {
    if (activeModal !== 'bookVet') return
    if (hasBreedingProfile) return
    if (eventForm.category !== 'breeding') return
    setEventForm((prev) => ({
      ...prev,
      category: 'health',
      type: 'vet',
      title: getDefaultEventTitle('vet'),
      location: getDefaultEventLocation('vet'),
      reminderEnabled: false,
    }))
  }, [activeModal, hasBreedingProfile, eventForm.category])

  const applyEventType = (type: EventType) => {
    setEventForm((prev) => ({
      ...prev,
      type,
      title: type === 'custom' ? '' : getDefaultEventTitle(type),
      location: getDefaultEventLocation(type),
      reminderEnabled: eventSupportsReminder(type) ? prev.reminderEnabled : false,
    }))
  }

  const handleAddHealth = (e: React.FormEvent) => {
    e.preventDefault()
    if (!healthForm.title.trim() || !healthForm.petId || !healthForm.date) return
    addHealthRecord({
      petId: healthForm.petId,
      type: healthForm.type,
      title: healthForm.title,
      date: healthForm.date,
      doctor: healthForm.doctor,
    })
    setHealthForm({
      type: 'vaccination',
      title: '',
      petId: healthForm.petId,
      date: todayIsoDate(),
      doctor: '',
    })
  }

  const handleAddCalendarEvent = (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventForm.date || !eventForm.petName || !eventForm.type) return
    if (eventForm.type === 'custom' && !eventForm.title.trim()) return
    const title = eventForm.title.trim() || getDefaultEventTitle(eventForm.type)
    addCalendarEvent({
      title,
      petName: eventForm.petName,
      type: eventForm.type,
      date: eventForm.date,
      time: eventForm.time || undefined,
      location: eventForm.location.trim() || undefined,
      notes: eventForm.notes.trim() || undefined,
      reminderEnabled: eventSupportsReminder(eventForm.type)
        ? eventForm.reminderEnabled
        : undefined,
    })
    setEventForm(getDefaultEventForm(eventForm.petName))
  }

  const photoPetId = modalPetId || selectedPhotoPetId || routePetId || pets[0]?.id || ''

  useEffect(() => {
    if (activeModal === 'addPhoto' && photoPetId) {
      pendingPhotoPetIdRef.current = photoPetId
      if (!selectedPhotoPetId) setSelectedPhotoPetId(photoPetId)
    }
  }, [activeModal, photoPetId, selectedPhotoPetId])

  useEffect(() => {
    if (!fileDialogOpen) return
    const handleWindowFocus = () => {
      window.setTimeout(() => setFileDialogOpen(false), 400)
    }
    window.addEventListener('focus', handleWindowFocus)
    return () => window.removeEventListener('focus', handleWindowFocus)
  }, [fileDialogOpen])

  const uploadPhotoFiles = async (files: FileList | File[], petIdOverride?: string) => {
    const list = Array.from(files)
    if (list.length === 0) return
    const targetPetId = petIdOverride || pendingPhotoPetIdRef.current || photoPetId
    if (!targetPetId) {
      showToast('Vyberte mazlíčka', 'Nejdřív zvolte, do které galerie fotku uložit.', 'info')
      return
    }

    setPhotoUploading(true)
    try {
      const urls: string[] = []
      for (const file of list) {
        urls.push(await readImageFileAsDataUrl(file))
      }
      addPetPhotos(targetPetId, urls)
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'read_failed'
      if (reason === 'unsupported_type') {
        showToast('Nepodporovaný formát', 'Použijte JPG, PNG, WEBP nebo GIF.', 'info')
      } else if (reason === 'too_large') {
        showToast('Soubor je příliš velký', 'Maximální velikost je 25 MB.', 'info')
      } else {
        showToast('Nahrání se nezdařilo', 'Zkuste to prosím znovu.', 'info')
      }
    } finally {
      setPhotoUploading(false)
      setFileDialogOpen(false)
    }
  }

  const handleActivitySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    showToast('Aktivita zaznamenána', 'Procházka a hra zapsány do denního logu.', 'gold')
    setActiveModal(null)
  }

  const petOptions = pets.map((p) => ({ value: p.id, label: p.name }))
  const petNameOptions = pets.map((p) => ({ value: p.name, label: p.name }))

  return (
    <>
      {/* 1. Add Pet Modal */}
      <Modal
        open={activeModal === 'addPet'}
        onClose={() => setActiveModal(null)}
        title="Registrace nového mazlíčka"
        subtitle="Vytvořte oficiální digitální zdravotní profil a pas."
      >
        <form autoComplete="off" onSubmit={handleAddPet} className="flex flex-col gap-4">
          <Input
            id="pet-name"
            label="Jméno mazlíčka"
            placeholder="např. Charlie, Coco..."
            value={petForm.name}
            onChange={(e) => setPetForm({ ...petForm, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <PetTypeSelect
              id="pet-type"
              label="Druh"
              value={petForm.type}
              onChange={(type) => {
                setPetForm({
                  ...petForm,
                  type,
                  breed: '',
                  gender: normalizeGenderForType(petForm.gender, type),
                })
              }}
            />
            <Select
              id="pet-gender"
              label="Pohlaví"
              value={petForm.gender ?? ''}
              onChange={(e) =>
                setPetForm({
                  ...petForm,
                  gender: e.target.value || undefined,
                })
              }
              options={[
                { value: '', label: 'Vyberte pohlaví' },
                ...getGenderOptions(petForm.type),
              ]}
            />
          </div>

          <BreedSelect
            id="pet-breed"
            label="Plemeno / rodokmen"
            petType={petForm.type}
            value={petForm.breed}
            onChange={(breed) => setPetForm({ ...petForm, breed })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="pet-age"
              label="Věk (roky)"
              type="number"
              min={0}
              max={30}
              placeholder="např. 3"
              value={petForm.age ?? ''}
              onChange={(e) =>
                setPetForm({
                  ...petForm,
                  age: e.target.value === '' ? undefined : parseInt(e.target.value, 10) || 0,
                })
              }
            />
            <Input
              id="pet-weight"
              label="Hmotnost (kg)"
              type="number"
              step="0.1"
              min={0}
              placeholder="např. 12,5"
              value={petForm.weight ?? ''}
              onChange={(e) =>
                setPetForm({
                  ...petForm,
                  weight: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-[#F0EDE6]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveModal(null)}
            >
              Zrušit
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Registrovat mazlíčka
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Add Health Record Modal */}
      <Modal
        open={activeModal === 'addHealthRecord'}
        onClose={() => setActiveModal(null)}
        title="Zapsat veterinární záznam"
        subtitle="Zaznamenejte očkování, předepsané léky nebo klinické poznámky."
      >
        <form onSubmit={handleAddHealth} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              id="health-pet"
              label="Vybrat mazlíčka"
              value={healthForm.petId}
              onChange={(e) =>
                setHealthForm({ ...healthForm, petId: e.target.value })
              }
              options={petOptions.length ? petOptions : [{ value: '', label: 'Žádný mazlíček' }]}
            />
            <Select
              id="health-type"
              label="Kategorie záznamu"
              value={healthForm.type}
              onChange={(e) =>
                setHealthForm({
                  ...healthForm,
                  type: e.target.value as HealthRecordType,
                })
              }
              options={[
                { value: 'vaccination', label: 'Očkování' },
                { value: 'vet', label: 'Návštěva veterináře' },
                { value: 'examination', label: 'Vyšetření' },
                { value: 'medication', label: 'Předepsaný lék' },
              ]}
            />
          </div>

          <Input
            id="health-title"
            label="Název záznamu"
            placeholder="např. očkování proti vzteklině a DHPP"
            value={healthForm.title}
            onChange={(e) =>
              setHealthForm({ ...healthForm, title: e.target.value })
            }
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="health-date"
              label="Datum podání / termín"
              type="date"
              value={healthForm.date}
              onChange={(e) =>
                setHealthForm({ ...healthForm, date: e.target.value })
              }
              required
            />
            <Input
              id="health-doc"
              label="Ošetřující veterinář"
              placeholder="např. MUDr. Martin Novák"
              value={healthForm.doctor}
              onChange={(e) =>
                setHealthForm({ ...healthForm, doctor: e.target.value })
              }
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-[#F0EDE6]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveModal(null)}
            >
              Zrušit
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Uložit zdravotní záznam
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Add calendar event (category → type) */}
      <Modal
        open={activeModal === 'bookVet'}
        onClose={() => setActiveModal(null)}
        title="Přidat událost do kalendáře"
        subtitle="Důležité termíny péče a života mazlíčka — ne běžné denní rutiny."
      >
        <form onSubmit={handleAddCalendarEvent} className="flex flex-col gap-4">
          <OptionSelect
            id="event-pet"
            label="Mazlíček"
            value={eventForm.petName}
            onChange={(petName) => setEventForm((prev) => ({ ...prev, petName }))}
            options={petNameOptions.length ? petNameOptions : [{ value: 'Luna', label: 'Luna' }]}
          />

          <OptionSelect
            id="event-category"
            label="Kategorie"
            value={eventForm.category}
            onChange={(categoryValue) => {
              const category = categoryValue as CalendarEventCategory
              const firstType = getEventTypesForCategory(category)[0]?.value ?? 'custom'
              setEventForm((prev) => ({
                ...prev,
                category,
                type: firstType,
                title: getDefaultEventTitle(firstType),
                location: getDefaultEventLocation(firstType),
                reminderEnabled: eventSupportsReminder(firstType) ? prev.reminderEnabled : false,
              }))
            }}
            options={categoryOptions}
          />

          <OptionSelect
            id="event-type"
            label="Typ události"
            value={eventForm.type}
            onChange={(typeValue) => applyEventType(typeValue as EventType)}
            options={typeOptions}
            maxListHeightClassName="max-h-64"
          />

          <Input
            id="event-title"
            label="Název události"
            value={eventForm.title}
            onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
            placeholder={
              eventForm.type === 'custom'
                ? 'Napište vlastní název události…'
                : 'např. Kontrola zubů, výstava Brno…'
            }
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="event-date"
              label="Datum"
              type="date"
              value={eventForm.date}
              onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
              required
            />
            <Input
              id="event-time"
              label="Čas"
              type="time"
              value={eventForm.time}
              onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
            />
          </div>

          <Input
            id="event-location"
            label={getLocationFieldLabel(eventForm.type)}
            value={eventForm.location}
            onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
            placeholder="např. Doma, klinika, výstaviště…"
          />

          {eventSupportsReminder(eventForm.type) && (
            <label className="flex items-start gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5]/80 px-3.5 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={eventForm.reminderEnabled}
                onChange={(e) =>
                  setEventForm({ ...eventForm, reminderEnabled: e.target.checked })
                }
                className="mt-0.5 h-4 w-4 rounded border-[#D1E0D8] text-[#2C4A3E] focus:ring-[#2C4A3E]/30 cursor-pointer"
              />
              <span>
                <span className="block text-sm font-medium text-[#191E1B]">
                  Nastavit připomínku
                </span>
                <span className="block text-[11px] text-[#7D8B82] mt-0.5 leading-relaxed">
                  Připomeneme termín léčení nebo ochrany v kalendáři.
                </span>
              </span>
            </label>
          )}

          <Textarea
            id="event-notes"
            label="Poznámky"
            placeholder="např. dávkování, důvod návštěvy, co vzít s sebou…"
            value={eventForm.notes}
            onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2.5 pt-4 border-t border-[#F0EDE6]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveModal(null)}
            >
              Zrušit
            </Button>
            <Button type="submit" variant="gold" size="sm">
              Přidat do kalendáře
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Add Activity Modal */}
      <Modal
        open={activeModal === 'addActivity'}
        onClose={() => setActiveModal(null)}
        title="Zapsat rutinní aktivitu"
        subtitle="Sledujte procházky, měření hmotnosti, péči o srst nebo tréninkové sezení."
      >
        <form onSubmit={handleActivitySubmit} className="flex flex-col gap-4">
          <Select
            id="act-type"
            label="Typ aktivity"
            options={[
              { value: 'walk', label: 'Lesní túra a cvičení (60 min)' },
              { value: 'grooming', label: 'Spa péče o srst a koupel' },
              { value: 'training', label: 'Agility a poslušnost' },
              { value: 'diet', label: 'Speciální dietní jídlo' },
            ]}
          />
          <Input
            id="act-notes"
            label="Poznámky a lokalita"
            placeholder="např. psí park u Labe v Kolíně — dnes skvělá energie!"
          />
          <div className="flex justify-end gap-2.5 pt-4 border-t border-[#F0EDE6]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveModal(null)}
            >
              Zrušit
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Uložit aktivitu
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. Add Photo Modal */}
      <Modal
        open={activeModal === 'addPhoto'}
        onClose={() => {
          if (fileDialogOpen || photoUploading) return
          setActiveModal(null)
        }}
        closeOnBackdrop={!fileDialogOpen && !photoUploading}
        title="Nahrát fotografii ve vysokém rozlišení"
        subtitle="Přidejte vzpomínky do osobní časové osy vašeho mazlíčka."
      >
        <div className="flex flex-col gap-4">
          {pets.length > 1 && (
            <Select
              id="photo-pet"
              label="Mazlíček"
              value={photoPetId}
              onChange={(e) => {
                setSelectedPhotoPetId(e.target.value)
                pendingPhotoPetIdRef.current = e.target.value
              }}
              options={pets.map((pet) => ({ value: pet.id, label: pet.name }))}
            />
          )}
          <label
            className={`flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
              photoDragOver ? 'border-[#2C4A3E] bg-[#EBF2EE]' : 'border-[#D1E0D8] bg-[#FAF8F5]'
            } ${photoUploading ? 'pointer-events-none opacity-60' : ''}`}
            onDragOver={(event) => {
              event.preventDefault()
              setPhotoDragOver(true)
            }}
            onDragLeave={() => setPhotoDragOver(false)}
            onDrop={(event) => {
              event.preventDefault()
              setPhotoDragOver(false)
              pendingPhotoPetIdRef.current = photoPetId
              void uploadPhotoFiles(event.dataTransfer.files)
            }}
          >
            <div className="h-12 w-12 rounded-2xl bg-white border border-[#E8E4DC] flex items-center justify-center text-[#2C4A3E] shadow-xs">
              <Upload size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#191E1B]">
                {photoUploading ? 'Nahrávám…' : 'Klepněte sem nebo přetáhněte fotografii'}
              </p>
              <p className="text-xs text-[#7D8B82] mt-0.5">
                Podporované formáty JPG, PNG, WEBP, GIF do 25 MB
              </p>
            </div>
            <span className="mt-2 inline-flex h-8 items-center rounded-lg border border-[#E8E4DC] bg-white px-3.5 text-xs font-medium text-[#191E1B]">
              Vybrat ze zařízení
            </span>
            <input
              type="file"
              accept={PET_IMAGE_ACCEPT}
              multiple
              className="sr-only"
              disabled={photoUploading}
              onChange={(event) => {
                const files = takeSelectedFiles(event.currentTarget)
                setFileDialogOpen(false)
                pendingPhotoPetIdRef.current = photoPetId
                if (files.length) void uploadPhotoFiles(files)
              }}
              onClick={() => setFileDialogOpen(true)}
            />
          </label>
        </div>
      </Modal>
    </>
  )
}
