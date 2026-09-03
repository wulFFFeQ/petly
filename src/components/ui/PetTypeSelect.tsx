import {
  Bird,
  Bug,
  Cat,
  Check,
  ChevronDown,
  Dog,
  Fish,
  Rabbit,
  Turtle,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useId, useRef, useState, type ComponentType } from 'react'
import { createPortal } from 'react-dom'
import { PET_TYPES, petTypeLabel, type PetType } from '../../lib/petTypes'
import { cn } from '../../lib/utils'
import {
  FrogIcon,
  GoatIcon,
  HorseHeadIcon,
  SpiderIcon,
} from './petTypeCustomIcons'

type PetTypeIconProps = {
  size?: number
  strokeWidth?: number
  className?: string
}

type PetTypeIcon = LucideIcon | ComponentType<PetTypeIconProps>

const petTypeIcons: Record<PetType, PetTypeIcon> = {
  dog: Dog,
  cat: Cat,
  birds: Bird,
  'small-mammals': Rabbit,
  reptiles: Turtle,
  amphibians: FrogIcon,
  fish: Fish,
  insects: Bug,
  'other-invertebrates': SpiderIcon,
  'horses-donkeys': HorseHeadIcon,
  'farm-animals': GoatIcon,
}

interface PetTypeSelectProps {
  id?: string
  label?: string
  value: PetType
  onChange: (value: PetType) => void
  className?: string
}

export function PetTypeSelect({
  id,
  label = 'Druh mazlíčka',
  value,
  onChange,
  className,
}: PetTypeSelectProps) {
  const listboxId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [panelStyle, setPanelStyle] = useState({ top: 0, left: 0, width: 0 })

  const SelectedIcon = petTypeIcons[value]

  useEffect(() => {
    if (!open || !triggerRef.current) return

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return

      setPanelStyle({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target)) return
      if (document.getElementById(listboxId)?.contains(target)) return
      setOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, listboxId])

  const dropdown = open
    ? createPortal(
        <div
          id={listboxId}
          role="listbox"
          aria-label={label}
          className="fixed z-[70] overflow-hidden rounded-xl border border-[#E8E4DC] bg-white shadow-[0_12px_32px_rgba(25,30,27,0.12)]"
          style={{
            top: panelStyle.top,
            left: panelStyle.left,
            width: panelStyle.width,
          }}
        >
          <ul className="max-h-64 overflow-y-auto py-1.5">
            {PET_TYPES.map((option) => {
              const Icon = petTypeIcons[option.value]
              const selected = option.value === value

              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors duration-150',
                      selected
                        ? 'bg-[#EBF2EE] text-[#2C4A3E]'
                        : 'text-[#191E1B] hover:bg-[#FAF8F5]',
                    )}
                  >
                    <Icon
                      size={18}
                      strokeWidth={1.75}
                      className={cn(
                        'shrink-0',
                        selected ? 'text-[#2C4A3E]' : 'text-[#7D8B82]',
                      )}
                    />
                    <span className="flex-1 font-medium">{option.label}</span>
                    {selected ? (
                      <Check size={16} strokeWidth={2.2} className="shrink-0 text-[#2C4A3E]" />
                    ) : (
                      <span className="w-4 shrink-0" aria-hidden />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>,
        document.body,
      )
    : null

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-xs font-semibold tracking-wide uppercase text-[#4A564F]">
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex h-10 w-full items-center gap-2.5 rounded-xl border border-[#E8E4DC] bg-white px-3.5 text-sm text-[#191E1B] shadow-[0_1px_2px_rgba(0,0,0,0.02)] outline-none transition-all duration-200',
          open
            ? 'border-[#2C4A3E] ring-4 ring-[#2C4A3E]/10'
            : 'hover:border-[#D1E0D8]',
        )}
      >
        <SelectedIcon size={18} strokeWidth={1.75} className="shrink-0 text-[#7D8B82]" />
        <span className="flex-1 truncate text-left font-medium">{petTypeLabel[value]}</span>
        <ChevronDown
          size={16}
          className={cn(
            'shrink-0 text-[#A3AEA7] transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      {dropdown}
    </div>
  )
}
