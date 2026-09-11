import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  accountNeedsOnboarding,
  ensureDefaultSelfAccount,
  isOnboardingCompleted,
  isSessionActive,
} from '../../lib/account'

/**
 * Requires an active DEMO session, then redirects unfinished users to /onboarding.
 * Public found/lost/emergency/login routes live outside this layout.
 */
export function OnboardingGate() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!isSessionActive()) {
      navigate('/login', { replace: true })
      return
    }

    ensureDefaultSelfAccount({ preferOnboardingWhenEmpty: true })

    if (location.pathname.startsWith('/onboarding')) {
      if (isOnboardingCompleted()) {
        navigate('/', { replace: true })
      }
      return
    }

    if (accountNeedsOnboarding()) {
      navigate('/onboarding', { replace: true })
    }
  }, [location.pathname, navigate])

  if (!isSessionActive()) {
    return null
  }

  return <Outlet />
}
