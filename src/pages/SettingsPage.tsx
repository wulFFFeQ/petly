import {
  Bell,
  Shield,
  User,
  Sparkles,
  ShieldCheck,
  Syringe,
  Pill,
  Stethoscope,
  FlaskConical,
  Activity,
} from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'
import { cn } from '../lib/utils'

const VET_DATA_ACCESS = [
  {
    id: 'vaccination',
    label: 'Očkování',
    desc: 'Historie očkování, posilovačů a termíny příštích dávek',
    icon: Syringe,
  },
  {
    id: 'medication',
    label: 'Léky a doplňky',
    desc: 'Aktuální medikace, dávkování a pravidelné podávání',
    icon: Pill,
  },
  {
    id: 'visits',
    label: 'Návštěvy u veterináře',
    desc: 'Poslední prohlídky, poznámky z kliniky a plánované termíny',
    icon: Stethoscope,
  },
  {
    id: 'examinations',
    label: 'Vyšetření a výsledky',
    desc: 'Laboratorní výsledky, diagnostika a klinické nálezy',
    icon: FlaskConical,
  },
  {
    id: 'vitals',
    label: 'Hmotnost a vitální údaje',
    desc: 'Vývoj hmotnosti, teplota a další sledované parametry',
    icon: Activity,
  },
] as const

type VetAccessKey = (typeof VET_DATA_ACCESS)[number]['id']

const DEFAULT_VET_ACCESS: Record<VetAccessKey, boolean> = {
  vaccination: true,
  medication: true,
  visits: true,
  examinations: false,
  vitals: true,
}

