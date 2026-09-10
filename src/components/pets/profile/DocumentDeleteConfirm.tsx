import { Button } from '../../ui/Button'

type DocumentDeleteConfirmProps = {
  open: boolean
  documentName?: string
  onCancel: () => void
  onConfirm: () => void
}

export function DocumentDeleteConfirm({
  open,
  documentName,
  onCancel,
  onConfirm,
}: DocumentDeleteConfirmProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#E8E4DC] bg-white p-5 shadow-lg">
        <h3 className="text-base font-bold text-[#191E1B]">Smazat dokument?</h3>
        <p className="mt-1 text-xs text-[#7D8B82]">
          Tento dokument bude trvale odstraněn z profilu mazlíčka.
          {documentName ? ` (${documentName})` : ''}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Zrušit
          </Button>
          <Button type="button" variant="danger" size="sm" onClick={onConfirm}>
            Smazat dokument
          </Button>
        </div>
      </div>
    </div>
  )
}
