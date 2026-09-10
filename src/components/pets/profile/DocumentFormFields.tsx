import { useEffect, useMemo, useRef } from 'react'
import {
  DOCUMENT_CATEGORIES,
  getDocumentTypesForCategory,
  type DocumentCategory,
  type DocumentTypeId,
} from '../../../lib/documentCategories'
import { displayNameFromFileName } from '../../../lib/documentStorage'
import {
  formatFileSize,
  isAcceptedDocumentFile,
  PET_DOCUMENT_ACCEPT,
} from '../../../lib/readDocumentFile'
import type { Pet } from '../../../types'
import { Button } from '../../ui/Button'
import { Input, Select, Textarea } from '../../ui/Input'

export type DocumentFormValues = {
  petId: string
  category: DocumentCategory
  documentType: DocumentTypeId
  name: string
  issuedAt: string
  hasExpiry: boolean
  expiresAt: string
  notes: string
  reminderEnabled: boolean
  reminderOffsets: number[]
  customReminderDays: string
  file: File | null
}

type DocumentFormFieldsProps = {
  pets: Pet[]
  values: DocumentFormValues
  onChange: (next: DocumentFormValues) => void
  /** When true, hide file picker (edit metadata only). */
  hideFile?: boolean
  fileError?: string | null
}

const PRESET_OFFSETS = [30, 14, 7] as const

export function createEmptyDocumentForm(petId: string): DocumentFormValues {
  return {
    petId,
    category: 'identification',
    documentType: 'eu_passport',
    name: '',
    issuedAt: '',
    hasExpiry: false,
    expiresAt: '',
    notes: '',
    reminderEnabled: false,
    reminderOffsets: [30],
    customReminderDays: '',
    file: null,
  }
}

