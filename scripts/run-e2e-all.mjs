#!/usr/bin/env node
/**
 * Run all scripts/e2e-*.mjs via node.
 * Prerequisites: Playwright browsers installed, app serving at BASE_URL
 * (default http://localhost:5173). Does not start the server.
 */
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const scriptsDir = join(root, 'scripts')
const baseUrl = process.env.BASE_URL || 'http://localhost:5173'
const files = readdirSync(scriptsDir)
  .filter((f) => f.startsWith('e2e-') && f.endsWith('.mjs'))
  .sort()

if (files.length === 0) {
  console.error('No e2e-*.mjs scripts found')
  process.exit(1)
}

console.log(`E2E BASE_URL=${baseUrl}`)
console.log('Prerequisite: app must be running (e.g. npm run dev). Playwright must be installed.')

let failed = 0
for (const file of files) {
  const path = join(scriptsDir, file)
  console.log(`\n>>> ${file}`)
  const result = spawnSync('node', [path], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, BASE_URL: baseUrl },
  })
  if (result.status !== 0) {
    failed += 1
    console.error(`FAILED: ${file} (exit ${result.status})`)
  }
}

console.log(`\n=== e2e suite: ${files.length - failed}/${files.length} passed ===`)
process.exit(failed > 0 ? 1 : 0)
