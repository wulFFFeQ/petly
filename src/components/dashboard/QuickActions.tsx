import {
  Camera,
  CalendarPlus,
  ClipboardPlus,
  Stethoscope,
  ArrowRight,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { Card } from '../ui/Card'

const actions = [
  {
    label: 'Přidat zdravotní záznam',
    description: 'Očkování, léky a testy',
    icon: ClipboardPlus,
    modal: 'addHealthRecord' as const,
    color: 'text-[#2C4A3E] bg-[#EBF2EE]',
  },
  {
    label: 'Rezervovat návštěvu u veterináře',
    description: 'Naplánovat preventivní prohlídku',
    icon: Stethoscope,
    modal: 'bookVet' as const,
    color: 'text-sky-700 bg-sky-50',
  },
  {
    label: 'Přidat aktivitu',
    description: 'Procházky, krmení a milníky',
    icon: CalendarPlus,
    modal: 'addActivity' as const,
    color: 'text-amber-700 bg-amber-50',
  },
  {
    label: 'Přidat fotku',
    description: 'Nahrát vzpomínky do galerie',
    icon: Camera,
    modal: 'addPhoto' as const,
    color: 'text-[#B8934A] bg-[#FAF4E6]',
  },
]

export function QuickActions() {
  const { setActiveModal } = useApp()

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-bold tracking-tight text-[#191E1B]">Rychlé akce</h2>
        <p className="text-xs text-[#7D8B82] mt-0.5">Časté záznamy a veterinární dokumentace</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map(({ label, description, icon: Icon, modal, color }) => (
          <Card
            key={label}
            variant="elevated"
            hoverable
            padding="sm"
            onClick={() => setActiveModal(modal)}
            className="group cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color} transition-transform duration-300 group-hover:scale-110`}
              >
                <Icon size={19} />
              </div>
              <div>
                <p className="text-sm font-bold text-[#191E1B] group-hover:text-[#2C4A3E] transition-colors">
                  {label}
                </p>
                <p className="text-[11px] text-[#7D8B82] font-medium">{description}</p>
              </div>
            </div>
            <ArrowRight
              size={15}
              className="text-[#A3AEA7] group-hover:text-[#2C4A3E] group-hover:translate-x-1 transition-all"
            />
          </Card>
        ))}
      </div>
    </section>
  )
}
