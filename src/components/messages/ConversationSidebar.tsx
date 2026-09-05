import { Archive, ArrowLeft } from 'lucide-react'
import type { Conversation } from '../../types'
import { Badge } from '../ui/Badge'
import { SearchInput } from '../ui/SearchInput'
import { cn } from '../../lib/utils'
import { ConversationListEmptyState } from './ConversationListEmptyState'
import { ConversationListItem } from './ConversationListItem'

interface ConversationSidebarProps {
  listMode: 'inbox' | 'archive'
  onListModeChange: (mode: 'inbox' | 'archive') => void
  search: string
  onSearchChange: (value: string) => void
  archivedCount: number
  filteredConversations: Conversation[]
  activeId: string
  mobileShowChat: boolean
  onSelectConversation: (id: string) => void
  onArchiveConversation: (id: string) => void
  onRestoreConversation: (id: string) => void
}

export function ConversationSidebar({
  listMode,
  onListModeChange,
  search,
  onSearchChange,
  archivedCount,
  filteredConversations,
  activeId,
  mobileShowChat,
  onSelectConversation,
  onArchiveConversation,
  onRestoreConversation,
}: ConversationSidebarProps) {
  return (
    <div
      className={cn(
        'w-full border-r border-[#E8E4DC] md:w-80 lg:w-96 flex flex-col bg-white',
        mobileShowChat ? 'hidden md:flex' : 'flex',
      )}
    >
      <div className="p-4 border-b border-[#F0EDE6] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-[#191E1B]">Zprávy</h2>
          <Badge variant="gold" size="sm">
            Ověřeno
          </Badge>
        </div>

        <div
          role="tablist"
          aria-label="Přepínač konverzací"
          className="grid grid-cols-2 gap-1 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={listMode === 'inbox'}
            onClick={() => onListModeChange('inbox')}
            className={cn(
              'rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer',
              listMode === 'inbox'
                ? 'bg-white text-[#2C4A3E] shadow-xs'
                : 'text-[#5A6660] hover:text-[#234B54]',
            )}
          >
            Aktivní
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={listMode === 'archive'}
            onClick={() => onListModeChange('archive')}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer',
              listMode === 'archive'
                ? 'bg-white text-[#2C4A3E] shadow-xs'
                : 'text-[#5A6660] hover:text-[#234B54]',
            )}
          >
            <Archive size={12} />
            Archiv
            {archivedCount > 0 && (
              <span
                className={cn(
                  'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold',
                  listMode === 'archive'
                    ? 'bg-[#E0EAEC] text-[#234B54]'
                    : 'bg-[#E8E4DC] text-[#5A6660]',
                )}
              >
                {archivedCount}
              </span>
            )}
          </button>
        </div>

        {listMode === 'archive' && (
          <button
            type="button"
            onClick={() => onListModeChange('inbox')}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#234B54] hover:text-[#B8934A] cursor-pointer"
          >
            <ArrowLeft size={13} />
            Zpět na aktivní chaty
          </button>
        )}

        <SearchInput
          size="sm"
          placeholder={
            listMode === 'archive' ? 'Hledat v archivu...' : 'Hledat konverzace...'
          }
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-[#FAF8F5] focus:bg-white"
        />
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#F0EDE6]">
        {filteredConversations.length === 0 ? (
          <ConversationListEmptyState
            listMode={listMode}
            onBackToInbox={() => onListModeChange('inbox')}
          />
        ) : (
          filteredConversations.map((conv) => (
            <ConversationListItem
              key={conv.id}
              conversation={conv}
              isSelected={activeId === conv.id}
              listMode={listMode}
              onSelect={onSelectConversation}
              onArchive={onArchiveConversation}
              onRestore={onRestoreConversation}
            />
          ))
        )}
      </div>
    </div>
  )
}
