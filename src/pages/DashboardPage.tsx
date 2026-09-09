import { DashboardCareSection } from '../components/dashboard/DashboardCareSection'
import { HealthAttentionSection } from '../components/dashboard/HealthAttentionSection'
import { MyPetsSection } from '../components/dashboard/MyPetsSection'
import { UrgentAlertsSection } from '../components/dashboard/UrgentAlertsSection'

export function DashboardPage() {
  return (
    <div className="min-w-0 space-y-8 lg:space-y-10">
      {/* Urgent only when a pet is lost / critical — otherwise renders nothing */}
      <UrgentAlertsSection />
      <DashboardCareSection />
      <HealthAttentionSection />
      <MyPetsSection />
    </div>
  )
}
