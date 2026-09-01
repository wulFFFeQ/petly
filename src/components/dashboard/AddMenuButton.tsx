import {
  CalendarPlus,
  Camera,
  ClipboardPlus,
  Footprints,
  Plus,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../context/AppContext'
import type { ModalType } from '../../types'
import { cn } from '../../lib/utils'

const menuItems: { label: string; icon: typeof Plus; modal: Exclude<ModalType, null> }[] = [
  { label: 'Přidat zdravotní záznam', icon: ClipboardPlus, modal: 'addHealthRecord' },
  { label: 'Přidat aktivitu', icon: Footprints, modal: 'addActivity' },
  { label: 'Přidat fotku', icon: Camera, modal: 'addPhoto' },
  { label: 'Přidat událost', icon: CalendarPlus, modal: 'bookVet' },
]

export function AddMenuButton() {
  const { setActiveModal } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleSelect = (modal: Exclude<ModalType, null>) => {
    setActiveModal(modal)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer',
          open
            ? 'border-[#2C4A3E] bg-[#2C4A3E] text-white shadow-xs'
            : 'border-[#E8E4DC] bg-white text-[#2C4A3E] hover:border-[#D1E0D8] hover:bg-[#FAF8F5]',
        )}
      >
        <Plus size={15} strokeWidth={2.5} />
        Přidat
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-[#E8E4DC] bg-white py-1.5 shadow-[0_12px_32px_rgba(25,30,27,0.1)] animate-in fade-in zoom-in-95 duration-150">
          {menuItems.map(({ label, icon: Icon, modal }) => (
            <button
              key={modal}
              type="button"
              onClick={() => handleSelect(modal)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-medium text-[#191E1B] transition-colors hover:bg-[#FAF8F5] cursor-pointer"
            >
              <Icon size={15} className="shrink-0 text-[#2C4A3E]" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
