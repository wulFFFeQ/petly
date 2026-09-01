import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { PetProfileHeader } from '../components/pets/PetProfileHeader'
import { PetProfileTabContent } from '../components/pets/PetProfileTabContent'
import { Card } from '../components/ui/Card'
import { Tabs } from '../components/ui/Tabs'
import { useApp } from '../context/AppContext'

const profileTabs = [
  { id: 'overview', label: 'Přehled' },
  { id: 'health', label: 'Zdraví a medicína' },
  { id: 'timeline', label: 'Životní časová osa' },
  { id: 'documents', label: 'Dokumenty a pasy' },
  { id: 'photos', label: 'Fotogalerie' },
]

export function PetProfilePage() {
  const { petId } = useParams()
  const { pets } = useApp()
  const [activeTab, setActiveTab] = useState('overview')

  const pet = pets.find((p) => p.id === petId)

  if (!pet) {
    return (
      <Card className="py-16 text-center">
        <p className="text-base font-semibold text-[#191E1B]">Mazlíček nenalezen</p>
        <p className="text-xs text-[#7D8B82] mt-1">Vraťte se prosím do hlavního seznamu mazlíčků.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <PetProfileHeader pet={pet} />

      <div className="bg-white px-4 sm:px-6 rounded-2xl border border-[#E8E4DC] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <Tabs tabs={profileTabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <PetProfileTabContent pet={pet} activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
