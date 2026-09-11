import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import {
  CANCELLATION_REASON_CODES,
  CANCELLATION_REASON_LABELS,
  type CancellationReasonCode,
} from '../../lib/booking'

export function BookingCancelDialog({
  open,
  onClose,
  role,
  policyHint,
  busy,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  role: 'owner' | 'professional'
  /** Owner policy hint shown under the confirm question. */
  policyHint?: string | null
  busy?: boolean
  onConfirm: (payload: {
    reasonCode?: CancellationReasonCode
    reason?: string
  }) => void
}) {
  const [reasonCode, setReasonCode] = useState<CancellationReasonCode | ''>('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open) return
    setReasonCode('')
    setReason('')
  }, [open])

  const canSubmit = useMemo(() => {
    if (role === 'owner') return true
    return Boolean(reasonCode)
  }, [role, reasonCode])

  return (
    <Modal open={open} onClose={onClose} title="Zrušit rezervaci?">
      <p className="text-sm text-[#4A564F]" data-testid="cancel-confirm-question">
        Opravdu chcete rezervaci zrušit?
      </p>
      {role === 'owner' && policyHint ? (
        <p
          className="mt-2 text-xs font-medium text-[#5A6660]"
          data-testid="cancel-policy-hint"
        >
          {policyHint}
        </p>
      ) : null}

      {role === 'professional' ? (
        <label className="mt-3 block text-xs font-semibold text-[#4A564F]">
          Důvod zrušení
          <select
            className="mt-1.5 w-full rounded-xl border border-[#E8E4DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#2C4A3E]"
            value={reasonCode}
            onChange={(e) => setReasonCode(e.target.value as CancellationReasonCode | '')}
            data-testid="cancel-reason-code"
          >
            <option value="">Vyberte důvod…</option>
            {CANCELLATION_REASON_CODES.map((code) => (
              <option key={code} value={code}>
                {CANCELLATION_REASON_LABELS[code]}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="mt-3 block text-xs font-semibold text-[#4A564F]">
        {role === 'professional' ? 'Vysvětlení (volitelné)' : 'Důvod zrušení (volitelné)'}
        <textarea
          className="mt-1.5 w-full rounded-xl border border-[#E8E4DC] px-3 py-2 text-sm outline-none focus:border-[#2C4A3E]"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          data-testid="cancel-reason-input"
        />
      </label>

      <div className="mt-4 flex gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Zpět
        </Button>
        <Button
          variant="danger"
          size="sm"
          data-testid="booking-cancel-confirm"
          disabled={busy || !canSubmit}
          onClick={() => {
            onConfirm({
              reasonCode: reasonCode || undefined,
              reason: reason.trim() || undefined,
            })
          }}
        >
          Ano, zrušit
        </Button>
      </div>
    </Modal>
  )
}
