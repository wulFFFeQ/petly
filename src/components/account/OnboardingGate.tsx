import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { accountNeedsOnboarding, ensureDefaultSelfAccount } from '../../lib/account'

/**
 * Bootstraps the self Account and redirects unfinished users to /onboarding.
 * Public found/lost/emergency routes live outside this layout.
 */
export function OnboardingGate() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    ensureDefaultSelfAccount({ preferOnboardingWhenEmpty: true })
    if (location.pathname.startsWith('/onboarding')) return
    if (accountNeedsOnboarding()) {
      navigate('/onboarding', { replace: true })
    }
  }, [location.pathname, navigate])

  return <Outlet />
}
