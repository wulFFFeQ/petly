import { Archive, ArrowLeft } from 'lucide-react'

interface ConversationListEmptyStateProps {
  listMode: 'inbox' | 'archive'
  onBackToInbox: () => void
}

export function ConversationListEmptyState({
  listMode,
  onBackToInbox,
}: ConversationListEmptyStateProps) {
  return (
    <div className="px-4 py-10 text-center">
      <Archive size={22} className="mx-auto text-[#C5D0CB]" />
      <p className="mt-2 text-sm font-semibold text-[#191E1B]">
        {listMode === 'archive' ? 'Archiv je prázdný' : 'Žádné aktivní konverzace'}
      </p>
      <p className="mt-1 text-[11px] text-[#7D8B82]">
        {listMode === 'archive'
          ? 'Archivované chaty se zobrazí tady.'
          : 'Zkuste jiný filtr nebo obnovte chat z archivu.'}
      </p>
      {listMode === 'archive' && (
        <button
          type="button"
          onClick={onBackToInbox}
          className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#234B54] hover:text-[#B8934A] cursor-pointer"
        >
          <ArrowLeft size={13} />
          Zpět na aktivní chaty
        </button>
      )}
    </div>
  )
}
