import { Plus, PawPrint } from 'lucide-react'
import { useState, useMemo } from 'react'
import { PetGridCard } from '../components/pets/PetGridCard'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { SearchInput } from '../components/ui/SearchInput'
import { Tabs } from '../components/ui/Tabs'
import { useApp } from '../context/AppContext'

export function MyPetsPage() {
  const { pets, setActiveModal } = useApp()
  const [activeTypeTab, setActiveTypeTab] = useState('all')
  const [search, setSearch] = useState('')

  const tabs = [
    { id: 'all', label: 'Všichni mazlíčci', count: pets.length },
    { id: 'dog', label: 'Psi', count: pets.filter((p) => p.type === 'dog').length },
    { id: 'cat', label: 'Kočky', count: pets.filter((p) => p.type === 'cat').length },
  ]

  const filteredPets = useMemo(() => {
    return pets.filter((pet) => {
      const matchesTab = activeTypeTab === 'all' || pet.type === activeTypeTab
      const matchesSearch =
        !search ||
        pet.name.toLowerCase().includes(search.toLowerCase()) ||
        pet.breed.toLowerCase().includes(search.toLowerCase())
      return matchesTab && matchesSearch
    })
  }, [pets, activeTypeTab, search])

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
            className="shadow-sm gap-2"
          >
            <Plus size={16} />
            <span>Přidat mazlíčka</span>
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-2.5 rounded-2xl border border-[#E8E4DC] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <Tabs
          tabs={tabs}
          activeTab={activeTypeTab}
          onChange={setActiveTypeTab}
          variant="pills"
        />

        <SearchInput
          size="sm"
          placeholder="Hledat podle jména nebo plemene..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#FAF8F5] focus:bg-white"
          wrapperClassName="sm:w-72"
        />
      </div>

      {filteredPets.length === 0 ? (
        <EmptyState
          icon={PawPrint}
          title="Žádné profily neodpovídají"
          description="Zkuste upravit filtry nebo hledané výrazy."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPets.map((pet) => (
            <PetGridCard key={pet.id} pet={pet} />
          ))}

          <button
            onClick={() => setActiveModal('addPet')}
            className="rounded-2xl border-2 border-dashed border-[#D1E0D8] bg-[#FAF8F5]/60 hover:bg-[#EBF2EE]/40 transition-all p-8 flex flex-col items-center justify-center text-center gap-3 group cursor-pointer min-h-[320px]"
          >
            <div className="h-12 w-12 rounded-2xl bg-white border border-[#D1E0D8] flex items-center justify-center text-[#2C4A3E] group-hover:scale-110 group-hover:bg-[#2C4A3E] group-hover:text-white transition-all shadow-xs">
              <Plus size={20} />
            </div>
            <div>
              <p className="text-base font-bold text-[#191E1B] group-hover:text-[#2C4A3E] transition-colors">
                Přidat dalšího mazlíčka
              </p>
              <p className="text-xs text-[#7D8B82] max-w-[200px] mt-1">
                Zaregistrujte psa, kočku nebo jiného mazlíčka s digitálním zdravotním pasem
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
