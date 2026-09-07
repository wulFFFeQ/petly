import { useState } from 'react'
import { useApp } from '../../../context/AppContext'
import type { ReportFlagReason } from '../../../types'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import { OptionSelect } from '../../ui/OptionSelect'

interface FlagReportModalProps {
  open: boolean
  onClose: () => void
  reportId: string
}

const REASON_OPTIONS = [
  { value: 'outdated', label: 'Už není aktuální' },
  { value: 'wrong_place', label: 'Nesprávné místo' },
  { value: 'fake', label: 'Falešné hlášení' },
  { value: 'other', label: 'Jiné' },
]

export function FlagReportModal({ open, onClose, reportId }: FlagReportModalProps) {
  const { flagLostReport } = useApp()
  const [reason, setReason] = useState<ReportFlagReason | ''>('')
  const [note, setNote] = useState('')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nahlásit nevhodné / falešné hlášení"
      subtitle="Hlášení zůstane v historii, ale bude označeno"
      maxWidth="sm"
    >
      <div className="space-y-4">
        <OptionSelect
          label="Důvod"
          value={reason}
          onChange={(v) => setReason(v as ReportFlagReason)}
          options={REASON_OPTIONS}
          placeholder="Vyberte důvod…"
        />
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#7D8B82]">
            Poznámka (volitelné)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-[#E8E4DC] px-3 py-2 text-sm outline-none focus:border-[#2C4A3E]"
          />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Zrušit
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={!reason}
            onClick={() => {
              if (!reason) return
              flagLostReport(reportId, reason, note)
              onClose()
            }}
          >
            Nahlásit
          </Button>
        </div>
      </div>
    </Modal>
  )
}
