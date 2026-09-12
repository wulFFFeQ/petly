/**
 * Atomic K63 idempotency on Postgres.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

export async function executeIdempotent<T>(input: {
  db: SupabaseClient
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

  const { data: existing } = await input.db
    .from('idempotency_records')
    .select('*')
    .eq('storage_key', storageKey)
    .maybeSingle()

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

  const { error: insertError } = await input.db.from('idempotency_records').upsert(
    {
      storage_key: storageKey,
      actor_account_id: input.actorAccountId,
      operation: input.operation,
      resource_ref: input.resourceRef,
      client_key: input.clientKey,
      fingerprint: input.fingerprint,
      state: 'pending',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'storage_key' },
  )

  if (insertError) {
    // Race: re-read
    const { data: raced } = await input.db
      .from('idempotency_records')
      .select('*')
      .eq('storage_key', storageKey)
      .maybeSingle()
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
    await input.db
      .from('idempotency_records')
      .update({
        state: 'completed',
        result: result as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq('storage_key', storageKey)
    return { ok: true, replay: false, result }
  } catch (err) {
    await input.db
      .from('idempotency_records')
      .update({
        state: 'failed',
        error_code: 'execution_failed',
        updated_at: new Date().toISOString(),
      })
      .eq('storage_key', storageKey)
    throw err
  }
}