export function SettingsPage() {
  const { showToast } = useApp()
  const [vetAccess, setVetAccess] = useState(DEFAULT_VET_ACCESS)
  const [vetHasAccess, setVetHasAccess] = useState(true)

  const handleSave = () => {
    showToast('Nastavení uloženo', 'Vaše nastavení účtu bylo uloženo.', 'gold')
  }

  const toggleVetAccess = (key: VetAccessKey) => {
    setVetAccess((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleRevokeVetAccess = () => {
    setVetHasAccess(false)
    setVetAccess({
      vaccination: false,
      medication: false,
      visits: false,
      examinations: false,
      vitals: false,
    })
    showToast(
      'Přístup odebrán',
      'MUDr. Novák již nemá přístup ke zdravotním údajům vašich mazlíčků.',
      'info',
    )
  }

  const handleRestoreVetAccess = () => {
    setVetHasAccess(true)
    setVetAccess(DEFAULT_VET_ACCESS)
    showToast(
      'Přístup obnoven',
      'Výchozí oprávnění pro ověřeného veterináře byla znovu aktivována.',
      'gold',
    )
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="gold" size="sm">
            <Sparkles size={11} className="mr-0.5 text-[#B8934A]" />
            Předvolby
          </Badge>
          <span className="text-xs text-[#7D8B82] font-medium">Účet a upozornění</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191E1B]">
          Nastavení
        </h1>
        <p className="mt-1 text-sm text-[#4A564F]">
          Spravujte profil účtu, upozornění a nastavení soukromí veterinárních dat.
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <Card variant="elevated">
          <h3 className="text-base font-bold text-[#191E1B] mb-4 flex items-center gap-2">
            <User size={18} className="text-[#2C4A3E]" />
            <span>Profil a domácnost</span>
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <label className="text-xs font-semibold text-[#4A564F]">Jméno účtu</label>
              <input
                type="text"
                defaultValue="Tereza V."
                className="mt-1 w-full h-10 rounded-xl border border-[#E8E4DC] px-3 text-xs text-[#191E1B] outline-none focus:border-[#2C4A3E]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#4A564F]">Kontaktní e-mail</label>
              <input
                type="email"
                defaultValue="tereza@example.cz"
                className="mt-1 w-full h-10 rounded-xl border border-[#E8E4DC] px-3 text-xs text-[#191E1B] outline-none focus:border-[#2C4A3E]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#4A564F]">Město / region</label>
              <input
                type="text"
                defaultValue="Kolín, Česká republika"
                className="mt-1 w-full h-10 rounded-xl border border-[#E8E4DC] px-3 text-xs text-[#191E1B] outline-none focus:border-[#2C4A3E]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#4A564F]">Hlavní veterinární klinika</label>
              <input
                type="text"
                defaultValue="PetCare Central Praha (MUDr. Novák)"
                className="mt-1 w-full h-10 rounded-xl border border-[#E8E4DC] px-3 text-xs text-[#191E1B] outline-none focus:border-[#2C4A3E]"
              />
            </div>
          </div>
        </Card>

        {/* Notifications & Reminders */}
        <Card variant="elevated">
          <h3 className="text-base font-bold text-[#191E1B] mb-4 flex items-center gap-2">
            <Bell size={18} className="text-[#B8934A]" />
            <span>Připomínky a upozornění</span>
          </h3>
          <div className="space-y-3">
            {[
              { title: 'Pushová upozornění na očkování a léky', desc: 'Připomínky 48 hodin a 2 hodiny před termínem', enabled: true },
              { title: 'SMS připomínky veterinárních termínů', desc: 'Upozornění na objednané návštěvy u veterináře', enabled: true },
              { title: 'Upozornění na schůzky', desc: 'Připomínky treninků, agility lekcí a dalších plánovaných aktivit', enabled: true },
              { title: 'Zprávy z komunity', desc: 'Upozornění, když se majitelé spojí nebo okomentují váš příspěvek', enabled: false },
              { title: 'Měsíční přehled zdraví a hmotnosti', desc: 'Souhrnná zpráva o vitálních údajích a dodržování rutin', enabled: true },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC]"
              >
                <div>
                  <p className="text-xs font-bold text-[#191E1B]">{item.title}</p>
                  <p className="text-[11px] text-[#7D8B82] mt-0.5">{item.desc}</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked={item.enabled}
                  className="h-4 w-4 rounded accent-[#2C4A3E] cursor-pointer"
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Privacy & Vet Data Access */}
        <Card variant="elevated">
          <h3 className="text-base font-bold text-[#191E1B] mb-4 flex items-center gap-2">
            <Shield size={18} className="text-[#2C4A3E]" />
            <span>Soukromí a přístup k veterinárním datům</span>
          </h3>
          <p className="text-xs text-[#4A564F] mb-5 leading-relaxed">
            PETLY uchovává zdravotní a klinické záznamy vašich mazlíčků v šifrované podobě.
            U každého ověřeného veterináře si můžete přesně nastavit, ke kterým údajům má
            přístup — a tento přístup kdykoliv odebrat.
          </p>

          <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-[#191E1B]">MUDr. Martin Novák</p>
                  <Badge variant="outline" size="sm">
                    <ShieldCheck size={11} className="mr-0.5 text-[#234B54]" />
                    Ověřený veterinář
                  </Badge>
                </div>
                <p className="mt-0.5 text-[11px] text-[#7D8B82]">
                  PetCare Central Praha · Luna, Milo, Bella
                </p>
              </div>
              <Badge
                variant={vetHasAccess && Object.values(vetAccess).some(Boolean) ? 'gold' : 'outline'}
                size="sm"
              >
                {vetHasAccess && Object.values(vetAccess).some(Boolean)
                  ? 'Aktivní přístup'
                  : 'Přístup odebrán'}
              </Badge>
            </div>

            <div className="mt-4 space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]">
                Sdílené zdravotní údaje
              </p>
              {VET_DATA_ACCESS.map((item) => {
                const Icon = item.icon
                const enabled = vetHasAccess && vetAccess[item.id]
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 transition-colors',
                      enabled
                        ? 'border-[#E8E4DC] bg-white'
                        : 'border-[#E8E4DC]/70 bg-white/60 opacity-80',
                    )}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E0EAEC] text-[#234B54]">
                        <Icon size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#191E1B]">{item.label}</p>
                        <p className="mt-0.5 text-[11px] text-[#7D8B82]">{item.desc}</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enabled}
                      disabled={!vetHasAccess}
                      onChange={() => toggleVetAccess(item.id)}
                      className="h-4 w-4 shrink-0 rounded accent-[#2C4A3E] cursor-pointer disabled:cursor-not-allowed"
                    />
                  </div>
                )
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#E8E4DC] pt-4">
              {vetHasAccess ? (
                <Button variant="outline" size="sm" onClick={handleRevokeVetAccess}>
                  Odebrat veškerý přístup
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={handleRestoreVetAccess}>
                  Obnovit přístup veterináře
                </Button>
              )}
              <p className="text-[11px] text-[#7D8B82]">
                Změny se projeví okamžitě v konzultacích i sdílení záznamů.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-5">
            <Button variant="outline" size="sm" onClick={handleRestoreVetAccess}>
              Obnovit výchozí
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave}>
              Uložit nastavení
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
