import { Plus, Search, PawPrint, Sparkles } from 'lucide-react'
import { useState, useMemo } from 'react'
import { PetGridCard } from '../components/pets/PetGridCard'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="gold" size="sm">
              <Sparkles size={11} className="mr-0.5 text-[#B8934A]" />
              Registr
            </Badge>
            <span className="text-xs text-[#7D8B82] font-medium">
              {pets.length} registrovaných mazlíčků
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191E1B]">
            Moji mazlíčci
          </h1>
          <p className="mt-1 text-sm text-[#4A564F]">
            Vše o vašich mazlíčcích na jednom místě.
          </p>
        </div>

        <Button
          onClick={() => setActiveModal('addPet')}
          variant="primary"
          size="md"
          className="shadow-sm gap-2"
        >
          <Plus size={16} />
          <span>Přidat mazlíčka</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-2.5 rounded-2xl border border-[#E8E4DC] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <Tabs
          tabs={tabs}
          activeTab={activeTypeTab}
          onChange={setActiveTypeTab}
          variant="pills"
        />

        <div className="relative sm:w-72">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3AEA7]"
          />
          <input
            type="text"
            placeholder="Hledat podle jména nebo plemene..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] pl-9 pr-3 text-xs text-[#191E1B] placeholder:text-[#A3AEA7] outline-none focus:border-[#2C4A3E] focus:bg-white focus:ring-2 focus:ring-[#2C4A3E]/10"
          />
        </div>
      </div>

      {/* Grid of Pets */}
      {filteredPets.length === 0 ? (
        <Card className="text-center py-12">
          <PawPrint size={32} className="mx-auto text-[#A3AEA7] mb-3" />
          <p className="text-base font-semibold text-[#191E1B]">Žádné profily neodpovídají</p>
          <p className="text-xs text-[#7D8B82] mt-1">Zkuste upravit filtry nebo hledané výrazy.</p>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPets.map((pet) => (
            <PetGridCard key={pet.id} pet={pet} />
          ))}

          {/* Quick Add Companion Card */}
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
