import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import {
  getGenderOptions,
  normalizeGenderForType,
} from '../../lib/petTypes'
import type { NewPetForm } from '../../types'
import { Button } from '../ui/Button'
import { BreedSelect } from '../ui/BreedSelect'
import { Input, Select, Textarea } from '../ui/Input'
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

export function Modals() {
  const {
    activeModal,
    setActiveModal,
    addPet,
    addCalendarEvent,
    showToast,
    pets,
  } = useApp()

  const [petForm, setPetForm] = useState<NewPetForm>(getDefaultPetForm())

  const [healthForm, setHealthForm] = useState({
    type: 'vaccination',
    title: '',
    petName: 'Luna',
    date: '2026-09-24',
    doctor: 'MUDr. Martin Novák',
  })

  const [vetForm, setVetForm] = useState({
    petName: 'Luna',
    date: '2026-09-10',
    time: '14:30',
    notes: 'Rutinní zdravotní screening a krevní test',
  })

  const handleAddPet = (e: React.FormEvent) => {
    e.preventDefault()
    if (!petForm.name || !petForm.breed) return
    addPet(petForm)
    setPetForm(getDefaultPetForm())
  }

  const handleAddHealth = (e: React.FormEvent) => {
    e.preventDefault()
    if (!healthForm.title) return
    showToast(
      'Zdravotní záznam uložen',
      `${healthForm.title} přidán pro ${healthForm.petName}`,
      'gold',
    )
    setActiveModal(null)
    setHealthForm({
      type: 'vaccination',
      title: '',
      petName: 'Luna',
      date: '2026-09-24',
      doctor: 'MUDr. Martin Novák',
    })
  }

  const handleBookVet = (e: React.FormEvent) => {
    e.preventDefault()
    if (!vetForm.date) return
    addCalendarEvent({
      title: 'Návštěva veterinární kliniky',
      petName: vetForm.petName,
      type: 'vet',
      date: vetForm.date,
      time: vetForm.time,
      location: 'PetCare Central Praha',
      notes: vetForm.notes,
    })
    setVetForm({ petName: 'Luna', date: '2026-09-10', time: '14:30', notes: '' })
  }

  const handlePhotoUploadSim = () => {
    showToast('Fotografie úspěšně nahrána', 'Přidáno do soukromých fotografických vzpomínek Luny.', 'gold')
    setActiveModal(null)
  }

  const handleActivitySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    showToast('Aktivita zaznamenána', 'Procházka a hra zapsány do denního logu.', 'gold')
    setActiveModal(null)
  }

  const petOptions = pets.map((p) => ({ value: p.name, label: p.name }))

  return (
    <>
      {/* 1. Add Pet Modal */}
      <Modal
        open={activeModal === 'addPet'}
        onClose={() => setActiveModal(null)}
        title="Registrace nového mazlíčka"
        subtitle="Vytvořte oficiální digitální zdravotní profil a pas."
      >
        <form onSubmit={handleAddPet} className="flex flex-col gap-4">
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
              value={healthForm.petName}
              onChange={(e) =>
                setHealthForm({ ...healthForm, petName: e.target.value })
              }
              options={petOptions.length ? petOptions : [{ value: 'Luna', label: 'Luna' }]}
            />
            <Select
              id="health-type"
              label="Kategorie záznamu"
              value={healthForm.type}
              onChange={(e) =>
                setHealthForm({ ...healthForm, type: e.target.value })
              }
              options={[
                { value: 'vaccination', label: 'Posilovací očkování' },
                { value: 'vet', label: 'Klinické vyšetření' },
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

      {/* 3. Book Vet Visit Modal */}
      <Modal
        open={activeModal === 'bookVet'}
        onClose={() => setActiveModal(null)}
        title="Rezervace veterinární konzultace"
        subtitle="Rezervujte návštěvu v klinice nebo vzdálenou veterinární konzultaci."
      >
        <form onSubmit={handleBookVet} className="flex flex-col gap-4">
          <Select
            id="vet-pet"
            label="Mazlíček"
            value={vetForm.petName}
            onChange={(e) => setVetForm({ ...vetForm, petName: e.target.value })}
            options={petOptions.length ? petOptions : [{ value: 'Luna', label: 'Luna' }]}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="vet-date"
              label="Datum schůzky"
              type="date"
              value={vetForm.date}
              onChange={(e) => setVetForm({ ...vetForm, date: e.target.value })}
              required
            />
            <Input
              id="vet-time"
              label="Preferovaný čas"
              type="time"
              value={vetForm.time}
              onChange={(e) => setVetForm({ ...vetForm, time: e.target.value })}
            />
          </div>

          <Textarea
            id="vet-notes"
            label="Důvod konzultace / příznaky"
            placeholder="např. roční krevní test, odstranění zubního kamene, kontrola alergie na kůži..."
            value={vetForm.notes}
            onChange={(e) => setVetForm({ ...vetForm, notes: e.target.value })}
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
              Potvrdit a přidat do kalendáře
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
        onClose={() => setActiveModal(null)}
        title="Nahrát fotografii ve vysokém rozlišení"
        subtitle="Přidejte vzpomínky do osobní časové osy vašeho mazlíčka."
      >
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[#D1E0D8] bg-[#FAF8F5] p-8 text-center">
          <div className="h-12 w-12 rounded-2xl bg-white border border-[#E8E4DC] flex items-center justify-center text-[#2C4A3E] shadow-xs">
            <Upload size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-[#191E1B]">
              Přetáhněte fotografii ve vysokém rozlišení sem
            </p>
            <p className="text-xs text-[#7D8B82] mt-0.5">
              Podporované formáty JPG, PNG, WEBP do 25 MB
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePhotoUploadSim}
            className="mt-2"
          >
            Vybrat ze zařízení
          </Button>
        </div>
      </Modal>
    </>
  )
}
