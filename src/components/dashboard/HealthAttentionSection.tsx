import { ChevronRight, HeartPulse } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import {
  buildDashboardHealthAlerts,
  buildSoftHealthAlerts,
} from '../../lib/dashboardCare'
import { cn } from '../../lib/utils'

export function HealthAttentionSection() {
  const { pets, healthRecords, calendarEvents } = useApp()

  const alerts = useMemo(
    () =>
      buildSoftHealthAlerts(
        buildDashboardHealthAlerts(pets, healthRecords, calendarEvents),
      ),
    [pets, healthRecords, calendarEvents],
  )

  if (alerts.length === 0) return null

  return (
    <section className="space-y-2.5" aria-label="Zdravotní pozornost">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#234B54]">
          Zdravotní pozornost
        </p>
        <Link
          to="/health"
          className="text-xs font-semibold text-[#B8934A] transition-colors hover:text-[#A8833B]"
        >
          Zobrazit vše
        </Link>
      </div>
      <ul className="space-y-2">
        {alerts.map((alert) => (
          <li key={alert.id}>
            <Link
              to={alert.href}
              className={cn(
                'flex items-center gap-3 rounded-xl border border-[#E8E4DC] bg-white/80 px-3.5 py-2.5',
                'transition-all hover:border-[#D1E0D8] hover:bg-white hover:shadow-[0_2px_12px_rgba(21,35,42,0.05)]',
              )}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E8D8B5]/70 bg-[#FAF4E6] text-[#B8934A]">
                <HeartPulse size={14} strokeWidth={2} />
              </div>
              <p className="min-w-0 flex-1 text-sm font-medium text-[#191E1B]">
                {alert.message}
              </p>
              <ChevronRight size={15} className="shrink-0 text-[#A3AEA7]" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
