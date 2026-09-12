import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Modals } from '../modals/Modals'
import { SupportWidget } from '../support/SupportWidget'
import { ToastContainer } from '../ui/Toast'
import { BottomNav } from './BottomNav'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

/** Private app shell — keep crawlers from indexing gated surfaces. */
function usePrivateNoIndex() {
  useEffect(() => {
    const existing = document.querySelector('meta[name="robots"]')
    const previous = existing?.getAttribute('content') ?? null
    if (existing) {
      existing.setAttribute('content', 'noindex,nofollow')
    } else {
      const meta = document.createElement('meta')
      meta.name = 'robots'
      meta.content = 'noindex,nofollow'
      document.head.appendChild(meta)
    }
    return () => {
      const meta = document.querySelector('meta[name="robots"]')
      if (!meta) return
      if (previous != null) meta.setAttribute('content', previous)
      else meta.setAttribute('content', 'index,follow')
    }
  }, [])
}

export function AppLayout() {
  usePrivateNoIndex()

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAF8F5]">
      <Sidebar />
      <div className="lg:pl-[260px] flex flex-col min-h-screen">
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
          <Header />
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <SupportWidget />
      <Modals />
      <ToastContainer />
    </div>
  )
}
