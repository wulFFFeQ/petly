import {
  ClipboardList,
  FileText,
  Home,
  PhoneCall,
  Plane,
  Scissors,
  Stethoscope,
  HelpCircle,
} from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Select, Textarea } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { BRAND_NAME } from '../../lib/brand'
import { cn } from '../../lib/utils'
import type {
  ConciergeContactPreference,
  ConciergeRequestPriority,
  ConciergeRequestStatus,
  ConciergeRequestType,
} from '../../types'

const CONCIERGE_TYPES: {
  id: ConciergeRequestType
  label: string
  desc: string
  icon: typeof Stethoscope
}[] = [
  {
    id: 'vet_care',
    label: 'Pomoc s veterinární péčí',
    desc: 'Objednání, doporučení, navazující péče',
    icon: Stethoscope,
  },
  {
    id: 'travel',
    label: 'Cestování se zvířetem',
    desc: 'Pravidla, dokumenty, příprava cesty',
    icon: Plane,
  },
  {
    id: 'pet_friendly_stay',
    label: 'Pet-friendly ubytování',
    desc: 'Hotely a místa, kam smí mazlíček',
    icon: Home,
  },
  {
    id: 'trainer_groomer',
    label: 'Trenér / groomer',
    desc: 'Výběr odborníka v okolí',
    icon: Scissors,
  },
  {
    id: 'documents_admin',
    label: 'Dokumenty a administrativa',
    desc: 'Pas, pojištění, potvrzení',
    icon: FileText,
  },
  {
    id: 'nonstandard',
    label: 'Nestandardní situace',
    desc: 'Citlivé nebo složité případy',
    icon: HelpCircle,
  },
  {
    id: 'other',
    label: 'Jiný požadavek',
    desc: 'Cokoli dalšího, co potřebujete zařídit',
    icon: ClipboardList,
  },
]

const STATUS_LABEL: Record<ConciergeRequestStatus, string> = {
  new: 'Nový',
  in_progress: 'Řešíme',
  needs_info: 'Potřebujeme doplnit informace',
  resolved: 'Vyřešeno',
}

const PRIORITY_LABEL: Record<ConciergeRequestPriority, string> = {
  low: 'Nízká',
  normal: 'Běžná',
  high: 'Vysoká',
}

const CONTACT_PREF_LABEL: Record<ConciergeContactPreference, string> = {
  phone: 'Telefon',
  email: 'E-mail',
  in_app: 'V aplikaci',
}

