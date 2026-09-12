import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import {
  accountNeedsOnboarding,
  isSessionActive,
  loginSelfSession,
} from '../lib/account'
import {
  isRealAuthAvailable,
  signInWithEmailPassword,
  signUpWithEmailPassword,
} from '../lib/auth'
import { getProductionConnectionStatus } from '../lib/backend'
import { BRAND_NAME, BRAND_TAGLINE } from '../lib/brand'

/**
 * Login — production email/password when Supabase is configured;
 * otherwise DEMO one-click owner_self (explicitly labeled).
 */
export function LoginPage() {
  const navigate = useNavigate()
  const realAuth = isRealAuthAvailable()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (realAuth) return
    if (!isSessionActive()) return
    navigate(accountNeedsOnboarding() ? '/onboarding' : '/', { replace: true })
  }, [navigate, realAuth])

  const handleDemoLogin = () => {
    loginSelfSession()
    navigate(accountNeedsOnboarding() ? '/onboarding' : '/', { replace: true })
  }

  const handleAuthSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setPending(true)
    const result =
      mode === 'signup'
        ? await signUpWithEmailPassword({ email, password })
        : await signInWithEmailPassword({ email, password })
    setPending(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div
      data-testid="login-page"
      className="flex min-h-screen flex-col items-center justify-center bg-[#FAF8F5] px-4 py-10"
    >
      <div className="w-full max-w-md text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B8934A]">
          {BRAND_NAME}
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#191E1B] sm:text-4xl">
          {BRAND_NAME}
        </h1>
        <p className="mt-2 text-sm tracking-wide text-[#7D8B82]">{BRAND_TAGLINE}</p>

        {realAuth ? (
          <>
            <p className="mt-6 text-sm leading-relaxed text-[#5A6660]">
              Přihlášení účtem (email + heslo). Identita pochází z autentizované session —
              ne z client payloadu.
            </p>
            <form className="mt-8 space-y-3 text-left" onSubmit={handleAuthSubmit}>
              <label className="block text-sm text-[#5A6660]">
                Email
                <input
                  type="email"
                  required
                  autoComplete="email"
                  data-testid="login-email"
                  className="mt-1 w-full rounded-lg border border-[#D5DCD7] bg-white px-3 py-2 text-[#191E1B]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="block text-sm text-[#5A6660]">
                Heslo
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  data-testid="login-password"
                  className="mt-1 w-full rounded-lg border border-[#D5DCD7] bg-white px-3 py-2 text-[#191E1B]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {error ? (
                <p className="text-sm text-red-700" data-testid="login-error">
                  {error}
                </p>
              ) : null}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={pending}
                data-testid="login-submit"
              >
                {pending
                  ? 'Čekejte…'
                  : mode === 'signup'
                    ? 'Vytvořit účet'
                    : 'Přihlásit se'}
              </Button>
            </form>
            <button
              type="button"
              className="mt-4 text-sm text-[#5A6660] underline"
              onClick={() =>
                setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
              }
            >
              {mode === 'signin' ? 'Nemáte účet? Registrace' : 'Už máte účet? Přihlášení'}
            </button>
          </>
        ) : (
          <>
            <p className="mt-6 text-sm leading-relaxed text-[#5A6660]">
              DEMO přihlášení — obnoví lokální relaci{' '}
              <span className="font-semibold">owner_self</span>. Nejde o serverové
              ověření identity. Data zůstanou v tomto prohlížeči.
            </p>
            <p
              className="mt-2 text-xs text-[#8A9690]"
              data-testid="production-connection-status"
            >
              {getProductionConnectionStatus()}
            </p>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              className="mt-8"
              data-testid="login-submit"
              onClick={handleDemoLogin}
            >
              Přihlásit se (DEMO)
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
