import { Outlet } from 'react-router-dom'
import { Modals } from '../modals/Modals'
import { ToastContainer } from '../ui/Toast'
import { BottomNav } from './BottomNav'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function AppLayout() {
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
      <Modals />
      <ToastContainer />
    </div>
  )
}
