import { useEffect, useMemo, useRef, useState } from 'react'
import {
  timelineEvents as staticTimelineEvents,
  weightMeasurements as initialWeightMeasurements,
} from '../../../data/mockData'
import { useApp } from '../../../context/AppContext'
import { getHeatPeriodEndDate } from '../../../lib/calendarEventTypes'
import { formatIdealWeightHint } from '../../../lib/breedIdealWeight'
import {
  buildDailyCareTasks,
  dailyCareCompletionPercent,
  loadDailyCareCompleted,
  saveDailyCareCompleted,
} from '../../../lib/dailyCareChecklist'
import { APP_TODAY } from '../../../lib/dashboardDates'
import { isDogType, isFemalePetGender } from '../../../lib/petTypes'
import type {
  HealthRecord,
  Pet,
  PetDocument,
  PetPhoto,
  TimelineEvent,
  WeightMeasurement,
} from '../../../types'
import {
  buildPetTimeline,
  formatIsoDateToCzech,
  parseCzechDate,
} from '../../../lib/petProfileUtils'
import { isMedicationCurrentlyActive } from '../../../lib/medicationReminders'
import { takeSelectedFiles, readImageFileAsDataUrl } from '../../../lib/readImageFile'
import {
  formatFileSize,
  inferDocumentType,
  readDocumentFileAsDataUrl,
} from '../../../lib/readDocumentFile'
import {
  buildHealthActionItems,
  buildHealthSummaryCards,
  type HealthCategoryKey,
} from './healthHelpers'

export type LifestyleField = 'diet' | 'supplements' | 'favoriteToy'

export interface UsePetProfileTabStateOptions {
  pet: Pet
  onTabChange: (tab: string) => void
}

