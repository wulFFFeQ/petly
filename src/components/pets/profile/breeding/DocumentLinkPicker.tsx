import { useMemo } from 'react'
import type { PetDocument } from '../../../../types'
import { getDocumentCategoryLabel, getDocumentTypeLabel } from '../../../../lib/documentCategories'

interface DocumentLinkPickerProps {
  documents: PetDocument[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  label?: string
}

export function DocumentLinkPicker({
  documents,
  selectedIds,
  onChange,
  label = 'Propojené dokumenty',
}: DocumentLinkPickerProps) {
  const sorted = useMemo(
    () =>
      [...documents].sort((a, b) =>
        a.name.localeCompare(b.name, 'cs', { sensitivity: 'base' }),
      ),
    [documents],
  )

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#E8E4DC] bg-[#FAF8F5] px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">{label}</p>
        <p className="mt-1 text-xs text-[#7D8B82]">
          Zatím žádné dokumenty u tohoto mazlíčka. Nahrajte je v sekci Dokumenty a pasy a pak je
          zde propojte.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#4A564F]">{label}</p>
      <p className="text-[11px] text-[#7D8B82]">
        Vyberte existující soubory — nahrávání znovu není potřeba.
      </p>
      <ul className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-[#E8E4DC] bg-white p-2">
        {sorted.map((doc) => {
          const checked = selectedIds.includes(doc.id)
          return (
            <li key={doc.id}>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-[#FAF8F5]">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(doc.id)}
                  className="mt-0.5"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[#191E1B]">{doc.name}</span>
                  <span className="block text-[11px] text-[#7D8B82]">
                    {getDocumentCategoryLabel(doc.category)}
                    {doc.documentType
                      ? ` · ${getDocumentTypeLabel(doc.category, doc.documentType)}`
                      : ''}
                  </span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

interface LinkedDocumentsListProps {
  documents: PetDocument[]
  documentIds?: string[]
}

export function LinkedDocumentsList({ documents, documentIds }: LinkedDocumentsListProps) {
  if (!documentIds?.length) return null
  const linked = documentIds
    .map((id) => documents.find((doc) => doc.id === id))
    .filter((doc): doc is PetDocument => Boolean(doc))

  if (linked.length === 0) {
    return (
      <p className="text-[11px] text-[#A3AEA7]">Propojené dokumenty už nejsou v Dokumentech.</p>
    )
  }

  return (
    <ul className="mt-1.5 flex flex-wrap gap-1.5">
      {linked.map((doc) => (
        <li
          key={doc.id}
          className="rounded-md border border-[#E8E4DC] bg-[#FAF8F5] px-2 py-0.5 text-[11px] font-medium text-[#4A564F]"
        >
          {doc.name}
        </li>
      ))}
    </ul>
  )
}
