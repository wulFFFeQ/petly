import type { ProfessionalDashboardStats } from '../../../lib/professional/dashboard'
import { Card } from '../../ui/Card'

const STATS: Array<{
  key: keyof ProfessionalDashboardStats
  label: string
  testId: string
}> = [
  { key: 'activeConnections', label: 'Aktivní propojení', testId: 'stat-active' },
  { key: 'pendingRequests', label: 'Čekající žádosti', testId: 'stat-pending' },
  { key: 'todaysEvents', label: 'Dnešní události', testId: 'stat-events' },
  { key: 'unreadNotifications', label: 'Notifikace', testId: 'stat-notifications' },
]

export function OverviewStats({ stats }: { stats: ProfessionalDashboardStats }) {
  return (
    <div
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      data-testid="professional-overview-stats"
    >
      {STATS.map(({ key, label, testId }) => (
        <Card key={key} variant="elevated" className="min-w-0" data-testid={testId}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-[#191E1B]">{stats[key]}</p>
        </Card>
      ))}
    </div>
  )
}
