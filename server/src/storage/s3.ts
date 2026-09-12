import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { ServerEnv } from '../env.js'

let client: S3Client | null = null

function getClient(env: ServerEnv): S3Client | null {
  if (!env.storageConfigured) return null
  if (client) return client
  client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT || undefined,
    forcePathStyle: Boolean(env.S3_FORCE_PATH_STYLE),
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
    },
  })
  return client
}

export async function createSignedDownloadUrl(
  env: ServerEnv,
  storageKey: string,
  expiresInSeconds = 60,
): Promise<string | null> {
  const s3 = getClient(env)
  if (!s3 || !env.S3_BUCKET) return null
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: storageKey,
  })
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds })
}

export async function createSignedUploadUrl(
  env: ServerEnv,
  storageKey: string,
  contentType: string,
  expiresInSeconds = 300,
): Promise<string | null> {
  const s3 = getClient(env)
  if (!s3 || !env.S3_BUCKET) return null
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: storageKey,
    ContentType: contentType,
  })
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds })
}

export function isStorageConfigured(env: ServerEnv): boolean {
  return env.storageConfigured
}
