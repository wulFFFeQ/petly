import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(16).optional(),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  PORT: z.coerce.number().default(3001),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
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

export type ServerEnv = z.infer<typeof envSchema> & {
  allowedOrigins: string[]
  databaseConfigured: boolean
  sessionConfigured: boolean
  storageConfigured: boolean
  malwareScanConfigured: boolean
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
  return {
    ...data,
    allowedOrigins,
    databaseConfigured: Boolean(data.DATABASE_URL?.trim()),
    sessionConfigured: Boolean(data.SESSION_SECRET && data.SESSION_SECRET.length >= 16),
    storageConfigured: Boolean(
      data.S3_BUCKET && data.S3_ACCESS_KEY_ID && data.S3_SECRET_ACCESS_KEY,
    ),
    malwareScanConfigured: Boolean(data.MALWARE_SCAN_PROVIDER?.trim()),
  }
}
