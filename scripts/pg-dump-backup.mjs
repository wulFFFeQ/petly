#!/usr/bin/env node
/**
 * Offsite-friendly Postgres dump helper for LOVED & KNOWN.
 * Requires `pg_dump` on PATH and DATABASE_URL in the environment.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npm run db:backup
 *
 * Output: backups/loved-and-known-YYYYMMDD-HHMMSS.dump (custom format, -Fc)
 * Never commit backups/ (gitignored).
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) {
  console.error('DATABASE_URL is required (server secret — never VITE_).')
  process.exit(1)
}

const outDir = join(process.cwd(), 'backups')
mkdirSync(outDir, { recursive: true })

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z').replace('T', '-')
const outFile = join(outDir, `loved-and-known-${stamp}.dump`)

const result = spawnSync(
  'pg_dump',
  ['--format=custom', '--file', outFile, '--no-owner', '--no-acl', databaseUrl],
  { stdio: 'inherit', shell: false },
)

if (result.error) {
  console.error(
    'Failed to run pg_dump. Install PostgreSQL client tools and ensure pg_dump is on PATH.',
  )
  console.error(result.error.message)
  process.exit(1)
}

if (result.status !== 0) {
  console.error(`pg_dump exited with code ${result.status ?? 'unknown'}`)
  process.exit(result.status ?? 1)
}

console.log(`Backup written: ${outFile}`)
console.log('Copy this file to a private offsite bucket; do not commit it.')
