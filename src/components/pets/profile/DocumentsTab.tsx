import { Download, Eye, FileText, Info, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { isDocumentExpiringSoon } from '../../../lib/petProfileUtils'
import { PET_DOCUMENT_ACCEPT } from '../../../lib/readDocumentFile'
import { cn } from '../../../lib/utils'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import type { PetProfileTabState } from './usePetProfileTabState'

type DocumentsTabProps = PetProfileTabState['documents']

export function DocumentsTab({
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
  )
}
