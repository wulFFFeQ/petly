import {
  Bell,
  Download,
  Eye,
  FileText,
  Info,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { DOCUMENT_FILTER_OPTIONS } from '../../../lib/documentCategories'
import {
  formatDocumentUpdatedAt,
  getDocumentExpiryInfo,
} from '../../../lib/documentExpiry'
import { cn } from '../../../lib/utils'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { DocumentDeleteConfirm } from './DocumentDeleteConfirm'
import { DocumentEditModal } from './DocumentEditModal'
import { DocumentUploadModal } from './DocumentUploadModal'
import type { PetProfileTabState } from './usePetProfileTabState'

type DocumentsTabProps = PetProfileTabState['documents']

const SORT_OPTIONS = [
  { value: 'newest', label: 'Nejnovější' },
  { value: 'oldest', label: 'Nejstarší' },
  { value: 'name', label: 'Název A–Z' },
  { value: 'expiry', label: 'Expirace nejdříve' },
] as const

function categoryIconClass(category: string) {
  switch (category) {
    case 'identification':
      return 'bg-[#E0EAEC] text-[#234B54]'
    case 'health':
      return 'bg-[#EBF2EE] text-[#2C4A3E]'
    case 'insurance':
      return 'bg-amber-50 text-amber-800'
    case 'breeding':
      return 'bg-rose-50 text-rose-800'
    case 'travel':
      return 'bg-sky-50 text-sky-800'
    default:
      return 'bg-[#EFECE6] text-[#4A564F]'
  }
}

export function DocumentsTab({
  petId,
  documents,
  allDocumentsForPet,
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
  accept,
}: DocumentsTabProps) {
  return (
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
                className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-[#E8E4DC] bg-white p-3.5 shadow-md opacity-0 invisible translate-y-1 transition-all group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0"
              >
                <p className="text-[11px] font-bold text-[#191E1B] mb-1.5">Co sem můžete nahrát</p>
                <ul className="space-y-1 text-[11px] text-[#4A564F] leading-relaxed list-disc pl-3.5">
                  <li>Pasy mazlíčka a očkovací certifikáty</li>
                  <li>Certifikáty registrace mikročipu</li>
                  <li>Pojistné smlouvy</li>
                  <li>Laboratorní výsledky a zdravotní zprávy</li>
                  <li>Rodokmeny a chovatelské dokumenty</li>
                  <li>Výstavní a šampionátní certifikáty</li>
                  <li>Cestovní dokumenty</li>
                  <li>Další důležité dokumenty (PDF nebo fotografie)</li>
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
          onClick={() => setDocumentUploadOpen(true)}
          disabled={documentUploading}
        >
          <Plus size={15} />
          {documentUploading ? 'Nahrávám…' : 'Nahrát dokument'}
        </Button>
        <input
          ref={replaceDocumentInputRef}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={handleReplaceDocumentUpload}
        />
      </div>

      {allDocumentsForPet.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E8E4DC] bg-[#FAF8F5] py-14 px-6 text-center">
          <FileText size={36} className="mx-auto text-[#A3AEA7] mb-3" />
          <p className="text-sm font-semibold text-[#191E1B]">Zatím zde nejsou žádné dokumenty.</p>
          <p className="mt-1 text-xs text-[#7D8B82] max-w-sm mx-auto">
            Uložte si pasy, očkovací dokumenty, zdravotní zprávy, certifikáty a další důležité
            dokumenty na jednom místě.
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-4"
            onClick={() => setDocumentUploadOpen(true)}
            disabled={documentUploading}
          >
            Nahrát první dokument
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {DOCUMENT_FILTER_OPTIONS.map((opt) => {
                const count = documentCategoryCounts[opt.id] ?? 0
                const active = documentFilter === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDocumentFilter(opt.id)}
                    className={cn(
                      'rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer',
                      active
                        ? 'border-[#234B54] bg-[#E0EAEC] text-[#234B54]'
                        : 'border-[#E8E4DC] bg-white text-[#7D8B82] hover:border-[#D1E0D8]',
                    )}
                  >
                    {opt.label}
                    <span className="ml-1 tabular-nums opacity-70">({count})</span>
                  </button>
                )
              })}
            </div>
            <label className="flex items-center gap-2 text-[11px] text-[#7D8B82]">
              Řazení
              <select
                value={documentSort}
                onChange={(e) => setDocumentSort(e.target.value as typeof documentSort)}
                className="h-8 rounded-lg border border-[#E8E4DC] bg-white px-2 text-[11px] font-semibold text-[#191E1B] outline-none focus:border-[#234B54]"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {documents.length === 0 ? (
            <p className="text-xs text-[#7D8B82] py-8 text-center">
              V této kategorii zatím nejsou žádné dokumenty.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => {
                const expiry = getDocumentExpiryInfo(doc.expiresAt)
                const reminderId = documentReminderEventId(doc.id)
                return (
                  <div
                    key={doc.id}
                    className={cn(
                      'group rounded-2xl border p-4.5 hover:bg-white hover:border-[#D1E0D8] hover:shadow-xs transition-all flex flex-col justify-between min-h-[160px]',
                      expiry.status === 'expired'
                        ? 'border-rose-200 bg-rose-50/40'
                        : expiry.status === 'soon'
                          ? 'border-amber-200 bg-amber-50/40'
                          : 'border-[#E8E4DC] bg-[#FAF8F5]',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'h-10 w-10 shrink-0 rounded-xl flex items-center justify-center overflow-hidden',
                          categoryIconClass(doc.category),
                        )}
                      >
                        <FileText size={19} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#191E1B] line-clamp-2">{doc.name}</p>
                        <p className="text-[10px] text-[#7D8B82] mt-1">
                          Mazlíček:{' '}
                          {pets.find((p) => p.id === doc.petId)?.name ?? '—'}
                        </p>
                        <p className="text-[10px] text-[#7D8B82] mt-0.5">
                          {doc.size} · Aktualizováno {formatDocumentUpdatedAt(doc.updatedAt)}
                        </p>
                        <p
                          className={cn(
                            'text-[10px] font-semibold mt-0.5',
                            expiry.status === 'expired'
                              ? 'text-rose-700'
                              : expiry.status === 'soon'
                                ? 'text-[#B8934A]'
                                : 'text-[#234B54]',
                          )}
                        >
                          {expiry.label}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-[#E8E4DC] flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void openDocumentPreview(doc)}
                        className="text-[11px] font-semibold text-[#234B54] hover:text-[#B8934A] flex items-center gap-1 cursor-pointer"
                      >
                        <Eye size={12} />
                        Otevřít
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDownloadDocument(doc)}
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
                      <button
                        type="button"
                        onClick={() => setDocumentEditTarget(doc)}
                        className="text-[11px] font-semibold text-[#7D8B82] hover:text-[#234B54] flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil size={12} />
                        Upravit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocumentDeleteTarget(doc)}
                        className="text-[11px] font-semibold text-[#7D8B82] hover:text-red-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={12} />
                        Smazat
                      </button>
                      {reminderId && (
                        <button
                          type="button"
                          onClick={() => openEditCalendarEvent(reminderId)}
                          className="text-[11px] font-semibold text-[#234B54] hover:text-[#B8934A] flex items-center gap-1 cursor-pointer"
                        >
                          <Bell size={12} />
                          Připomínka
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <DocumentUploadModal
        open={documentUploadOpen}
        onClose={() => setDocumentUploadOpen(false)}
        pets={pets}
        defaultPetId={petId}
        uploading={documentUploading}
        onSubmit={handleDocumentUploadSubmit}
      />

      <DocumentEditModal
        open={!!documentEditTarget}
        document={documentEditTarget}
        pets={pets}
        onClose={() => setDocumentEditTarget(null)}
        onSave={(id, updates) => {
          updatePetDocument(id, updates)
          setDocumentEditTarget(null)
        }}
      />

      <DocumentDeleteConfirm
        open={!!documentDeleteTarget}
        documentName={documentDeleteTarget?.name}
        onCancel={() => setDocumentDeleteTarget(null)}
        onConfirm={() => void handleConfirmDeleteDocument()}
      />
    </Card>
  )
}
