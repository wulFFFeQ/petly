import { Link, useParams } from 'react-router-dom'
import { useMemo, useState, type FormEvent } from 'react'
import { HeartHandshake, Shield } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { BRAND_NAME } from '../lib/brand'
import {
  buildFoundPetPublicView,
  findPetByFoundToken,
} from '../lib/foundPet'
import { petTypeLabel } from '../lib/petTypes'
import { Button } from '../components/ui/Button'

export function FoundPetPage() {
  const { token = '' } = useParams<{ token: string }>()
  const { pets, submitFoundPetContact } = useApp()
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pet = useMemo(() => findPetByFoundToken(pets, token), [pets, token])
  const view = useMemo(() => (pet ? buildFoundPetPublicView(pet) : null), [pet])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!message.trim()) {
      setError('Napište prosím krátkou zprávu majiteli.')
      return
    }
    const ok = submitFoundPetContact(token, message)
    if (!ok) {
      setError('Zprávu se nepodařilo odeslat. Kontakt může být vypnutý.')
      return
    }
    setSent(true)
    setFormOpen(false)
    setMessage('')
  }

  if (!view) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B8934A]">{BRAND_NAME}</p>
        <h1 className="mt-4 text-2xl font-bold text-[#191E1B]">Odkaz není platný</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#5A6660]">
          Tento QR kód nepatří k žádnému mazlíčkovi v aplikaci, nebo byl zrušen.
        </p>
        <Link to="/" className="mt-6 inline-block text-sm font-semibold text-[#2C4A3E] hover:underline">
          Zpět na LOVED &amp; KNOWN
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-14">
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#B8934A]">
        {BRAND_NAME}
      </p>
      <h1 className="mt-3 text-center text-2xl font-bold tracking-tight text-[#191E1B] sm:text-3xl">
        Našli jste mazlíčka?
      </h1>
      <p className="mt-2 text-center text-sm text-[#5A6660]">Pomozte mi domů</p>

      <div className="mt-8 overflow-hidden rounded-3xl border border-[#E8E4DC] bg-white shadow-[0_8px_30px_rgba(25,30,27,0.06)]">
        <div className="aspect-[4/3] w-full bg-[#EBF2EE]">
          <img
            src={view.image}
            alt={view.name}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="space-y-3 p-6">
          <div>
            <h2 className="text-2xl font-bold text-[#191E1B]">{view.name}</h2>
            <p className="mt-1 text-sm font-medium text-[#4A564F]">
              {view.breed}
              <span className="text-[#A3AEA7]"> · {petTypeLabel[view.type]}</span>
            </p>
          </div>

          {view.approximateArea && (
            <p className="text-xs text-[#5A6660]">
              Přibližná oblast:{' '}
              <span className="font-semibold text-[#191E1B]">{view.approximateArea}</span>
            </p>
          )}

          {view.urgentNote && (
            <div className="rounded-xl border border-[#E8D8B5] bg-[#FAF4E6]/70 px-3 py-2.5 text-xs font-medium text-[#8A6A2E]">
              {view.urgentNote}
            </div>
          )}

          <p className="text-sm leading-relaxed text-[#4A564F]">
            Pokud jste {view.name} našli, můžete bezpečně kontaktovat majitele.
          </p>

          <div className="flex items-start gap-2 rounded-xl bg-[#FAF8F5] px-3 py-2.5">
            <Shield size={15} className="mt-0.5 shrink-0 text-[#2C4A3E]" />
            <p className="text-[11px] leading-relaxed text-[#7D8B82]">
              Nezobrazujeme telefon, e-mail, adresu ani číslo mikročipu. Kontakt probíhá jen přes
              LOVED &amp; KNOWN.
            </p>
          </div>

          {sent && (
            <div className="rounded-xl border border-[#D1E0D8] bg-[#EBF2EE]/70 px-3 py-2.5 text-xs font-medium text-[#2C4A3E]">
              Zpráva byla uložena lokálně (DEMO). Majiteli se nedoručuje mimo tento prohlížeč.
            </div>
          )}

          {view.contactEnabled && !formOpen && !sent && (
            <Button
              type="button"
              variant="primary"
              fullWidth
              className="gap-1.5"
              onClick={() => setFormOpen(true)}
            >
              <HeartHandshake size={15} />
              Kontaktovat majitele
            </Button>
          )}

          {view.contactEnabled && formOpen && (
            <form onSubmit={handleSubmit} className="space-y-3 border-t border-[#E8E4DC] pt-4">
              <h3 className="text-sm font-bold text-[#191E1B]">Našli jste {view.name}?</h3>
              <label className="block">
                <span className="text-[11px] font-semibold text-[#5A6660]">Vaše zpráva</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Napište majiteli, kde jste mazlíčka našli a jak vás může kontaktovat."
                  className="mt-1.5 w-full resize-none rounded-xl border border-[#E8E4DC] bg-white px-3 py-2.5 text-sm text-[#191E1B] placeholder:text-[#A3AEA7] focus:border-[#2C4A3E] focus:outline-none focus:ring-2 focus:ring-[#2C4A3E]/15"
                />
              </label>
              {error && (
                <p className="text-xs text-[#A85B4A]" role="alert">
                  {error}
                </p>
              )}
              <div className="flex flex-col gap-2">
                <Button type="submit" variant="primary" fullWidth>
                  Odeslat zprávu majiteli
                </Button>
                <Button type="button" variant="ghost" fullWidth onClick={() => setFormOpen(false)}>
                  Zrušit
                </Button>
              </div>
            </form>
          )}

          {!view.contactEnabled && (
            <p className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3 py-2.5 text-xs text-[#7D8B82]">
              Majitel má kontakt přes QR momentálně vypnutý. Mikročip může ověřit veterinář nebo
              jiná oprávněná organizace.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
