import {
  Calendar,
  FileText,
  Heart,
  Pill,
  Scale,
  Syringe,
  Plus,
} from 'lucide-react'
import { healthRecords } from '../../data/mockData'
import { useApp } from '../../context/AppContext'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

const summaries = [
  {
    label: 'Očkování',
    value: '3 aktivní',
    subtext: 'Další za 12 dní',
    icon: Syringe,
    color: 'text-[#2C4A3E] bg-[#EBF2EE] border-[#D1E0D8]',
  },
  {
    label: 'Léky',
    value: '2 recepty',
    subtext: 'Denní režim aktivní',
    icon: Pill,
    color: 'text-amber-800 bg-amber-50 border-amber-200/60',
  },
  {
    label: 'Návštěvy veterináře',
    value: '4 zaznamenané',
    subtext: 'MUDr. Novák a MUDr. Králová',
    icon: Heart,
    color: 'text-sky-800 bg-sky-50 border-sky-200/60',
  },
  {
    label: 'Prům. hmotnost',
    value: 'Optimální',
    subtext: '100 % shoda s cílem',
    icon: Scale,
    color: 'text-emerald-800 bg-emerald-50 border-emerald-200/60',
  },
  {
    label: 'Zdravotní záznamy',
    value: '12 ověřených',
    subtext: 'Oficiální pasy synchronizovány',
    icon: FileText,
    color: 'text-purple-800 bg-purple-50 border-purple-200/60',
  },
]

export function HealthSummary() {
  return (
    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
      {summaries.map(({ label, value, subtext, icon: Icon, color }) => (
        <Card
          key={label}
          variant="elevated"
          padding="sm"
          hoverable
          className="group"
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${color} transition-transform duration-300 group-hover:scale-105`}
            >
              <Icon size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                {label}
              </p>
              <p className="text-base font-bold text-[#191E1B] mt-0.5">{value}</p>
              <p className="text-[11px] text-[#7D8B82] font-medium mt-0.5 truncate">{subtext}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

export function UpcomingHealthEvents() {
  const { setActiveModal } = useApp()

  const upcoming = [
    {
      pet: 'Luna',
      event: 'Posilovací očkování proti vzteklině',
      date: '24. zář 2026',
      dueIn: 'Za 12 dní',
      clinic: 'PetCare Central Praha',
    },
    {
      pet: 'Milo',
      event: 'Rutinní prohlídka a dentální péče',
      date: 'Zítra · 14:30',
      dueIn: 'Zítra',
      clinic: 'Feline Care Studio Praha',
    },
    {
      pet: 'Bella',
      event: 'Dávka glukosaminu na klouby',
      date: 'Dnes · 20:00',
      dueIn: 'Dnes večer',
      clinic: 'Domácí podání',
    },
    {
      pet: 'Luna',
      event: 'Stříhání a odstraňování podsady',
      date: '5. zář 2026',
      dueIn: 'Za 4 dny',
      clinic: 'Maison Dog Spa Kolín',
    },
  ]

  return (
    <Card variant="elevated">
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#F0EDE6]">
        <div>
          <h3 className="text-base font-bold text-[#191E1B]">Nadcházející zdravotní události</h3>
          <p className="text-xs text-[#7D8B82]">Očkování, kliniky a denní léky</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setActiveModal('bookVet')}
          className="text-[#2C4A3E] font-semibold"
        >
          <Plus size={15} />
          <span>Rezervovat kliniku</span>
        </Button>
      </div>

      <ul className="divide-y divide-[#F0EDE6]">
        {upcoming.map((item, i) => (
          <li
            key={i}
            className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 hover:bg-[#FAF8F5] -mx-4 px-4 rounded-xl transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EBF2EE] text-[#2C4A3E]">
                <Calendar size={16} />
              </div>
              <div>
                <p className="text-sm font-bold text-[#191E1B]">{item.event}</p>
                <p className="text-xs text-[#7D8B82] font-medium">
                  Mazlíček: <strong className="text-[#4A564F]">{item.pet}</strong> · {item.clinic}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <Badge variant="gold" size="sm">
                {item.dueIn}
              </Badge>
              <p className="text-[11px] text-[#7D8B82] mt-1 font-mono">{item.date}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function HealthRecordsList() {
  const { setActiveModal } = useApp()

  return (
    <Card variant="elevated">
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#F0EDE6]">
        <div>
          <h3 className="text-base font-bold text-[#191E1B]">Nedávné klinické záznamy</h3>
          <p className="text-xs text-[#7D8B82]">Certifikovaná vyšetření a poznámky lékařů</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setActiveModal('addHealthRecord')}
        >
          <Plus size={15} />
          <span>Přidat záznam</span>
        </Button>
      </div>

      <ul className="divide-y divide-[#F0EDE6]">
        {healthRecords.slice(0, 5).map((record) => (
          <li
            key={record.id}
            className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 hover:bg-[#FAF8F5] -mx-4 px-4 rounded-xl transition-colors"
          >
            <div className="min-w-0 flex-1 pr-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-[#191E1B]">{record.title}</p>
                <Badge variant="default" size="sm">
                  {record.petId.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-[#4A564F] font-medium mt-0.5 truncate">
                {record.subtitle}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-mono font-medium text-[#7D8B82]">
                {record.date}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
