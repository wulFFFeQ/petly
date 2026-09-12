/**
 * K59 — Authorized document projections.
 * PetDocument remains SSOT; projections must not leak storage keys / raw URLs
 * or account provenance to professional / organization views.
 */

import type { PetDocument } from '../../types'

export type AuthorizedDocumentViewMode = 'household' | 'professional' | 'organization'

/**
 * Project a PetDocument for an already-authorized actor.
 * Never includes raw blob URLs as public-safe content.
 */
export function toAuthorizedDocumentView(
  doc: PetDocument,
  mode: AuthorizedDocumentViewMode = 'household',
): PetDocument {
  const base: PetDocument = {
    ...doc,
    isPublic: false,
    storageKey: undefined,
    url: undefined,
  }

  if (mode === 'professional' || mode === 'organization') {
    return {
      ...base,
      uploadedByAccountId: undefined,
      updatedByAccountId: undefined,
      withdrawnByAccountId: undefined,
    }
  }

  return base
}

export function toAuthorizedDocumentViews(
  docs: PetDocument[],
  mode: AuthorizedDocumentViewMode = 'household',
): PetDocument[] {
  return docs.map((d) => toAuthorizedDocumentView(d, mode))
}
