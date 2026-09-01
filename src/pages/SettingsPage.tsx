import {
  Bell,
  Shield,
  User,
  Sparkles,
} from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'

export function SettingsPage() {
  const { showToast } = useApp()

  const handleSave = () => {
    showToast('Nastavení uloženo', 'Vaše nastavení účtu bylo uloženo.', 'gold')
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
              { title: 'Upozornění na schůzky a zprávy z komunity', desc: 'Upozornění, když se majitelé spojí nebo okomentují příspěvek', enabled: false },
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

        {/* Security & Passports */}
        <Card variant="elevated">
          <h3 className="text-base font-bold text-[#191E1B] mb-4 flex items-center gap-2">
            <Shield size={18} className="text-[#2C4A3E]" />
            <span>Soukromí a přístup k veterinárním datům</span>
          </h3>
          <p className="text-xs text-[#4A564F] mb-4">
            PETLY uchovává čipy a klinické záznamy vašich mazlíčků v šifrované podobě. Můžete si zvolit, zda ověření veterináři uvidí celý záznam.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm">
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
