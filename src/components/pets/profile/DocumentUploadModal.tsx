import { useEffect, useState } from 'react'
import { isAcceptedDocumentFile } from '../../../lib/readDocumentFile'
import type { Pet } from '../../../types'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import {
  createEmptyDocumentForm,
  DocumentFormFields,
  resolveReminderOffsets,
  type DocumentFormValues,
} from './DocumentFormFields'

type DocumentUploadModalProps = {
  open: boolean
  onClose: () => void
  pets: Pet[]
  defaultPetId: string
  uploading: boolean
  onSubmit: (values: DocumentFormValues & { file: File; reminderOffsetsDays: number[] }) => Promise<boolean>
}

export function DocumentUploadModal({
  open,
  onClose,
  pets,
  defaultPetId,
  uploading,
  onSubmit,
}: DocumentUploadModalProps) {
  const [values, setValues] = useState<DocumentFormValues>(() =>
    createEmptyDocumentForm(defaultPetId),
  )
  const [fileError, setFileError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setValues(createEmptyDocumentForm(defaultPetId))
      setFileError(null)
    }
  }, [open, defaultPetId])

  const handleSubmit = async () => {
    if (!values.name.trim()) {
      setFileError('Zadejte název dokumentu.')
      return
    }
    if (!values.file) {
      setFileError('Vyberte soubor dokumentu.')
      return
    }
    if (!isAcceptedDocumentFile(values.file)) {
      setFileError('Povolené formáty: PDF, JPG, JPEG, PNG.')
      return
    }
    if (values.hasExpiry && !values.expiresAt) {
      setFileError('Zadejte datum expirace, nebo zvolte Bez expirace.')
      return
    }
    setFileError(null)
    const ok = await onSubmit({
      ...values,
      file: values.file,
      reminderOffsetsDays: values.reminderEnabled ? resolveReminderOffsets(values) : [],
    })
    if (ok) onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nahrát dokument"
      subtitle="Dokument bude uložen u vybraného mazlíčka a zůstane soukromý."
      maxWidth="lg"
      closeOnBackdrop={!uploading}
    >
      <DocumentFormFields
        pets={pets}
        values={values}
        onChange={(next) => {
          setValues(next)
          setFileError(null)
        }}
        fileError={fileError}
      />
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={uploading}>
          Zrušit
        </Button>
        <Button type="button" variant="primary" size="sm" onClick={handleSubmit} disabled={uploading}>
          {uploading ? 'Nahrávám…' : 'Uložit dokument'}
        </Button>
      </div>
    </Modal>
  )
}
