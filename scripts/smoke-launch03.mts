/**
 * LAUNCH 03 — production smoke checklist runner.
 * Requires live credentials (VITE_SUPABASE_*). Without them → blocked report.
 *
 * Usage (after Phase B):
 *   npx tsx scripts/smoke-launch03.mts
 *
 * Never prints secrets.
 */

import {
  PRODUCTION_CONNECTION_NOT_CONFIGURED,
  isProductionBackendConfigured,
  getProductionConnectionStatus,
} from '../src/lib/backend/index.ts'
import { isDocumentUploadEnabled, MALWARE_SCAN_CONFIGURED } from '../src/lib/documents/uploadPolicy.ts'

const scenarios = [
  'AUTH: register → login → refresh → logout',
  'ACCOUNT: account isolation',
  'PET: create → read → update',
  'HOUSEHOLD: invite/member/access',
  'PRO: grant → read → revoke → deny',
  'CLINICAL: write → read → unauthorized deny',
  'DOCUMENT: upload disabled if scanner absent; authorized download if available',
  'MESSAGING: participant → message; nonparticipant → deny',
  'BOOKING: create → confirm → cancel',
  'PUBLIC: projection contains no forbidden fields',
  'IDEMPOTENCY: retry same mutation → one mutation',
] as const

console.log('LAUNCH 03 — production smoke')
console.log(`Connection: ${getProductionConnectionStatus()}`)
console.log(`Malware scan configured: ${MALWARE_SCAN_CONFIGURED}`)
console.log(`Document upload enabled: ${isDocumentUploadEnabled()}`)
console.log('')

if (!isProductionBackendConfigured()) {
  console.log('BLOCKED — PRODUCTION CONNECTION NOT CONFIGURED')
  console.log('Complete docs/LAUNCH-03-SUPABASE-SETUP.md then re-run.')
  console.log('')
  console.log('Pending smoke scenarios:')
  for (const s of scenarios) console.log(`  - [ ] ${s}`)
  process.exitCode = 2
} else {
  console.log('Client env detected. Manual / interactive smoke still required:')
  for (const s of scenarios) console.log(`  - [ ] ${s}`)
  console.log('')
  console.log(
    'Automated end-to-end smoke against live project is environment-gated;',
  )
  console.log('mark scenarios after manual verification on staging.')
  if (!MALWARE_SCAN_CONFIGURED) {
    console.log('DOCUMENT upload expected: DISABLED (scanner absent).')
  }
}
