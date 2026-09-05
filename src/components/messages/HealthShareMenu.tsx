import type { HealthRecord } from '../../types'
import { cn } from '../../lib/utils'
import { SHARE_GROUPS, getShareCategory } from './messageShareUtils'

interface HealthShareMenuProps {
  shareableRecords: HealthRecord[]
  selectedShareIds: string[]
  onToggleSelection: (recordId: string) => void
  onToggleSelectAll: () => void
  onShare: () => void
}

export function HealthShareMenu({
  shareableRecords,
  selectedShareIds,
  onToggleSelection,
  onToggleSelectAll,
  onShare,
}: HealthShareMenuProps) {
  return (
    <div className="absolute bottom-full left-0 z-20 mb-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#E8E4DC] bg-white shadow-lg">
      <div className="border-b border-[#F0EDE6] px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]">
          Sdílet zdravotní údaje
        </p>
        <p className="mt-0.5 text-[11px] text-[#5A6660]">
          Vyberte záznamy, které chcete odeslat veterináři.
        </p>
      </div>

      <div className="max-h-64 overflow-y-auto py-1">
        {SHARE_GROUPS.map((group) => {
          const groupRecords = shareableRecords.filter(
            (r) => getShareCategory(r) === group.id,
          )
          if (groupRecords.length === 0) return null
          const GroupIcon = group.icon

          return (
            <div key={group.id} className="px-2 py-1">
              <div className="flex items-center gap-1.5 px-1 py-1.5">
                <GroupIcon size={12} className="text-[#234B54]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]">
                  {group.label}
                </span>
              </div>
              <ul>
                {groupRecords.map((record) => {
                  const isSelected = selectedShareIds.includes(record.id)
                  return (
                    <li key={record.id}>
                      <label
                        className={cn(
                          'flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 transition-colors',
                          isSelected ? 'bg-[#EBF2EE]' : 'hover:bg-[#FAF8F5]',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelection(record.id)}
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-[#C5D0CB] text-[#234B54] focus:ring-[#234B54]/20"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-bold text-[#191E1B]">
                            {record.title}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-[#5A6660]">
                            {record.subtitle}
                          </span>
                          <span className="mt-0.5 block text-[10px] font-medium text-[#7D8B82]">
                            {record.date}
                          </span>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}

        {shareableRecords.length === 0 && (
          <p className="px-3 py-4 text-center text-[11px] text-[#7D8B82]">
            Pro tohoto mazlíčka zatím nejsou dostupné záznamy.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[#F0EDE6] bg-[#FAF8F5] px-3 py-2.5">
        <button
          type="button"
          onClick={onToggleSelectAll}
          disabled={shareableRecords.length === 0}
          className="text-[11px] font-semibold text-[#234B54] hover:text-[#B8934A] disabled:opacity-40 cursor-pointer"
        >
          {selectedShareIds.length === shareableRecords.length
            ? 'Zrušit výběr'
            : 'Vybrat vše'}
        </button>
        <button
          type="button"
          onClick={onShare}
          disabled={selectedShareIds.length === 0}
          className="rounded-lg bg-[#234B54] px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#1a383f] disabled:opacity-40 cursor-pointer"
        >
          Sdílet{selectedShareIds.length > 0 ? ` (${selectedShareIds.length})` : ''}
        </button>
      </div>
    </div>
  )
}
