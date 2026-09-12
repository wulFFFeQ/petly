import { prisma } from '../prisma.js'
import { Prisma } from '@prisma/client'

export async function recordAuditEvent(event: {
  actorAccountId?: string
  resourceType: string
  resourceId: string
  action: string
  result: 'allow' | 'deny'
  reasonCode?: string
  denyCode?: string
  denyClass?: string
  grantId?: string
  permission?: string
  allowPath?: string
  correlationId?: string
  idempotencyRef?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        kind: 'authorization_decision',
        actorAccountId: event.actorAccountId ?? null,
        actorType: event.actorAccountId ? 'account' : 'anonymous',
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        action: event.action,
        result: event.result,
        reasonCode: event.reasonCode ?? null,
        denyCode: event.denyCode ?? null,
        denyClass: event.denyClass ?? null,
        grantId: event.grantId ?? null,
        permission: event.permission ?? null,
        allowPath: event.allowPath ?? null,
        correlationId: event.correlationId ?? null,
        idempotencyRef: event.idempotencyRef ?? null,
        source: 'node_api',
        authority: 'server',
        metadata: (event.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    })
  } catch {
    /* audit failure must not flip authorization */
  }
}
