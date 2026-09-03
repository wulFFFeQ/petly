const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const MAX_IMAGE_SIZE_BYTES = 25 * 1024 * 1024

export const PET_IMAGE_ACCEPT = ACCEPTED_IMAGE_TYPES.join(',')

export function readImageFileAsDataUrl(file: File): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return Promise.reject(new Error('unsupported_type'))
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return Promise.reject(new Error('too_large'))
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('read_failed'))
      }
    }
    reader.onerror = () => reject(new Error('read_failed'))
    reader.readAsDataURL(file)
  })
}
