import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'

export type OptionSelectItem = {
  value: string
  label: string
}

interface OptionSelectProps {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  options: OptionSelectItem[]
  placeholder?: string
  disabled?: boolean
  className?: string
  /** Max height of the dropdown list. */
  maxListHeightClassName?: string
}

export function OptionSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = 'Vyberte…',
  disabled = false,
  className,
  maxListHeightClassName = 'max-h-56',
}: OptionSelectProps) {
  const listboxId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [panelStyle, setPanelStyle] = useState({ top: 0, left: 0, width: 0 })

  const selected = options.find((option) => option.value === value)

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

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

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
          <ul className={cn('overflow-y-auto py-1.5', maxListHeightClassName)}>
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors duration-150 cursor-pointer',
                      isSelected
                        ? 'bg-[#EBF2EE] text-[#2C4A3E]'
                        : 'text-[#191E1B] hover:bg-[#FAF8F5]',
                    )}
                  >
                    <span className="flex-1 font-medium leading-snug">{option.label}</span>
                    {isSelected ? (
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
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => {
          if (!disabled) setOpen((current) => !current)
        }}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-xl border border-[#E8E4DC] bg-white px-3.5 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.02)] outline-none transition-all duration-200',
          disabled
            ? 'cursor-not-allowed opacity-55 text-[#A3AEA7]'
            : open
              ? 'border-[#2C4A3E] ring-4 ring-[#2C4A3E]/10 cursor-pointer text-[#191E1B]'
              : 'hover:border-[#D1E0D8] cursor-pointer text-[#191E1B]',
        )}
      >
        <span
          className={cn(
            'flex-1 truncate text-left font-medium',
            !selected && 'text-[#A3AEA7] font-normal',
          )}
        >
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            'shrink-0 text-[#A3AEA7] transition-transform duration-200',
            open && !disabled && 'rotate-180',
          )}
        />
      </button>
      {dropdown}
    </div>
  )
}
