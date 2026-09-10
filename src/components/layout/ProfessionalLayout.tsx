import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { setUiWorkspace } from '../../lib/account'
import { Modals } from '../modals/Modals'
import { SupportWidget } from '../support/SupportWidget'
import { ToastContainer } from '../ui/Toast'
import { Header } from './Header'
import { ProfessionalBottomNav } from './ProfessionalBottomNav'
import { ProfessionalSidebar } from './ProfessionalSidebar'
import { ProfessionalRoleHeader } from '../professional/dashboard/ProfessionalRoleHeader'

export function ProfessionalLayout() {
  useEffect(() => {
    setUiWorkspace('professional')
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAF8F5]" data-testid="professional-layout">
      <ProfessionalSidebar />
      <div className="lg:pl-[260px] flex flex-col min-h-screen">
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
          <Header variant="professional" />
          <ProfessionalRoleHeader />
          <Outlet />
        </main>
      </div>
      <ProfessionalBottomNav />
      <SupportWidget />
      <Modals />
      <ToastContainer />
    </div>
  )
}