export function usePetProfileTabState({ pet, onTabChange }: UsePetProfileTabStateOptions) {
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
  const [customTimeline, setCustomTimeline] = useState<TimelineEvent[]>([])
  const [hiddenTimelineIds, setHiddenTimelineIds] = useState<string[]>([])
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null)
  const [selectedTimelineEvent, setSelectedTimelineEvent] = useState<TimelineEvent | null>(null)
  const [documentPreview, setDocumentPreview] = useState<PetDocument | null>(null)
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null)
  const [editingPhoto, setEditingPhoto] = useState<PetPhoto | null>(null)
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
  const [healthCategoryView, setHealthCategoryView] = useState<HealthCategoryKey | null>(null)
  const healthOverviewRef = useRef<HTMLDivElement>(null)
  const [assessmentOpen, setAssessmentOpen] = useState(false)
  const [lifestyleEdit, setLifestyleEdit] = useState<LifestyleField | null>(null)
  const [lifestyleValue, setLifestyleValue] = useState('')
  const [dailyCareDone, setDailyCareDone] = useState<string[]>(() =>
    loadDailyCareCompleted(pet.id),
  )

  const documents = allDocuments.filter((d) => d.petId === pet.id)
  const photos = allPhotos.filter((p) => p.petId === pet.id)

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
    () => [...vetVisits].sort((a, b) => parseCzechDate(b.date) - parseCzechDate(a.date))[0],
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

  const overviewLastVetVisit = pet.lastVetVisit || latestClinicalVisit?.date || undefined

  const showLastHeatCard =
    Boolean(pet.breedingProfile) && isDogType(pet.type) && isFemalePetGender(pet.gender)

  const lastHeatEvent = useMemo(() => {
    if (!showLastHeatCard) return null
    const heats = calendarEvents
      .filter((event) => event.type === 'heat' && event.petName === pet.name)
      .sort((a, b) => b.date.localeCompare(a.date))
    return heats[0] ?? null
  }, [calendarEvents, pet.name, showLastHeatCard])

  const lastHeatLabel = lastHeatEvent ? formatIsoDateToCzech(lastHeatEvent.date) : undefined
  const lastHeatSubtext = lastHeatEvent
    ? `Do ${formatIsoDateToCzech(getHeatPeriodEndDate(lastHeatEvent))}`
    : 'Zatím bez záznamu v kalendáři'

  const idealWeightHint = formatIdealWeightHint(pet.type, pet.breed, pet.gender)

  const healthActionItems = useMemo(
    () => buildHealthActionItems(activeMedications, vaccinations, vetVisits, examinations),
    [activeMedications, vaccinations, vetVisits, examinations],
  )

  const healthSummaryCards = useMemo(
    () =>
      buildHealthSummaryCards(
        vaccinations,
        medications,
        activeMedications,
        vetVisits,
        examinations,
        nextVaccinationDue,
        latestVetVisit,
        latestExamination,
      ),
    [
      vaccinations,
      medications,
      activeMedications,
      vetVisits,
      examinations,
      nextVaccinationDue,
      latestVetVisit,
      latestExamination,
    ],
  )

  const mergedTimeline = useMemo(
    () =>
      buildPetTimeline(pet.id, staticTimelineEvents, allRecords, customTimeline).filter(
        (event) => !hiddenTimelineIds.includes(event.id),
      ),
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
      setHiddenTimelineIds((prev) => (prev.includes(event.id) ? prev : [...prev, event.id]))
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

  const openCaptionEditor = (photo: PetPhoto) => {
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

  const handleLifestyleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!lifestyleEdit) return
    const trimmed = lifestyleValue.trim()
    updatePet(pet.id, {
      [lifestyleEdit]: trimmed || undefined,
    })
    showToast('Údaj uložen', undefined, 'gold')
    setLifestyleEdit(null)
  }

  const activeGalleryPhoto = galleryIndex !== null ? photos[galleryIndex] : null

  return {
    pet,
    onTabChange,
    allRecords,
    overview: {
      pet,
      onTabChange,
      weightData,
      idealWeightHint,
      showLastHeatCard,
      lastHeatEvent,
      lastHeatLabel,
      lastHeatSubtext,
      overviewLastVetVisit,
      setAssessmentOpen,
      openNewHealthRecord,
      openEditCalendarEvent,
      openNewCalendarEvent,
      dailyCareTasks,
      dailyCareDoneSet,
      dailyCarePercent,
      toggleDailyCareTask,
      openDailyCareTaskDetail,
      setLifestyleEdit,
      setLifestyleValue,
    },
    health: {
      pet,
      healthCategoryView,
      setHealthCategoryView,
      returnToHealthOverview,
      healthOverviewRef,
      filteredPetRecords,
      categoryActiveMedications,
      healthSummaryCards,
      healthActionItems,
      openRecordDetail,
      openNewHealthRecord,
      setActiveModal,
      toggleMedicationReminder,
      weightData,
      idealWeightHint,
      chartData,
      yDomain,
      newWeight,
      setNewWeight,
      newWeightNote,
      setNewWeightNote,
      handleAddWeight,
    },
    timeline: {
      mergedTimeline,
      openTimelineEvent,
      handleDeleteTimelineEvent,
      addEventOpen,
      setAddEventOpen,
      newEvent,
      setNewEvent,
      handleAddTimelineEvent,
    },
    documents: {
      documents,
      documentUploading,
      documentFileInputRef,
      replaceDocumentInputRef,
      handleDocumentUpload,
      handleReplaceDocumentUpload,
      handleReplaceDocumentPick,
      handleDownloadDocument,
      handleUpdateDocumentExpiry,
      setDocumentPreview,
      deletePetDocument,
    },
    photos: {
      pet,
      photos,
      galleryUploading,
      galleryFileInputRef,
      handleGalleryUpload,
      setGalleryIndex,
    },
    modals: {
      pet,
      onTabChange,
      allRecords,
      selectedRecord,
      setSelectedRecord,
      selectedTimelineEvent,
      setSelectedTimelineEvent,
      handleDeleteTimelineEvent,
      addEventOpen,
      setAddEventOpen,
      newEvent,
      setNewEvent,
      handleAddTimelineEvent,
      documentPreview,
      setDocumentPreview,
      handleDownloadDocument,
      handleReplaceDocumentPick,
      activeGalleryPhoto,
      galleryIndex,
      photos,
      editingPhoto,
      setEditingPhoto,
      photoCaption,
      setPhotoCaption,
      openCaptionEditor,
      handleDeletePhoto,
      handleSavePhotoCaption,
      setGalleryIndex,
      assessmentOpen,
      setAssessmentOpen,
      lifestyleEdit,
      setLifestyleEdit,
      lifestyleValue,
      setLifestyleValue,
      handleLifestyleSubmit,
      toggleMedicationReminder,
      setMedicationReminderTime,
      setMedicationReminderDays,
      updateHealthRecord,
      deleteHealthRecord,
    },
  }
}

export type PetProfileTabState = ReturnType<typeof usePetProfileTabState>
