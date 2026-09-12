/**
 * E2E gate for K47 SecurityContext — runs assert suite (no UI migration).
 * Covers owner / co-owner / caregiver / professional / org / revoked / cross-org via unit asserts.
 * Run: node scripts/e2e-security-context.mjs
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const assertScript = path.join(__dirname, 'assert-security-context.mts')

console.log('K47 E2E: running assert-security-context.mts (security scenarios A–T)\n')

const result = spawnSync('npx', ['tsx', assertScript], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true,
})

if (result.status !== 0) {
  console.error('K47 E2E FAILED')
  process.exit(result.status ?? 1)
}

console.log('\nK47 E2E OK — owner, co-owner, caregiver, professional, org, revoked, cross-org covered')
