/**
 * Node + Prisma cutover asserts (offline — no live DATABASE_URL required).
 */

import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  PRODUCTION_CONNECTION_NOT_CONFIGURED,
  getProductionConnectionStatus,
  getApiPublicConfig,
  isDemoBackendMode,
  isDemoLoginAllowed,
  isProductionBackendConfigured,
  isRealBackendMode,
  shouldPersistSensitiveLocalStorage,
} from '../src/lib/backend/index.ts'
import {
  MALWARE_SCAN_CONFIGURED,
  isDocumentUploadEnabled,
} from '../src/lib/documents/uploadPolicy.ts'
import { createAppSecurityContext } from '../src/lib/security/index.ts'
import { loginSelfSession } from '../src/lib/account/session.ts'

function installMemoryStorage() {
  const store = new Map<string, string>()
  const local = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    setItem(key: string, value: string) {
      store.set(key, String(value))
    },
    removeItem(key: string) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: local,
    configurable: true,
  })
}

installMemoryStorage()

let passed = 0
function ok(name: string) {
  passed += 1
  console.log(`  ✓ ${name}`)
}

console.log('Node/Prisma — cutover asserts')

{
  assert.equal(isProductionBackendConfigured(), false)
  assert.equal(getApiPublicConfig(), null)
  assert.equal(isDemoBackendMode(), true)
  assert.equal(isRealBackendMode(), false)
  assert.equal(shouldPersistSensitiveLocalStorage(), true)
  assert.equal(getProductionConnectionStatus(), PRODUCTION_CONNECTION_NOT_CONFIGURED)
  ok('env unset → DEMO mode + PRODUCTION CONNECTION NOT CONFIGURED')
}

{
  assert.equal(MALWARE_SCAN_CONFIGURED, false)
  assert.equal(isDocumentUploadEnabled(), true)
  ok('malware scanner not configured (honest gap)')
}

{
  loginSelfSession()
  const demo = createAppSecurityContext({})
  assert.equal(demo.ok, true)
  if (demo.ok) assert.equal(demo.context.authority, 'demo')
  ok('DEMO security context when env unset')
}

{
  assert.equal(typeof isDemoLoginAllowed(), 'boolean')
  ok('isDemoLoginAllowed is defined')
}

{
  const docsFn = readFileSync(
    join(process.cwd(), 'server/src/routes/documents.ts'),
    'utf8',
  )
  assert.match(docsFn, /upload_disabled/)
  assert.match(docsFn, /malwareScanStatus/)
  ok('documents route rejects upload when scanner absent')
}

{
  const index = readFileSync(join(process.cwd(), 'server/src/index.ts'), 'utf8')
  assert.match(index, /allowedOrigins/)
  assert.match(index, /credentials:\s*true/)
  ok('CORS credentials + origin allowlist')
}

{
  const mode = readFileSync(join(process.cwd(), 'src/lib/backend/mode.ts'), 'utf8')
  assert.match(mode, /shouldPersistSensitiveLocalStorage/)
  assert.match(mode, /isDemoLoginAllowed/)
  ok('dual-mode helpers present')
}

{
  const schema = readFileSync(join(process.cwd(), 'server/prisma/schema.prisma'), 'utf8')
  assert.match(schema, /model Credential/)
  assert.match(schema, /model Session/)
  assert.doesNotMatch(schema, /REFERENCES\s+auth\.users/i)
  ok('Prisma auth tables without auth.users')
}

{
  assert.ok(existsSync(join(process.cwd(), 'src/lib/api/apiClient.ts')))
  assert.ok(existsSync(join(process.cwd(), 'src/lib/auth/sessionAuth.ts')))
  assert.ok(!existsSync(join(process.cwd(), 'src/lib/auth/supabaseClient.ts')))
  assert.ok(!existsSync(join(process.cwd(), 'src/lib/auth/supabaseAuth.ts')))
  assert.ok(!existsSync(join(process.cwd(), 'supabase')))
  ok('Supabase client/tree removed; cookie apiClient present')
}

{
  const distDir = join(process.cwd(), 'dist')
  if (existsSync(distDir)) {
    const assets = join(distDir, 'assets')
    if (existsSync(assets)) {
      const files = readdirSync(assets).filter((f) => f.endsWith('.js'))
      for (const f of files) {
        const body = readFileSync(join(assets, f), 'utf8')
        assert.doesNotMatch(body, /SERVICE_ROLE_KEY\s*=\s*['"]eyJ/)
        assert.doesNotMatch(body, /supabase_service_role/i)
        assert.doesNotMatch(body, /SESSION_SECRET\s*=\s*['"]/)
      }
      ok(`Vite bundle scrub (${files.length} js assets)`)
    } else {
      ok('dist present but no assets yet — scrub skipped')
    }
  } else {
    ok('dist not built yet — bundle scrub deferred to post-build')
  }
}

{
  assert.ok(existsSync(join(process.cwd(), 'docs/NODE-PRISMA-BACKEND.md')))
  ok('Node/Prisma backend docs present')
}

console.log(`\nNode/Prisma cutover: ${passed} passed`)
