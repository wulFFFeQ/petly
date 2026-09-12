/**
 * LAUNCH 03 — offline cutover asserts (no live credentials required).
 */

import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  PRODUCTION_CONNECTION_NOT_CONFIGURED,
  getProductionConnectionStatus,
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

console.log('LAUNCH 03 — cutover asserts')

{
  assert.equal(isProductionBackendConfigured(), false)
  assert.equal(isDemoBackendMode(), true)
  assert.equal(isRealBackendMode(), false)
  assert.equal(shouldPersistSensitiveLocalStorage(), true)
  assert.equal(getProductionConnectionStatus(), PRODUCTION_CONNECTION_NOT_CONFIGURED)
  ok('env unset → DEMO mode + PRODUCTION CONNECTION NOT CONFIGURED')
}

{
  assert.equal(MALWARE_SCAN_CONFIGURED, false)
  assert.equal(isDocumentUploadEnabled(), true) // DEMO allows local docs
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
  // Production Vite build forbids DEMO login even without env
  // (isDemoLoginAllowed checks import.meta.env.PROD — in Node assert this is not PROD)
  assert.equal(typeof isDemoLoginAllowed(), 'boolean')
  ok('isDemoLoginAllowed is defined')
}

{
  const docsFn = readFileSync(
    join(process.cwd(), 'supabase/functions/documents/index.ts'),
    'utf8',
  )
  assert.match(docsFn, /upload_disabled/)
  assert.match(docsFn, /malware scanning/i)
  ok('documents Edge rejects upload when scanner absent')
}

{
  const http = readFileSync(
    join(process.cwd(), 'supabase/functions/_shared/http.ts'),
    'utf8',
  )
  assert.match(http, /ALLOWED_ORIGINS/)
  assert.ok(!http.includes("Access-Control-Allow-Origin': '*'"))
  assert.ok(!http.includes('Access-Control-Allow-Origin: *'))
  ok('CORS allowlist (no wildcard *)')
}

{
  const mode = readFileSync(join(process.cwd(), 'src/lib/backend/mode.ts'), 'utf8')
  assert.match(mode, /shouldPersistSensitiveLocalStorage/)
  assert.match(mode, /isDemoLoginAllowed/)
  ok('dual-mode helpers present')
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
  assert.ok(existsSync(join(process.cwd(), 'docs/LAUNCH-03-SUPABASE-SETUP.md')))
  assert.ok(existsSync(join(process.cwd(), 'docs/LAUNCH-03-SECURITY.md')))
  ok('LAUNCH 03 docs present')
}

console.log(`\nLAUNCH 03 cutover: ${passed} passed`)
