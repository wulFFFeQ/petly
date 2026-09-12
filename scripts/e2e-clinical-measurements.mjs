/**
 * K60 E2E — Clinical Measurements / WeightMeasurement hardening.
 * Run: node scripts/e2e-clinical-measurements.mjs
 *
 * Runs assert-clinical-measurements.mts (authz matrix + isolation + projections).
 * No fake server / versioning ledger E2E (known gaps documented in K60).
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const assertScript = path.join(__dirname, 'assert-clinical-measurements.mts')

console.log('K60 E2E: running assert-clinical-measurements.mts\n')
console.log('Scenarios: owner/HH/pro/org R/W, isolation, shortcuts, forged actor,')
console.log('invalid numeric, public/pro/org scrub (+ documented versioning/withdraw N/A).\n')

const result = spawnSync('npx', ['tsx', assertScript], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
})

if (result.status !== 0) {
  console.error('K60 E2E FAILED (assert matrix)')
  process.exit(result.status ?? 1)
}

console.log('\nK60 E2E: assert matrix OK')
