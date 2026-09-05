import { Archive } from 'lucide-react'
import type { Conversation } from '../../types'
import { Avatar } from '../ui/Avatar'
import { cn } from '../../lib/utils'

interface ConversationListItemProps {
  conversation: Conversation
  isSelected: boolean
  listMode: 'inbox' | 'archive'
  onSelect: (id: string) => void
  onArchive: (id: string) => void
  onRestore: (id: string) => void
}

export function ConversationListItem({
  conversation: conv,
  isSelected,
  listMode,
  onSelect,
  onArchive,
  onRestore,
}: ConversationListItemProps) {
  return (
    <div
      className={cn(
        'group relative flex w-full items-start gap-3.5 p-4 text-left transition-all duration-200',
        isSelected ? 'bg-[#EBF2EE]' : 'hover:bg-[#FAF8F5]',
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(conv.id)}
        className="flex min-w-0 flex-1 items-start gap-3.5 text-left cursor-pointer"
      >
        <Avatar
          src={conv.avatar}
          alt={conv.name}
          size="md"
          status={conv.online ? 'online' : 'offline'}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span
              className={cn(
                'text-sm font-bold truncate',
                isSelected ? 'text-[#2C4A3E]' : 'text-[#191E1B]',
              )}
            >
              {conv.name}
            </span>
            <span className="text-[10px] font-medium text-[#7D8B82] shrink-0">
              {conv.time}
            </span>
          </div>

          {conv.role && (
            <p className="text-[11px] text-[#7D8B82] font-medium truncate">
              {conv.role}
            </p>
          )}

          <p className="mt-0.5 text-[10px] font-semibold text-[#234B54] truncate">
            {conv.petContext}
          </p>

          <p
            className={cn(
              'text-xs truncate mt-1',
              conv.unread > 0 ? 'font-bold text-[#191E1B]' : 'text-[#4A564F]',
            )}
          >
            {conv.lastMessage}
          </p>
        </div>
      </button>

      <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
        {conv.unread > 0 && listMode === 'inbox' && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2C4A3E] text-[10px] font-bold text-white shadow-xs">
            {conv.unread}
          </span>
        )}
        {listMode === 'archive' ? (
          <button
            type="button"
            onClick={() => onRestore(conv.id)}
            title="Obnovit konverzaci"
            aria-label={`Obnovit konverzaci s ${conv.name}`}
            className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[10px] font-semibold text-[#234B54] hover:bg-white cursor-pointer"
          >
            Obnovit
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onArchive(conv.id)}
            title="Archivovat konverzaci"
            aria-label={`Archivovat konverzaci s ${conv.name}`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#A3AEA7] opacity-0 transition-all hover:bg-white hover:text-[#234B54] group-hover:opacity-100 focus:opacity-100 cursor-pointer"
          >
            <Archive size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
