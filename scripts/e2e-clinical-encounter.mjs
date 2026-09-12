/**
 * K58 E2E — Clinical Encounter container.
 * Run: node scripts/e2e-clinical-encounter.mjs
 *
 * Runs assert-clinical-encounter.mts (full matrix A–AX + concurrency).
 * No fake server / EMR E2E.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const assertScript = path.join(__dirname, 'assert-clinical-encounter.mts')

console.log('K58 E2E: running assert-clinical-encounter.mts\n')
console.log('Scenarios covered in assert matrix: A create, B authorized read,')
console.log('C authorized update, D stale version, E complete, F unauthorized pro,')
console.log('G booking does not grant access, H public privacy (+ full A–AX).\n')

const result = spawnSync('npx', ['tsx', assertScript], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
})

if (result.status !== 0) {
  console.error('K58 E2E FAILED (assert matrix)')
  process.exit(result.status ?? 1)
}

console.log('\nK58 E2E: assert matrix OK')
