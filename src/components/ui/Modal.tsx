import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
  /** When false, clicking the dimmed backdrop does not close the modal. */
  closeOnBackdrop?: boolean
}

const maxSizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-xl',
  xl: 'max-w-3xl',
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  className,
  maxWidth = 'md',
  closeOnBackdrop = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1)
      if (focusable.length === 0) {
        e.preventDefault()
        panelRef.current.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleEsc)
    document.addEventListener('keydown', handleTab)
    document.body.style.overflow = 'hidden'

    // Initial focus only when the modal opens — not on every parent re-render.
    requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel) return
      const closeBtn = panel.querySelector<HTMLElement>('[data-modal-close]')
      const first = panel.querySelector<HTMLElement>(FOCUSABLE)
      ;(closeBtn ?? first ?? panel).focus()
    })

    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.removeEventListener('keydown', handleTab)
      document.body.style.overflow = ''
      restoreFocusRef.current?.focus()
      restoreFocusRef.current = null
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div
        className="fixed inset-0 bg-[#171B18]/45 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (closeOnBackdrop) onClose()
        }}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full overflow-hidden rounded-2xl border border-[#E8E4DC] bg-white p-6 sm:p-8 shadow-[0_20px_50px_rgba(25,30,27,0.15)] animate-in zoom-in-95 duration-200 my-auto outline-none',
          maxSizes[maxWidth],
          className,
        )}
      >
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
            type="button"
            data-modal-close
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
