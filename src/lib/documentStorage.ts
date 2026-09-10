import type { DocumentCategory, DocumentTypeId } from './documentCategories'
import { mapLegacyDocumentType } from './documentCategories'
import type { PetDocument } from '../types'

const DB_NAME = 'lovedandknown-documents'
const DB_VERSION = 1
const STORE_NAME = 'blobs'
export const DOCUMENTS_META_STORAGE_KEY = 'lovedandknown.petDocuments'

type BlobRecord = {
  id: string
  blob: Blob
  mimeType?: string
  fileName?: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexeddb_unavailable'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('indexeddb_open_failed'))
  })
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('indexeddb_request_failed'))
  })
}

export async function saveDocumentBlob(
  documentId: string,
  blob: Blob,
  meta?: { mimeType?: string; fileName?: string },
): Promise<void> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const record: BlobRecord = {
      id: documentId,
      blob,
      mimeType: meta?.mimeType,
      fileName: meta?.fileName,
    }
    await idbRequest(store.put(record))
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('indexeddb_tx_failed'))
      tx.onabort = () => reject(tx.error ?? new Error('indexeddb_tx_aborted'))
    })
  } finally {
    db.close()
  }
}

export async function getDocumentBlob(documentId: string): Promise<Blob | null> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const record = await idbRequest(store.get(documentId) as IDBRequest<BlobRecord | undefined>)
    return record?.blob ?? null
  } finally {
    db.close()
  }
}

export async function getDocumentObjectUrl(documentId: string): Promise<string | null> {
  const blob = await getDocumentBlob(documentId)
  if (!blob) return null
  return URL.createObjectURL(blob)
}

export async function deleteDocumentBlob(documentId: string): Promise<void> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    await idbRequest(store.delete(documentId))
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('indexeddb_tx_failed'))
      tx.onabort = () => reject(tx.error ?? new Error('indexeddb_tx_aborted'))
    })
  } finally {
    db.close()
  }
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl)
  return response.blob()
}

type LegacyPetDocument = Partial<PetDocument> & {
  type?: string
  url?: string
}

function stripFileExtension(name: string) {
  return name.replace(/\.[^.]+$/, '')
}

export function normalizePetDocument(raw: LegacyPetDocument): PetDocument {
  const mapped =
    raw.category && raw.documentType
      ? {
          category: raw.category as DocumentCategory,
          documentType: raw.documentType as DocumentTypeId,
        }
      : mapLegacyDocumentType(raw.type)

  const nowIso = new Date().toISOString()
  const name = raw.name ?? 'Dokument'
  const fileName = raw.fileName ?? (raw.url ? name : name)

  return {
    id: raw.id ?? `doc_${Date.now()}`,
    petId: raw.petId ?? '',
    name,
    category: mapped.category,
    documentType: mapped.documentType,
    fileName,
    fileSizeBytes: raw.fileSizeBytes,
    size: raw.size ?? '',
    mimeType: raw.mimeType,
    uploadedAt: raw.uploadedAt ?? nowIso,
    updatedAt: raw.updatedAt ?? raw.uploadedAt ?? nowIso,
    issuedAt: raw.issuedAt,
    expiresAt: raw.expiresAt ?? undefined,
    notes: raw.notes,
    storageKey: raw.storageKey,
    url: raw.url,
    isPublic: false,
    reminderEnabled: raw.reminderEnabled ?? false,
    reminderOffsetsDays: raw.reminderOffsetsDays,
  }
}

export function persistDocumentsMeta(documents: PetDocument[]): boolean {
  if (typeof window === 'undefined') return false
  try {
    const forStorage = documents.map((doc) => {
      const { url, ...rest } = doc
      // Keep data URLs only when there is no IndexedDB key yet (in-flight / legacy).
      if (rest.storageKey) return rest
      if (url?.startsWith('data:')) return { ...rest, url }
      return rest
    })
    const payload = JSON.stringify(forStorage)
    window.localStorage.setItem(DOCUMENTS_META_STORAGE_KEY, payload)
    return true
  } catch {
    return false
  }
}

export function loadDocumentsMeta(fallback: PetDocument[]): PetDocument[] {
  if (typeof window === 'undefined') return fallback.map(normalizePetDocument)
  try {
    const raw = window.localStorage.getItem(DOCUMENTS_META_STORAGE_KEY)
    if (!raw) return fallback.map(normalizePetDocument)
    const parsed = JSON.parse(raw) as LegacyPetDocument[]
    if (!Array.isArray(parsed)) return fallback.map(normalizePetDocument)
    return parsed.map(normalizePetDocument)
  } catch {
    return fallback.map(normalizePetDocument)
  }
}

/** Move legacy data-URL payloads into IndexedDB and clear `url` from meta. */
export async function migrateDocumentBlobs(documents: PetDocument[]): Promise<PetDocument[]> {
  const next: PetDocument[] = []
  for (const doc of documents) {
    if (doc.storageKey || !doc.url?.startsWith('data:')) {
      next.push({ ...doc, isPublic: false })
      continue
    }
    try {
      const blob = await dataUrlToBlob(doc.url)
      await saveDocumentBlob(doc.id, blob, {
        mimeType: doc.mimeType,
        fileName: doc.fileName,
      })
      next.push({
        ...doc,
        storageKey: doc.id,
        url: undefined,
        isPublic: false,
      })
    } catch {
      next.push({ ...doc, isPublic: false })
    }
  }
  return next
}

export function displayNameFromFileName(fileName: string): string {
  return stripFileExtension(fileName).trim() || fileName
}
