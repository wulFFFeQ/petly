import { PawPrint, Send, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useApp } from '../../context/AppContext'
import { cn } from '../../lib/utils'
import { Button } from '../ui/Button'
import { Input, Select, Textarea } from '../ui/Input'

const MESSAGE_TYPES = [
  { id: 'question', label: 'Dotaz' },
  { id: 'feedback', label: 'Připomínka' },
  { id: 'bug', label: 'Technický problém' },
] as const

type MessageTypeId = (typeof MESSAGE_TYPES)[number]['id']

const SUBJECT_OPTIONS: Record<MessageTypeId, { value: string; label: string }[]> = {
  question: [
    { value: 'how_to', label: 'Jak něco funguje' },
    { value: 'account', label: 'Účet a nastavení' },
    { value: 'pets', label: 'Mazlíčci a profily' },
    { value: 'health', label: 'Zdraví a záznamy' },
    { value: 'other_question', label: 'Jiný dotaz' },
  ],
  feedback: [
    { value: 'idea', label: 'Nápad na vylepšení' },
    { value: 'ui', label: 'Vzhled a použitelnost' },
    { value: 'missing_feature', label: 'Chybějící funkce' },
    { value: 'content', label: 'Obsah a texty' },
    { value: 'other_feedback', label: 'Jiná připomínka' },
  ],
  bug: [
    { value: 'crash', label: 'Aplikace nejde / padá' },
    { value: 'display', label: 'Špatně zobrazená stránka' },
    { value: 'save', label: 'Neukládá se / mizí data' },
    { value: 'login', label: 'Přihlášení a přístup' },
    { value: 'other_bug', label: 'Jiný technický problém' },
  ],
}

export function SupportWidget() {
  const { showToast } = useApp()
  const [open, setOpen] = useState(false)
  const [messageType, setMessageType] = useState<MessageTypeId>('question')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  const subjectOptions = [
    { value: '', label: 'Vyberte předmět' },
    ...SUBJECT_OPTIONS[messageType],
  ]

  const selectMessageType = (type: MessageTypeId) => {
    setMessageType(type)
    setSubject('')
  }

  useEffect(() => {
    if (!open) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleEsc)
    const timer = window.setTimeout(() => {
      document.getElementById('support-message')?.focus()
    }, 50)
    return () => {
      document.removeEventListener('keydown', handleEsc)
      window.clearTimeout(timer)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handlePointer = (e: MouseEvent) => {
      const target = e.target as Node
      if (panelRef.current?.contains(target)) return
      if (fabRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    return () => document.removeEventListener('mousedown', handlePointer)
  }, [open])

  const resetForm = () => {
    setMessageType('question')
    setSubject('')
    setMessage('')
    setEmail('')
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!subject) {
      showToast('Vyberte předmět', 'Zvolte jednu z přednastavených možností.', 'info')
      return
    }
    const trimmed = message.trim()
    if (!trimmed) {
      showToast('Napište zprávu', 'Bez textu zprávy to neodešleme.', 'info')
      return
    }
    const typeLabel = MESSAGE_TYPES.find((t) => t.id === messageType)?.label
    const subjectLabel =
      SUBJECT_OPTIONS[messageType].find((opt) => opt.value === subject)?.label ?? subject
    showToast(
      'Demo: zpráva zaznamenána lokálně',
      `Zpráva nebyla odeslána na server${typeLabel ? ` · ${typeLabel}` : ''} · ${subjectLabel}.`,
      'info',
    )
    resetForm()
    setOpen(false)
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 top-0 z-[60] flex items-end justify-end p-4 pb-[5.75rem] lg:p-6">
      <div className="flex max-h-full w-[min(100%,22.5rem)] flex-col items-end gap-3">
        {open && (
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="pointer-events-auto flex max-h-[calc(100%-4.25rem)] w-full flex-col overflow-y-auto rounded-2xl border border-[#E8E4DC] bg-[#FAF8F5] shadow-[0_20px_50px_rgba(25,30,27,0.18)] animate-in fade-in slide-in-from-bottom-4 duration-200"
          >
            <div className="relative shrink-0 rounded-t-2xl bg-gradient-to-br from-[#2C4A3E] via-[#2C4A3E] to-[#234B54] px-5 pb-5 pt-7 text-white">
              <PawPrint
                size={72}
                strokeWidth={1.25}
                className="pointer-events-none absolute -right-2 -top-1 text-white/10"
                aria-hidden
              />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id={titleId} className="font-serif text-xl font-semibold leading-[1.45]">
                    Napište nám
                  </h2>
                  <p className="mt-2 max-w-[17rem] text-xs leading-relaxed text-white/85">
                    Dotazy, připomínky i technické problémy.
                    <br />
                    DEMO: zpráva zůstane jen v tomto prohlížeči.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="shrink-0 rounded-xl p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                  aria-label="Zavřít podporu"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 rounded-b-2xl p-4 sm:space-y-3.5 sm:p-5">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#4A564F]">
                  Typ zprávy
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {MESSAGE_TYPES.map((type) => {
                    const active = messageType === type.id
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => selectMessageType(type.id)}
                        className={cn(
                          'rounded-xl px-2 py-2 text-[11px] font-semibold transition-all cursor-pointer',
                          active
                            ? 'bg-[#2C4A3E] text-white shadow-sm'
                            : 'bg-white text-[#5A6660] border border-[#E8E4DC] hover:border-[#2C4A3E]/35',
                        )}
                      >
                        {type.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <Select
                id="support-subject"
                label="Předmět"
                options={subjectOptions}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />

              <Textarea
                id="support-message"
                label="Zpráva"
                placeholder="Popište dotaz nebo připomínku…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[72px]"
                rows={3}
                required
              />

              <Input
                id="support-email"
                type="email"
                label="E-mail pro odpověď"
                placeholder="volitelné"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                hint="Pokud chcete odpověď jinam než na účet."
              />

              <Button type="submit" variant="primary" fullWidth className="font-semibold gap-2">
                <Send size={15} />
                Odeslat
              </Button>
            </form>
          </div>
        )}

        <button
          ref={fabRef}
          id="support-widget-fab"
          type="button"
          aria-expanded={open}
          aria-label={open ? 'Zavřít podporu' : 'Otevřít podporu'}
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            'pointer-events-auto relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-[0_10px_28px_rgba(44,74,62,0.35)] transition-all duration-200 cursor-pointer',
            'hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2C4A3E]/25',
            open
              ? 'bg-[#191E1B] hover:bg-[#2C4A3E]'
              : 'bg-gradient-to-br from-[#2C4A3E] to-[#234B54] hover:from-[#234B54] hover:to-[#2C4A3E]',
          )}
        >
          {open ? (
            <X size={22} strokeWidth={2.2} />
          ) : (
            <PawPrint size={22} strokeWidth={2.1} className="animate-float" />
          )}
          {!open && (
            <span
              className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#FAF8F5] bg-[#B8934A]"
              aria-hidden
            />
          )}
        </button>
      </div>
    </div>
  )
}
