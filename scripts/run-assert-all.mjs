#!/usr/bin/env node
/**
 * Run all scripts/assert-*.mts via npx tsx.
 * Exit 1 if any assert fails.
 */
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const scriptsDir = join(root, 'scripts')
const files = readdirSync(scriptsDir)
  .filter((f) => f.startsWith('assert-') && f.endsWith('.mts'))
  .sort()

if (files.length === 0) {
  console.error('No assert-*.mts scripts found')
  process.exit(1)
}

let failed = 0
for (const file of files) {
  const path = join(scriptsDir, file)
  console.log(`\n>>> ${file}`)
  const result = spawnSync('npx', ['tsx', path], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  })
  if (result.status !== 0) {
    failed += 1
    console.error(`FAILED: ${file} (exit ${result.status})`)
  }
}

console.log(`\n=== assert suite: ${files.length - failed}/${files.length} passed ===`)
process.exit(failed > 0 ? 1 : 0)