export function DocumentFormFields({
  pets,
  values,
  onChange,
  hideFile = false,
  fileError,
}: DocumentFormFieldsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typeOptions = useMemo(
    () => getDocumentTypesForCategory(values.category),
    [values.category],
  )

  useEffect(() => {
    if (!typeOptions.some((t) => t.id === values.documentType)) {
      onChange({ ...values, documentType: typeOptions[0]?.id ?? 'other' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync type when category changes
  }, [values.category])

  const patch = (partial: Partial<DocumentFormValues>) => onChange({ ...values, ...partial })

  const handleFile = (file: File | null) => {
    if (!file) {
      patch({ file: null })
      return
    }
    if (!isAcceptedDocumentFile(file)) {
      patch({ file: null })
      return
    }
    const nextName = values.name.trim() ? values.name : displayNameFromFileName(file.name)
    patch({ file, name: nextName })
  }

  const toggleOffset = (days: number) => {
    const has = values.reminderOffsets.includes(days)
    patch({
      reminderOffsets: has
        ? values.reminderOffsets.filter((d) => d !== days)
        : [...values.reminderOffsets, days].sort((a, b) => b - a),
    })
  }

  return (
    <div className="space-y-4">
      <Select
        id="doc-pet"
        label="Mazlíček"
        value={values.petId}
        onChange={(e) => patch({ petId: e.target.value })}
        options={pets.map((pet) => ({ value: pet.id, label: pet.name }))}
      />

      <Select
        id="doc-category"
        label="Kategorie"
        value={values.category}
        onChange={(e) => {
          const category = e.target.value as DocumentCategory
          const types = getDocumentTypesForCategory(category)
          patch({
            category,
            documentType: types[0]?.id ?? 'other',
          })
        }}
        options={DOCUMENT_CATEGORIES.map((cat) => ({ value: cat.id, label: cat.label }))}
      />

      <Select
        id="doc-type"
        label="Typ dokumentu"
        value={values.documentType}
        onChange={(e) => patch({ documentType: e.target.value as DocumentTypeId })}
        options={typeOptions.map((t) => ({ value: t.id, label: t.label }))}
      />

      <Input
        id="doc-name"
        label="Název dokumentu"
        value={values.name}
        onChange={(e) => patch({ name: e.target.value })}
        required
        placeholder="např. Pet pas Luna"
      />

      {!hideFile && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide uppercase text-[#4A564F]">
            Soubor
          </span>
          {!values.file ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => fileInputRef.current?.click()}
              >
                Vybrat soubor
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept={PET_DOCUMENT_ACCEPT}
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  handleFile(file)
                  e.target.value = ''
                }}
              />
              <span className="text-[11px] text-[#7D8B82]">PDF, JPG, JPEG nebo PNG (max. 25 MB)</span>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#191E1B] truncate">{values.file.name}</p>
                <p className="text-[10px] text-[#7D8B82]">{formatFileSize(values.file.size)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => {
                  patch({ file: null })
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
              >
                Odstranit
              </Button>
            </div>
          )}
          {fileError && <span className="text-[11px] text-rose-700">{fileError}</span>}
        </div>
      )}

      <Input
        id="doc-issued"
        label="Datum vydání"
        type="date"
        value={values.issuedAt}
        onChange={(e) => patch({ issuedAt: e.target.value })}
        hint="Volitelné"
      />

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold tracking-wide uppercase text-[#4A564F]">
          Platnost / expirace
        </span>
        <div className="flex flex-wrap gap-3 text-sm text-[#191E1B]">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="doc-expiry-mode"
              checked={!values.hasExpiry}
              onChange={() =>
                patch({
                  hasExpiry: false,
                  expiresAt: '',
                  reminderEnabled: false,
                })
              }
            />
            Bez expirace
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="doc-expiry-mode"
              checked={values.hasExpiry}
              onChange={() => patch({ hasExpiry: true })}
            />
            Má datum expirace
          </label>
        </div>
        {values.hasExpiry && (
          <Input
            id="doc-expires"
            type="date"
            value={values.expiresAt}
            onChange={(e) => patch({ expiresAt: e.target.value })}
            label="Datum expirace"
          />
        )}
      </div>

      {values.hasExpiry && (
        <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3 space-y-2">
          <label className="inline-flex items-center gap-2 text-sm text-[#191E1B] cursor-pointer">
            <input
              type="checkbox"
              checked={values.reminderEnabled}
              onChange={(e) => patch({ reminderEnabled: e.target.checked })}
            />
            Připomenout před expirací
          </label>
          {values.reminderEnabled && (
            <div className="space-y-2 pl-1">
              {PRESET_OFFSETS.map((days) => (
                <label
                  key={days}
                  className="flex items-center gap-2 text-xs text-[#4A564F] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={values.reminderOffsets.includes(days)}
                    onChange={() => toggleOffset(days)}
                  />
                  {days} dní předem
                </label>
              ))}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-[#4A564F] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(values.customReminderDays)}
                    onChange={(e) => {
                      if (!e.target.checked) patch({ customReminderDays: '' })
                      else if (!values.customReminderDays) patch({ customReminderDays: '21' })
                    }}
                  />
                  vlastní
                </label>
                {values.customReminderDays !== '' && (
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={values.customReminderDays}
                    onChange={(e) => patch({ customReminderDays: e.target.value })}
                    className="h-8 w-20 rounded-lg border border-[#E8E4DC] px-2 text-xs outline-none focus:border-[#234B54]"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <Textarea
        id="doc-notes"
        label="Poznámky"
        value={values.notes}
        onChange={(e) => patch({ notes: e.target.value })}
        rows={3}
        hint="Volitelné"
      />
    </div>
  )
}

export function resolveReminderOffsets(values: DocumentFormValues): number[] {
  const offsets = [...values.reminderOffsets]
  const custom = Number(values.customReminderDays)
  if (values.customReminderDays !== '' && Number.isFinite(custom) && custom > 0) {
    if (!offsets.includes(custom)) offsets.push(custom)
  }
  return [...new Set(offsets)].filter((d) => d > 0).sort((a, b) => b - a)
}

export function documentToFormValues(doc: {
  petId: string
  category: DocumentCategory
  documentType: DocumentTypeId
  name: string
  issuedAt?: string
  expiresAt?: string
  notes?: string
  reminderEnabled?: boolean
  reminderOffsetsDays?: number[]
}): DocumentFormValues {
  const presets = new Set<number>(PRESET_OFFSETS)
  const offsets = doc.reminderOffsetsDays ?? []
  const presetSelected = offsets.filter((d) => presets.has(d))
  const custom = offsets.find((d) => !presets.has(d))
  return {
    petId: doc.petId,
    category: doc.category,
    documentType: doc.documentType,
    name: doc.name,
    issuedAt: doc.issuedAt ?? '',
    hasExpiry: Boolean(doc.expiresAt),
    expiresAt: doc.expiresAt ?? '',
    notes: doc.notes ?? '',
    reminderEnabled: Boolean(doc.reminderEnabled),
    reminderOffsets: presetSelected.length > 0 ? presetSelected : doc.reminderEnabled ? [30] : [],
    customReminderDays: custom != null ? String(custom) : '',
    file: null,
  }
}