export function ConciergeSection({ hideHeader = false }: { hideHeader?: boolean }) {
  const {
    pets,
    conciergeRequests,
    createConciergeRequest,
    updateConciergeRequestStatus,
    showToast,
  } = useApp()

  const [formOpen, setFormOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<ConciergeRequestType>('vet_care')
  const [petId, setPetId] = useState(pets[0]?.id ?? '')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<ConciergeRequestPriority>('normal')
  const [contactPreference, setContactPreference] =
    useState<ConciergeContactPreference>('in_app')

  const openForm = (type?: ConciergeRequestType) => {
    if (type) setSelectedType(type)
    setFormOpen(true)
  }

  const handleSubmit = () => {
    if (!description.trim()) {
      showToast('Doplňte popis', 'Stručně popište, s čím potřebujete pomoct.', 'info')
      return
    }
    const req = createConciergeRequest({
      petId: petId || undefined,
      type: selectedType,
      description: description.trim(),
      priority,
      contactPreference,
    })
    const topic = CONCIERGE_TYPES.find((t) => t.id === selectedType)
    showToast(
      'Požadavek odeslán',
      `${BRAND_NAME} Concierge přijal „${topic?.label ?? 'požadavek'}“. Stav: Nový.`,
      'gold',
    )
    setDescription('')
    setFormOpen(false)
    void req
  }

  const petOptions = [
    { value: '', label: 'Bez konkrétního mazlíčka' },
    ...pets.map((pet) => ({
      value: pet.id,
      label: `${pet.name} · ${pet.breed}`,
    })),
  ]

  return (
    <div className="space-y-6">
      <Card variant="gold" padding="lg">
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              {!hideHeader && (
                <Badge variant="gold" size="sm" className="mb-2">
                  {BRAND_NAME} Concierge
                </Badge>
              )}
              <h3 className="text-lg font-bold text-[#191E1B]">
                Některé věci nemusíte řešit sami.
              </h3>
              <p className="text-xs text-[#4A564F] max-w-xl mt-1 leading-relaxed">
                Prémiová asistence pro zařizování, hledání a řešení situací kolem mazlíčka — od
                veterinární péče po cestování a administrativu.
              </p>
            </div>
            <Button
              variant="gold"
              size="md"
              onClick={() => openForm()}
              className="shrink-0 gap-1.5 font-bold"
              data-testid="concierge-cta"
            >
              <PhoneCall size={16} />
              <span>Požádat Concierge</span>
            </Button>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54] mb-2.5">
              S čím Concierge pomůže
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {CONCIERGE_TYPES.map((topic) => {
                const Icon = topic.icon
                const selected = selectedType === topic.id
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => openForm(topic.id)}
                    data-testid={`concierge-type-${topic.id}`}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                      selected
                        ? 'border-[#B8934A] bg-[#FAF4E6]'
                        : 'border-[#E8E4DC] bg-white hover:border-[#B8934A]/40',
                    )}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FAF8F5] text-[#234B54]">
                      <Icon size={16} />
                    </span>
                    <span>
                      <span className="block text-xs font-bold text-[#191E1B]">{topic.label}</span>
                      <span className="mt-0.5 block text-[11px] text-[#7D8B82] leading-relaxed">
                        {topic.desc}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </Card>

      <Card variant="elevated">
        <h4 className="text-sm font-bold text-[#191E1B] mb-1">Vaše požadavky</h4>
        <p className="text-[11px] text-[#7D8B82] mb-4">
          Uložené požadavky a jejich stav. Stav můžete aktualizovat podle průběhu řešení.
        </p>
        {conciergeRequests.length === 0 ? (
          <p className="text-sm text-[#7D8B82]" data-testid="concierge-empty">
            Zatím žádný požadavek. Klikněte na „Požádat Concierge“.
          </p>
        ) : (
          <ul className="space-y-3" data-testid="concierge-requests">
            {conciergeRequests.map((req) => {
              const topic = CONCIERGE_TYPES.find((t) => t.id === req.type)
              const pet = pets.find((p) => p.id === req.petId)
              return (
                <li
                  key={req.id}
                  data-testid={`concierge-request-${req.id}`}
                  className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3.5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-[#191E1B]">
                          {topic?.label ?? req.type}
                        </p>
                        <Badge variant="outline" size="sm">
                          {PRIORITY_LABEL[req.priority]}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-[#5A6660] leading-relaxed">
                        {req.description}
                      </p>
                      <p className="mt-1.5 text-[10px] text-[#7D8B82]">
                        {pet ? pet.name : 'Bez mazlíčka'} · kontakt{' '}
                        {CONTACT_PREF_LABEL[req.contactPreference]} ·{' '}
                        {new Date(req.createdAt).toLocaleString('cs-CZ')}
                      </p>
                    </div>
                    <div className="w-full sm:w-56 shrink-0">
                      <Select
                        id={`concierge-status-${req.id}`}
                        label="Stav"
                        value={req.status}
                        data-testid={`concierge-status-${req.id}`}
                        onChange={(e) =>
                          updateConciergeRequestStatus(
                            req.id,
                            e.target.value as ConciergeRequestStatus,
                          )
                        }
                        options={(
                          Object.keys(STATUS_LABEL) as ConciergeRequestStatus[]
                        ).map((key) => ({
                          value: key,
                          label: STATUS_LABEL[key],
                        }))}
                      />
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Požádat Concierge"
        subtitle="Popište požadavek — Concierge vás bude kontaktovat preferovaným způsobem."
        maxWidth="lg"
      >
        <div className="space-y-4" data-testid="concierge-form">
          <Select
            id="concierge-pet"
            label="Pro kterého mazlíčka"
            value={petId}
            onChange={(e) => setPetId(e.target.value)}
            options={petOptions}
          />
          <Select
            id="concierge-type"
            label="Typ požadavku"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as ConciergeRequestType)}
            options={CONCIERGE_TYPES.map((t) => ({ value: t.id, label: t.label }))}
          />
          <Textarea
            id="concierge-description"
            label="Stručný popis"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Co potřebujete zařídit nebo vyřešit?"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              id="concierge-priority"
              label="Priorita"
              value={priority}
              onChange={(e) => setPriority(e.target.value as ConciergeRequestPriority)}
              options={[
                { value: 'low', label: 'Nízká' },
                { value: 'normal', label: 'Běžná' },
                { value: 'high', label: 'Vysoká' },
              ]}
            />
            <Select
              id="concierge-contact-pref"
              label="Preferovaný kontakt"
              value={contactPreference}
              onChange={(e) =>
                setContactPreference(e.target.value as ConciergeContactPreference)
              }
              options={[
                { value: 'in_app', label: 'V aplikaci' },
                { value: 'phone', label: 'Telefon' },
                { value: 'email', label: 'E-mail' },
              ]}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>
              Zrušit
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={handleSubmit}
              data-testid="concierge-submit"
            >
              Odeslat požadavek
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
