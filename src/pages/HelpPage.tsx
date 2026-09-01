import {
  AlertCircle,
  BookOpen,
  Car,
  Check,
  Download,
  FileText,
  Home,
  MapPin,
  Phone,
  PhoneCall,
  Plane,
  Scissors,
  Shield,
  Sparkles,
  Stethoscope,
  Syringe,
  Utensils,
  Share2,
  ScanLine,
  PawPrint,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { importantContacts, petTravelPackages } from '../data/mockData'
import { useApp } from '../context/AppContext'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { cn } from '../lib/utils'
import type { ImportantContactType } from '../types'

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

const CONTACT_ICONS: Record<ImportantContactType, typeof Phone> = {
  emergency: AlertCircle,
  vet: Stethoscope,
  insurance: Shield,
  registry: PawPrint,
  emergency_person: Phone,
}

export function HelpPage() {
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
  const [activeTravelPetId, setActiveTravelPetId] = useState(pets[0]?.id ?? '')

  const activeTravelPackage = petTravelPackages.find((p) => p.petId === activeTravelPetId)
  const activeTravelPet = pets.find((p) => p.id === activeTravelPetId)
  const allowedAccessCount = Object.values(conciergeAccess).filter(Boolean).length

  const handleConciergeRequest = () => {
    const topic = CONCIERGE_TOPICS.find((t) => t.id === selectedTopic)
    const pet = pets.find((p) => p.id === selectedPetId)
    showToast(
      'Požadavek odeslán',
      `PETLY Concierge vás bude kontaktovat ohledně „${topic?.label}“${pet ? ` pro ${pet.name}` : ''}. Sdíleno ${allowedAccessCount} typů zdravotních údajů.`,
      'gold',
    )
    setConciergeMessage('')
  }

  const toggleConciergeAccess = (key: ConciergeAccessKey) => {
    setConciergeAccess((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleDownloadTravelPack = () => {
    if (!activeTravelPet) return
    showToast(
      'Balíček pro cestování',
      `Dokumenty pro ${activeTravelPet.name} byly připraveny ke stažení.`,
      'gold',
    )
  }

  const handleShareTravelPack = () => {
    if (!activeTravelPet) return
    showToast(
      'Balíček sdílen',
      `Cestovní dokumenty ${activeTravelPet.name} jsou připraveny ke sdílení.`,
      'info',
    )
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="gold" size="sm">
            <Sparkles size={11} className="mr-0.5 text-[#B8934A]" />
            Podpora péče
          </Badge>
          <span className="text-xs text-[#7D8B82] font-medium">Znalostní báze a concierge</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191E1B]">
          Nápověda a concierge péče o mazlíčky
        </h1>
        <p className="mt-1 text-sm text-[#4A564F]">
          Návody, důležité kontakty, cestovní balíčky a nonstop PETLY Concierge.
        </p>
      </div>

      {/* PETLY Concierge */}
      <Card variant="gold" padding="lg">
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <Badge variant="gold" size="sm" className="mb-2">
                PETLY Concierge
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
              <div>
                <label className="text-xs font-semibold text-[#4A564F]">Mazlíček (volitelné)</label>
                <select
                  value={selectedPetId}
                  onChange={(e) => setSelectedPetId(e.target.value)}
                  className="mt-1 w-full h-10 rounded-xl border border-[#E8E4DC] bg-white px-3 text-xs text-[#191E1B] outline-none focus:border-[#234B54]"
                >
                  <option value="">Bez konkrétního mazlíčka</option>
                  {pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name} · {pet.breed}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#4A564F]">Popis požadavku</label>
                <textarea
                  value={conciergeMessage}
                  onChange={(e) => setConciergeMessage(e.target.value)}
                  rows={3}
                  placeholder="Stručně popište, s čím potřebujete pomoct..."
                  className="mt-1 w-full rounded-xl border border-[#E8E4DC] bg-white px-3 py-2.5 text-xs text-[#191E1B] placeholder:text-[#A3AEA7] outline-none focus:border-[#234B54] resize-none"
                />
              </div>
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

      {/* Important Contacts */}
      <Card variant="elevated">
        <h3 className="text-base font-bold text-[#191E1B] mb-1 flex items-center gap-2">
          <Phone size={18} className="text-[#234B54]" />
          <span>Důležité kontakty</span>
        </h3>
        <p className="text-xs text-[#4A564F] mb-4">
          Rychlý přístup k pohotovosti, veterináři, pojišťovně a kontaktům pro nouzové situace.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {importantContacts.map((contact) => {
            const Icon = CONTACT_ICONS[contact.type]
            return (
              <div
                key={contact.id}
                className="flex items-start gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3.5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E0EAEC] text-[#234B54]">
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]">
                    {contact.label}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-[#191E1B]">{contact.name}</p>
                  {contact.note && (
                    <p className="mt-0.5 text-[11px] text-[#7D8B82]">{contact.note}</p>
                  )}
                  <a
                    href={`tel:${contact.phone.replace(/\s/g, '')}`}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#234B54] hover:text-[#B8934A] transition-colors"
                  >
                    <Phone size={12} />
                    {contact.phone}
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Travel Packages */}
      <Card variant="elevated">
        <h3 className="text-base font-bold text-[#191E1B] mb-1 flex items-center gap-2">
          <Plane size={18} className="text-[#B8934A]" />
          <span>Balíček pro cestování</span>
        </h3>
        <p className="text-xs text-[#4A564F] mb-4">
          EU pas, očkování, čip, zdravotní záznamy a dokumenty pohromadě u každého mazlíčka.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {pets.map((pet) => (
            <button
              key={pet.id}
              type="button"
              onClick={() => setActiveTravelPetId(pet.id)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer',
                activeTravelPetId === pet.id
                  ? 'bg-[#234B54] text-white'
                  : 'bg-[#FAF8F5] text-[#4A564F] border border-[#E8E4DC] hover:border-[#234B54]/30',
              )}
            >
              {pet.name}
            </button>
          ))}
        </div>

        {activeTravelPackage && activeTravelPet && (
          <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-[#E8E4DC] bg-white p-4">
              <img
                src={activeTravelPet.image}
                alt={activeTravelPet.name}
                className="h-16 w-16 rounded-xl object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#191E1B]">
                  {activeTravelPet.name} · {activeTravelPet.breed}
                </p>
                <p className="mt-0.5 text-[11px] text-[#7D8B82]">
                  EU pas {activeTravelPackage.euPassport.number} · platný do{' '}
                  {activeTravelPackage.euPassport.validUntil}
                </p>
              </div>
              <Badge
                variant={
                  activeTravelPackage.euPassport.status === 'valid'
                    ? 'gold'
                    : activeTravelPackage.euPassport.status === 'expiring'
                      ? 'outline'
                      : 'outline'
                }
                size="sm"
              >
                {activeTravelPackage.euPassport.status === 'valid'
                  ? 'Připraveno k cestě'
                  : activeTravelPackage.euPassport.status === 'expiring'
                    ? 'Brzy obnovit pas'
                    : 'Chybí dokumenty'}
              </Badge>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[#E8E4DC] bg-white p-3.5">
                <div className="flex items-center gap-2 text-[#234B54]">
                  <FileText size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">EU pas</span>
                </div>
                <p className="mt-1.5 text-xs font-bold text-[#191E1B]">
                  {activeTravelPackage.euPassport.number}
                </p>
                <p className="mt-0.5 text-[11px] text-[#7D8B82]">
                  Platnost do {activeTravelPackage.euPassport.validUntil}
                </p>
              </div>

              <div className="rounded-xl border border-[#E8E4DC] bg-white p-3.5">
                <div className="flex items-center gap-2 text-[#234B54]">
                  <Syringe size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Očkování</span>
                </div>
                <p className="mt-1.5 text-xs font-bold text-[#191E1B]">
                  {activeTravelPackage.vaccinationSummary}
                </p>
                <p className="mt-0.5 text-[11px] text-[#7D8B82]">
                  Další termín: {activeTravelPet.nextVaccination}
                </p>
              </div>

              <div className="rounded-xl border border-[#E8E4DC] bg-white p-3.5">
                <div className="flex items-center gap-2 text-[#234B54]">
                  <ScanLine size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Čip</span>
                </div>
                <p className="mt-1.5 text-xs font-bold text-[#191E1B] tabular-nums">
                  {activeTravelPackage.microchip}
                </p>
                <p className="mt-0.5 text-[11px] text-[#7D8B82]">Registrován v systému PETLY</p>
              </div>

              <div className="rounded-xl border border-[#E8E4DC] bg-white p-3.5">
                <div className="flex items-center gap-2 text-[#234B54]">
                  <Stethoscope size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Zdravotní záznamy
                  </span>
                </div>
                <p className="mt-1.5 text-xs font-bold text-[#191E1B]">
                  {activeTravelPackage.healthRecordCount} klinických záznamů
                </p>
                <p className="mt-0.5 text-[11px] text-[#7D8B82]">
                  Poslední návštěva: {activeTravelPet.lastVetVisit}
                </p>
              </div>
            </div>

            <div className="border-t border-[#E8E4DC] bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54] mb-2">
                Dokumenty v balíčku
              </p>
              <ul className="space-y-1.5">
                {activeTravelPackage.documents.map((doc) => (
                  <li key={doc.label} className="flex items-center gap-2 text-xs">
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                        doc.ready ? 'bg-[#E0EAEC] text-[#234B54]' : 'bg-[#F0EDE6] text-[#A3AEA7]',
                      )}
                    >
                      {doc.ready ? <Check size={10} /> : '–'}
                    </span>
                    <span className={doc.ready ? 'text-[#191E1B] font-medium' : 'text-[#7D8B82]'}>
                      {doc.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-[#E8E4DC] bg-[#FAF8F5] p-4">
              <Button variant="primary" size="sm" onClick={handleDownloadTravelPack} className="gap-1.5">
                <Download size={14} />
                Stáhnout balíček
              </Button>
              <Button variant="outline" size="sm" onClick={handleShareTravelPack} className="gap-1.5">
                <Share2 size={14} />
                Sdílet
              </Button>
              <Link to={`/pets/${activeTravelPet.id}`}>
                <Button variant="ghost" size="sm">
                  Otevřít profil mazlíčka
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Card>

      {/* FAQ Grid */}
      <div>
        <h3 className="text-base font-bold text-[#191E1B] mb-4 flex items-center gap-2">
          <BookOpen size={18} className="text-[#234B54]" />
          <span>Často kladené otázky</span>
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              q: 'Jak přidám mezinárodní očkovací certifikáty do profilu mazlíčka?',
              a: 'Přejděte do Moji mazlíčci > vyberte mazlíčka > záložka Dokumenty. Můžete nahrát naskenované veterinární PDF certifikáty nebo fotografie fyzického pasu.',
            },
            {
              q: 'Jak funguje automatický odpočet do dalšího očkování?',
              a: 'Když zaznamenáte posilovací dávku s budoucím termínem, PETLY vypočítá zbývající dny a automaticky naplánuje připomínku do kalendáře.',
            },
            {
              q: 'Mohu exportovat zdravotní záznamy pro nového veterináře?',
              a: 'Ano, v hlavičce profilu mazlíčka klikněte na tlačítko „Sdílet“ nebo „Dokumenty“ a exportujte kompletní ověřený zdravotní souhrn.',
            },
            {
              q: 'Jak se spojím s majiteli mazlíčků v okolí v sekci Objevovat?',
              a: 'Procházejte záložku Objevovat s filtrem podle vašeho regionu, klikněte na „Pozdravit a spojit se“ a začněte konverzaci v sekci Zprávy.',
            },
          ].map((faq, i) => (
            <Card key={i} variant="elevated">
              <h4 className="text-sm font-bold text-[#191E1B] flex items-start gap-2">
                <BookOpen size={16} className="text-[#234B54] shrink-0 mt-0.5" />
                <span>{faq.q}</span>
              </h4>
              <p className="mt-2 text-xs text-[#4A564F] leading-relaxed pl-6">{faq.a}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
