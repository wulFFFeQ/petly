import {
  AlertCircle,
  Car,
  Home,
  MapPin,
  PhoneCall,
  Plane,
  Scissors,
  Shield,
  Stethoscope,
  Utensils,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Select, Textarea } from '../ui/Input'
import { BRAND_NAME } from '../../lib/brand'
import { cn } from '../../lib/utils'

const CONCIERGE_TOPICS = [
  { id: 'vet_care', label: 'Veterinární péče', desc: 'Kontrola, prevence, následná péče', icon: Stethoscope },
  { id: 'travel', label: 'Cestování se zvířetem', desc: 'EU pas, pravidla, dokumenty', icon: Plane },
  { id: 'find_vet', label: 'Hledání veterináře', desc: 'Doporučení kliniky v okolí', icon: MapPin },
  { id: 'emergency', label: 'Akutní situace', desc: 'Okamžitá pomoc a postup', icon: AlertCircle },
  { id: 'transport', label: 'Převoz mazlíčka', desc: 'Doprava ke klinice nebo na dovolenou', icon: Car },
  { id: 'pet_sitting', label: 'Pet-sitting', desc: 'Hlídání během cesty nebo práce', icon: Home },
  { id: 'grooming', label: 'Grooming', desc: 'Stříhání, péče o srst a hygienu', icon: Scissors },
  { id: 'nutrition', label: 'Výběr krmiva', desc: 'Strava podle plemene a zdraví', icon: Utensils },
] as const

type ConciergeTopicId = (typeof CONCIERGE_TOPICS)[number]['id']

const CONCIERGE_DATA_ACCESS = [
  { id: 'vaccination', label: 'Očkování' },
  { id: 'medication', label: 'Léky' },
  { id: 'visits', label: 'Návštěvy' },
  { id: 'examinations', label: 'Vyšetření' },
  { id: 'vitals', label: 'Vitální údaje' },
] as const

type ConciergeAccessKey = (typeof CONCIERGE_DATA_ACCESS)[number]['id']

export function ConciergeSection() {
  const { pets, showToast } = useApp()
  const [selectedTopic, setSelectedTopic] = useState<ConciergeTopicId>('vet_care')
  const [selectedPetId, setSelectedPetId] = useState(pets[0]?.id ?? '')
  const [conciergeMessage, setConciergeMessage] = useState('')
  const [conciergeAccess, setConciergeAccess] = useState<Record<ConciergeAccessKey, boolean>>({
    vaccination: true,
    medication: false,
    visits: true,
    examinations: false,
    vitals: false,
  })

  const allowedAccessCount = Object.values(conciergeAccess).filter(Boolean).length

  const handleConciergeRequest = () => {
    const topic = CONCIERGE_TOPICS.find((t) => t.id === selectedTopic)
    const pet = pets.find((p) => p.id === selectedPetId)
    showToast(
      'Požadavek odeslán',
      `${BRAND_NAME} Concierge vás bude kontaktovat ohledně „${topic?.label}“${pet ? ` pro ${pet.name}` : ''}. Sdíleno ${allowedAccessCount} typů zdravotních údajů.`,
      'gold',
    )
    setConciergeMessage('')
  }

  const toggleConciergeAccess = (key: ConciergeAccessKey) => {
    setConciergeAccess((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const petOptions = [
    { value: '', label: 'Bez konkrétního mazlíčka' },
    ...pets.map((pet) => ({
      value: pet.id,
      label: `${pet.name} · ${pet.breed}`,
    })),
  ]

  return (
    <Card variant="gold" padding="lg">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <Badge variant="gold" size="sm" className="mb-2">
              {BRAND_NAME} Concierge
            </Badge>
            <h3 className="text-lg font-bold text-[#191E1B]">
              Kdykoliv požádejte o pomoc
            </h3>
            <p className="text-xs text-[#4A564F] max-w-xl mt-1 leading-relaxed">
              Concierge vám pomůže s veterinární péčí, cestováním, akutní situací, převozem,
              pet-sittingem, groomingem nebo výběrem krmiva. Vidí pouze zdravotní údaje, ke
              kterým výslovně povolíte přístup.
            </p>
          </div>
          <Button
            variant="gold"
            size="md"
            onClick={handleConciergeRequest}
            className="shrink-0 gap-1.5 font-bold"
          >
            <PhoneCall size={16} />
            <span>Odeslat požadavek</span>
          </Button>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54] mb-2.5">
            S čím potřebujete pomoct?
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {CONCIERGE_TOPICS.map((topic) => {
              const Icon = topic.icon
              const isSelected = selectedTopic === topic.id
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setSelectedTopic(topic.id)}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer',
                    isSelected
                      ? 'border-[#234B54] bg-white shadow-xs'
                      : 'border-[#E8D8B5]/80 bg-white/60 hover:bg-white hover:border-[#E8D8B5]',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      size={14}
                      className={isSelected ? 'text-[#234B54]' : 'text-[#7D8B82]'}
                    />
                    <span className="text-xs font-bold text-[#191E1B]">{topic.label}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-[#7D8B82] leading-snug">{topic.desc}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Select
              label="Mazlíček (volitelné)"
              value={selectedPetId}
              onChange={(e) => setSelectedPetId(e.target.value)}
              options={petOptions}
              className="text-xs focus:border-[#234B54] focus:ring-0"
            />
            <Textarea
              label="Popis požadavku"
              value={conciergeMessage}
              onChange={(e) => setConciergeMessage(e.target.value)}
              rows={3}
              placeholder="Stručně popište, s čím potřebujete pomoct..."
              className="text-xs focus:border-[#234B54] focus:ring-0 min-h-0"
            />
          </div>

          <div className="rounded-xl border border-[#E8D8B5]/70 bg-white/70 p-4">
            <div className="flex items-start gap-2">
              <Shield size={15} className="text-[#234B54] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#191E1B]">
                  Přístup ke zdravotním údajům
                </p>
                <p className="mt-0.5 text-[11px] text-[#5A6660] leading-relaxed">
                  Concierge uvidí jen údaje, které zde výslovně povolíte. Nastavení veterináře
                  upravíte v{' '}
                  <Link to="/settings" className="font-semibold text-[#234B54] hover:text-[#B8934A]">
                    Nastavení
                  </Link>
                  .
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {CONCIERGE_DATA_ACCESS.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center justify-between rounded-lg bg-[#FAF8F5] border border-[#E8E4DC] px-3 py-2 cursor-pointer"
                >
                  <span className="text-xs font-medium text-[#191E1B]">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={conciergeAccess[item.id]}
                    onChange={() => toggleConciergeAccess(item.id)}
                    className="h-4 w-4 rounded accent-[#234B54] cursor-pointer"
                  />
                </label>
              ))}
            </div>
            <p className="mt-2.5 text-[10px] font-medium text-[#7D8B82]">
              Sdíleno {allowedAccessCount} z {CONCIERGE_DATA_ACCESS.length} typů údajů
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
