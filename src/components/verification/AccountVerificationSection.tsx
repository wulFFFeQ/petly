import { Mail, Phone, ShieldAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { SELF_OWNER_ID } from '../../lib/discover/owner'
import {
  createDemoEmailVerification,
  createDemoPhoneVerification,
  findSubjectVerifications,
  getEmailProvider,
  getSmsProvider,
  isDemoVerification,
  loadVerifications,
  saveVerifications,
  upsertVerification,
  type Verification,
} from '../../lib/verification'

/**
 * Settings section for email/phone verification.
 * Without a real provider, only DEMO confirmation is available — never presented as trust.
 */
export function AccountVerificationSection() {
  const [verifications, setVerifications] = useState<Verification[]>([])
  const [email, setEmail] = useState('tereza@example.cz')
  const [phone, setPhone] = useState('+420 777 000 000')
  const [demoCode, setDemoCode] = useState<string | null>(null)
  const [codeInput, setCodeInput] = useState('')
  const [pendingChannel, setPendingChannel] = useState<'email' | 'phone' | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const reload = useCallback(() => {
    setVerifications(loadVerifications())
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const emailProvider = getEmailProvider()
  const smsProvider = getSmsProvider()

  const userVerifications = findSubjectVerifications(verifications, 'user', SELF_OWNER_ID)
  const emailRecord = userVerifications.find((v) => v.type === 'email')
  const phoneRecord = userVerifications.find((v) => v.type === 'phone')

  const startDemo = (channel: 'email' | 'phone') => {
    const code = String(Math.floor(100000 + Math.random() * 900000))
    setDemoCode(code)
    setCodeInput('')
    setPendingChannel(channel)
    setMessage(
      `DEMO: ověřovací kód je ${code}. Skutečný ${channel === 'email' ? 'e-mailový' : 'SMS'} provider není napojen — toto ověření nebude zobrazeno jako důvěryhodné.`,
    )
  }

  const confirmDemo = () => {
    if (!pendingChannel || !demoCode) return
    if (codeInput.trim() !== demoCode) {
      setMessage('Nesprávný kód.')
      return
    }
    const record =
      pendingChannel === 'email'
        ? createDemoEmailVerification({ email })
        : createDemoPhoneVerification({ phone })
    const next = upsertVerification(loadVerifications(), record)
    saveVerifications(next)
    setVerifications(next)
    setPendingChannel(null)
    setDemoCode(null)
    setCodeInput('')
    setMessage(
      'DEMO ověření uloženo. Ve veřejném profilu se nezobrazí jako skutečné ověření důvěryhodnosti.',
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-2">
        <h3 className="text-base font-bold text-[#191E1B] flex items-center gap-2">
          <ShieldAlert size={18} className="text-[#B8934A]" />
          <span>Ověření účtu</span>
        </h3>
        <Badge variant="outline" size="sm">
          DEMO / připraveno
        </Badge>
      </div>
      <p className="text-xs text-[#4A564F] leading-relaxed">
        Skutečné ověření e-mailu a telefonu vyžaduje napojený provider. Lokální potvrzení je pouze
        DEMO a nikdy se neveřejní jako důvěryhodný badge.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-[#191E1B] flex items-center gap-1.5">
              <Mail size={14} /> E-mail
            </p>
            {emailRecord ? (
              <Badge variant="outline" size="sm">
                {isDemoVerification(emailRecord) ? 'Demo uloženo' : 'Ověřeno'}
              </Badge>
            ) : (
              <Badge variant="outline" size="sm">
                Neověřeno
              </Badge>
            )}
          </div>
          <Input
            id="verify-email"
            type="email"
            label="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            labelClassName="normal-case tracking-normal"
            className="text-xs shadow-none focus:ring-0"
          />
          <p className="text-[10px] text-[#7D8B82]">{emailProvider.note}</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => startDemo('email')}
          >
            Spustit DEMO ověření e-mailu
          </Button>
        </div>

        <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-[#191E1B] flex items-center gap-1.5">
              <Phone size={14} /> Telefon
            </p>
            {phoneRecord ? (
              <Badge variant="outline" size="sm">
                {isDemoVerification(phoneRecord) ? 'Demo uloženo' : 'Ověřeno'}
              </Badge>
            ) : (
              <Badge variant="outline" size="sm">
                Neověřeno
              </Badge>
            )}
          </div>
          <Input
            id="verify-phone"
            type="tel"
            label="Telefon"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            labelClassName="normal-case tracking-normal"
            className="text-xs shadow-none focus:ring-0"
          />
          <p className="text-[10px] text-[#7D8B82]">{smsProvider.note}</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => startDemo('phone')}
          >
            Spustit DEMO ověření telefonu
          </Button>
        </div>
      </div>

      {pendingChannel ? (
        <div className="rounded-xl border border-[#E8D9B8] bg-[#FFFBF3] p-3.5 space-y-2">
          <p className="text-xs font-bold text-[#191E1B]">
            Potvrďte DEMO kód ({pendingChannel === 'email' ? 'e-mail' : 'telefon'})
          </p>
          <Input
            id="verify-demo-code"
            label="Kód"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            labelClassName="normal-case tracking-normal"
            className="text-xs shadow-none focus:ring-0"
          />
          <Button type="button" size="sm" onClick={confirmDemo}>
            Potvrdit DEMO
          </Button>
        </div>
      ) : null}

      {message ? <p className="text-[11px] text-[#5A6660] leading-relaxed">{message}</p> : null}
    </div>
  )
}
