import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ServerEnv } from './env.js'

export type ApiOk<T extends Record<string, unknown> = Record<string, unknown>> = {
  ok: true
} & T

export type ApiErr = {
  ok: false
  code: string
  message: string
  [key: string]: unknown
}

export function sendOk<T extends Record<string, unknown>>(
  reply: FastifyReply,
  data: T,
  status = 200,
) {
  return reply.status(status).send({ ok: true, ...data })
}

export function sendErr(
  reply: FastifyReply,
  code: string,
  message: string,
  status = 400,
  extra?: Record<string, unknown>,
) {
  return reply.status(status).send({ ok: false, code, message, ...extra })
}

export function corsOrigin(env: ServerEnv, request: FastifyRequest): string {
  const origin = request.headers.origin?.trim() ?? ''
  if (origin && env.allowedOrigins.includes(origin)) return origin
  return env.allowedOrigins[0] ?? 'http://localhost:5173'
}

export const SESSION_COOKIE = 'lk_session'
