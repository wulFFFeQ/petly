/**
 * K50 — Messages health-share is DEMO / placeholder only.
 * Not a production clinical share path. Does not read AppContext SSOT or mockData.
 */
import { cn } from '../../lib/utils'

interface HealthShareMenuProps {
  onClose: () => void
}

export function HealthShareMenu({ onClose }: HealthShareMenuProps) {
  return (
    <div
      className="absolute bottom-full left-0 z-20 mb-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#E8E4DC] bg-white shadow-lg"
      data-testid="messages-health-share-demo"
    >
      <div className="border-b border-[#F0EDE6] px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A6B2E]">
          DEMO — placeholder
        </p>
        <p className="mt-1 text-xs font-bold text-[#191E1B]">
          Sdílení zdravotních záznamů
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-[#5A6660]">
          Toto není produkční klinické sdílení. Zprávy nemohou obejít authorization —
          skutečné zdravotní údaje se sem nenačítají.
        </p>
      </div>
      <div className="px-3 py-3">
        <p className="text-[11px] text-[#7D8B82]">
          Pro klinický přístup použijte Health / Professional pet pohled s explicitním
          grantem a oprávněním.
        </p>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            'mt-3 w-full rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3 py-2',
            'text-xs font-semibold text-[#234B54] hover:bg-white cursor-pointer',
          )}
          data-testid="messages-health-share-demo-dismiss"
        >
          Rozumím
        </button>
      </div>
    </div>
  )
}
