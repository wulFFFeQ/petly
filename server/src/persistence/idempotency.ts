import { prisma } from '../prisma.js'

export async function executeIdempotent<T>(input: {
  actorAccountId: string
  operation: string
  resourceRef: string
  clientKey: string
  fingerprint: string
  run: () => Promise<T>
}): Promise<
  | { ok: true; replay: boolean; result: T }
  | { ok: false; code: 'IDEMPOTENCY_CONFLICT'; message: string }
> {
  const storageKey = [
    input.actorAccountId,
    input.operation,
    input.resourceRef,
    input.clientKey,
  ].join('|')

  const existing = await prisma.idempotencyRecord.findUnique({
    where: { storageKey },
  })

  if (existing) {
    if (existing.fingerprint !== input.fingerprint) {
      return {
        ok: false,
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'Same idempotency key with different fingerprint',
      }
    }
    if (existing.state === 'completed') {
      return { ok: true, replay: true, result: existing.result as T }
    }
  }

  try {
    await prisma.idempotencyRecord.upsert({
      where: { storageKey },
      create: {
        storageKey,
        actorAccountId: input.actorAccountId,
        operation: input.operation,
        resourceRef: input.resourceRef,
        clientKey: input.clientKey,
        fingerprint: input.fingerprint,
        state: 'pending',
      },
      update: {
        fingerprint: input.fingerprint,
        state: 'pending',
        errorCode: null,
      },
    })
  } catch {
    const raced = await prisma.idempotencyRecord.findUnique({ where: { storageKey } })
    if (raced?.fingerprint === input.fingerprint && raced.state === 'completed') {
      return { ok: true, replay: true, result: raced.result as T }
    }
    if (raced && raced.fingerprint !== input.fingerprint) {
      return {
        ok: false,
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'Same idempotency key with different fingerprint',
      }
    }
  }

  try {
    const result = await input.run()
    await prisma.idempotencyRecord.update({
      where: { storageKey },
      data: {
        state: 'completed',
        result: result as object,
      },
    })
    return { ok: true, replay: false, result }
  } catch (err) {
    await prisma.idempotencyRecord.update({
      where: { storageKey },
      data: { state: 'failed', errorCode: 'execution_failed' },
    })
    throw err
  }
}
