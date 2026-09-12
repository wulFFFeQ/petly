/**
 * K59 E2E — Clinical Documents / PetDocument hardening.
 * Run: node scripts/e2e-clinical-documents.mjs
 *
 * Runs assert-clinical-documents.mts (full matrix A–BD + concurrency + regressions).
 * No fake server / blob / EMR E2E.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const assertScript = path.join(__dirname, 'assert-clinical-documents.mts')

console.log('K59 E2E: running assert-clinical-documents.mts\n')
console.log('Scenarios: A create, B v1, D/E owner R/W, F–K authz, Q–X versioning/withdraw,')
console.log('Y/Z isolation, AB–AF privacy, AL–AN shortcuts, AY/AZ authority (+ full matrix).\n')

const result = spawnSync('npx', ['tsx', assertScript], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
})

if (result.status !== 0) {
  console.error('K59 E2E FAILED (assert matrix)')
  process.exit(result.status ?? 1)
}

console.log('\nK59 E2E: assert matrix OK')
