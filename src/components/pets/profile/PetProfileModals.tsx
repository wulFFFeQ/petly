import { ChevronLeft, ChevronRight, Download, FileText, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { formatDocumentUpdatedAt } from '../../../lib/documentExpiry'
import type { TimelineEvent } from '../../../types'
import {
  getCustomListItems,
  getDislikePresets,
  getLikePresets,
  getLookingForPresets,
  PERSONALITY_PRESETS,
  personalityHasPreset,
} from '../../../lib/petAboutPresets'
import { cn } from '../../../lib/utils'
import { HealthRecordDetailBody } from '../../health/HealthRecordDetailBody'
import { HealthAssessmentModal } from '../HealthAssessmentModal'
import { Button } from '../../ui/Button'
import { FoodSelect } from '../../ui/FoodSelect'
import { Input, Select, Textarea } from '../../ui/Input'
import { Modal } from '../../ui/Modal'
import type { PetProfileTabState } from './usePetProfileTabState'

type PetProfileModalsProps = PetProfileTabState['modals']

const TIMELINE_CATEGORY_OPTIONS: {
  value: NonNullable<TimelineEvent['category']>
  label: string
}[] = [
  { value: 'memory', label: 'Vzpomínka' },
  { value: 'milestone', label: 'Milník' },
  { value: 'adoption', label: 'Adopce' },
  { value: 'birthday', label: 'Narozeniny' },
  { value: 'medical', label: 'Zdravotní' },
]

function timelineCategoryLabel(category: TimelineEvent['category']) {
  if (category === 'birthday') return 'Narozeniny'
  if (category === 'adoption') return 'Adopce'
  if (category === 'medical') return 'Zdravotní'
  if (category === 'milestone') return 'Milník'
  if (category === 'memory') return 'Vzpomínka'
  return 'Událost'
}

function lifestyleAddLabel(field: PetProfileTabState['modals']['lifestyleEdit']) {
  if (field === 'diet') return 'Přidat další krmivo'
  if (field === 'supplements') return 'Přidat další doplněk'
  return 'Přidat další hračku'
}

function lifestyleRowLabel(
  field: PetProfileTabState['modals']['lifestyleEdit'],
  index: number,
) {
  const n = index + 1
  if (field === 'diet') return `Krmivo ${n}`
  if (field === 'supplements') return `Doplněk ${n}`
  return `Hračka / stimulace ${n}`
}

export function PetProfileModals({
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
}: PetProfileModalsProps) {
  return (
    <>
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
                  {timelineCategoryLabel(selectedTimelineEvent.category)}
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

      <Modal
        open={addEventOpen}
        onClose={() => setAddEventOpen(false)}
        title="Přidat událost"
        subtitle="Adopce, výlet, operace, narozeniny nebo důležitá vzpomínka"
      >
        <div className="space-y-3">
          <Input
            id="timeline-event-title"
            placeholder="Název události"
            value={newEvent.title}
            onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))}
          />
          <Input
            id="timeline-event-date"
            placeholder="Datum (např. 15. 9. 2026)"
            value={newEvent.date}
            onChange={(e) => setNewEvent((p) => ({ ...p, date: e.target.value }))}
          />
          <Select
            id="timeline-event-category"
            value={newEvent.category}
            options={TIMELINE_CATEGORY_OPTIONS}
            onChange={(e) =>
              setNewEvent((p) => ({
                ...p,
                category: e.target.value as TimelineEvent['category'],
              }))
            }
          />
          <Textarea
            id="timeline-event-description"
            placeholder="Popis (volitelné)"
            value={newEvent.description}
            onChange={(e) => setNewEvent((p) => ({ ...p, description: e.target.value }))}
            rows={3}
          />
          <Button variant="primary" fullWidth onClick={handleAddTimelineEvent}>
            Přidat do časové osy
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!documentPreview}
        onClose={closeDocumentPreview}
        title={documentPreview?.name ?? 'Dokument'}
        subtitle={
          documentPreview
            ? `${documentPreview.size} · aktualizováno ${formatDocumentUpdatedAt(documentPreview.updatedAt)}`
            : undefined
        }
        maxWidth="lg"
      >
        {documentPreview && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] overflow-hidden">
              {(() => {
                const src = previewObjectUrl || documentPreview.url
                const isImage =
                  Boolean(src) &&
                  (documentPreview.mimeType?.startsWith('image/') ||
                    /\.(jpe?g|png|webp|gif|bmp)$/i.test(documentPreview.fileName || documentPreview.name))
                const isPdf =
                  Boolean(src) &&
                  (documentPreview.mimeType === 'application/pdf' ||
                    (documentPreview.fileName || documentPreview.name).toLowerCase().endsWith('.pdf'))

                if (src && isImage) {
                  return (
                    <img
                      src={src}
                      alt={documentPreview.name}
                      className="max-h-80 w-full object-contain bg-white"
                    />
                  )
                }
                if (src && isPdf) {
                  return (
                    <iframe
                      title={documentPreview.name}
                      src={src}
                      className="h-80 w-full bg-white"
                    />
                  )
                }
                return (
                  <div className="p-8 text-center">
                    <FileText size={48} className="mx-auto text-[#234B54] mb-3" />
                    <p className="text-sm font-bold text-[#191E1B]">{documentPreview.name}</p>
                    <p className="text-xs text-[#7D8B82] mt-1">
                      {src
                        ? 'Náhled není k dispozici — soubor lze stáhnout.'
                        : 'Ukázkový dokument bez nahraného souboru.'}
                    </p>
                  </div>
                )
              })()}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => void handleDownloadDocument(documentPreview)}
              >
                <Download size={14} />
                Stáhnout
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleReplaceDocumentPick(documentPreview.id)
                  closeDocumentPreview()
                }}
              >
                <RefreshCw size={14} />
                Nahradit
              </Button>
              <Button variant="ghost" size="sm" onClick={closeDocumentPreview}>
                Zavřít
              </Button>
            </div>
          </div>
        )}
      </Modal>

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
        subtitle={`Údaje pro ${pet.name} · můžete přidat více možností`}
      >
        <form className="flex flex-col gap-4" onSubmit={handleLifestyleSubmit}>
          <div className="space-y-3">
            {lifestyleValues.map((value, index) => (
              <div key={`lifestyle-${lifestyleEdit}-${index}`} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  {lifestyleEdit === 'diet' ? (
                    <FoodSelect
                      id={`lifestyle-diet-${index}`}
                      label={lifestyleRowLabel(lifestyleEdit, index)}
                      petType={pet.type}
                      value={value}
                      onChange={(next) => updateLifestyleValueAt(index, next)}
                      placeholder={
                        pet.type === 'cat'
                          ? 'Hledejte krmivo pro kočky…'
                          : 'Hledejte krmivo pro psy…'
                      }
                    />
                  ) : lifestyleEdit === 'favoriteToy' ? (
                    <Input
                      id={`lifestyle-toy-${index}`}
                      label={lifestyleRowLabel(lifestyleEdit, index)}
                      value={value}
                      onChange={(e) => updateLifestyleValueAt(index, e.target.value)}
                      placeholder="např. míček, peříčko, čichací kobereček…"
                      autoFocus={index === 0}
                    />
                  ) : (
                    <Input
                      id={`lifestyle-supplement-${index}`}
                      label={lifestyleRowLabel(lifestyleEdit, index)}
                      value={value}
                      onChange={(e) => updateLifestyleValueAt(index, e.target.value)}
                      placeholder="např. omega-3, kloubní výživa…"
                      autoFocus={index === 0}
                    />
                  )}
                </div>
                {lifestyleValues.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLifestyleValueAt(index)}
                    className="mt-7 rounded-xl p-2 text-[#7D8B82] transition-colors hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                    aria-label="Odebrat"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addLifestyleValue}
            className="w-full gap-1.5 border-dashed"
          >
            <Plus size={15} />
            {lifestyleAddLabel(lifestyleEdit)}
          </Button>

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

      <Modal
        open={aboutEditOpen}
        onClose={() => setAboutEditOpen(false)}
        title="O mazlíčkovi"
        subtitle={`Veřejný popis ${pet.name} · zobrazí se i na profilu v Objevovat`}
      >
        <form className="flex flex-col gap-4" onSubmit={handleAboutSubmit}>
          <Textarea
            id="about-bio"
            label="Krátký popis"
            value={aboutForm.bio}
            onChange={(e) => setAboutForm((prev) => ({ ...prev, bio: e.target.value }))}
            placeholder="např. Energický plavec a šampion v aportu…"
            rows={3}
            autoFocus
          />

          <div className="space-y-2">
            <Textarea
              id="about-personality"
              label="Povaha"
              value={aboutForm.personality}
              onChange={(e) => setAboutForm((prev) => ({ ...prev, personality: e.target.value }))}
              placeholder="např. Přátelský, hravý a vyrovnaný…"
              rows={2}
            />
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
              Rychlý výběr
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PERSONALITY_PRESETS.map((preset) => {
                const active = personalityHasPreset(aboutForm.personality, preset)
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => togglePersonalityPresetChip(preset)}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                      active
                        ? 'bg-[#2C4A3E] text-white'
                        : 'bg-[#F3F0EA] text-[#5A6660] hover:bg-[#EBF2EE] hover:text-[#2C4A3E]',
                    )}
                  >
                    {preset}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#4A564F]">Má rád</p>
            <div className="flex flex-wrap gap-1.5">
              {getLikePresets(pet.type).map((preset) => {
                const active = aboutForm.likes.some(
                  (item) => item.trim().toLowerCase() === preset.toLowerCase(),
                )
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => toggleAboutListPreset('likes', preset)}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                      active
                        ? 'bg-[#EBF2EE] text-[#2C4A3E] ring-1 ring-[#2C4A3E]/25'
                        : 'bg-[#F3F0EA] text-[#5A6660] hover:bg-[#EBF2EE] hover:text-[#2C4A3E]',
                    )}
                  >
                    {preset}
                  </button>
                )
              })}
            </div>
            {(() => {
              const rows = getCustomListItems(aboutForm.likes, getLikePresets(pet.type))
              return rows.map((value, index) => (
                <div key={`about-like-custom-${index}`} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <Input
                      id={`about-like-custom-${index}`}
                      label={index === 0 ? 'Vlastní' : `Vlastní ${index + 1}`}
                      value={value}
                      onChange={(e) => {
                        const next = [...rows]
                        next[index] = e.target.value
                        setAboutCustomList('likes', next)
                      }}
                      placeholder="nebo napište vlastní…"
                    />
                  </div>
                  {(rows.length > 1 || value.trim()) && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = rows.filter((_, i) => i !== index)
                        setAboutCustomList('likes', next.length > 0 ? next : [''])
                      }}
                      className="mt-7 rounded-xl p-2 text-[#7D8B82] transition-colors hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                      aria-label="Odebrat"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))
            })()}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const rows = getCustomListItems(aboutForm.likes, getLikePresets(pet.type))
                setAboutCustomList('likes', [...rows.filter((r) => r.trim()), ''])
              }}
              className="w-full gap-1.5 border-dashed"
            >
              <Plus size={15} />
              Přidat vlastní
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#4A564F]">Nemá rád</p>
            <div className="flex flex-wrap gap-1.5">
              {getDislikePresets(pet.type).map((preset) => {
                const active = aboutForm.dislikes.some(
                  (item) => item.trim().toLowerCase() === preset.toLowerCase(),
                )
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => toggleAboutListPreset('dislikes', preset)}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                      active
                        ? 'bg-[#F3F0EA] text-[#5A6660] ring-1 ring-[#C8C2B8]'
                        : 'bg-white border border-[#E8E4DC] text-[#7D8B82] hover:bg-[#F3F0EA]',
                    )}
                  >
                    {preset}
                  </button>
                )
              })}
            </div>
            {(() => {
              const rows = getCustomListItems(aboutForm.dislikes, getDislikePresets(pet.type))
              return rows.map((value, index) => (
                <div key={`about-dislike-custom-${index}`} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <Input
                      id={`about-dislike-custom-${index}`}
                      label={index === 0 ? 'Vlastní' : `Vlastní ${index + 1}`}
                      value={value}
                      onChange={(e) => {
                        const next = [...rows]
                        next[index] = e.target.value
                        setAboutCustomList('dislikes', next)
                      }}
                      placeholder="nebo napište vlastní…"
                    />
                  </div>
                  {(rows.length > 1 || value.trim()) && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = rows.filter((_, i) => i !== index)
                        setAboutCustomList('dislikes', next.length > 0 ? next : [''])
                      }}
                      className="mt-7 rounded-xl p-2 text-[#7D8B82] transition-colors hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                      aria-label="Odebrat"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))
            })()}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const rows = getCustomListItems(
                  aboutForm.dislikes,
                  getDislikePresets(pet.type),
                )
                setAboutCustomList('dislikes', [...rows.filter((r) => r.trim()), ''])
              }}
              className="w-full gap-1.5 border-dashed"
            >
              <Plus size={15} />
              Přidat vlastní
            </Button>
          </div>

          <div className="space-y-2">
            <Input
              id="about-looking-for"
              label="Hledá"
              value={aboutForm.lookingFor}
              onChange={(e) => setAboutForm((prev) => ({ ...prev, lookingFor: e.target.value }))}
              placeholder="např. Parťáka na procházky a výlety"
            />
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
              Rychlý výběr
            </p>
            <div className="flex flex-wrap gap-1.5">
              {getLookingForPresets(pet.type).map((preset) => {
                const active = aboutForm.lookingFor
                  .toLowerCase()
                  .includes(preset.toLowerCase())
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => toggleLookingForPreset(preset)}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                      active
                        ? 'bg-[#FAF4E6] text-[#B8934A] ring-1 ring-[#E8D8B5]'
                        : 'bg-[#F3F0EA] text-[#5A6660] hover:bg-[#FAF4E6] hover:text-[#B8934A]',
                    )}
                  >
                    {preset}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setAboutEditOpen(false)}>
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
