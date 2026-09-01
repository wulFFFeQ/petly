import {
  Activity,
  Clock,
  Download,
  FileText,
  Heart,
  Plus,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Syringe,
  Utensils,
} from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { healthRecords, timelineEvents } from '../data/mockData'
import { PetProfileHeader } from '../components/pets/PetProfileHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Tabs } from '../components/ui/Tabs'
import { useApp } from '../context/AppContext'
import { healthStatusLabel } from '../data/mockData'

const profileTabs = [
  { id: 'overview', label: 'Přehled' },
  { id: 'health', label: 'Zdraví a medicína' },
  { id: 'timeline', label: 'Životní časová osa' },
  { id: 'documents', label: 'Dokumenty a pasy' },
  { id: 'photos', label: 'Fotogalerie' },
]

export function PetProfilePage() {
  const { petId } = useParams()
  const { pets, setActiveModal, showToast } = useApp()
  const [activeTab, setActiveTab] = useState('overview')
  const [activePhoto, setActivePhoto] = useState<string | null>(null)

  const pet = pets.find((p) => p.id === petId)

  if (!pet) {
    return (
      <Card className="py-16 text-center">
        <p className="text-base font-semibold text-[#191E1B]">Mazlíček nenalezen</p>
        <p className="text-xs text-[#7D8B82] mt-1">Vraťte se prosím do hlavního seznamu mazlíčků.</p>
      </Card>
    )
  }

  const petHealthRecords = healthRecords.filter((r) => r.petId === pet.id)
  const petTimeline = timelineEvents.filter((t) => t.petId === pet.id)

  const galleryImages = [
    pet.image,
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=800&q=85',
    'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=800&q=85',
  ]

  const handleDownloadDoc = (docName: string) => {
    showToast(`Stahování: ${docName}`, 'Oficiální ověřená kopie připravena k veterinární kontrole.', 'gold')
  }

  return (
    <div className="space-y-8">
      <PetProfileHeader pet={pet} />

      {/* Tabs */}
      <div className="bg-white px-4 sm:px-6 rounded-2xl border border-[#E8E4DC] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <Tabs tabs={profileTabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 Stat Overview Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card variant="elevated" padding="md">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                  Zdravotní stav
                </span>
                <ShieldCheck size={16} className="text-[#2C4A3E]" />
              </div>
              <p className="mt-2 text-xl font-bold text-[#191E1B]">
                {healthStatusLabel[pet.healthStatus]}
              </p>
              <p className="text-xs text-[#2C4A3E] font-medium mt-1">
                Všechna preventivní vyšetření aktuální
              </p>
            </Card>

            <Card variant="elevated" padding="md">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                  Tělesná hmotnost
                </span>
                <Activity size={16} className="text-emerald-700" />
              </div>
              <p className="mt-2 text-xl font-bold text-[#191E1B]">{pet.weight} kg</p>
              <p className="text-xs text-[#7D8B82] font-medium mt-1">
                Ideální kondiční skóre
              </p>
            </Card>

            <Card variant="elevated" padding="md">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                  Poslední návštěva veterináře
                </span>
                <Stethoscope size={16} className="text-sky-700" />
              </div>
              <p className="mt-2 text-xl font-bold text-[#191E1B]">{pet.lastVetVisit}</p>
              <p className="text-xs text-[#7D8B82] font-medium mt-1">
                Rutinní prohlídka a screening
              </p>
            </Card>

            <Card variant="elevated" padding="md">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                  Další očkování
                </span>
                <Syringe size={16} className="text-[#B8934A]" />
              </div>
              <p className="mt-2 text-xl font-bold text-[#2C4A3E]">
                {pet.nextVaccination}
              </p>
              <p className="text-xs text-[#B8934A] font-medium mt-1">
                Posilovací dávka na podzim
              </p>
            </Card>
          </div>

          {/* Additional details: Lifestyle & Care */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card variant="elevated">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-[#FAF4E6] text-[#B8934A] flex items-center justify-center">
                  <Utensils size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#191E1B]">Výživa a stravovací režim</h3>
                  <p className="text-xs text-[#7D8B82]">Doporučený krmný plán a doplňky stravy</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                    Hlavní výživa
                  </span>
                  <p className="font-semibold text-[#191E1B] mt-0.5">
                    {pet.diet || 'Bezobilná receptura s vysokým obsahem bílkovin a probiotiky'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                    Denní doplňky stravy
                  </span>
                  <p className="font-semibold text-[#191E1B] mt-0.5">
                    Omega-3 olej z divokého lososa (2 střiky k večeři)
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                    Oblíbené hračky a stimulace
                  </span>
                  <p className="font-semibold text-[#191E1B] mt-0.5">
                    {pet.favoriteToy || 'Plyšová kachna, Kong hlavolam a frisbee'}
                  </p>
                </div>
              </div>
            </Card>

            <Card variant="elevated">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-[#EBF2EE] text-[#2C4A3E] flex items-center justify-center">
                    <Clock size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#191E1B]">Denní péče – kontrolní seznam</h3>
                    <p className="text-xs text-[#7D8B82]">Sledujte ranní a večerní rutiny</p>
                  </div>
                </div>
                <Badge variant="success" size="sm">
                  100 % splněno
                </Badge>
              </div>

              <div className="space-y-2.5">
                {[
                  { title: 'Ranní procházka a cvičení (45 min)', time: '07:30', done: true },
                  { title: 'Snídaně + čerstvá voda', time: '08:30', done: true },
                  { title: 'Pamlsek na zuby a vyčesání srsti', time: '14:00', done: true },
                  { title: 'Večerní hra a večeře', time: '18:30', done: false },
                  { title: 'Dávka doplňku na klouby', time: '20:00', done: false },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#E8E4DC] hover:bg-[#FAF8F5] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-5 w-5 rounded-md flex items-center justify-center ${
                          item.done
                            ? 'bg-[#2C4A3E] text-white'
                            : 'border-2 border-[#D1E0D8]'
                        }`}
                      >
                        {item.done && <ShieldCheck size={12} />}
                      </div>
                      <span className="text-xs font-semibold text-[#191E1B]">
                        {item.title}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-[#7D8B82]">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Health Records Tab */}
      {activeTab === 'health' && (
        <Card variant="elevated">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#F0EDE6]">
            <div>
              <h3 className="text-lg font-bold text-[#191E1B]">Zdravotní záznamy a historie</h3>
              <p className="text-xs text-[#7D8B82] mt-0.5">
                Ověřené klinické záznamy, očkování a předepsané dávkování
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setActiveModal('addHealthRecord')}
            >
              <Plus size={15} />
              <span>Přidat záznam</span>
            </Button>
          </div>

          <ul className="divide-y divide-[#F0EDE6]">
            {petHealthRecords.length === 0 ? (
              <li className="py-8 text-center text-sm text-[#7D8B82]">
                Pro tohoto mazlíčka zatím nejsou žádné záznamy.
              </li>
            ) : (
              petHealthRecords.map((record) => (
                <li
                  key={record.id}
                  className="py-4.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF8F5] -mx-4 px-4 sm:-mx-6 sm:px-6 rounded-xl transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${
                        record.type === 'vaccination'
                          ? 'bg-[#EBF2EE] text-[#2C4A3E]'
                          : record.type === 'medication'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-sky-50 text-sky-700'
                      }`}
                    >
                      {record.type === 'vaccination' ? (
                        <Syringe size={18} />
                      ) : record.type === 'medication' ? (
                        <Heart size={18} />
                      ) : (
                        <Stethoscope size={18} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[#191E1B]">
                          {record.title}
                        </p>
                        <Badge
                          variant={
                            record.status === 'completed'
                              ? 'success'
                              : record.status === 'active'
                                ? 'primary'
                                : 'default'
                          }
                          size="sm"
                        >
                          {record.status === 'completed'
                            ? 'Dokončeno'
                            : record.status === 'active'
                              ? 'Aktivní'
                              : record.status || 'Ověřeno'}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#4A564F] font-medium mt-0.5">
                        {record.subtitle}
                      </p>
                      {record.clinic && (
                        <p className="text-[11px] text-[#7D8B82] mt-0.5">
                          {record.clinic} {record.doctor && `· ${record.doctor}`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <Badge variant="outline" size="sm" className="font-mono">
                      {record.date}
                    </Badge>
                  </div>
                </li>
              ))
            )}
          </ul>
        </Card>
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <Card variant="elevated">
          <div className="mb-6 pb-4 border-b border-[#F0EDE6]">
            <h3 className="text-lg font-bold text-[#191E1B]">Časová osa životní cesty</h3>
            <p className="text-xs text-[#7D8B82] mt-0.5">
              Důležité milníky vývoje, lékařské zákroky a vzpomínky na adopci
            </p>
          </div>

          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E8E4DC]">
            {petTimeline.map((event) => (
              <div key={event.id} className="relative group">
                <div className="absolute -left-6 sm:-left-8 top-1 h-3.5 w-3.5 rounded-full border-2 border-[#2C4A3E] bg-white ring-4 ring-[#FAF8F5] transition-transform group-hover:scale-125" />
                <div className="rounded-2xl border border-[#E8E4DC] p-4 bg-[#FAF8F5] hover:bg-white hover:shadow-xs transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="text-sm font-bold text-[#191E1B] flex items-center gap-2">
                      <span>{event.title}</span>
                      {event.category === 'birthday' && (
                        <Sparkles size={13} className="text-[#B8934A]" />
                      )}
                    </h4>
                    <span className="text-xs font-semibold text-[#2C4A3E] font-mono">
                      {event.date}
                    </span>
                  </div>
                  {event.description && (
                    <p className="mt-1.5 text-xs text-[#4A564F] leading-relaxed">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <Card variant="elevated">
          <div className="mb-6 pb-4 border-b border-[#F0EDE6] flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#191E1B]">
                Oficiální záznamy a certifikáty
              </h3>
              <p className="text-xs text-[#7D8B82] mt-0.5">
                Stáhněte ověřené veterinární PDF, skeny pasů a rodokmeny
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveModal('addPhoto')}
            >
              Nahrát dokument
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: 'Oficiální pas mazlíčka a certifikát vztekliny.pdf', size: '2,4 MB', date: 'srp 2026' },
              { name: 'Národní certifikát registrace mikročipu.pdf', size: '1,1 MB', date: 'úno 2023' },
              { name: 'Komplexní pojistná smlouva zdravotního pojištění.pdf', size: '4,8 MB', date: 'led 2026' },
              { name: 'Kompletní krevní a biochemický panel.pdf', size: '1,7 MB', date: 'čvc 2026' },
              { name: 'Certifikát šampiona a rodokmen.pdf', size: '3,2 MB', date: 'říj 2022' },
            ].map((doc) => (
              <div
                key={doc.name}
                className="group rounded-2xl border border-[#E8E4DC] p-4.5 bg-[#FAF8F5] hover:bg-white hover:border-[#D1E0D8] hover:shadow-xs transition-all flex flex-col justify-between min-h-[140px]"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-[#EBF2EE] text-[#2C4A3E] flex items-center justify-center font-bold text-xs">
                    <FileText size={19} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#191E1B] group-hover:text-[#2C4A3E] transition-colors line-clamp-2">
                      {doc.name}
                    </p>
                    <p className="text-[10px] text-[#7D8B82] mt-1">
                      {doc.size} · Aktualizováno {doc.date}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[#E8E4DC] flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#B8934A]">
                    Ověřené PDF
                  </span>
                  <button
                    onClick={() => handleDownloadDoc(doc.name)}
                    className="text-xs font-semibold text-[#2C4A3E] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Download size={13} />
                    Stáhnout
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Photos Tab */}
      {activeTab === 'photos' && (
        <Card variant="elevated">
          <div className="mb-6 pb-4 border-b border-[#F0EDE6] flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#191E1B]">Fotografické vzpomínky a milníky</h3>
              <p className="text-xs text-[#7D8B82] mt-0.5">
                Galerie ve vysokém rozlišení z dobrodružství vašeho mazlíčka
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveModal('addPhoto')}
            >
              Nahrát fotografii
            </Button>
          </div>

          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {galleryImages.map((src, i) => (
              <div
                key={i}
                onClick={() => setActivePhoto(src)}
                className="group relative aspect-square overflow-hidden rounded-2xl bg-stone-100 cursor-pointer shadow-xs border border-[#E8E4DC]"
              >
                <img
                  src={src}
                  alt={`${pet.name} – fotografie ${i + 1}`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                  <span>Zobrazit celou fotografii</span>
                </div>
              </div>
            ))}
          </div>

          {/* Lightbox Modal */}
          {activePhoto && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
              onClick={() => setActivePhoto(null)}
            >
              <div className="relative max-w-2xl w-full max-h-[85vh] overflow-hidden rounded-3xl border border-white/20 shadow-2xl">
                <img
                  src={activePhoto}
                  alt="Celý náhled"
                  className="w-full h-full object-contain max-h-[80vh] bg-black"
                />
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
