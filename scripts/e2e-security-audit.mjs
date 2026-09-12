/**
 * E2E gate for K48 Security Audit Trail — runs assert suite.
 * Covers owner ALLOW / professional DENY+ALLOW / org DENY+ALLOW / cross-org DENY.
 * Run: node scripts/e2e-security-audit.mjs
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const assertScript = path.join(__dirname, 'assert-security-audit.mts')

console.log('K48 E2E: running assert-security-audit.mts (audit scenarios A–W)\n')

const result = spawnSync('npx', ['tsx', assertScript], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true,
})

if (result.status !== 0) {
  console.error('K48 E2E FAILED')
  process.exit(result.status ?? 1)
}

console.log(
  '\nK48 E2E OK — owner ALLOW, professional DENY/ALLOW, organization DENY/ALLOW, cross-org DENY covered',
)
