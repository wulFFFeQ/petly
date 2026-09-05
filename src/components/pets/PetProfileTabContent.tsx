import {
  Activity,
  Bell,
  BellOff,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Download,
  Eye,
  FileText,
  FlaskConical,
  Heart,
  HeartHandshake,
  Info,
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
import { useEffect, useMemo, useRef, useState } from 'react'
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
  timelineEvents as staticTimelineEvents,
  weightMeasurements as initialWeightMeasurements,
} from '../../data/mockData'
import { useApp } from '../../context/AppContext'
import { getHeatPeriodEndDate } from '../../lib/calendarEventTypes'
import { formatIdealWeightHint } from '../../lib/breedIdealWeight'
import {
  buildDailyCareTasks,
  dailyCareCompletionPercent,
  loadDailyCareCompleted,
  saveDailyCareCompleted,
} from '../../lib/dailyCareChecklist'
import { APP_TODAY, formatTodayHeader } from '../../lib/dashboardDates'
import { isDogType, isFemalePetGender } from '../../lib/petTypes'
import type {
  HealthRecord,
  HealthRecordType,
  Pet,
  PetDocument,
  TimelineEvent,
  WeightMeasurement,
} from '../../types'
import {
  buildPetTimeline,
  formatIsoDateToCzech,
  isDocumentExpiringSoon,
  parseCzechDate,
} from '../../lib/petProfileUtils'
import {
  formatMedicationRemainingLabel,
  isMedicationCurrentlyActive,
} from '../../lib/medicationReminders'
import { HealthRecordDetailBody } from '../health/HealthRecordDetailBody'
import { HealthAssessmentModal } from './HealthAssessmentModal'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { FoodSelect } from '../ui/FoodSelect'
import { Input, Textarea } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { cn } from '../../lib/utils'
import {
  EMPTY_PROFILE_LABEL,
  formatHealthStatus,
  formatOptionalText,
  formatOptionalWeight,
} from '../../lib/petProfileDisplay'
import { PET_IMAGE_ACCEPT, readImageFileAsDataUrl, takeSelectedFiles } from '../../lib/readImageFile'
import {
  formatFileSize,
  inferDocumentType,
  PET_DOCUMENT_ACCEPT,
  readDocumentFileAsDataUrl,
} from '../../lib/readDocumentFile'

interface PetProfileTabContentProps {
  pet: Pet
  activeTab: string
  onTabChange: (tab: string) => void
}

