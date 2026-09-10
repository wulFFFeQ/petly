import type { DocumentCategory, DocumentTypeId } from './documentCategories'

const MAX_DOCUMENT_SIZE_BYTES = 25 * 1024 * 1024

export const PET_DOCUMENT_ACCEPT =
  'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png'

function hasDocExtension(fileName: string) {
  const lower = fileName.toLowerCase()
  return ['.pdf', '.jpg', '.jpeg', '.png'].some((ext) => lower.endsWith(ext))
}

export function isAcceptedDocumentFile(file: File) {
  if (
    file.type === 'application/pdf' ||
    file.type === 'image/jpeg' ||
    file.type === 'image/png' ||
    file.type === 'image/jpg'
  ) {
    return true
  }
  return hasDocExtension(file.name)
}

export function assertDocumentFile(file: File): void {
  if (!isAcceptedDocumentFile(file)) {
    throw new Error('unsupported_type')
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new Error('too_large')
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

export function inferDocumentCategoryAndType(
  fileName: string,
): { category: DocumentCategory; documentType: DocumentTypeId } {
  const lower = fileName.toLowerCase()
  if (/pas|passport|eu\s*pas/.test(lower)) {
    return { category: 'identification', documentType: 'eu_passport' }
  }
  if (/chip|mikro|čip/.test(lower)) {
    return { category: 'identification', documentType: 'microchip_certificate' }
  }
  if (/pojist|insur/.test(lower)) {
    return { category: 'insurance', documentType: 'insurance_policy' }
  }
  if (/očkov|vztekl|vaccin/.test(lower)) {
    return { category: 'health', documentType: 'vaccination_record' }
  }
  if (/lab|krev|biochem/.test(lower)) {
    return { category: 'health', documentType: 'lab_results' }
  }
  if (/rodokmen|pedigree/.test(lower)) {
    return { category: 'breeding', documentType: 'pedigree' }
  }
  if (/šampion|champion/.test(lower)) {
    return { category: 'breeding', documentType: 'champion_certificate' }
  }
  if (/cestov|travel/.test(lower)) {
    return { category: 'travel', documentType: 'travel_document' }
  }
  return { category: 'other', documentType: 'other' }
}

export function readDocumentFileAsDataUrl(file: File): Promise<string> {
  assertDocumentFile(file)

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string' && reader.result.startsWith('data:')) {
        resolve(reader.result)
      } else {
        reject(new Error('read_failed'))
      }
    }
    reader.onerror = () => reject(new Error('read_failed'))
    reader.readAsDataURL(file)
  })
}
