/**
 * K56 E2E — Clinical service boundary.
 * Run: node scripts/e2e-clinical-service.mjs
 *
 * Runs assert-clinical-service.mts (full matrix).
 * No fake server E2E.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const assertScript = path.join(__dirname, 'assert-clinical-service.mts')

console.log('K56 E2E: running assert-clinical-service.mts\n')

const result = spawnSync('npx', ['tsx', assertScript], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
})

if (result.status !== 0) {
  console.error('K56 E2E FAILED (assert matrix)')
  process.exit(result.status ?? 1)
}

console.log('\nK56 E2E: assert matrix OK')