export function PetProfileTabContent({ pet, activeTab, onTabChange }: PetProfileTabContentProps) {
  const {
    setActiveModal,
    openNewCalendarEvent,
    openEditCalendarEvent,
    openNewHealthRecord,
    showToast,
    photos: allPhotos,
    documents: allDocuments,
    healthRecords: allRecords,
    addPetPhotos,
    updatePetPhoto,
    deletePetPhoto,
    addPetDocuments,
    updatePetDocument,
    replacePetDocument,
    deletePetDocument,
    updateHealthRecord,
    deleteHealthRecord,
    toggleMedicationReminder,
    setMedicationReminderTime,
    setMedicationReminderDays,
    calendarEvents,
    updatePet,
  } = useApp()
  const galleryFileInputRef = useRef<HTMLInputElement>(null)
  const documentFileInputRef = useRef<HTMLInputElement>(null)
  const replaceDocumentInputRef = useRef<HTMLInputElement>(null)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [documentUploading, setDocumentUploading] = useState(false)
  const [replacingDocumentId, setReplacingDocumentId] = useState<string | null>(null)

  const [weightData, setWeightData] = useState<WeightMeasurement[]>(() =>
    initialWeightMeasurements.filter((w) => w.petId === pet.id),
  )
  const documents = allDocuments.filter((d) => d.petId === pet.id)
  const photos = allPhotos.filter((p) => p.petId === pet.id)
  const [customTimeline, setCustomTimeline] = useState<TimelineEvent[]>([])
  const [hiddenTimelineIds, setHiddenTimelineIds] = useState<string[]>([])
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null)
  const [selectedTimelineEvent, setSelectedTimelineEvent] = useState<TimelineEvent | null>(null)
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
  const [healthCategoryView, setHealthCategoryView] = useState<
    'vaccination' | 'medication' | 'vet' | 'examination' | null
  >(null)
  const healthOverviewRef = useRef<HTMLDivElement>(null)
  const [assessmentOpen, setAssessmentOpen] = useState(false)
  type LifestyleField = 'diet' | 'supplements' | 'favoriteToy'
  const [lifestyleEdit, setLifestyleEdit] = useState<LifestyleField | null>(null)
  const [lifestyleValue, setLifestyleValue] = useState('')
  const [dailyCareDone, setDailyCareDone] = useState<string[]>(() =>
    loadDailyCareCompleted(pet.id),
  )

  useEffect(() => {
    setDailyCareDone(loadDailyCareCompleted(pet.id))
  }, [pet.id])

  useEffect(() => {
    setHealthCategoryView(null)
    setHiddenTimelineIds([])
  }, [pet.id])

  const dailyCareTasks = useMemo(
    () => buildDailyCareTasks(pet, allRecords, calendarEvents, APP_TODAY),
    [pet, allRecords, calendarEvents],
  )

  const dailyCareDoneSet = useMemo(() => new Set(dailyCareDone), [dailyCareDone])
  const dailyCareCompletedCount = dailyCareTasks.filter((task) =>
    dailyCareDoneSet.has(task.id),
  ).length
  const dailyCarePercent = dailyCareCompletionPercent(
    dailyCareTasks.length,
    dailyCareCompletedCount,
  )

  const toggleDailyCareTask = (taskId: string) => {
    setDailyCareDone((prev) => {
      const next = prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
      saveDailyCareCompleted(pet.id, next)
      return next
    })
  }

  const returnToHealthOverview = () => {
    setHealthCategoryView(null)
    requestAnimationFrame(() => {
      healthOverviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const openDailyCareTaskDetail = (taskId: string, kind: 'medication' | 'calendar') => {
    if (kind === 'medication') {
      const recordId = taskId.replace(/^med:/, '')
      const record = allRecords.find((item) => item.id === recordId)
      if (record) {
        // Keep current tab (overview) — only open the detail modal.
        setSelectedRecord(record)
      }
      return
    }
    const eventId = taskId.replace(/^event:/, '')
    const event = calendarEvents.find((item) => item.id === eventId)
    if (event) openEditCalendarEvent(event.id)
  }

  const petRecords = allRecords.filter((r) => r.petId === pet.id)
  const vaccinations = petRecords.filter((r) => r.type === 'vaccination')
  const medications = petRecords.filter((r) => r.type === 'medication')
  const vetVisits = petRecords.filter((r) => r.type === 'vet')
  const examinations = petRecords.filter((r) => r.type === 'examination')
  const activeMedications = medications.filter(isMedicationCurrentlyActive)

  const sortedPetRecords = useMemo(() => {
    return [...petRecords].sort((a, b) => {
      const da = parseCzechDate(a.date)
      const db = parseCzechDate(b.date)
      if (da !== db) return db - da
      if (a.status === 'active' && b.status !== 'active') return -1
      if (b.status === 'active' && a.status !== 'active') return 1
      return 0
    })
  }, [petRecords])

  const filteredPetRecords = useMemo(() => {
    if (!healthCategoryView) return []
    return sortedPetRecords.filter((r) => r.type === healthCategoryView)
  }, [sortedPetRecords, healthCategoryView])

  const categoryActiveMedications = useMemo(
    () =>
      healthCategoryView === 'medication'
        ? filteredPetRecords.filter((r) => r.status === 'active')
        : [],
    [healthCategoryView, filteredPetRecords],
  )

  const nextVaccinationDue = useMemo(() => {
    const withDue = vaccinations
      .filter((r) => r.nextDueDate)
      .sort((a, b) => parseCzechDate(a.nextDueDate!) - parseCzechDate(b.nextDueDate!))
    return withDue[0]?.nextDueDate
  }, [vaccinations])

  const latestVetVisit = useMemo(
    () =>
      [...vetVisits].sort((a, b) => parseCzechDate(b.date) - parseCzechDate(a.date))[0],
    [vetVisits],
  )
  const latestExamination = useMemo(
    () =>
      [...examinations].sort((a, b) => parseCzechDate(b.date) - parseCzechDate(a.date))[0],
    [examinations],
  )

  const latestClinicalVisit = useMemo(() => {
    const clinical = petRecords.filter(
      (r) => r.type === 'vet' || r.type === 'examination' || r.type === 'vaccination',
    )
    return [...clinical].sort((a, b) => parseCzechDate(b.date) - parseCzechDate(a.date))[0]
  }, [petRecords])

  const overviewLastVetVisit =
    pet.lastVetVisit || latestClinicalVisit?.date || undefined

  const showLastHeatCard =
    Boolean(pet.breedingProfile) &&
    isDogType(pet.type) &&
    isFemalePetGender(pet.gender)

  const lastHeatEvent = useMemo(() => {
    if (!showLastHeatCard) return null
    const heats = calendarEvents
      .filter((event) => event.type === 'heat' && event.petName === pet.name)
      .sort((a, b) => b.date.localeCompare(a.date))
    return heats[0] ?? null
  }, [calendarEvents, pet.name, showLastHeatCard])

  const lastHeatLabel = lastHeatEvent
    ? formatIsoDateToCzech(lastHeatEvent.date)
    : undefined
  const lastHeatSubtext = lastHeatEvent
    ? `Do ${formatIsoDateToCzech(getHeatPeriodEndDate(lastHeatEvent))}`
    : 'Zatím bez záznamu v kalendáři'

  const idealWeightHint = formatIdealWeightHint(pet.type, pet.breed, pet.gender)

  const healthActionItems = useMemo(() => {
    const items: Array<{
      id: string
      record: HealthRecord
      kind: 'medication' | 'vaccination' | 'vet' | 'examination'
      label: string
      detail: string
      meta: string
    }> = []

    for (const record of activeMedications) {
      items.push({
        id: `med-${record.id}`,
        record,
        kind: 'medication',
        label: record.subtitle || record.title,
        detail: [record.dosage || 'dle předpisu', record.scheduleTime]
          .filter(Boolean)
          .join(' · '),
        meta: formatMedicationRemainingLabel(record),
      })
    }

    const seen = new Set(items.map((item) => item.record.id))

    for (const record of vaccinations) {
      if (seen.has(record.id)) continue
      const due = record.nextDueDate
      const dueTs = due ? parseCzechDate(due) : 0
      const daysToDue = dueTs
        ? Math.round((dueTs - APP_TODAY.getTime()) / (1000 * 60 * 60 * 24))
        : null
      const upcomingDue = daysToDue != null && daysToDue >= 0 && daysToDue <= 45
      if (record.status === 'scheduled' || upcomingDue) {
        seen.add(record.id)
        items.push({
          id: `vax-${record.id}`,
          record,
          kind: 'vaccination',
          label: record.subtitle || record.title,
          detail: due ? `Termín: ${due}` : 'Naplánované očkování',
          meta:
            daysToDue == null
              ? 'Ke kontrole'
              : daysToDue === 0
                ? 'Dnes'
                : daysToDue === 1
                  ? 'Zítra'
                  : `Za ${daysToDue} dní`,
        })
      }
    }

    for (const record of [...vetVisits, ...examinations]) {
      if (seen.has(record.id)) continue
      if (record.status !== 'scheduled') continue
      seen.add(record.id)
      items.push({
        id: `sched-${record.id}`,
        record,
        kind: record.type === 'examination' ? 'examination' : 'vet',
        label: record.subtitle || record.title,
        detail: record.doctor || record.clinic || 'Naplánovaná kontrola',
        meta: record.date,
      })
    }

    return items
  }, [activeMedications, vaccinations, vetVisits, examinations])

  const healthSummaryCards = [
    {
      key: 'vaccination' as const,
      label: 'Očkování',
      value: vaccinations.length === 0 ? 'Žádné' : `${vaccinations.length}`,
      subtext: nextVaccinationDue
        ? `Další: ${nextVaccinationDue}`
        : vaccinations.length > 0
          ? 'Bez naplánovaného termínu'
          : 'Zatím bez záznamů',
      icon: Syringe,
      color: 'text-[#234B54] bg-[#E0EAEC] border-[#C5D5D9]/70',
      accent: 'bg-[#234B54]',
    },
    {
      key: 'medication' as const,
      label: 'Léky',
      value: activeMedications.length > 0
        ? `${activeMedications.length} aktivní`
        : medications.length === 0
          ? 'Žádné'
          : `${medications.length}`,
      subtext:
        activeMedications.length > 0
          ? activeMedications[0].subtitle
          : medications.length > 0
            ? 'Bez aktivních receptů'
            : 'Zatím bez záznamů',
      icon: Heart,
      color: 'text-amber-900 bg-amber-100 border-amber-200/60',
      accent: 'bg-[#B8934A]',
    },
    {
      key: 'vet' as const,
      label: 'Návštěvy veterináře',
      value: vetVisits.length === 0 ? 'Žádné' : `${vetVisits.length}`,
      subtext: latestVetVisit?.subtitle ?? 'Zatím bez návštěv',
      icon: Stethoscope,
      color: 'text-sky-800 bg-sky-100 border-sky-200/60',
      accent: 'bg-sky-600',
    },
    {
      key: 'examination' as const,
      label: 'Vyšetření',
      value: examinations.length === 0 ? 'Žádné' : `${examinations.length}`,
      subtext: latestExamination?.subtitle ?? 'Zatím bez výsledků',
      icon: FlaskConical,
      color: 'text-emerald-800 bg-emerald-50 border-emerald-200/60',
      accent: 'bg-emerald-600',
    },
  ]

  const healthCategoryCopy: Record<
    'vaccination' | 'medication' | 'vet' | 'examination',
    { title: string; subtitle: string }
  > = {
    vaccination: {
      title: 'Očkování',
      subtitle: 'Kompletní historie očkování, termíny, stav a veterinář',
    },
    medication: {
      title: 'Léky',
      subtitle: 'Aktivní léčba a kompletní historie léků',
    },
    vet: {
      title: 'Návštěvy veterináře',
      subtitle: 'Historie návštěv, diagnózy a doporučení',
    },
    examination: {
      title: 'Vyšetření',
      subtitle: 'Výsledky a historie vyšetření',
    },
  }

  const recordTypeMeta = (type: HealthRecordType) => {
    if (type === 'vaccination') {
      return {
        icon: Syringe,
        className: 'bg-[#E0EAEC] text-[#234B54]',
      }
    }
    if (type === 'medication') {
      return {
        icon: Heart,
        className: 'bg-amber-50 text-amber-700',
      }
    }
    if (type === 'examination') {
      return {
        icon: FlaskConical,
        className: 'bg-emerald-50 text-emerald-700',
      }
    }
    if (type === 'assessment') {
      return {
        icon: ClipboardList,
        className: 'bg-[#EBF2EE] text-[#2C4A3E]',
      }
    }
    return {
      icon: Stethoscope,
      className: 'bg-sky-50 text-sky-700',
    }
  }

  const mergedTimeline = useMemo(
    () =>
      buildPetTimeline(
        pet.id,
        staticTimelineEvents,
        allRecords,
        customTimeline,
      ).filter((event) => !hiddenTimelineIds.includes(event.id)),
    [pet.id, allRecords, customTimeline, hiddenTimelineIds],
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

  const openTimelineEvent = (event: TimelineEvent) => {
    if (event.sourceId) {
      const record = allRecords.find((r) => r.id === event.sourceId)
      if (record) {
        setSelectedRecord(record)
        onTabChange('health')
        return
      }
    }
    setSelectedTimelineEvent(event)
  }

  const handleDeleteTimelineEvent = (event: TimelineEvent) => {
    if (event.source === 'manual' || event.id.startsWith('custom_')) {
      setCustomTimeline((prev) => prev.filter((item) => item.id !== event.id))
    } else {
      setHiddenTimelineIds((prev) =>
        prev.includes(event.id) ? prev : [...prev, event.id],
      )
    }
    setSelectedTimelineEvent(null)
    showToast('Událost smazána', 'Položka byla odstraněna z časové osy.', 'info')
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

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const files = takeSelectedFiles(input)
    if (files.length === 0) return

    setDocumentUploading(true)
    try {
      const uploaded = []
      for (const file of files) {
        const url = await readDocumentFileAsDataUrl(file)
        uploaded.push({
          name: file.name,
          size: formatFileSize(file.size),
          url,
          mimeType: file.type || undefined,
          type: inferDocumentType(file.name),
        })
      }
      addPetDocuments(pet.id, uploaded)
      onTabChange('documents')
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'read_failed'
      if (reason === 'unsupported_type') {
        showToast('Nepodporovaný formát', 'Nahrajte PDF nebo obrázek (JPG, PNG, WEBP, GIF).', 'info')
      } else if (reason === 'too_large') {
        showToast('Soubor je příliš velký', 'Maximální velikost je 25 MB.', 'info')
      } else {
        showToast('Nahrání selhalo', 'Zkuste soubor vybrat znovu.', 'info')
      }
    } finally {
      setDocumentUploading(false)
    }
  }

  const handleReplaceDocumentPick = (docId: string) => {
    setReplacingDocumentId(docId)
    replaceDocumentInputRef.current?.click()
  }

  const handleReplaceDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const files = takeSelectedFiles(input)
    const docId = replacingDocumentId
    setReplacingDocumentId(null)
    if (!docId || files.length === 0) return

    try {
      const file = files[0]
      const url = await readDocumentFileAsDataUrl(file)
      replacePetDocument(docId, {
        name: file.name,
        size: formatFileSize(file.size),
        url,
        mimeType: file.type || undefined,
        type: inferDocumentType(file.name),
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'read_failed'
      if (reason === 'unsupported_type') {
        showToast('Nepodporovaný formát', 'Nahrajte PDF nebo obrázek.', 'info')
      } else if (reason === 'too_large') {
        showToast('Soubor je příliš velký', 'Maximální velikost je 25 MB.', 'info')
      } else {
        showToast('Nahrání selhalo', 'Zkuste soubor vybrat znovu.', 'info')
      }
    }
  }

  const handleDownloadDocument = (doc: PetDocument) => {
    if (!doc.url) {
      showToast('Stažení není dostupné', 'Tento ukázkový dokument nemá soubor ke stažení.', 'info')
      return
    }
    const link = document.createElement('a')
    link.href = doc.url
    link.download = doc.name
    link.click()
    showToast('Stahování zahájeno', doc.name, 'gold')
  }

  const handleUpdateDocumentExpiry = (docId: string, expiresAt: string) => {
    updatePetDocument(docId, { expiresAt: expiresAt.trim() || undefined })
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
          <div
            className={`grid gap-4 sm:grid-cols-2 ${
              showLastHeatCard ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
            }`}
          >
            <Card
              variant="elevated"
              padding="md"
              hoverable
              onClick={() => setAssessmentOpen(true)}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                  Zdravotní stav
                </span>
                <ShieldCheck size={16} className="text-[#234B54]" />
              </div>
              <div className="mt-2 flex min-h-[1.75rem] items-center gap-2">
                {pet.healthStatus && (
                  <span
                    className={cn(
                      'h-2.5 w-2.5 shrink-0 rounded-full shadow-sm',
                      pet.healthStatus === 'excellent' || pet.healthStatus === 'good'
                        ? 'bg-emerald-500 ring-2 ring-emerald-500/25'
                        : pet.healthStatus === 'attention'
                          ? 'bg-amber-400 ring-2 ring-amber-400/25'
                          : pet.healthStatus === 'vet_check'
                            ? 'bg-orange-500 ring-2 ring-orange-500/25'
                            : 'bg-red-500 ring-2 ring-red-500/25',
                    )}
                    aria-hidden
                  />
                )}
                <p
                  className={cn(
                    'text-[22px] font-semibold leading-snug tracking-normal',
                    pet.healthStatus === 'excellent' || pet.healthStatus === 'good'
                      ? 'text-[#2C4A3E]'
                      : pet.healthStatus === 'attention'
                        ? 'text-amber-900'
                        : pet.healthStatus === 'vet_check'
                          ? 'text-orange-900'
                          : pet.healthStatus === 'urgent'
                            ? 'text-red-900'
                            : 'text-[#191E1B]',
                  )}
                >
                  {formatHealthStatus(pet.healthStatus)}
                </p>
              </div>
              <p className="text-xs text-[#234B54] font-medium mt-1">
                {pet.healthAssessment
                  ? `Aktualizováno ${formatIsoDateToCzech(pet.healthAssessment.assessedAt)}`
                  : 'Klepnutím vyplníte orientační přehled'}
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
                  {idealWeightHint ? (
                    <span className="inline-flex rounded-full border border-[#D1E0D8] bg-[#EBF2EE] px-2 py-0.5 text-[11px] font-semibold text-[#2C4A3E]">
                      {idealWeightHint}
                    </span>
                  ) : (
                    'Sledujte vývoj a přidávejte měření'
                  )}
                </p>
            </Card>

            <Card
              variant="elevated"
              padding="md"
              hoverable
              onClick={() => openNewHealthRecord({ petId: pet.id, type: 'vet' })}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                  Poslední návštěva veterináře
                </span>
                <Stethoscope size={16} className="text-sky-700" />
              </div>
              <p className="mt-2 text-xl font-bold text-[#191E1B]">
                {formatOptionalText(overviewLastVetVisit)}
              </p>
              <p className="text-xs text-[#7D8B82] font-medium mt-1">Zapsat návštěvu a údaje</p>
            </Card>

            {showLastHeatCard && (
              <Card
                variant="elevated"
                padding="md"
                hoverable
                onClick={() => {
                  if (lastHeatEvent) {
                    openEditCalendarEvent(lastHeatEvent.id)
                    return
                  }
                  openNewCalendarEvent({ petId: pet.id, type: 'heat' })
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                    Poslední hárání
                  </span>
                  <HeartHandshake size={16} className="text-rose-700" />
                </div>
                <p className="mt-2 text-xl font-bold text-[#191E1B]">
                  {formatOptionalText(lastHeatLabel)}
                </p>
                <p className="text-xs text-rose-800/80 font-medium mt-1">{lastHeatSubtext}</p>
              </Card>
            )}
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
                {(
                  [
                    {
                      key: 'diet' as const,
                      label: 'Hlavní výživa',
                      value: pet.diet,
                      placeholder: 'např. Royal Canin Adult, BARF…',
                    },
                    {
                      key: 'supplements' as const,
                      label: 'Denní doplňky stravy',
                      value: pet.supplements,
                      placeholder: 'např. omega-3, kloubní výživa…',
                    },
                    {
                      key: 'favoriteToy' as const,
                      label: 'Oblíbené hračky a stimulace',
                      value: pet.favoriteToy,
                      placeholder: 'např. míček, peříčko, čichací kobereček…',
                    },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setLifestyleEdit(item.key)
                      setLifestyleValue(item.value ?? '')
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3 text-left transition-colors hover:border-[#D1E0D8] hover:bg-white cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                        {item.label}
                      </span>
                      <p className="mt-0.5 font-semibold text-[#191E1B]">
                        {formatOptionalText(item.value)}
                      </p>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-[#A3AEA7]" />
                  </button>
                ))}
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
                    <p className="text-xs text-[#7D8B82]">
                      Dnes · {formatTodayHeader().toLowerCase()} · léky a naplánované události
                    </p>
                  </div>
                </div>
                {dailyCareTasks.length > 0 && (
                  <Badge
                    variant={
                      dailyCarePercent === 100
                        ? 'success'
                        : dailyCarePercent >= 50
                          ? 'primary'
                          : 'warning'
                    }
                    size="sm"
                  >
                    {dailyCarePercent} % splněno
                  </Badge>
                )}
              </div>
              {dailyCareTasks.length === 0 ? (
                <p className="text-sm text-[#7D8B82] py-6 text-center">
                  Dnes nemáte žádné úkoly péče. Přidejte léky nebo událost v kalendáři.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {dailyCareTasks.map((task) => {
                    const done = dailyCareDoneSet.has(task.id)
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl border p-3 transition-colors',
                          done
                            ? 'border-[#D1E0D8] bg-[#EBF2EE]/60'
                            : 'border-[#E8E4DC] bg-white',
                        )}
                      >
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={done}
                          aria-label={done ? `Odškrtnout: ${task.title}` : `Splnit: ${task.title}`}
                          onClick={() => toggleDailyCareTask(task.id)}
                          className={cn(
                            'flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors',
                            done
                              ? 'border-[#2C4A3E] bg-[#2C4A3E] text-white'
                              : 'border-[#D1D9D4] bg-white text-transparent hover:border-[#2C4A3E]',
                          )}
                        >
                          <Check size={12} strokeWidth={3} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDailyCareTaskDetail(task.id, task.kind)}
                          className="min-w-0 flex-1 cursor-pointer text-left"
                        >
                          <p
                            className={cn(
                              'text-xs font-semibold truncate',
                              done ? 'text-[#5A6660] line-through' : 'text-[#191E1B]',
                            )}
                          >
                            {task.title}
                            {task.time ? ` · ${task.time}` : ''}
                          </p>
                          {task.detail && (
                            <p className="mt-0.5 text-[11px] text-[#7D8B82] truncate">
                              {task.detail}
                            </p>
                          )}
                        </button>
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
                          {task.kind === 'medication' ? 'Lék' : 'Událost'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'health' && (
        <div className="space-y-6">
          {healthCategoryView ? (
            <Card variant="elevated">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={returnToHealthOverview}
                    className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-[#5A6660] hover:text-[#234B54] cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                    Zpět k přehledu
                  </button>
                  <h3 className="text-lg font-bold text-[#191E1B]">
                    {healthCategoryCopy[healthCategoryView].title}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#7D8B82]">
                    {healthCategoryCopy[healthCategoryView].subtitle}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-[#7D8B82]">
                    {filteredPetRecords.length}{' '}
                    {filteredPetRecords.length === 1 ? 'záznam' : 'záznamů'} · chronologicky
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() =>
                    openNewHealthRecord({ petId: pet.id, type: healthCategoryView })
                  }
                  className="shrink-0"
                >
                  <Plus size={15} />
                  <span>Přidat záznam</span>
                </Button>
              </div>

              {healthCategoryView === 'medication' && categoryActiveMedications.length > 0 && (
                <div className="mb-5 rounded-2xl border border-[#E8D8B5] bg-[#FAF4E6]/50 p-3.5">
                  <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-[#8A6B2E]">
                    Aktivní léčba
                  </p>
                  <ul className="space-y-2">
                    {categoryActiveMedications.map((record) => (
                      <li
                        key={record.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E8E4DC] bg-white/90 px-3 py-2"
                      >
                        <button
                          type="button"
                          onClick={() => openRecordDetail(record)}
                          className="min-w-0 flex-1 cursor-pointer text-left"
                        >
                          <p className="text-sm font-bold text-[#191E1B] truncate">
                            {record.subtitle || record.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#5A6660]">
                            {[record.dosage || 'dle předpisu', record.scheduleTime]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                          <p className="mt-0.5 text-[11px] font-semibold text-[#2C4A3E]">
                            {formatMedicationRemainingLabel(record)}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleMedicationReminder(record.id)}
                          className={cn(
                            'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer',
                            record.reminderEnabled
                              ? 'border border-[#D1E0D8] bg-[#EBF2EE] text-[#2C4A3E]'
                              : 'border border-[#E8D8B5] bg-[#FAF4E6] text-[#8A6B2E]',
                          )}
                        >
                          {record.reminderEnabled ? <Bell size={12} /> : <BellOff size={12} />}
                          {record.reminderEnabled ? 'Aktivní' : 'Připomínka'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                  Historie
                </p>
                <ul className="divide-y divide-[#F0EDE6]">
                  {filteredPetRecords.length === 0 ? (
                    <li className="py-8 text-center text-sm text-[#7D8B82]">
                      V této kategorii zatím nejsou žádné záznamy.
                    </li>
                  ) : (
                    filteredPetRecords.map((record) => {
                      const meta = recordTypeMeta(record.type)
                      const Icon = meta.icon
                      return (
                        <li key={record.id}>
                          <button
                            type="button"
                            onClick={() => openRecordDetail(record)}
                            className="w-full py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF8F5] -mx-4 px-4 sm:-mx-6 sm:px-6 rounded-xl transition-colors cursor-pointer text-left"
                          >
                            <div className="flex items-start gap-3.5 min-w-0">
                              <div
                                className={cn(
                                  'h-10 w-10 shrink-0 rounded-xl flex items-center justify-center',
                                  meta.className,
                                )}
                              >
                                <Icon size={18} />
                              </div>
                              <div className="min-w-0">
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
                                        : 'Naplánováno'}
                                  </Badge>
                                </div>
                                <p className="text-xs text-[#4A564F] font-medium mt-0.5 truncate">
                                  {record.subtitle}
                                </p>
                                {(record.doctor || record.nextDueDate || record.clinic) && (
                                  <p className="text-[11px] text-[#7D8B82] mt-0.5">
                                    {[
                                      record.doctor,
                                      record.clinic,
                                      record.nextDueDate && `Další: ${record.nextDueDate}`,
                                    ]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              size="sm"
                              className="font-mono self-end sm:self-center shrink-0"
                            >
                              {record.date}
                            </Badge>
                          </button>
                        </li>
                      )
                    })
                  )}
                </ul>
              </div>
            </Card>
          ) : (
            <>
              <div ref={healthOverviewRef} className="space-y-6 scroll-mt-4">
                <Card variant="elevated">
                  <div className="space-y-8">
                    {/* 1. Rychlý zdravotní přehled */}
                    <section>
                      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                            1 · Rychlý stav
                          </p>
                          <h3 className="mt-0.5 text-lg font-bold text-[#191E1B]">
                            Rychlý zdravotní přehled
                          </h3>
                          <p className="mt-0.5 text-xs text-[#7D8B82]">
                            Klepnutím otevřete historii vybrané kategorie
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => setActiveModal('addHealthRecord', pet.id)}
                          className="shrink-0"
                        >
                          <Plus size={15} />
                          <span>Přidat záznam</span>
                        </Button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {healthSummaryCards.map(({ key, label, value, subtext, icon: Icon, color, accent }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setHealthCategoryView(key)}
                            className="rounded-2xl border border-[#E8E4DC] bg-[#FAF8F5] p-3.5 text-left transition-all cursor-pointer hover:bg-white hover:border-[#D1E0D8] hover:shadow-sm"
                          >
                            <div className={cn('mb-2.5 h-0.5 w-8 rounded-full', accent)} aria-hidden />
                            <div className="flex items-start gap-2.5">
                              <div
                                className={cn(
                                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                                  color,
                                )}
                              >
                                <Icon size={16} strokeWidth={1.75} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]/80">
                                  {label}
                                </p>
                                <p className="mt-0.5 text-sm font-bold text-[#191E1B]">{value}</p>
                                <p className="mt-0.5 truncate text-[11px] text-[#5A6660]">{subtext}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>

                    {/* 2. Co je potřeba řešit */}
                    <section className="border-t border-[#F0EDE6] pt-8">
                      <div className="mb-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                          2 · Aktuální úkoly
                        </p>
                        <h3 className="mt-0.5 text-lg font-bold text-[#191E1B]">Co je potřeba řešit</h3>
                        <p className="mt-0.5 text-xs text-[#7D8B82]">
                          Aktivní léčba, blížící se očkování a naplánované kontroly
                        </p>
                      </div>

                      {healthActionItems.length === 0 ? (
                        <div className="flex items-start gap-3 rounded-2xl border border-[#D1E0D8] bg-[#EBF2EE]/50 px-4 py-4">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#2C4A3E] border border-[#D1E0D8]">
                            <Check size={18} strokeWidth={2.5} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#2C4A3E]">
                              Vše je aktuálně v pořádku
                            </p>
                            <p className="mt-0.5 text-xs leading-relaxed text-[#5A6660]">
                              Nemáte žádné blížící se zdravotní úkoly.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <ul className="space-y-2">
                          {healthActionItems.map((item) => (
                            <li
                              key={item.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3 py-2.5"
                            >
                              <button
                                type="button"
                                onClick={() => openRecordDetail(item.record)}
                                className="min-w-0 flex-1 cursor-pointer text-left"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                                    {item.kind === 'medication'
                                      ? 'Lék'
                                      : item.kind === 'vaccination'
                                        ? 'Očkování'
                                        : item.kind === 'examination'
                                          ? 'Vyšetření'
                                          : 'Kontrola'}
                                  </span>
                                  <p className="text-sm font-bold text-[#191E1B] truncate">
                                    {item.label}
                                  </p>
                                </div>
                                <p className="mt-0.5 text-[11px] text-[#5A6660]">{item.detail}</p>
                                <p className="mt-0.5 text-[11px] font-semibold text-[#2C4A3E]">
                                  {item.meta}
                                </p>
                              </button>
                              {item.kind === 'medication' && (
                                <button
                                  type="button"
                                  onClick={() => toggleMedicationReminder(item.record.id)}
                                  className={cn(
                                    'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer',
                                    item.record.reminderEnabled
                                      ? 'border border-[#D1E0D8] bg-[#EBF2EE] text-[#2C4A3E]'
                                      : 'border border-[#E8D8B5] bg-[#FAF4E6] text-[#8A6B2E]',
                                  )}
                                >
                                  {item.record.reminderEnabled ? (
                                    <Bell size={12} />
                                  ) : (
                                    <BellOff size={12} />
                                  )}
                                  {item.record.reminderEnabled ? 'Aktivní' : 'Připomínka'}
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </div>
                </Card>

                <Card variant="elevated">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-[#191E1B] flex items-center gap-2">
                        <TrendingUp size={18} className="text-[#234B54]" />
                        Vývoj hmotnosti
                      </h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <p className="text-xs text-[#7D8B82]">
                          Aktuálně {weightData[weightData.length - 1]?.weight ?? pet.weight ?? '—'} kg
                        </p>
                        {idealWeightHint && (
                          <span className="inline-flex items-center rounded-full border border-[#D1E0D8] bg-[#EBF2EE] px-2.5 py-0.5 text-[11px] font-semibold tracking-tight text-[#2C4A3E]">
                            {idealWeightHint}
                          </span>
                        )}
                      </div>
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
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d.,]/g, '')
                        const sepMatch = raw.match(/[.,]/)
                        if (!sepMatch) {
                          setNewWeight(raw)
                          return
                        }
                        const sep = sepMatch[0]
                        const [whole, ...fractionParts] = raw.split(/[.,]/)
                        setNewWeight(`${whole}${sep}${fractionParts.join('')}`)
                      }}
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
              </div>
            </>
          )}
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
                <div className="relative rounded-2xl border border-[#E8E4DC] bg-[#FAF8F5] hover:bg-white hover:shadow-xs transition-all">
                  <button
                    type="button"
                    onClick={() => openTimelineEvent(event)}
                    className="w-full cursor-pointer p-4 pr-12 text-left"
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
                      <span className="text-xs font-semibold text-[#234B54] font-mono">
                        {event.date}
                      </span>
                    </div>
                    {event.description && (
                      <p className="mt-1.5 text-xs text-[#4A564F] leading-relaxed">
                        {event.description}
                      </p>
                    )}
                    <p className="mt-1.5 text-[10px] font-semibold text-[#234B54]">
                      {event.sourceId
                        ? 'Klepnutím otevřete detail záznamu →'
                        : 'Klepnutím otevřete detail události →'}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteTimelineEvent(event)
                    }}
                    aria-label={`Smazat událost ${event.title}`}
                    title="Smazat událost"
                    className="absolute right-2.5 top-2.5 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#A3AEA7] opacity-70 transition-colors hover:bg-rose-50 hover:text-rose-700 group-hover:opacity-100 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'documents' && (
        <Card variant="elevated">
          <div className="mb-6 pb-4 border-b border-[#F0EDE6] flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#191E1B]">Oficiální záznamy a certifikáty</h3>
                <div className="relative group">
                  <button
                    type="button"
                    aria-label="Jaké dokumenty lze nahrát"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#D1E0D8] text-[#234B54] hover:bg-[#E0EAEC] hover:border-[#234B54]/40 transition-colors cursor-pointer"
                  >
                    <Info size={12} strokeWidth={2.5} />
                  </button>
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-[#E8E4DC] bg-white p-3.5 shadow-md opacity-0 invisible translate-y-1 transition-all group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0"
                  >
                    <p className="text-[11px] font-bold text-[#191E1B] mb-1.5">
                      Co sem můžete nahrát
                    </p>
                    <ul className="space-y-1 text-[11px] text-[#4A564F] leading-relaxed list-disc pl-3.5">
                      <li>Pas mazlíčka a očkovací certifikáty</li>
                      <li>Certifikát registrace mikročipu</li>
                      <li>Pojistné smlouvy</li>
                      <li>Laboratorní výsledky a zdravotní zprávy</li>
                      <li>Další oficiální dokumenty (PDF nebo fotografie)</li>
                    </ul>
                  </div>
                </div>
              </div>
              <p className="text-xs text-[#7D8B82] mt-0.5">
                Otevřete, stáhněte, nahraďte nebo nastavte platnost dokumentů
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => documentFileInputRef.current?.click()}
              disabled={documentUploading}
            >
              <Plus size={15} />
              {documentUploading ? 'Nahrávám…' : 'Nahrát dokument'}
            </Button>
            <input
              ref={documentFileInputRef}
              type="file"
              accept={PET_DOCUMENT_ACCEPT}
              multiple
              className="sr-only"
              onChange={handleDocumentUpload}
            />
            <input
              ref={replaceDocumentInputRef}
              type="file"
              accept={PET_DOCUMENT_ACCEPT}
              className="sr-only"
              onChange={handleReplaceDocumentUpload}
            />
          </div>

          {documents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E8E4DC] bg-[#FAF8F5] py-14 px-6 text-center">
              <FileText size={36} className="mx-auto text-[#A3AEA7] mb-3" />
              <p className="text-sm font-semibold text-[#191E1B]">Zatím žádné dokumenty</p>
              <p className="mt-1 text-xs text-[#7D8B82] max-w-sm mx-auto">
                Nahrajte PDF nebo fotografii pasu, čipu, pojištění či lékařské zprávy.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => documentFileInputRef.current?.click()}
                disabled={documentUploading}
              >
                Nahrát první dokument
              </Button>
            </div>
          ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="group rounded-2xl border border-[#E8E4DC] p-4.5 bg-[#FAF8F5] hover:bg-white hover:border-[#D1E0D8] hover:shadow-xs transition-all flex flex-col justify-between min-h-[160px]"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-[#E0EAEC] text-[#234B54] flex items-center justify-center overflow-hidden">
                    {doc.url && doc.mimeType?.startsWith('image/') ? (
                      <img src={doc.url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <FileText size={19} />
                    )}
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
                    onClick={() => handleDownloadDocument(doc)}
                    className="text-[11px] font-semibold text-[#234B54] hover:text-[#B8934A] flex items-center gap-1 cursor-pointer"
                  >
                    <Download size={12} />
                    Stáhnout
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReplaceDocumentPick(doc.id)}
                    className="text-[11px] font-semibold text-[#7D8B82] hover:text-[#234B54] flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    Nahradit
                  </button>
                  {doc.url && (
                    <button
                      type="button"
                      onClick={() => deletePetDocument(doc.id)}
                      className="text-[11px] font-semibold text-[#7D8B82] hover:text-red-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={12} />
                      Smazat
                    </button>
                  )}
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
          )}
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
        open={!!selectedRecord && !!allRecords.find((r) => r.id === selectedRecord.id)}
        onClose={() => setSelectedRecord(null)}
        title={
          (selectedRecord && allRecords.find((r) => r.id === selectedRecord.id)?.title) ||
          selectedRecord?.title ||
          ''
        }
        subtitle={
          selectedRecord
            ? allRecords.find((r) => r.id === selectedRecord.id)?.subtitle ??
              selectedRecord.subtitle
            : undefined
        }
        maxWidth="lg"
      >
        {selectedRecord && allRecords.find((r) => r.id === selectedRecord.id) && (
          <HealthRecordDetailBody
            record={allRecords.find((r) => r.id === selectedRecord.id)!}
            onToggleReminder={toggleMedicationReminder}
            onSetReminderTime={setMedicationReminderTime}
            onSetReminderDays={setMedicationReminderDays}
            onUpdate={updateHealthRecord}
            onDelete={deleteHealthRecord}
            onGoTimeline={() => onTabChange('timeline')}
            onClose={() => setSelectedRecord(null)}
          />
        )}
      </Modal>

      {/* Timeline event detail */}
      <Modal
        open={!!selectedTimelineEvent}
        onClose={() => setSelectedTimelineEvent(null)}
        title={selectedTimelineEvent?.title ?? 'Událost'}
        subtitle={selectedTimelineEvent?.date}
      >
        {selectedTimelineEvent && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                  Datum
                </p>
                <p className="mt-0.5 text-sm font-bold text-[#191E1B]">
                  {selectedTimelineEvent.date}
                </p>
              </div>
              <div className="rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                  Kategorie
                </p>
                <p className="mt-0.5 text-sm font-bold text-[#191E1B]">
                  {selectedTimelineEvent.category === 'birthday'
                    ? 'Narozeniny'
                    : selectedTimelineEvent.category === 'adoption'
                      ? 'Adopce'
                      : selectedTimelineEvent.category === 'medical'
                        ? 'Zdravotní'
                        : selectedTimelineEvent.category === 'milestone'
                          ? 'Milník'
                          : selectedTimelineEvent.category === 'memory'
                            ? 'Vzpomínka'
                            : 'Událost'}
                </p>
              </div>
            </div>

            {selectedTimelineEvent.description ? (
              <div className="rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                  Popis
                </p>
                <p className="mt-0.5 text-sm text-[#4A564F] leading-relaxed">
                  {selectedTimelineEvent.description}
                </p>
              </div>
            ) : (
              <p className="text-sm text-[#7D8B82]">Bez dalšího popisu.</p>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDeleteTimelineEvent(selectedTimelineEvent)}
              >
                Smazat událost
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedTimelineEvent(null)}
                className="sm:ml-auto"
              >
                Zavřít
              </Button>
            </div>
          </div>
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
            <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] overflow-hidden">
              {documentPreview.url &&
              (documentPreview.mimeType?.startsWith('image/') ||
                /\.(jpe?g|png|webp|gif|bmp)$/i.test(documentPreview.name)) ? (
                <img
                  src={documentPreview.url}
                  alt={documentPreview.name}
                  className="max-h-80 w-full object-contain bg-white"
                />
              ) : documentPreview.url &&
                (documentPreview.mimeType === 'application/pdf' ||
                  documentPreview.name.toLowerCase().endsWith('.pdf')) ? (
                <iframe
                  title={documentPreview.name}
                  src={documentPreview.url}
                  className="h-80 w-full bg-white"
                />
              ) : (
                <div className="p-8 text-center">
                  <FileText size={48} className="mx-auto text-[#234B54] mb-3" />
                  <p className="text-sm font-bold text-[#191E1B]">{documentPreview.name}</p>
                  <p className="text-xs text-[#7D8B82] mt-1">
                    {documentPreview.url
                      ? 'Náhled není k dispozici — soubor lze stáhnout.'
                      : 'Ukázkový dokument bez nahraného souboru.'}
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleDownloadDocument(documentPreview)}
              >
                <Download size={14} />
                Stáhnout
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleReplaceDocumentPick(documentPreview.id)
                  setDocumentPreview(null)
                }}
              >
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

      <HealthAssessmentModal
        open={assessmentOpen}
        onClose={() => setAssessmentOpen(false)}
        pet={pet}
        startOnResult={Boolean(pet.healthAssessment)}
      />

      <Modal
        open={lifestyleEdit != null}
        onClose={() => setLifestyleEdit(null)}
        title={
          lifestyleEdit === 'diet'
            ? 'Hlavní výživa'
            : lifestyleEdit === 'supplements'
              ? 'Denní doplňky stravy'
              : 'Oblíbené hračky a stimulace'
        }
        subtitle={`Údaje pro ${pet.name}`}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!lifestyleEdit) return
            const trimmed = lifestyleValue.trim()
            updatePet(pet.id, {
              [lifestyleEdit]: trimmed || undefined,
            })
            showToast('Údaj uložen', undefined, 'gold')
            setLifestyleEdit(null)
          }}
        >
          {lifestyleEdit === 'diet' ? (
            <FoodSelect
              id="lifestyle-diet"
              label="Hlavní výživa"
              petType={pet.type}
              value={lifestyleValue}
              onChange={setLifestyleValue}
              placeholder={
                pet.type === 'cat'
                  ? 'Hledejte krmivo pro kočky…'
                  : 'Hledejte krmivo pro psy…'
              }
            />
          ) : lifestyleEdit === 'favoriteToy' ? (
            <Input
              id="lifestyle-field"
              label="Oblíbené hračky a stimulace"
              value={lifestyleValue}
              onChange={(e) => setLifestyleValue(e.target.value)}
              placeholder="např. míček, peříčko, čichací kobereček…"
              autoFocus
            />
          ) : (
            <Textarea
              id="lifestyle-field"
              label="Denní doplňky stravy"
              value={lifestyleValue}
              onChange={(e) => setLifestyleValue(e.target.value)}
              placeholder="např. omega-3, kloubní výživa…"
              rows={3}
            />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setLifestyleEdit(null)}>
              Zrušit
            </Button>
            <Button type="submit" variant="primary">
              Uložit
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

