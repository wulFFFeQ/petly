import type { FastifyInstance } from 'fastify'
import type { ServerEnv } from '../env.js'
import { SESSION_COOKIE, sendErr, sendOk } from '../http.js'
import { prisma } from '../prisma.js'
import {
  clearSessionCookie,
  createSessionForAccount,
  hashPassword,
  requireActor,
  resolveSessionAccountId,
  revokeSessionToken,
  setSessionCookie,
  verifyPassword,
} from '../auth/session.js'

type AuthBody = {
  op: 'register' | 'login' | 'logout' | 'me'
  email?: string
  password?: string
  displayName?: string
}

export function registerAuthRoutes(app: FastifyInstance, env: ServerEnv) {
  app.post('/api/auth', async (request, reply) => {
    const body = (request.body ?? {}) as AuthBody
    if (!body.op) return sendErr(reply, 'invalid', 'op required')

    if (body.op === 'me') {
      if (!env.databaseConfigured) {
        return sendErr(reply, 'not_configured', 'PRODUCTION CONNECTION NOT CONFIGURED', 503)
      }
      const accountId = await resolveSessionAccountId(env, request)
      if (!accountId) return sendErr(reply, 'unauthenticated', 'Not signed in', 401)
      const account = await prisma.account.findUnique({ where: { id: accountId } })
      if (!account) return sendErr(reply, 'unauthenticated', 'Account missing', 401)
      const cred = await prisma.credential.findUnique({ where: { accountId } })
      return sendOk(reply, {
        account: {
          id: account.id,
          kind: account.kind,
          roles: account.roles,
          displayName: account.displayName,
          email: cred?.email ?? null,
        },
      })
    }

    if (body.op === 'logout') {
      await revokeSessionToken(env, request.cookies?.[SESSION_COOKIE])
      clearSessionCookie(reply, env)
      return sendOk(reply, {})
    }

    if (!env.databaseConfigured || !env.sessionConfigured) {
      return sendErr(reply, 'not_configured', 'PRODUCTION CONNECTION NOT CONFIGURED', 503)
    }

    const email = body.email?.trim().toLowerCase()
    const password = body.password ?? ''
    if (!email || !password) {
      return sendErr(reply, 'invalid', 'email and password required')
    }
    if (password.length < 8) {
      return sendErr(reply, 'invalid', 'password must be at least 8 characters')
    }

    if (body.op === 'register') {
      const existing = await prisma.credential.findUnique({ where: { email } })
      if (existing) return sendErr(reply, 'email_taken', 'Email already registered', 409)

      const passwordHash = await hashPassword(password)
      const displayName =
        body.displayName?.trim() || email.split('@')[0] || 'User'

      const account = await prisma.$transaction(async (tx) => {
        const acc = await tx.account.create({
          data: {
            kind: 'consumer',
            roles: ['owner'],
            displayName,
          },
        })
        await tx.credential.create({
          data: {
            accountId: acc.id,
            email,
            passwordHash,
          },
        })
        return acc
      })

      const session = await createSessionForAccount(env, account.id)
      setSessionCookie(reply, env, session.token, session.expiresAt)
      return sendOk(reply, {
        account: {
          id: account.id,
          kind: account.kind,
          roles: account.roles,
          displayName: account.displayName,
          email,
        },
      })
    }

    if (body.op === 'login') {
      const cred = await prisma.credential.findUnique({
        where: { email },
        include: { account: true },
      })
      if (!cred) return sendErr(reply, 'invalid_credentials', 'Invalid email or password', 401)
      const ok = await verifyPassword(cred.passwordHash, password)
      if (!ok) return sendErr(reply, 'invalid_credentials', 'Invalid email or password', 401)

      const session = await createSessionForAccount(env, cred.accountId)
      setSessionCookie(reply, env, session.token, session.expiresAt)
      return sendOk(reply, {
        account: {
          id: cred.account.id,
          kind: cred.account.kind,
          roles: cred.account.roles,
          displayName: cred.account.displayName,
          email: cred.email,
        },
      })
    }

    return sendErr(reply, 'invalid', 'unknown op')
  })

  // Keep requireActor import used for future middleware tests
  void requireActor
}
