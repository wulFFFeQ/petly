import { DashboardCareSection } from '../components/dashboard/DashboardCareSection'
import { MyPetsSection } from '../components/dashboard/MyPetsSection'

export function DashboardPage() {
  return (
    <div className="space-y-8 lg:space-y-10">
      <MyPetsSection />
      <DashboardCareSection />
    </div>
  )
}
