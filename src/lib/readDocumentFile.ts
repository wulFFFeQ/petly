const DOC_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.jfif',
  '.bmp',
] as const

const MAX_DOCUMENT_SIZE_BYTES = 25 * 1024 * 1024

export const PET_DOCUMENT_ACCEPT =
  'application/pdf,image/*,.pdf,.jpg,.jpeg,.png,.webp,.gif,.jfif,.bmp'

function hasDocExtension(fileName: string) {
  const lower = fileName.toLowerCase()
  return DOC_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

export function isAcceptedDocumentFile(file: File) {
  if (file.type === 'application/pdf' || file.type.startsWith('image/')) return true
  return hasDocExtension(file.name)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

export function inferDocumentType(
  fileName: string,
): 'passport' | 'chip' | 'insurance' | 'lab' | 'other' {
  const lower = fileName.toLowerCase()
  if (/pas|passport|očkov|vztekl/.test(lower)) return 'passport'
  if (/chip|mikro|čip/.test(lower)) return 'chip'
  if (/pojist|insur/.test(lower)) return 'insurance'
  if (/lab|krev|biochem|vyšetř|zpráv/.test(lower)) return 'lab'
  return 'other'
}

export function readDocumentFileAsDataUrl(file: File): Promise<string> {
  if (!isAcceptedDocumentFile(file)) {
    return Promise.reject(new Error('unsupported_type'))
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return Promise.reject(new Error('too_large'))
  }

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
