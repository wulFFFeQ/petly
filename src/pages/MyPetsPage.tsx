import { Plus, PawPrint } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PetGridCard } from '../components/pets/PetGridCard'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { OptionSelect } from '../components/ui/OptionSelect'
import { PageHeader } from '../components/ui/PageHeader'
import { SearchInput } from '../components/ui/SearchInput'
import { Tabs } from '../components/ui/Tabs'
import { useApp } from '../context/AppContext'
import {
  PET_LIST_SORT_OPTIONS,
  type PetListSort,
  sortPetsForList,
} from '../lib/myPetsList'

export function MyPetsPage() {
  const {
    pets,
    setActiveModal,
    calendarEvents,
    healthRecords,
    lostAnnouncements,
    lostReports,
  } = useApp()
  const [activeTypeTab, setActiveTypeTab] = useState('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<PetListSort>('recent')

  const dogCount = pets.filter((p) => p.type === 'dog').length
  const catCount = pets.filter((p) => p.type === 'cat').length

  const tabs = [
    { id: 'all', label: 'Všichni mazlíčci', count: pets.length },
    { id: 'dog', label: 'Psi', count: dogCount },
    { id: 'cat', label: 'Kočky', count: catCount },
  ]

  const filteredPets = useMemo(() => {
    const filtered = pets.filter((pet) => {
      const matchesTab = activeTypeTab === 'all' || pet.type === activeTypeTab
      const query = search.trim().toLowerCase()
      const matchesSearch =
        !query ||
        pet.name.toLowerCase().includes(query) ||
        pet.breed.toLowerCase().includes(query)
      return matchesTab && matchesSearch
    })
    return sortPetsForList(filtered, sortBy, calendarEvents)
  }, [pets, activeTypeTab, search, sortBy, calendarEvents])

  const emptyFilterTitle =
    activeTypeTab === 'dog'
      ? 'Žádný pes zde zatím není.'
      : activeTypeTab === 'cat'
        ? 'Žádná kočka zde zatím není.'
        : search.trim()
          ? 'Žádné profily neodpovídají'
          : 'Žádné profily neodpovídají'

  const emptyFilterDescription =
    activeTypeTab === 'dog'
      ? 'Přepněte na Všichni mazlíčci, nebo přidejte profil psa.'
      : activeTypeTab === 'cat'
        ? 'Přepněte na Všichni mazlíčci, nebo přidejte profil kočky.'
        : 'Zkuste upravit filtry nebo hledané výrazy.'

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Registr"
        meta={`${pets.length} registrovaných mazlíčků`}
        title="Moji mazlíčci"
        description="Vše o vašich mazlíčcích na jednom místě."
        actions={
          <Button
            onClick={() => setActiveModal('addPet')}
            variant="primary"
            size="md"
            className="gap-2 shadow-sm"
          >
            <Plus size={16} />
            <span>Přidat mazlíčka</span>
          </Button>
        }
      />

      {pets.length === 0 ? (
        <EmptyState
          icon={PawPrint}
          title="Vaši mazlíčci"
          description="Začněte vytvořením prvního profilu. Uchováte na jednom místě jeho zdraví, dokumenty, vzpomínky i důležité události."
          action={
            <Button
              onClick={() => setActiveModal('addPet')}
              variant="primary"
              size="md"
              className="gap-2"
            >
              <Plus size={16} />
              Přidat prvního mazlíčka
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-2xl border border-[#E8E4DC] bg-white p-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <Tabs
              tabs={tabs}
              activeTab={activeTypeTab}
              onChange={setActiveTypeTab}
              variant="pills"
              className="shrink-0"
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <span className="hidden shrink-0 text-[11px] font-medium text-[#7D8B82] lg:inline">
                  Řadit podle
                </span>
                <OptionSelect
                  id="pets-sort"
                  value={sortBy}
                  onChange={(value) => setSortBy(value as PetListSort)}
                  options={PET_LIST_SORT_OPTIONS}
                  placeholder="Řadit podle…"
                  className="w-[220px] shrink-0"
                />
              </div>
              <SearchInput
                size="sm"
                placeholder="Hledat podle jména nebo plemene..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#FAF8F5] focus:bg-white"
                wrapperClassName="sm:w-72"
              />
            </div>
          </div>

          {filteredPets.length === 0 ? (
            <EmptyState
              icon={PawPrint}
              title={emptyFilterTitle}
              description={emptyFilterDescription}
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
              {filteredPets.map((pet) => (
                <PetGridCard
                  key={pet.id}
                  pet={pet}
                  calendarEvents={calendarEvents}
                  healthRecords={healthRecords}
                  lostAnnouncements={lostAnnouncements}
                  lostReports={lostReports}
                />
              ))}

              <button
                type="button"
                onClick={() => setActiveModal('addPet')}
                className="group flex min-h-[280px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#D1E0D8] bg-[#FAF8F5]/60 p-8 text-center transition-all hover:bg-[#EBF2EE]/40"
              >
                <div className="shadow-xs flex h-12 w-12 items-center justify-center rounded-2xl border border-[#D1E0D8] bg-white text-[#2C4A3E] transition-all group-hover:scale-110 group-hover:bg-[#2C4A3E] group-hover:text-white">
                  <Plus size={20} />
                </div>
                <div>
                  <p className="text-base font-bold text-[#191E1B] transition-colors group-hover:text-[#2C4A3E]">
                    Přidat dalšího mazlíčka
                  </p>
                  <p className="mt-1 max-w-[200px] text-xs text-[#7D8B82]">
                    Zaregistrujte psa nebo kočku s digitálním zdravotním pasem
                  </p>
                </div>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
