import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import {
  accountNeedsOnboarding,
  isSessionActive,
  loginSelfSession,
} from '../lib/account'
import { BRAND_NAME, BRAND_TAGLINE } from '../lib/brand'
import { useEffect } from 'react'

/**
 * DEMO login — reactivates the existing owner_self session.
 * Not a parallel auth system.
 */
export function LoginPage() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isSessionActive()) return
    navigate(accountNeedsOnboarding() ? '/onboarding' : '/', { replace: true })
  }, [navigate])

  const handleLogin = () => {
    loginSelfSession()
    navigate(accountNeedsOnboarding() ? '/onboarding' : '/', { replace: true })
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
        <p className="mt-6 text-sm leading-relaxed text-[#5A6660]">
          DEMO přihlášení — obnoví lokální relaci <span className="font-semibold">owner_self</span>.
          Nejde o serverové ověření identity. Data zůstanou v tomto prohlížeči.
        </p>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          className="mt-8"
          data-testid="login-submit"
          onClick={handleLogin}
        >
          Přihlásit se (DEMO)
        </Button>
      </div>
    </div>
  )
}
