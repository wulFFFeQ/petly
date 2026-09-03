import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getBreedOptions } from '../../lib/petBreeds'
import type { PetType } from '../../lib/petTypes'
import { cn } from '../../lib/utils'

interface BreedSelectProps {
  id?: string
  label?: string
  petType: PetType
  value: string
  onChange: (value: string) => void
  className?: string
}

function normalizeSearch(text: string) {
  return text.trim().toLocaleLowerCase('cs')
}

export function BreedSelect({
  id,
  label = 'Plemeno',
  petType,
  value,
  onChange,
  className,
}: BreedSelectProps) {
  const listboxId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const [panelStyle, setPanelStyle] = useState({ top: 0, left: 0, width: 0 })

  const options = getBreedOptions(petType)
  const normalizedQuery = normalizeSearch(query)
  const filteredOptions = normalizedQuery
    ? options.filter((option) =>
        normalizeSearch(option.label).includes(normalizedQuery),
      )
    : options

  useEffect(() => {
    setQuery(value)
  }, [value, petType])

  useEffect(() => {
    if (!open || !containerRef.current) return

    const updatePosition = () => {
      const rect = containerRef.current?.getBoundingClientRect()
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
      if (containerRef.current?.contains(target)) return
      if (document.getElementById(listboxId)?.contains(target)) return
      setOpen(false)
      setQuery(value)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setQuery(value)
        inputRef.current?.blur()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, listboxId, value])

  const selectBreed = (breed: string) => {
    onChange(breed)
    setQuery(breed)
    setOpen(false)
  }

  const handleBlur = () => {
    window.setTimeout(() => {
      if (document.getElementById(listboxId)?.contains(document.activeElement)) return

      const exactMatch = options.find(
        (option) => normalizeSearch(option.label) === normalizedQuery,
      )

      if (exactMatch) {
        selectBreed(exactMatch.value)
        return
      }

      setOpen(false)
      setQuery(value)
    }, 0)
  }

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
          <ul className="max-h-[212px] overflow-y-auto py-1.5">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-[#7D8B82]">Žádné plemeno nenalezeno</li>
            ) : (
              filteredOptions.map((option) => {
                const selected = option.value === value

                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectBreed(option.value)}
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors duration-150',
                        selected
                          ? 'bg-[#EBF2EE] text-[#2C4A3E]'
                          : 'text-[#191E1B] hover:bg-[#FAF8F5]',
                      )}
                    >
                      <span className="flex-1 font-medium">{option.label}</span>
                      {selected ? (
                        <Check size={16} strokeWidth={2.2} className="shrink-0 text-[#2C4A3E]" />
                      ) : (
                        <span className="w-4 shrink-0" aria-hidden />
                      )}
                    </button>
                  </li>
                )
              })
            )}
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
      <div
        ref={containerRef}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-xl border border-[#E8E4DC] bg-white px-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-200',
          open ? 'border-[#2C4A3E] ring-4 ring-[#2C4A3E]/10' : 'hover:border-[#D1E0D8]',
        )}
      >
        <input
          ref={inputRef}
          id={id}
          name="pet-breed-search"
          type="text"
          role="combobox"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
          value={query}
          placeholder="Hledejte nebo vyberte plemeno"
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            if (value && event.target.value !== value) {
              onChange('')
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#191E1B] placeholder:text-[#A3AEA7] placeholder:font-normal outline-none"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Otevřít seznam plemen"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setOpen((current) => !current)
            inputRef.current?.focus()
          }}
          className="shrink-0 text-[#A3AEA7]"
        >
          <ChevronDown
            size={16}
            className={cn('transition-transform duration-200', open && 'rotate-180')}
          />
        </button>
      </div>
      {dropdown}
    </div>
  )
}
