import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg'
}

const maxSizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-xl',
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  className,
  maxWidth = 'md',
}: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div
        className="fixed inset-0 bg-[#171B18]/45 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="modal-title"
        className={cn(
          'relative z-10 w-full overflow-hidden rounded-2xl border border-[#E8E4DC] bg-white p-6 sm:p-8 shadow-[0_20px_50px_rgba(25,30,27,0.15)] animate-in zoom-in-95 duration-200 my-auto',
          maxSizes[maxWidth],
          className,
        )}
      >
        {/* Subtle decorative gold top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2C4A3E] via-[#B8934A] to-[#2C4A3E]" />

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-title" className="text-xl font-semibold text-[#191E1B]">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-xs text-[#7D8B82] leading-relaxed">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-[#7D8B82] transition-colors hover:bg-[#FAF8F5] hover:text-[#191E1B] active:scale-95"
            aria-label="Zavřít"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
