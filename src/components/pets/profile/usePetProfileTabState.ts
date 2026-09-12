import { useEffect, useMemo, useRef, useState } from 'react'
import {
  timelineEvents as staticTimelineEvents,
} from '../../../data/mockData'
import { useApp } from '../../../context/AppContext'
import { getHeatPeriodEndDate } from '../../../lib/calendarEventTypes'
import { canAutoGenerateHeat } from '../../../lib/breedingProfile'
import { formatIdealWeightHint } from '../../../lib/breedIdealWeight'
import {
  buildDailyCareTasks,
  dailyCareCompletionPercent,
  loadDailyCareCompleted,
  saveDailyCareCompleted,
} from '../../../lib/dailyCareChecklist'
import { persistWeightMeasurement, getWeightMeasurementsForPet } from '../../../lib/badges/badgeData'
import {
  resolveClinicalStampContext,
} from '../../../lib/health/clinicalProvenance'
import {
  createDemoClinicalService,
  DemoClinicalPersistenceAdapter,
  isClinicalError,
} from '../../../lib/clinical'
import { APP_TODAY } from '../../../lib/dashboardDates'
import { usePetClinicalFlags } from '../../../lib/security/useAuthorizedHealthScope'
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
import { normalizeLifestyleList } from '../../../lib/petProfileDisplay'
import {
  getDislikePresets,
  getLikePresets,
  togglePersonalityPreset,
} from '../../../lib/petAboutPresets'
import { takeSelectedFiles, readImageFileAsDataUrl } from '../../../lib/readImageFile'
import { isAcceptedDocumentFile, PET_DOCUMENT_ACCEPT } from '../../../lib/readDocumentFile'
import type { DocumentCategory } from '../../../lib/documentCategories'
import type { DocumentFormValues } from './DocumentFormFields'
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
    pets,
    refreshBadges,
    addPetPhotos,
    updatePetPhoto,
    deletePetPhoto,
    addPetDocument,
    updatePetDocument,
    replacePetDocument,
    deletePetDocument,
    resolveDocumentUrl,
    updateHealthRecord,
    deleteHealthRecord,
    toggleMedicationReminder,
    setMedicationReminderTime,
    setMedicationReminderDays,
    calendarEvents,
    updatePet,
    clinicalEncounters,
  } = useApp()

  const clinical = usePetClinicalFlags(pet.id)
  const healthRecordsForPet = clinical.canRead
    ? allRecords.filter((r) => r.petId === pet.id && r.lifecycleStatus !== 'withdrawn')
    : []
  const documents = clinical.canReadDocuments
    ? allDocuments.filter((d) => d.petId === pet.id && d.lifecycleStatus !== 'withdrawn')
    : []
  const photos = allPhotos.filter((p) => p.petId === pet.id)

  const galleryFileInputRef = useRef<HTMLInputElement>(null)
  const replaceDocumentInputRef = useRef<HTMLInputElement>(null)

  const [galleryUploading, setGalleryUploading] = useState(false)
  const [documentUploading, setDocumentUploading] = useState(false)
  const [documentUploadOpen, setDocumentUploadOpen] = useState(false)
  const [documentEditTarget, setDocumentEditTarget] = useState<PetDocument | null>(null)
  const [documentDeleteTarget, setDocumentDeleteTarget] = useState<PetDocument | null>(null)
  const [documentFilter, setDocumentFilter] = useState<DocumentCategory | 'all'>('all')
  const [documentSort, setDocumentSort] = useState<
    'newest' | 'oldest' | 'name' | 'expiry'
  >('newest')
  const [replacingDocumentId, setReplacingDocumentId] = useState<string | null>(null)
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null)
  const [weightData, setWeightData] = useState<WeightMeasurement[]>(() =>
    getWeightMeasurementsForPet(pet.id),
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
  const [lifestyleValues, setLifestyleValues] = useState<string[]>([''])
  const [aboutEditOpen, setAboutEditOpen] = useState(false)
  const [aboutForm, setAboutForm] = useState({
    bio: '',
    personality: '',
    likes: [''] as string[],
    dislikes: [''] as string[],
    lookingFor: '',
  })
  const [dailyCareDone, setDailyCareDone] = useState<string[]>(() =>
    loadDailyCareCompleted(pet.id),
  )

  useEffect(() => {
    setDailyCareDone(loadDailyCareCompleted(pet.id))
  }, [pet.id])

  useEffect(() => {
    setHealthCategoryView(null)
    setHiddenTimelineIds([])
    setDocumentFilter('all')
    setDocumentSort('newest')
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
      queueMicrotask(() => refreshBadges())
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

  const petRecords = healthRecordsForPet
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

  const showLastHeatCard = canAutoGenerateHeat(pet)

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

    const adapter = new DemoClinicalPersistenceAdapter({
      getHealthRecords: () => [],
      setHealthRecords: () => undefined,
      persistWeightMeasurement,
    })
    const service = createDemoClinicalService(adapter, { store: { pets } })

    try {
      const result = service.createWeightMeasurement({
        context: resolveClinicalStampContext(),
        pets,
        input: {
          id: `wm_${Date.now()}`,
          petId: pet.id,
          date: `${new Date().getDate()}. ${new Date().getMonth() + 1}. ${new Date().getFullYear()}`,
          weight,
          note: newWeightNote || undefined,
        },
      })
      setWeightData((prev) => [...prev, result.data])
      refreshBadges()
      setNewWeight('')
      setNewWeightNote('')
      showToast('Měření přidáno', `${pet.name}: ${weight} kg`, 'gold')
    } catch (err) {
      if (isClinicalError(err)) {
        showToast('Bez oprávnění', 'Nemáte oprávnění zapisovat hmotnost.', 'info')
        return
      }
      throw err
    }
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

  const handleDocumentUploadSubmit = async (
    values: DocumentFormValues & { file: File; reminderOffsetsDays: number[] },
  ): Promise<boolean> => {
    setDocumentUploading(true)
    try {
      const created = await addPetDocument({
        petId: values.petId,
        name: values.name.trim(),
        category: values.category,
        documentType: values.documentType,
        file: values.file,
        issuedAt: values.issuedAt || undefined,
        expiresAt: values.hasExpiry ? values.expiresAt || undefined : undefined,
        notes: values.notes.trim() || undefined,
        reminderEnabled: values.hasExpiry && values.reminderEnabled,
        reminderOffsetsDays: values.reminderOffsetsDays,
      })
      if (!created) return false
      onTabChange('documents')
      return true
    } catch {
      showToast('Nahrání selhalo', 'Zkuste soubor vybrat znovu.', 'info')
      return false
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

    const file = files[0]
    if (!isAcceptedDocumentFile(file)) {
      showToast('Nepodporovaný formát', 'Nahrajte PDF nebo obrázek (JPG, PNG).', 'info')
      return
    }

    try {
      await replacePetDocument(docId, file)
    } catch {
      showToast('Nahrání selhalo', 'Zkuste soubor vybrat znovu.', 'info')
    }
  }

  const handleDownloadDocument = async (doc: PetDocument) => {
    const url = await resolveDocumentUrl(doc)
    if (!url) {
      showToast(
        'Stažení není dostupné',
        doc.storageKey || doc.url
          ? 'Soubor se nepodařilo načíst.'
          : 'Tento ukázkový dokument nemá soubor ke stažení.',
        'info',
      )
      return
    }
    const link = document.createElement('a')
    link.href = url
    link.download = doc.fileName || doc.name
    link.click()
    if (url.startsWith('blob:')) {
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
    }
    showToast('Stahování zahájeno', doc.name, 'gold')
  }

  const openDocumentPreview = async (doc: PetDocument) => {
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl)
      setPreviewObjectUrl(null)
    }
    setDocumentPreview(doc)
    if (doc.storageKey || doc.url) {
      const url = await resolveDocumentUrl(doc)
      if (url?.startsWith('blob:')) setPreviewObjectUrl(url)
      else if (url) setPreviewObjectUrl(url)
    }
  }

  const closeDocumentPreview = () => {
    setDocumentPreview(null)
    if (previewObjectUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewObjectUrl)
    }
    setPreviewObjectUrl(null)
  }

  const handleConfirmDeleteDocument = async () => {
    if (!documentDeleteTarget) return
    const id = documentDeleteTarget.id
    setDocumentDeleteTarget(null)
    if (documentPreview?.id === id) closeDocumentPreview()
    await deletePetDocument(id)
  }

  const documentReminderEventId = (docId: string) =>
    calendarEvents.find((event) => event.sourceDocumentId === docId)?.id

  const sortedFilteredDocuments = useMemo(() => {
    let list =
      documentFilter === 'all'
        ? [...documents]
        : documents.filter((d) => d.category === documentFilter)

    list.sort((a, b) => {
      if (documentSort === 'name') {
        return a.name.localeCompare(b.name, 'cs')
      }
      if (documentSort === 'expiry') {
        const ae = a.expiresAt ? Date.parse(a.expiresAt) : Number.POSITIVE_INFINITY
        const be = b.expiresAt ? Date.parse(b.expiresAt) : Number.POSITIVE_INFINITY
        return ae - be
      }
      const at = Date.parse(a.updatedAt) || Date.parse(a.uploadedAt) || 0
      const bt = Date.parse(b.updatedAt) || Date.parse(b.uploadedAt) || 0
      return documentSort === 'oldest' ? at - bt : bt - at
    })
    return list
  }, [documents, documentFilter, documentSort])

  const documentCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: documents.length }
    for (const doc of documents) {
      counts[doc.category] = (counts[doc.category] ?? 0) + 1
    }
    return counts
  }, [documents])

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

  const openLifestyleEditor = (field: LifestyleField) => {
    const existing = normalizeLifestyleList(pet[field])
    setLifestyleEdit(field)
    setLifestyleValues(existing.length > 0 ? existing : [''])
  }

  const updateLifestyleValueAt = (index: number, value: string) => {
    setLifestyleValues((prev) => prev.map((item, i) => (i === index ? value : item)))
  }

  const addLifestyleValue = () => {
    setLifestyleValues((prev) => [...prev, ''])
  }

  const removeLifestyleValueAt = (index: number) => {
    setLifestyleValues((prev) => {
      if (prev.length <= 1) return ['']
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleLifestyleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!lifestyleEdit) return
    const cleaned = normalizeLifestyleList(lifestyleValues)
    updatePet(pet.id, {
      [lifestyleEdit]: cleaned.length > 0 ? cleaned : undefined,
    })
    showToast('Údaj uložen', undefined, 'gold')
    setLifestyleEdit(null)
  }

  const openAboutEditor = () => {
    const likes = normalizeLifestyleList(pet.likes)
    const dislikes = normalizeLifestyleList(pet.dislikes)
    setAboutForm({
      bio: pet.bio ?? '',
      personality: pet.personality ?? '',
      likes: likes.length > 0 ? likes : [''],
      dislikes: dislikes.length > 0 ? dislikes : [''],
      lookingFor: pet.lookingFor ?? '',
    })
    setAboutEditOpen(true)
  }

  const updateAboutListValue = (
    field: 'likes' | 'dislikes',
    index: number,
    value: string,
  ) => {
    setAboutForm((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }))
  }

  const addAboutListValue = (field: 'likes' | 'dislikes') => {
    setAboutForm((prev) => ({ ...prev, [field]: [...prev[field], ''] }))
  }

  const removeAboutListValue = (field: 'likes' | 'dislikes', index: number) => {
    setAboutForm((prev) => {
      const list = prev[field]
      if (list.length <= 1) return { ...prev, [field]: [''] }
      return { ...prev, [field]: list.filter((_, i) => i !== index) }
    })
  }

  const toggleAboutListPreset = (field: 'likes' | 'dislikes', preset: string) => {
    setAboutForm((prev) => {
      const cleaned = prev[field].map((item) => item.trim()).filter(Boolean)
      const exists = cleaned.some((item) => item.toLowerCase() === preset.toLowerCase())
      const next = exists
        ? cleaned.filter((item) => item.toLowerCase() !== preset.toLowerCase())
        : [...cleaned, preset]
      return { ...prev, [field]: next.length > 0 ? next : [''] }
    })
  }

  const togglePersonalityPresetChip = (preset: string) => {
    setAboutForm((prev) => ({
      ...prev,
      personality: togglePersonalityPreset(prev.personality, preset),
    }))
  }

  const toggleLookingForPreset = (preset: string) => {
    setAboutForm((prev) => {
      const current = prev.lookingFor.trim()
      if (!current) return { ...prev, lookingFor: preset }
      if (current.toLowerCase() === preset.toLowerCase()) {
        return { ...prev, lookingFor: '' }
      }
      if (current.toLowerCase().includes(preset.toLowerCase())) {
        return {
          ...prev,
          lookingFor: current
            .split(/[,;]+/)
            .map((p) => p.trim())
            .filter((p) => p && p.toLowerCase() !== preset.toLowerCase())
            .join(', '),
        }
      }
      return { ...prev, lookingFor: `${current}, ${preset}` }
    })
  }

  /** Custom (non-preset) rows for likes / dislikes editors. */
  const setAboutCustomList = (field: 'likes' | 'dislikes', customs: string[]) => {
    setAboutForm((prev) => {
      const presets =
        field === 'likes' ? getLikePresets(pet.type) : getDislikePresets(pet.type)
      const presetSet = new Set(presets.map((p) => p.toLowerCase()))
      const selectedPresets = prev[field].filter((item) =>
        presetSet.has(item.trim().toLowerCase()),
      )
      const next = [...selectedPresets, ...customs]
      return { ...prev, [field]: next.length > 0 ? next : [''] }
    })
  }

  const handleAboutSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updatePet(pet.id, {
      bio: aboutForm.bio,
      personality: aboutForm.personality,
      likes: normalizeLifestyleList(aboutForm.likes),
      dislikes: normalizeLifestyleList(aboutForm.dislikes),
      lookingFor: aboutForm.lookingFor,
    })
    showToast('Profil mazlíčka uložen', 'Sekce „O mazlíčkovi“ byla aktualizována.', 'gold')
    setAboutEditOpen(false)
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
      openLifestyleEditor,
      openAboutEditor,
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
      canReadHealth: clinical.canRead,
      canWriteHealth: clinical.canWrite,
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
      petId: pet.id,
      documents: sortedFilteredDocuments,
      allDocumentsForPet: documents,
      documentCategoryCounts,
      documentFilter,
      setDocumentFilter,
      documentSort,
      setDocumentSort,
      documentUploading,
      documentUploadOpen,
      setDocumentUploadOpen,
      documentEditTarget,
      setDocumentEditTarget,
      documentDeleteTarget,
      setDocumentDeleteTarget,
      pets,
      clinicalEncounters,
      replaceDocumentInputRef,
      handleDocumentUploadSubmit,
      handleReplaceDocumentUpload,
      handleReplaceDocumentPick,
      handleDownloadDocument,
      handleConfirmDeleteDocument,
      openDocumentPreview,
      documentReminderEventId,
      openEditCalendarEvent,
      updatePetDocument,
      accept: PET_DOCUMENT_ACCEPT,
      canReadDocuments: clinical.canReadDocuments,
      canWriteDocuments: clinical.canWriteDocuments,
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
      previewObjectUrl,
      closeDocumentPreview,
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
      lifestyleValues,
      updateLifestyleValueAt,
      addLifestyleValue,
      removeLifestyleValueAt,
      handleLifestyleSubmit,
      aboutEditOpen,
      setAboutEditOpen,
      aboutForm,
      setAboutForm,
      updateAboutListValue,
      addAboutListValue,
      removeAboutListValue,
      toggleAboutListPreset,
      togglePersonalityPresetChip,
      toggleLookingForPreset,
      setAboutCustomList,
      handleAboutSubmit,
      toggleMedicationReminder,
      setMedicationReminderTime,
      setMedicationReminderDays,
      updateHealthRecord,
      deleteHealthRecord,
    },
  }
}

export type PetProfileTabState = ReturnType<typeof usePetProfileTabState>
