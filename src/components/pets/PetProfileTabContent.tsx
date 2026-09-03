import {
  Activity,
  Bell,
  BellOff,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Heart,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Syringe,
  Trash2,
  TrendingUp,
  Utensils,
  X,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  healthRecords as initialHealthRecords,
  timelineEvents as staticTimelineEvents,
  weightMeasurements as initialWeightMeasurements,
  petDocuments as initialPetDocuments,
} from '../../data/mockData'
import { useApp } from '../../context/AppContext'
import type {
  HealthRecord,
  Pet,
  PetDocument,
  TimelineEvent,
  WeightMeasurement,
} from '../../types'
import {
  buildPetTimeline,
  isDocumentExpiringSoon,
  parseCzechDate,
} from '../../lib/petProfileUtils'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { cn } from '../../lib/utils'
import {
  EMPTY_PROFILE_LABEL,
  formatHealthStatus,
  formatOptionalText,
  formatOptionalWeight,
} from '../../lib/petProfileDisplay'
import { PET_IMAGE_ACCEPT, readImageFileAsDataUrl, takeSelectedFiles } from '../../lib/readImageFile'

interface PetProfileTabContentProps {
  pet: Pet
  activeTab: string
  onTabChange: (tab: string) => void
}

export function PetProfileTabContent({ pet, activeTab, onTabChange }: PetProfileTabContentProps) {
  const {
    setActiveModal,
    showToast,
    photos: allPhotos,
    addPetPhotos,
    updatePetPhoto,
    deletePetPhoto,
  } = useApp()
  const galleryFileInputRef = useRef<HTMLInputElement>(null)
  const [galleryUploading, setGalleryUploading] = useState(false)

  const [allRecords, setAllRecords] = useState<HealthRecord[]>(initialHealthRecords)
  const [weightData, setWeightData] = useState<WeightMeasurement[]>(() =>
    initialWeightMeasurements.filter((w) => w.petId === pet.id),
  )
  const [documents, setDocuments] = useState<PetDocument[]>(() =>
    initialPetDocuments.filter((d) => d.petId === pet.id),
  )
  const photos = allPhotos.filter((p) => p.petId === pet.id)
  const [customTimeline, setCustomTimeline] = useState<TimelineEvent[]>([])

  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null)
  const [documentPreview, setDocumentPreview] = useState<PetDocument | null>(null)
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null)
  const [editingPhoto, setEditingPhoto] = useState<(typeof photos)[number] | null>(null)
  const [photoCaption, setPhotoCaption] = useState('')
  const [addEventOpen, setAddEventOpen] = useState(false)
  const [newWeight, setNewWeight] = useState('')
  const [newWeightNote, setNewWeightNote] = useState('')
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    category: 'memory' as TimelineEvent['category'],
    description: '',
  })

  const petRecords = allRecords.filter((r) => r.petId === pet.id)
  const vaccinations = petRecords.filter((r) => r.type === 'vaccination')
  const medications = petRecords.filter((r) => r.type === 'medication')

  const mergedTimeline = useMemo(
    () =>
      buildPetTimeline(
        pet.id,
        staticTimelineEvents,
        allRecords,
        customTimeline,
      ),
    [pet.id, allRecords, customTimeline],
  )

  const chartData = useMemo(
    () =>
      [...weightData]
        .sort((a, b) => parseCzechDate(a.date) - parseCzechDate(b.date))
        .map((w) => ({
          label: w.date.replace(/\.\s*\d{4}$/, '.'),
          weight: w.weight,
        })),
    [weightData],
  )

  const yDomain = useMemo((): [number, number] => {
    const weights = chartData.map((d) => d.weight)
    if (weights.length === 0) {
      const base = pet.weight && pet.weight > 0 ? pet.weight : 5
      return [Math.max(0, base - 2), base + 2]
    }
    const min = Math.min(...weights)
    const max = Math.max(...weights)
    const pad = Math.max((max - min) * 0.25, 0.4)
    return [Math.floor((min - pad) * 10) / 10, Math.ceil((max + pad) * 10) / 10]
  }, [chartData, pet.weight])

  const openRecordDetail = (record: HealthRecord) => setSelectedRecord(record)

  const openRecordFromTimeline = (event: TimelineEvent) => {
    if (!event.sourceId) return
    const record = allRecords.find((r) => r.id === event.sourceId)
    if (record) {
      setSelectedRecord(record)
      onTabChange('health')
    }
  }

  const toggleMedicationReminder = (recordId: string) => {
    setAllRecords((prev) =>
      prev.map((r) =>
        r.id === recordId ? { ...r, reminderEnabled: !r.reminderEnabled } : r,
      ),
    )
    const record = allRecords.find((r) => r.id === recordId)
    if (record) {
      showToast(
        !record.reminderEnabled ? 'Připomínka zapnuta' : 'Připomínka vypnuta',
        `${record.subtitle} · ${record.scheduleTime || record.date}`,
        'gold',
      )
    }
  }

  const handleAddWeight = () => {
    const weight = parseFloat(newWeight.replace(',', '.'))
    if (!weight || Number.isNaN(weight)) return
    const today = new Date()
    const dateStr = `${today.getDate()}. ${today.getMonth() + 1}. ${today.getFullYear()}`
    const entry: WeightMeasurement = {
      id: `wm_${Date.now()}`,
      petId: pet.id,
      date: dateStr,
      weight,
      note: newWeightNote || undefined,
    }
    setWeightData((prev) => [...prev, entry])
    setNewWeight('')
    setNewWeightNote('')
    showToast('Měření přidáno', `${pet.name}: ${weight} kg`, 'gold')
  }

  const handleAddTimelineEvent = () => {
    if (!newEvent.title.trim() || !newEvent.date.trim()) return
    const event: TimelineEvent = {
      id: `custom_${Date.now()}`,
      petId: pet.id,
      title: newEvent.title.trim(),
      date: newEvent.date.trim(),
      category: newEvent.category,
      description: newEvent.description.trim() || undefined,
      source: 'manual',
    }
    setCustomTimeline((prev) => [...prev, event])
    setAddEventOpen(false)
    setNewEvent({ title: '', date: '', category: 'memory', description: '' })
    showToast('Událost přidána', 'Nová položka byla přidána do časové osy.', 'gold')
  }

  const handleReplaceDocument = (docId: string) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId
          ? { ...d, updatedAt: 'právě teď', size: '2,1 MB' }
          : d,
      ),
    )
    showToast('Dokument nahrazen', 'Nová verze byla nahrána a ověřena.', 'gold')
  }

  const handleUpdateDocumentExpiry = (docId: string, expiresAt: string) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, expiresAt } : d)),
    )
    showToast('Platnost aktualizována', 'Datum expirace dokumentu bylo uloženo.', 'info')
  }

  const handleDeletePhoto = (photoId: string) => {
    deletePetPhoto(photoId)
    setGalleryIndex(null)
    showToast('Fotografie smazána', 'Snímek byl odstraněn z galerie.', 'info')
  }

  const handleSavePhotoCaption = () => {
    if (!editingPhoto) return
    updatePetPhoto(editingPhoto.id, { caption: photoCaption.trim() || undefined })
    setEditingPhoto(null)
    showToast('Popisek uložen', 'Fotografie byla aktualizována.', 'gold')
  }

  const openCaptionEditor = (photo: (typeof photos)[number]) => {
    setEditingPhoto(photo)
    setPhotoCaption(photo.caption || '')
  }

  const handleGalleryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const files = takeSelectedFiles(input)
    if (files.length === 0) return

    setGalleryUploading(true)
    try {
      const urls: string[] = []
      for (const file of files) {
        urls.push(await readImageFileAsDataUrl(file))
      }
      addPetPhotos(pet.id, urls)
      onTabChange('photos')
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
      setGalleryUploading(false)
    }
  }

  const activeGalleryPhoto = galleryIndex !== null ? photos[galleryIndex] : null

  return (
    <>
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card variant="elevated" padding="md" hoverable onClick={() => onTabChange('health')}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                  Zdravotní stav
                </span>
                <ShieldCheck size={16} className="text-[#234B54]" />
              </div>
              <p className="mt-2 text-xl font-bold text-[#191E1B]">
                {formatHealthStatus(pet.healthStatus)}
              </p>
              <p className="text-xs text-[#234B54] font-medium mt-1">
                Klepnutím otevřete zdravotní sekci
              </p>
            </Card>

            <Card variant="elevated" padding="md" hoverable onClick={() => onTabChange('health')}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                  Tělesná hmotnost
                </span>
                <Activity size={16} className="text-emerald-700" />
              </div>
              <p className="mt-2 text-xl font-bold text-[#191E1B]">
                {weightData.length > 0
                  ? formatOptionalWeight(weightData[weightData.length - 1]?.weight)
                  : formatOptionalWeight(pet.weight)}
              </p>
              <p className="text-xs text-[#7D8B82] font-medium mt-1">
                Sledujte vývoj a přidávejte měření
              </p>
            </Card>

            <Card variant="elevated" padding="md" hoverable onClick={() => onTabChange('health')}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                  Poslední návštěva veterináře
                </span>
                <Stethoscope size={16} className="text-sky-700" />
              </div>
              <p className="mt-2 text-xl font-bold text-[#191E1B]">
                {formatOptionalText(pet.lastVetVisit)}
              </p>
              <p className="text-xs text-[#7D8B82] font-medium mt-1">Zobrazit klinické záznamy</p>
            </Card>

            <Card variant="elevated" padding="md" hoverable onClick={() => onTabChange('health')}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                  Další očkování
                </span>
                <Syringe size={16} className="text-[#B8934A]" />
              </div>
              <p className="mt-2 text-xl font-bold text-[#234B54]">
                {formatOptionalText(pet.nextVaccination)}
              </p>
              <p className="text-xs text-[#B8934A] font-medium mt-1">Detail vakcíny a veterináře</p>
            </Card>
          </div>

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
                    {formatOptionalText(pet.diet)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                    Denní doplňky stravy
                  </span>
                  <p className="font-semibold text-[#191E1B] mt-0.5">
                    {formatOptionalText(pet.supplements)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                    Oblíbené hračky a stimulace
                  </span>
                  <p className="font-semibold text-[#191E1B] mt-0.5">
                    {formatOptionalText(pet.favoriteToy)}
                  </p>
                </div>
              </div>
            </Card>

            <Card variant="elevated">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-[#EBF2EE] text-[#234B54] flex items-center justify-center">
                    <Clock size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#191E1B]">Denní péče – kontrolní seznam</h3>
                    <p className="text-xs text-[#7D8B82]">Propojeno s léky a připomínkami</p>
                  </div>
                </div>
                {medications.length > 0 && (
                  <Badge variant="success" size="sm">100 % splněno</Badge>
                )}
              </div>
              {medications.length === 0 ? (
                <p className="text-sm text-[#7D8B82] py-6 text-center">
                  {EMPTY_PROFILE_LABEL}. Přidejte léky nebo péči ve zdravotní sekci.
                </p>
              ) : (
              <div className="space-y-2.5">
                {medications.map((med) => (
                  <button
                    key={med.id}
                    type="button"
                    onClick={() => {
                      onTabChange('health')
                      openRecordDetail(med)
                    }}
                    className="flex w-full items-center justify-between p-3 rounded-xl border border-[#E8E4DC] hover:bg-[#FAF8F5] transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-5 w-5 rounded-md flex items-center justify-center bg-[#234B54] text-white shrink-0">
                        <Heart size={12} />
                      </div>
                      <span className="text-xs font-semibold text-[#191E1B] truncate">
                        {med.subtitle} · {med.dosage}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-[#7D8B82] shrink-0 ml-2">
                      {med.scheduleTime}
                    </span>
                  </button>
                ))}
              </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'health' && (
        <div className="space-y-6">
          <Card variant="elevated">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-[#191E1B] flex items-center gap-2">
                  <TrendingUp size={18} className="text-[#234B54]" />
                  Vývoj hmotnosti
                </h3>
                <p className="text-xs text-[#7D8B82] mt-0.5">
                  Aktuálně {weightData[weightData.length - 1]?.weight ?? pet.weight} kg
                </p>
              </div>
            </div>
            {chartData.length > 0 && (
              <div className="h-48 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#7D8B82' }} />
                    <YAxis domain={yDomain} tick={{ fontSize: 10, fill: '#7D8B82' }} width={36} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="weight"
                      stroke="#234B54"
                      fill="#E0EAEC"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex flex-wrap gap-2 border-t border-[#F0EDE6] pt-4">
              <input
                type="text"
                inputMode="decimal"
                placeholder="Hmotnost (kg)"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                className="h-9 w-28 rounded-xl border border-[#E8E4DC] px-3 text-xs outline-none focus:border-[#234B54]"
              />
              <input
                type="text"
                placeholder="Poznámka (volitelné)"
                value={newWeightNote}
                onChange={(e) => setNewWeightNote(e.target.value)}
                className="h-9 flex-1 min-w-[140px] rounded-xl border border-[#E8E4DC] px-3 text-xs outline-none focus:border-[#234B54]"
              />
              <Button size="sm" variant="primary" onClick={handleAddWeight} disabled={!newWeight.trim()}>
                <Plus size={14} />
                Přidat měření
              </Button>
            </div>
            <ul className="mt-3 space-y-1.5">
              {[...weightData]
                .sort((a, b) => parseCzechDate(b.date) - parseCzechDate(a.date))
                .slice(0, 4)
                .map((w) => (
                  <li key={w.id} className="flex justify-between text-[11px] text-[#5A6660] px-1">
                    <span>{w.date}{w.note ? ` · ${w.note}` : ''}</span>
                    <span className="font-bold text-[#191E1B] tabular-nums">{w.weight} kg</span>
                  </li>
                ))}
            </ul>
          </Card>

          <Card variant="elevated">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#F0EDE6]">
              <div>
                <h3 className="text-lg font-bold text-[#191E1B]">Zdravotní záznamy a historie</h3>
                <p className="text-xs text-[#7D8B82] mt-0.5">
                  Klepnutím otevřete detail · očkování, léky a návštěvy propojené s časovou osou
                </p>
              </div>
              <Button size="sm" variant="primary" onClick={() => setActiveModal('addHealthRecord')}>
                <Plus size={15} />
                <span>Přidat záznam</span>
              </Button>
            </div>

            {vaccinations.length > 0 && (
              <div className="mb-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54] mb-2">
                  Očkování
                </p>
                <ul className="space-y-2">
                  {vaccinations.map((record) => (
                    <li key={record.id}>
                      <button
                        type="button"
                        onClick={() => openRecordDetail(record)}
                        className="w-full flex items-center justify-between gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3.5 text-left hover:bg-white hover:border-[#234B54]/30 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="h-9 w-9 shrink-0 rounded-lg bg-[#E0EAEC] text-[#234B54] flex items-center justify-center">
                            <Syringe size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#191E1B]">
                              {record.vaccineName || record.subtitle}
                            </p>
                            <p className="text-[11px] text-[#5A6660] mt-0.5">
                              {record.date} · {record.doctor}
                            </p>
                            {record.nextDueDate && (
                              <p className="text-[11px] font-semibold text-[#B8934A] mt-0.5">
                                Další termín: {record.nextDueDate}
                              </p>
                            )}
                          </div>
                        </div>
                        <ExternalLink size={14} className="text-[#7D8B82] shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {medications.length > 0 && (
              <div className="mb-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54] mb-2">
                  Léky a doplňky
                </p>
                <ul className="space-y-2">
                  {medications.map((record) => (
                    <li
                      key={record.id}
                      className="rounded-xl border border-[#E8E4DC] bg-white p-3.5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => openRecordDetail(record)}
                          className="flex items-start gap-3 min-w-0 text-left cursor-pointer"
                        >
                          <div className="h-9 w-9 shrink-0 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                            <Heart size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#191E1B]">{record.subtitle}</p>
                            <p className="text-[11px] text-[#5A6660] mt-0.5">
                              Dávkování: {record.dosage || 'dle předpisu'}
                            </p>
                            <p className="text-[11px] text-[#5A6660]">
                              Čas podání: {record.scheduleTime || record.date}
                            </p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleMedicationReminder(record.id)}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer',
                            record.reminderEnabled
                              ? 'bg-[#E0EAEC] text-[#234B54]'
                              : 'bg-[#FAF8F5] text-[#7D8B82] border border-[#E8E4DC]',
                          )}
                        >
                          {record.reminderEnabled ? <Bell size={12} /> : <BellOff size={12} />}
                          {record.reminderEnabled ? 'Připomínka zapnutá' : 'Zapnout připomínku'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54] mb-2">
              Všechny klinické záznamy
            </p>
            <ul className="divide-y divide-[#F0EDE6]">
              {petRecords.length === 0 ? (
                <li className="py-8 text-center text-sm text-[#7D8B82]">
                  Pro tohoto mazlíčka zatím nejsou žádné záznamy.
                </li>
              ) : (
                petRecords.map((record) => (
                  <li key={record.id}>
                    <button
                      type="button"
                      onClick={() => openRecordDetail(record)}
                      className="w-full py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF8F5] -mx-4 px-4 sm:-mx-6 sm:px-6 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={cn(
                            'h-10 w-10 shrink-0 rounded-xl flex items-center justify-center',
                            record.type === 'vaccination'
                              ? 'bg-[#E0EAEC] text-[#234B54]'
                              : record.type === 'medication'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-sky-50 text-sky-700',
                          )}
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-[#191E1B]">{record.title}</p>
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
                                  : 'Ověřeno'}
                            </Badge>
                          </div>
                          <p className="text-xs text-[#4A564F] font-medium mt-0.5">{record.subtitle}</p>
                        </div>
                      </div>
                      <Badge variant="outline" size="sm" className="font-mono self-end sm:self-center">
                        {record.date}
                      </Badge>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </Card>
        </div>
      )}

      {activeTab === 'timeline' && (
        <Card variant="elevated">
          <div className="mb-6 pb-4 border-b border-[#F0EDE6] flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#191E1B]">Časová osa životní cesty</h3>
              <p className="text-xs text-[#7D8B82] mt-0.5">
                Automaticky zahrnuje zdravotní záznamy, očkování a vaše vlastní události
              </p>
            </div>
            <Button size="sm" variant="primary" onClick={() => setAddEventOpen(true)}>
              <Plus size={15} />
              Přidat událost
            </Button>
          </div>

          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E8E4DC]">
            {mergedTimeline.map((event) => (
              <div key={event.id} className="relative group">
                <div className="absolute -left-6 sm:-left-8 top-1 h-3.5 w-3.5 rounded-full border-2 border-[#234B54] bg-white ring-4 ring-[#FAF8F5] transition-transform group-hover:scale-125" />
                <button
                  type="button"
                  onClick={() =>
                    event.sourceId ? openRecordFromTimeline(event) : undefined
                  }
                  className={cn(
                    'w-full rounded-2xl border border-[#E8E4DC] p-4 bg-[#FAF8F5] hover:bg-white hover:shadow-xs transition-all text-left',
                    event.sourceId && 'cursor-pointer',
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="text-sm font-bold text-[#191E1B] flex items-center gap-2 flex-wrap">
                      <span>{event.title}</span>
                      {event.category === 'birthday' && (
                        <Sparkles size={13} className="text-[#B8934A]" />
                      )}
                      {event.source && event.source !== 'manual' && (
                        <Badge variant="outline" size="sm">
                          {event.source === 'vaccination'
                            ? 'Očkování'
                            : event.source === 'medication'
                              ? 'Léky'
                              : 'Zdraví'}
                        </Badge>
                      )}
                    </h4>
                    <span className="text-xs font-semibold text-[#234B54] font-mono">{event.date}</span>
                  </div>
                  {event.description && (
                    <p className="mt-1.5 text-xs text-[#4A564F] leading-relaxed">{event.description}</p>
                  )}
                  {event.sourceId && (
                    <p className="mt-1.5 text-[10px] font-semibold text-[#234B54]">
                      Klepnutím otevřete detail záznamu →
                    </p>
                  )}
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'documents' && (
        <Card variant="elevated">
          <div className="mb-6 pb-4 border-b border-[#F0EDE6] flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#191E1B]">Oficiální záznamy a certifikáty</h3>
              <p className="text-xs text-[#7D8B82] mt-0.5">
                Otevřete, stáhněte, nahraďte nebo nastavte platnost dokumentů
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setActiveModal('addPhoto', pet.id)}>
              Nahrát dokument
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="group rounded-2xl border border-[#E8E4DC] p-4.5 bg-[#FAF8F5] hover:bg-white hover:border-[#D1E0D8] hover:shadow-xs transition-all flex flex-col justify-between min-h-[160px]"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-[#E0EAEC] text-[#234B54] flex items-center justify-center">
                    <FileText size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#191E1B] line-clamp-2">{doc.name}</p>
                    <p className="text-[10px] text-[#7D8B82] mt-1">
                      {doc.size} · Aktualizováno {doc.updatedAt}
                    </p>
                    {doc.expiresAt && (
                      <p
                        className={cn(
                          'text-[10px] font-semibold mt-0.5',
                          isDocumentExpiringSoon(doc.expiresAt)
                            ? 'text-[#B8934A]'
                            : 'text-[#234B54]',
                        )}
                      >
                        Platnost do: {doc.expiresAt}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[#E8E4DC] flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDocumentPreview(doc)}
                    className="text-[11px] font-semibold text-[#234B54] hover:text-[#B8934A] flex items-center gap-1 cursor-pointer"
                  >
                    <Eye size={12} />
                    Otevřít
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      showToast(`Stahování: ${doc.name}`, 'PDF připraveno ke stažení.', 'gold')
                    }
                    className="text-[11px] font-semibold text-[#234B54] hover:text-[#B8934A] flex items-center gap-1 cursor-pointer"
                  >
                    <Download size={12} />
                    Stáhnout
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReplaceDocument(doc.id)}
                    className="text-[11px] font-semibold text-[#7D8B82] hover:text-[#234B54] flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    Nahradit
                  </button>
                </div>
                <div className="mt-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                    Platnost / expirace
                  </label>
                  <input
                    type="text"
                    defaultValue={doc.expiresAt || ''}
                    placeholder="např. 12. 2028"
                    onBlur={(e) => {
                      if (e.target.value !== (doc.expiresAt || '')) {
                        handleUpdateDocumentExpiry(doc.id, e.target.value)
                      }
                    }}
                    className="mt-1 w-full h-8 rounded-lg border border-[#E8E4DC] px-2 text-[11px] outline-none focus:border-[#234B54]"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'photos' && (
        <Card variant="elevated">
          <input
            ref={galleryFileInputRef}
            type="file"
            accept={PET_IMAGE_ACCEPT}
            multiple
            className="sr-only"
            disabled={galleryUploading}
            onChange={handleGalleryUpload}
          />

          <div className="mb-6 pb-4 border-b border-[#F0EDE6] flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#191E1B]">Fotografické vzpomínky a milníky</h3>
              <p className="text-xs text-[#7D8B82] mt-0.5">
                Full-screen galerie · upravit popisek nebo smazat fotografii
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={galleryUploading}
              onClick={() => galleryFileInputRef.current?.click()}
            >
              <Plus size={14} />
              {galleryUploading ? 'Nahrávám…' : 'Nahrát fotografii'}
            </Button>
          </div>

          {photos.length === 0 ? (
            <button
              type="button"
              disabled={galleryUploading}
              onClick={() => galleryFileInputRef.current?.click()}
              className={cn(
                'flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#D1E0D8] bg-[#FAF8F5] px-6 py-12 text-center transition-colors hover:border-[#2C4A3E] hover:bg-[#EBF2EE]',
                galleryUploading && 'pointer-events-none opacity-60',
              )}
            >
              <Plus size={22} className="text-[#2C4A3E]" />
              <div>
                <p className="text-sm font-bold text-[#191E1B]">
                  {galleryUploading ? 'Nahrávám fotografii…' : 'Přidejte první fotografii'}
                </p>
                <p className="mt-1 text-xs text-[#7D8B82]">
                  Klepněte sem a vyberte JPG, PNG, WEBP nebo GIF (do 25 MB)
                </p>
              </div>
            </button>
          ) : (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((photo, i) => (
                <div
                  key={photo.id}
                  onClick={() => setGalleryIndex(i)}
                  className="group relative aspect-square overflow-hidden rounded-2xl bg-stone-100 cursor-pointer shadow-xs border border-[#E8E4DC]"
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || `${pet.name} – fotografie ${i + 1}`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-[10px] font-medium text-white truncate">
                      {photo.caption || 'Bez popisku'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Health record detail modal */}
      <Modal
        open={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title={selectedRecord?.title ?? ''}
        subtitle={selectedRecord?.subtitle}
        maxWidth="lg"
      >
        {selectedRecord && (
          <HealthRecordDetailBody
            record={allRecords.find((r) => r.id === selectedRecord.id) ?? selectedRecord}
            onToggleReminder={toggleMedicationReminder}
            onGoTimeline={() => onTabChange('timeline')}
            onClose={() => setSelectedRecord(null)}
          />
        )}
      </Modal>

      {/* Add timeline event */}
      <Modal
        open={addEventOpen}
        onClose={() => setAddEventOpen(false)}
        title="Přidat událost"
        subtitle="Adopce, výlet, operace, narozeniny nebo důležitá vzpomínka"
      >
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Název události"
            value={newEvent.title}
            onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))}
            className="w-full h-10 rounded-xl border border-[#E8E4DC] px-3 text-sm outline-none focus:border-[#234B54]"
          />
          <input
            type="text"
            placeholder="Datum (např. 15. 9. 2026)"
            value={newEvent.date}
            onChange={(e) => setNewEvent((p) => ({ ...p, date: e.target.value }))}
            className="w-full h-10 rounded-xl border border-[#E8E4DC] px-3 text-sm outline-none focus:border-[#234B54]"
          />
          <select
            value={newEvent.category}
            onChange={(e) =>
              setNewEvent((p) => ({
                ...p,
                category: e.target.value as TimelineEvent['category'],
              }))
            }
            className="w-full h-10 rounded-xl border border-[#E8E4DC] px-3 text-sm outline-none focus:border-[#234B54]"
          >
            <option value="memory">Vzpomínka</option>
            <option value="milestone">Milník</option>
            <option value="adoption">Adopce</option>
            <option value="birthday">Narozeniny</option>
            <option value="medical">Zdravotní</option>
          </select>
          <textarea
            placeholder="Popis (volitelné)"
            value={newEvent.description}
            onChange={(e) => setNewEvent((p) => ({ ...p, description: e.target.value }))}
            rows={3}
            className="w-full rounded-xl border border-[#E8E4DC] px-3 py-2 text-sm outline-none focus:border-[#234B54] resize-none"
          />
          <Button variant="primary" fullWidth onClick={handleAddTimelineEvent}>
            Přidat do časové osy
          </Button>
        </div>
      </Modal>

      {/* Document preview */}
      <Modal
        open={!!documentPreview}
        onClose={() => setDocumentPreview(null)}
        title={documentPreview?.name ?? 'Dokument'}
        subtitle={`${documentPreview?.size} · aktualizováno ${documentPreview?.updatedAt}`}
        maxWidth="lg"
      >
        {documentPreview && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-8 text-center">
              <FileText size={48} className="mx-auto text-[#234B54] mb-3" />
              <p className="text-sm font-bold text-[#191E1B]">{documentPreview.name}</p>
              <p className="text-xs text-[#7D8B82] mt-1">Náhled PDF dokumentu</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  showToast(`Stahování: ${documentPreview.name}`, 'PDF připraveno.', 'gold')
                }
              >
                <Download size={14} />
                Stáhnout
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleReplaceDocument(documentPreview.id)}>
                <RefreshCw size={14} />
                Nahradit
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Full-screen gallery */}
      {activeGalleryPhoto && galleryIndex !== null && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/95 backdrop-blur-md">
          <div className="flex items-center justify-between p-4 text-white">
            <span className="text-sm font-medium">
              {galleryIndex + 1} / {photos.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openCaptionEditor(activeGalleryPhoto)}
                className="rounded-xl p-2 hover:bg-white/10 cursor-pointer"
                aria-label="Upravit popisek"
                title="Upravit popisek"
              >
                <Pencil size={18} />
              </button>
              <button
                type="button"
                onClick={() => handleDeletePhoto(activeGalleryPhoto.id)}
                className="rounded-xl p-2 hover:bg-white/10 text-rose-300 cursor-pointer"
                aria-label="Smazat fotografii"
              >
                <Trash2 size={18} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setGalleryIndex(null)
                  setEditingPhoto(null)
                }}
                className="rounded-xl p-2 hover:bg-white/10 cursor-pointer"
                aria-label="Zavřít galerii"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="relative flex flex-1 items-center justify-center px-4">
            <button
              type="button"
              onClick={() => {
                setEditingPhoto(null)
                setGalleryIndex((i) => (i !== null && i > 0 ? i - 1 : photos.length - 1))
              }}
              className="absolute left-2 sm:left-6 rounded-full p-2 bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              aria-label="Předchozí"
            >
              <ChevronLeft size={24} />
            </button>
            <img
              src={activeGalleryPhoto.url}
              alt={activeGalleryPhoto.caption || pet.name}
              className="max-h-[70vh] max-w-full object-contain rounded-lg"
            />
            <button
              type="button"
              onClick={() => {
                setEditingPhoto(null)
                setGalleryIndex((i) => (i !== null && i < photos.length - 1 ? i + 1 : 0))
              }}
              className="absolute right-2 sm:right-6 rounded-full p-2 bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              aria-label="Další"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          <div className="px-4 pb-6">
            {editingPhoto && editingPhoto.id === activeGalleryPhoto.id ? (
              <div className="mx-auto flex w-full max-w-lg flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  autoFocus
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSavePhotoCaption()
                    if (e.key === 'Escape') setEditingPhoto(null)
                  }}
                  placeholder="Napište popisek fotografie…"
                  className="h-10 flex-1 rounded-xl border border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-white/50 outline-none focus:border-white/50"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="gold"
                    size="sm"
                    onClick={handleSavePhotoCaption}
                    className="flex-1 sm:flex-none"
                  >
                    Uložit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingPhoto(null)}
                    className="flex-1 border-white/20 bg-transparent text-white hover:bg-white/10 sm:flex-none"
                  >
                    Zrušit
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-center text-sm text-white/80">
                {activeGalleryPhoto.caption || 'Bez popisku'}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function HealthRecordDetailBody({
  record,
  onToggleReminder,
  onGoTimeline,
  onClose,
}: {
  record: HealthRecord
  onToggleReminder: (id: string) => void
  onGoTimeline: () => void
  onClose: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">Datum</p>
          <p className="text-sm font-bold text-[#191E1B] mt-0.5">{record.date}</p>
        </div>
        {record.doctor && (
          <div className="rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">Veterinář</p>
            <p className="text-sm font-bold text-[#191E1B] mt-0.5">{record.doctor}</p>
          </div>
        )}
        {record.clinic && (
          <div className="rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] p-3 sm:col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">Klinika</p>
            <p className="text-sm font-bold text-[#191E1B] mt-0.5">{record.clinic}</p>
          </div>
        )}
      </div>

      {record.type === 'vaccination' && (
        <div className="rounded-xl border border-[#E8D8B5] bg-[#FCFBF8] p-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]">Detail očkování</p>
          <p className="text-sm font-bold text-[#191E1B]">
            Vakcína: {record.vaccineName || record.subtitle}
          </p>
          {record.nextDueDate && (
            <p className="text-sm text-[#B8934A] font-semibold">
              Další termín: {record.nextDueDate}
            </p>
          )}
        </div>
      )}

      {record.type === 'medication' && (
        <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]">Dávkování</p>
          <p className="text-sm font-bold text-[#191E1B]">{record.dosage || 'Dle předpisu'}</p>
          <p className="text-sm text-[#5A6660]">
            Čas podání: {record.scheduleTime || record.date}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onToggleReminder(record.id)}
            className="gap-1.5"
          >
            {record.reminderEnabled ? <Bell size={14} /> : <BellOff size={14} />}
            {record.reminderEnabled ? 'Připomínka aktivní' : 'Zapnout připomínku'}
          </Button>
        </div>
      )}

      {record.notes && (
        <div className="rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">Poznámky</p>
          <p className="text-sm text-[#4A564F] mt-0.5 leading-relaxed">{record.notes}</p>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onGoTimeline}>
          Zobrazit v časové ose
        </Button>
        <Button variant="primary" size="sm" onClick={onClose}>
          Zavřít
        </Button>
      </div>
    </div>
  )
}
