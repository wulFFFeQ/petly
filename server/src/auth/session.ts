import { createHash, randomBytes } from 'node:crypto'
import * as argon2 from 'argon2'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ServerEnv } from '../env.js'
import { SESSION_COOKIE, sendErr } from '../http.js'
import { prisma } from '../prisma.js'

declare module 'fastify' {
  interface FastifyRequest {
    authenticatedAccountId?: string
  }
}

export function hashToken(token: string, secret: string): string {
  return createHash('sha256').update(`${secret}:${token}`).digest('hex')
}

export function newSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id })
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}

export function setSessionCookie(
  reply: FastifyReply,
  env: ServerEnv,
  token: string,
  expiresAt: Date,
) {
  reply.setCookie(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(env.secureCookie),
    expires: expiresAt,
  })
}

export function clearSessionCookie(reply: FastifyReply, env: ServerEnv) {
  reply.clearCookie(SESSION_COOKIE, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(env.secureCookie),
  })
}

export async function resolveSessionAccountId(
  env: ServerEnv,
  request: FastifyRequest,
): Promise<string | null> {
  if (!env.databaseConfigured || !env.sessionConfigured || !env.SESSION_SECRET) {
    return null
  }
  const token = request.cookies?.[SESSION_COOKIE]
  if (!token) return null
  const tokenHash = hashToken(token, env.SESSION_SECRET)
  const session = await prisma.session.findUnique({ where: { tokenHash } })
  if (!session) return null
  if (session.revokedAt) return null
  if (session.expiresAt.getTime() <= Date.now()) return null
  if (session.accountId === 'owner_self') return null
  return session.accountId
}

export async function requireActor(
  env: ServerEnv,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<{ accountId: string } | null> {
  if (!env.databaseConfigured) {
    sendErr(reply, 'not_configured', 'PRODUCTION CONNECTION NOT CONFIGURED', 503)
    return null
  }
  const accountId = await resolveSessionAccountId(env, request)
  if (!accountId) {
    sendErr(reply, 'unauthenticated', 'Not signed in', 401)
    return null
  }
  request.authenticatedAccountId = accountId
  return { accountId }
}

export async function createSessionForAccount(
  env: ServerEnv,
  accountId: string,
): Promise<{ token: string; expiresAt: Date }> {
  if (!env.SESSION_SECRET) throw new Error('SESSION_SECRET missing')
  const token = newSessionToken()
  const expiresAt = new Date(
    Date.now() + (env.SESSION_TTL_DAYS ?? 14) * 24 * 60 * 60 * 1000,
  )
  await prisma.session.create({
    data: {
      accountId,
      tokenHash: hashToken(token, env.SESSION_SECRET),
      expiresAt,
    },
  })
  return { token, expiresAt }
}

export async function revokeSessionToken(env: ServerEnv, token: string | undefined) {
  if (!token || !env.SESSION_SECRET) return
  const tokenHash = hashToken(token, env.SESSION_SECRET)
  await prisma.session.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}
