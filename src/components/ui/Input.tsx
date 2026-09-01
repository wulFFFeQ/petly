import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
}

export function Input({ label, hint, className, id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold tracking-wide uppercase text-[#4A564F]">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          'h-10 rounded-xl border border-[#E8E4DC] bg-white px-3.5 text-sm text-[#191E1B] placeholder:text-[#A3AEA7] outline-none transition-all duration-200 focus:border-[#2C4A3E] focus:ring-4 focus:ring-[#2C4A3E]/10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]',
          className,
        )}
        {...props}
      />
      {hint && <span className="text-[11px] text-[#7D8B82]">{hint}</span>}
    </div>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
}

export function Textarea({ label, hint, className, id, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold tracking-wide uppercase text-[#4A564F]">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={cn(
          'min-h-[90px] rounded-xl border border-[#E8E4DC] bg-white p-3 text-sm text-[#191E1B] placeholder:text-[#A3AEA7] outline-none transition-all duration-200 focus:border-[#2C4A3E] focus:ring-4 focus:ring-[#2C4A3E]/10 shadow-[0_1px_2px_rgba(0,0,0,0.02)] resize-none',
          className,
        )}
        {...props}
      />
      {hint && <span className="text-[11px] text-[#7D8B82]">{hint}</span>}
    </div>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export function Select({ label, options, className, id, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold tracking-wide uppercase text-[#4A564F]">
          {label}
        </label>
      )}
      <select
        id={id}
        className={cn(
          'h-10 rounded-xl border border-[#E8E4DC] bg-white px-3.5 text-sm text-[#191E1B] outline-none transition-all duration-200 focus:border-[#2C4A3E] focus:ring-4 focus:ring-[#2C4A3E]/10 shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer',
          className,
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
