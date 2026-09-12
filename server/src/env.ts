import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  DATABASE_URL: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(16).optional(),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  PORT: z.coerce.number().default(3001),
  /** Raw env; resolved to `secureCookie` in loadEnv (production defaults true). */
  COOKIE_SECURE: z.string().optional(),
  SESSION_TTL_DAYS: z.coerce.number().default(14),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  MALWARE_SCAN_PROVIDER: z.string().optional(),
})

export type ServerEnv = Omit<z.infer<typeof envSchema>, 'COOKIE_SECURE'> & {
  allowedOrigins: string[]
  /** Effective Secure flag for lk_session cookie. */
  secureCookie: boolean
  cookieSecureForcedOff: boolean
  databaseConfigured: boolean
  sessionConfigured: boolean
  storageConfigured: boolean
  malwareScanConfigured: boolean
}

function parseCookieSecureFlag(raw: string | undefined): boolean | null {
  if (raw === undefined || raw.trim() === '') return null
  const v = raw.trim().toLowerCase()
  if (v === 'true' || v === '1') return true
  if (v === 'false' || v === '0') return false
  return null
}

export function loadEnv(): ServerEnv {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    throw new Error(`Invalid server env: ${parsed.error.message}`)
  }
  const data = parsed.data
  const allowedOrigins = data.ALLOWED_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const isProduction = data.NODE_ENV === 'production'
  const cookieFlag = parseCookieSecureFlag(data.COOKIE_SECURE)
  // Production defaults Secure on unless explicitly COOKIE_SECURE=false.
  const secureCookie = cookieFlag === null ? isProduction : cookieFlag
  const cookieSecureForcedOff = isProduction && cookieFlag === false

  const { COOKIE_SECURE: _rawCookie, ...rest } = data
  return {
    ...rest,
    allowedOrigins,
    secureCookie,
    cookieSecureForcedOff,
    databaseConfigured: Boolean(data.DATABASE_URL?.trim()),
    sessionConfigured: Boolean(data.SESSION_SECRET && data.SESSION_SECRET.length >= 16),
    storageConfigured: Boolean(
      data.S3_BUCKET && data.S3_ACCESS_KEY_ID && data.S3_SECRET_ACCESS_KEY,
    ),
    malwareScanConfigured: Boolean(data.MALWARE_SCAN_PROVIDER?.trim()),
  }
}
