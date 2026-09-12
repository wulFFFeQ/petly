/**
 * Live smoke against Node API.
 * Requires VITE_API_BASE_URL + running server with DATABASE_URL.
 * Without them → blocked report (not a fake pass).
 */

const base = process.env.VITE_API_BASE_URL?.replace(/\/$/, '')

console.log('Node API smoke')

if (!base) {
  console.log('BLOCKED: VITE_API_BASE_URL not set — no live credentials in this environment')
  process.exit(0)
}

const health = await fetch(`${base}/health`)
const json = (await health.json()) as Record<string, unknown>
console.log('health:', json)
if (!health.ok || json.ok !== true) {
  console.error('FAIL: /health')
  process.exit(1)
}
if (!json.databaseConfigured) {
  console.log('BLOCKED: server DATABASE_URL not configured')
  process.exit(0)
}
console.log('PASS: health + databaseConfigured')
