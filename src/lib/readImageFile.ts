const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.jfif', '.bmp'] as const
const MAX_IMAGE_SIZE_BYTES = 25 * 1024 * 1024

export const PET_IMAGE_ACCEPT = 'image/*,.jpg,.jpeg,.png,.webp,.gif,.jfif,.bmp'

function hasAcceptedExtension(fileName: string) {
  const lower = fileName.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

export function isAcceptedImageFile(file: File) {
  if (file.type.startsWith('image/')) return true
  return hasAcceptedExtension(file.name)
}

/** Copy selected files immediately — clearing input.value can wipe FileList on Windows. */
export function takeSelectedFiles(input: HTMLInputElement | null): File[] {
  if (!input?.files?.length) return []
  const files = Array.from(input.files)
  input.value = ''
  return files
}

export function readImageFileAsDataUrl(file: File): Promise<string> {
  if (!isAcceptedImageFile(file)) {
    return Promise.reject(new Error('unsupported_type'))
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
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
