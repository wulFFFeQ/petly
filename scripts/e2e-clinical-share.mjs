/**
 * K61 E2E — Clinical Share hardening.
 * Run: node scripts/e2e-clinical-share.mjs
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const assertScript = path.join(__dirname, 'assert-clinical-share.mts')

console.log('K61 E2E: running assert-clinical-share.mts\n')
console.log('Scenarios: owner/HH/pro/org share ALLOW/DENY, forged actor/pet/source/recipient,')
console.log('share≠access, notification scrub, storageKey injection, withdrawn source.\n')

const result = spawnSync('npx', ['tsx', assertScript], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
})

if (result.status !== 0) {
  console.error('K61 E2E FAILED (assert matrix)')
  process.exit(result.status ?? 1)
}

console.log('\nK61 E2E: assert matrix OK')
