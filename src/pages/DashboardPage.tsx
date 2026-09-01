import { DashboardSchedule } from '../components/dashboard/DashboardSchedule'
import { MyPetsSection } from '../components/dashboard/MyPetsSection'

export function DashboardPage() {
  return (
    <div className="space-y-8">
      <MyPetsSection />
      <DashboardSchedule />
    </div>
  )
}
