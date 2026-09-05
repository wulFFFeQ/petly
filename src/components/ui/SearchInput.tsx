import type { InputHTMLAttributes } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '../../lib/utils'

type SearchInputSize = 'sm' | 'md' | 'lg'

interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  size?: SearchInputSize
  onClear?: () => void
  clearable?: boolean
  wrapperClassName?: string
}

const sizeStyles: Record<
  SearchInputSize,
  { input: string; icon: number; iconLeft: string; clearRight: string }
> = {
  sm: {
    input:
      'h-9 rounded-xl pl-9 pr-3 text-xs focus:ring-2 focus:ring-[#2C4A3E]/10',
    icon: 16,
    iconLeft: 'left-3',
    clearRight: 'right-3',
  },
  md: {
    input:
      'h-10 rounded-xl pl-9 pr-9 text-sm focus:ring-2 focus:ring-[#2C4A3E]/10',
    icon: 16,
    iconLeft: 'left-3',
    clearRight: 'right-3',
  },
  lg: {
    input:
      'h-11 rounded-2xl pl-10 pr-10 text-sm focus:ring-4 focus:ring-[#2C4A3E]/10 shadow-[0_1px_3px_rgba(0,0,0,0.02)]',
    icon: 18,
    iconLeft: 'left-3.5',
    clearRight: 'right-3.5',
  },
}

export function SearchInput({
  size = 'md',
  onClear,
  clearable = false,
  className,
  wrapperClassName,
  value,
  ...props
}: SearchInputProps) {
  const styles = sizeStyles[size]
  const showClear =
    clearable && typeof value === 'string' && value.length > 0 && onClear

  return (
    <div className={cn('relative', wrapperClassName)}>
      <Search
        size={styles.icon}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 text-[#A3AEA7] pointer-events-none',
          styles.iconLeft,
        )}
      />
      <input
        type="search"
        value={value}
        className={cn(
          'w-full border border-[#E8E4DC] bg-white text-[#191E1B] placeholder:text-[#A3AEA7] outline-none transition-all focus:border-[#2C4A3E]',
          styles.input,
          className,
        )}
        {...props}
      />
      {showClear && (
        <button
          type="button"
          onClick={onClear}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 text-[#A3AEA7] hover:text-[#191E1B] p-1 rounded-md',
            styles.clearRight,
          )}
          aria-label="Vymazat vyhledávání"
        >
          <X size={15} />
        </button>
      )}
    </div>
  )
}
