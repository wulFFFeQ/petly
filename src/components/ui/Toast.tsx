import { CheckCircle2, Sparkles, X, Info } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { cn } from '../../lib/utils'

export function ToastContainer() {
  const { toasts, removeToast } = useApp()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex items-start gap-3 rounded-2xl p-4 shadow-[0_10px_30px_rgba(25,30,27,0.12)] border transition-all duration-300 animate-in slide-in-from-bottom-5',
            toast.type === 'gold'
              ? 'bg-[#FCFBF8] border-[#E8D8B5] text-[#191E1B]'
              : toast.type === 'info'
                ? 'bg-white border-[#E8E4DC] text-[#191E1B]'
                : 'bg-[#F3F7F5] border-[#D1E0D8] text-[#191E1B]',
          )}
        >
          <div
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg mt-0.5',
              toast.type === 'gold'
                ? 'bg-[#FAF4E6] text-[#B8934A]'
                : toast.type === 'info'
                  ? 'bg-[#FAF8F5] text-[#4A564F]'
                  : 'bg-[#EBF2EE] text-[#2C4A3E]',
            )}
          >
            {toast.type === 'gold' ? (
              <Sparkles size={16} />
            ) : toast.type === 'info' ? (
              <Info size={16} />
            ) : (
              <CheckCircle2 size={16} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold tracking-normal">{toast.title}</p>
            {toast.description && (
              <p className="mt-0.5 text-xs text-[#7D8B82] leading-relaxed">
                {toast.description}
              </p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-[#A3AEA7] hover:text-[#191E1B] p-1 rounded-md transition-colors"
            aria-label="Zavřít"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
