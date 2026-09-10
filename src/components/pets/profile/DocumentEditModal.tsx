import { useEffect, useState } from 'react'
import type { Pet, PetDocument } from '../../../types'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import {
  DocumentFormFields,
  documentToFormValues,
  resolveReminderOffsets,
  type DocumentFormValues,
} from './DocumentFormFields'
import type { DocumentCategory, DocumentTypeId } from '../../../lib/documentCategories'

type DocumentEditModalProps = {
  open: boolean
  document: PetDocument | null
  pets: Pet[]
  onClose: () => void
  onSave: (documentId: string, updates: Partial<PetDocument>) => void
}

export function DocumentEditModal({
  open,
  document,
  pets,
  onClose,
  onSave,
}: DocumentEditModalProps) {
  const [values, setValues] = useState<DocumentFormValues | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && document) {
      setValues(
        documentToFormValues({
          petId: document.petId,
          category: document.category as DocumentCategory,
          documentType: document.documentType as DocumentTypeId,
          name: document.name,
          issuedAt: document.issuedAt,
          expiresAt: document.expiresAt,
          notes: document.notes,
          reminderEnabled: document.reminderEnabled,
          reminderOffsetsDays: document.reminderOffsetsDays,
        }),
      )
      setError(null)
    }
  }, [open, document])

  if (!document || !values) {
    return (
      <Modal open={open} onClose={onClose} title="Upravit dokument">
        <p className="text-sm text-[#7D8B82]">Dokument nenalezen.</p>
      </Modal>
    )
  }

  const handleSave = () => {
    if (!values.name.trim()) {
      setError('Zadejte název dokumentu.')
      return
    }
    if (values.hasExpiry && !values.expiresAt) {
      setError('Zadejte datum expirace, nebo zvolte Bez expirace.')
      return
    }

    const reminderEnabled = Boolean(values.hasExpiry && values.reminderEnabled)
    onSave(document.id, {
      petId: values.petId,
      name: values.name.trim(),
      category: values.category,
      documentType: values.documentType,
      issuedAt: values.issuedAt || undefined,
      expiresAt: values.hasExpiry ? values.expiresAt : undefined,
      notes: values.notes.trim() || undefined,
      reminderEnabled,
      reminderOffsetsDays: reminderEnabled ? resolveReminderOffsets(values) : undefined,
      isPublic: false,
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upravit dokument"
      subtitle="Upravíte metadata. Soubor zůstane beze změny."
      maxWidth="lg"
    >
      <DocumentFormFields pets={pets} values={values} onChange={setValues} hideFile />
      {error && <p className="mt-2 text-[11px] text-rose-700">{error}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Zrušit
        </Button>
        <Button type="button" variant="primary" size="sm" onClick={handleSave}>
          Uložit změny
        </Button>
      </div>
    </Modal>
  )
}
