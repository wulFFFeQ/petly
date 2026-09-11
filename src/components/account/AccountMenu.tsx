import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getMyProfilePath,
  getSelfAccount,
  logoutSelfSession,
} from '../../lib/account'
import { getUserDisplayName } from '../../lib/discover/owner'
import { isProfessionalAccount } from '../../lib/professional/roles'
import { cn } from '../../lib/utils'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&q=85'

type AccountMenuProps = {
  /** Visual size of the avatar trigger */
  size?: 'sm' | 'md'
  goldRing?: boolean
  /** Extra class on the trigger button */
  className?: string
  /** Compact layout for sidebar footer */
  showLabel?: boolean
  subtitle?: string
}

/**
 * Shared account popover — consumer header, professional header, sidebars.
 * Uses existing routes and session.logoutSelfSession (no parallel auth).
 */
export function AccountMenu({
  size = 'sm',
  goldRing = true,
  className,
  showLabel = false,
  subtitle,
}: AccountMenuProps) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const account = getSelfAccount()
  const displayName =
    account?.displayName?.trim() || getUserDisplayName() || 'Účet'
  const profilePath = getMyProfilePath(account)
  const isPro = isProfessionalAccount(account)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const close = () => setOpen(false)

  const handleLogoutConfirm = () => {
    setConfirmLogout(false)
    close()
    logoutSelfSession()
    navigate('/login', { replace: true })
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        data-testid="account-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Účet: ${displayName}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex cursor-pointer items-center gap-3 rounded-xl text-left transition',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8934A]/40',
          showLabel && 'w-full p-2 hover:bg-white/60',
        )}
      >
        <Avatar src={DEFAULT_AVATAR} alt={displayName} size={size} goldRing={goldRing} />
        {showLabel && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-[#191E1B]">
              {displayName}
            </span>
            <span className="block truncate text-[10px] font-medium text-[#7D8B82]">
              {subtitle ?? (isPro ? 'Profesionální účet' : 'Můj účet')}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          data-testid="account-menu"
          className={cn(
            'absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-[#E8E4DC]',
            'bg-white shadow-[0_12px_40px_rgba(25,30,27,0.12)]',
            showLabel && 'left-0 right-auto bottom-full mb-2 mt-0',
          )}
        >
          <div className="border-b border-[#F0EDE6] px-4 py-3">
            <p className="truncate text-sm font-semibold text-[#191E1B]">{displayName}</p>
            {isPro && (
              <p className="mt-0.5 text-[11px] font-medium text-[#7D8B82]">Profesionální role</p>
            )}
          </div>
          <nav className="py-1.5">
            <MenuLink to={profilePath} testId="account-menu-profile" onNavigate={close}>
              Můj profil
            </MenuLink>
            <MenuLink to="/settings" testId="account-menu-settings" onNavigate={close}>
              Nastavení
            </MenuLink>
            <MenuLink to="/membership" testId="account-menu-membership" onNavigate={close}>
              Členství
            </MenuLink>
            <MenuLink to="/help" testId="account-menu-help" onNavigate={close}>
              Nápověda
            </MenuLink>
          </nav>
          <div className="border-t border-[#F0EDE6] p-1.5">
            <button
              type="button"
              role="menuitem"
              data-testid="account-menu-logout"
              className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#A33B3B] transition hover:bg-[#FDF2F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A33B3B]/30"
              onClick={() => {
                close()
                setConfirmLogout(true)
              }}
            >
              Odhlásit se
            </button>
          </div>
        </div>
      )}

      <Modal
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title="Odhlásit se"
        subtitle="Chcete se opravdu odhlásit?"
        maxWidth="sm"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="ghost"
            data-testid="logout-cancel"
            onClick={() => setConfirmLogout(false)}
          >
            Zrušit
          </Button>
          <Button
            variant="danger"
            data-testid="logout-confirm"
            onClick={handleLogoutConfirm}
          >
            Odhlásit se
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function MenuLink({
  to,
  children,
  onNavigate,
  testId,
}: {
  to: string
  children: string
  onNavigate: () => void
  testId: string
}) {
  return (
    <Link
      to={to}
      role="menuitem"
      data-testid={testId}
      onClick={onNavigate}
      className="block px-4 py-2.5 text-sm font-medium text-[#2C4A3E] transition hover:bg-[#FAF8F5] focus-visible:bg-[#FAF8F5] focus-visible:outline-none"
    >
      {children}
    </Link>
  )
}
