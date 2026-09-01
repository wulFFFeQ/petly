import {
  Camera,
  CheckCircle2,
  Scale,
  Stethoscope,
  Syringe,
  Sparkles,
} from 'lucide-react'
import { recentActivities } from '../../data/mockData'
import { Card } from '../ui/Card'

const categoryIcons = {
  health: { icon: Syringe, color: 'text-[#2C4A3E] bg-[#EBF2EE]' },
  photo: { icon: Camera, color: 'text-[#B8934A] bg-[#FAF4E6]' },
  routine: { icon: Scale, color: 'text-emerald-700 bg-emerald-50' },
  appointment: { icon: Stethoscope, color: 'text-sky-700 bg-sky-50' },
}

export function ActivityFeed() {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#191E1B]">Nedávná aktivita</h2>
          <p className="text-xs text-[#7D8B82] mt-0.5">Aktuální aktualizace ve záznamech vašich mazlíčků</p>
        </div>
        <span className="text-xs font-semibold text-[#2C4A3E] flex items-center gap-1">
          <Sparkles size={12} />
          Synchronizováno
        </span>
      </div>

      <Card variant="elevated" padding="none">
        <ul className="divide-y divide-[#F0EDE6]">
          {recentActivities.map((activity) => {
            const cat = activity.category
              ? categoryIcons[activity.category]
              : { icon: CheckCircle2, color: 'text-[#2C4A3E] bg-[#EBF2EE]' }
            const Icon = cat.icon

            return (
              <li
                key={activity.id}
                className="flex items-center justify-between p-4 sm:p-5 transition-colors hover:bg-[#FAF8F5]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cat.color}`}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#191E1B] truncate">
                      {activity.text}
                    </p>
                    {activity.petName && (
                      <span className="text-[11px] font-medium text-[#7D8B82]">
                        Mazlíček: {activity.petName}
                      </span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-[#7D8B82] font-medium pl-3">
                  {activity.time}
                </span>
              </li>
            )
          })}
        </ul>
      </Card>
    </section>
  )
}
