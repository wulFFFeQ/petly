/**
 * Document upload policy — production requires malware scanning.
 * Until a real scanner is configured, production uploads stay disabled.
 */

import { isRealBackendMode } from '../backend/mode'

/** Honest gap — no fake scanner. Flip only when a real provider is wired. */
export const MALWARE_SCAN_CONFIGURED = false

export function isDocumentUploadEnabled(): boolean {
  if (isRealBackendMode()) return MALWARE_SCAN_CONFIGURED
  return true
}

export const DOCUMENT_UPLOAD_DISABLED_MESSAGE =
  'Nahrávání dokumentů bude dostupné po aktivaci secure malware scanning.'
