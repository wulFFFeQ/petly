import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/professional/dashboard/EmptyState'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  SERVICE_PRICE_TYPES,
  activateProfessionalService,
  createProfessionalService,
  disableProfessionalService,
  ensureSeedServices,
  formatServicePrice,
  listProfessionalServices,
  recommendedCategoriesForRole,
  suggestedServicesForRole,
  updateProfessionalService,
  type ProfessionalService,
  type ServiceCategory,
  type ServiceDepositType,
  type ServicePaymentCollection,
  type ServicePriceType,
  type ServicePublicVisibility,
} from '../../lib/booking'
import { suggestedPaymentDefaults } from '../../lib/payments'
import { getActiveSelfProfessionalProfile } from '../../lib/professional/dashboard'
import { useApp } from '../../context/AppContext'

type Draft = {
  name: string
  description: string
  category: ServiceCategory
  durationMinutes: string
  priceType: ServicePriceType
  price: string
  currency: string
  bookingEnabled: boolean
  publicVisibility: ServicePublicVisibility
  bufferBefore: string
  bufferAfter: string
  paymentCollection: ServicePaymentCollection
  depositType: ServiceDepositType
  depositValue: string
}

const emptyDraft = (
  category: ServiceCategory = 'other',
  paymentCollection: ServicePaymentCollection = 'pay_on_site',
): Draft => ({
  name: '',
  description: '',
  category,
  durationMinutes: '30',
  priceType: 'on_request',
  price: '',
  currency: 'CZK',
  bookingEnabled: true,
  publicVisibility: 'public',
  bufferBefore: '',
  bufferAfter: '',
  paymentCollection,
  depositType: 'percentage',
  depositValue: '30',
})

export function ProfessionalServicesPage() {
  const profile = getActiveSelfProfessionalProfile()
  const { showToast } = useApp()
  const [revision, setRevision] = useState(0)
  const [editId, setEditId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft())

  const services = useMemo(() => {
    if (!profile) return [] as ProfessionalService[]
    ensureSeedServices(profile.id, profile.type)
    return listProfessionalServices(profile.id, { includeInactive: true })
  }, [profile, revision])

  const suggestions = useMemo(() => {
    if (!profile) return []
    return suggestedServicesForRole(profile.type)
  }, [profile])

  const recommendedCategories = useMemo(() => {
    if (!profile) return SERVICE_CATEGORIES
    const recommended = recommendedCategoriesForRole(profile.type)
    const rest = SERVICE_CATEGORIES.filter((c) => !recommended.includes(c))
    return [...recommended, ...rest]
  }, [profile])

  if (!profile) {
    return (
      <EmptyState
        title="Chybí profesionální profil"
        description="Správa služeb vyžaduje profesionální účet."
        ctaTo="/professional/profile"
        ctaLabel="Profil"
      />
    )
  }

  const openCreate = () => {
    setEditId(null)
    const defaults = suggestedPaymentDefaults(profile.type)
    const base = emptyDraft(
      recommendedCategories[0] ?? 'other',
      defaults.paymentCollection,
    )
    if (defaults.requiresDeposit && defaults.depositType && defaults.depositValue !== undefined) {
      base.paymentCollection = 'deposit'
      base.depositType = defaults.depositType
      base.depositValue = String(defaults.depositValue)
    }
    setDraft(base)
    setOpen(true)
  }

  const applySuggestion = (name: string) => {
    const s = suggestions.find((x) => x.name === name)
    if (!s) return
    setDraft((d) => ({
      ...d,
      name: s.name,
      description: s.description ?? '',
      category: s.category,
      durationMinutes: String(s.durationMinutes),
      priceType: s.priceType ?? (s.price !== undefined ? 'fixed' : 'on_request'),
      price: s.price !== undefined ? String(s.price) : '',
      currency: s.currency ?? 'CZK',
      bookingEnabled: s.bookingEnabled ?? true,
    }))
  }

  const openEdit = (s: ProfessionalService) => {
    setEditId(s.id)
    setDraft({
      name: s.name,
      description: s.description ?? '',
      category: s.category,
      durationMinutes: String(s.durationMinutes),
      priceType: s.priceType,
      price: s.price !== undefined ? String(s.price) : '',
      currency: s.currency ?? 'CZK',
      bookingEnabled: s.bookingEnabled,
      publicVisibility: s.publicVisibility,
      bufferBefore:
        s.bookingBufferBeforeMinutes !== undefined
          ? String(s.bookingBufferBeforeMinutes)
          : '',
      bufferAfter:
        s.bookingBufferAfterMinutes !== undefined
          ? String(s.bookingBufferAfterMinutes)
          : '',
      paymentCollection: s.paymentCollection ?? 'pay_on_site',
      depositType: s.depositType ?? 'percentage',
      depositValue: s.depositValue !== undefined ? String(s.depositValue) : '30',
    })
    setOpen(true)
  }

  const save = () => {
    const duration = Number(draft.durationMinutes)
    const priceRaw = draft.price.trim()
    const price =
      draft.priceType === 'on_request' || priceRaw === ''
        ? undefined
        : Number(priceRaw)
    const bufferBefore = draft.bufferBefore.trim()
      ? Number(draft.bufferBefore)
      : undefined
    const bufferAfter = draft.bufferAfter.trim()
      ? Number(draft.bufferAfter)
      : undefined
    const depositValueRaw = draft.depositValue.trim()
    const depositValue =
      draft.paymentCollection === 'deposit' && depositValueRaw !== ''
        ? Number(depositValueRaw)
        : undefined

    const fields = {
      name: draft.name,
      description: draft.description,
      category: draft.category,
      durationMinutes: duration,
      priceType: draft.priceType,
      price,
      currency: draft.priceType === 'on_request' ? undefined : draft.currency,
      bookingEnabled: draft.bookingEnabled,
      publicVisibility: draft.publicVisibility,
      bookingBufferBeforeMinutes: bufferBefore,
      bookingBufferAfterMinutes: bufferAfter,
      paymentCollection: draft.paymentCollection,
      requiresDeposit: draft.paymentCollection === 'deposit',
      depositType:
        draft.paymentCollection === 'deposit' ? draft.depositType : undefined,
      depositValue:
        draft.paymentCollection === 'deposit' ? depositValue : undefined,
    }

    if (editId) {
      const result = updateProfessionalService(editId, fields, profile.id)
      if (!result.ok) {
        showToast('Uložení selhalo', result.message, 'error')
        return
      }
    } else {
      const result = createProfessionalService({
        professionalId: profile.id,
        ...fields,
        description: draft.description || undefined,
      })
      if (!result.ok) {
        showToast('Uložení selhalo', result.message, 'error')
        return
      }
    }
    setOpen(false)
    setRevision((r) => r + 1)
    showToast('Služba uložena', draft.name, 'success')
  }

  return (
    <div className="space-y-5 pb-8" data-testid="professional-services-page">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#191E1B]">Moje služby</h1>
          <p className="text-xs text-[#7D8B82]">
            Veřejný katalog služeb a ceník. Základní správa není omezena členstvím.
            Platba zatím neprobíhá.
          </p>
        </div>
        <Button variant="primary" size="sm" data-testid="add-service" onClick={openCreate}>
          Přidat službu
        </Button>
      </div>

      <Link
        to="/professional/availability"
        className="inline-flex text-xs font-semibold text-[#2C4A3E] hover:underline"
      >
        Nastavit dostupnost →
      </Link>

      <ul className="space-y-2" data-testid="services-list">
        {services.map((s) => (
          <li key={s.id}>
            <Card
              variant="elevated"
              className={!s.active ? 'opacity-60' : undefined}
              data-testid={`service-row-${s.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#191E1B]">
                    {s.name}
                    {s.isDemo ? (
                      <span
                        className="ml-2 text-[10px] font-bold uppercase tracking-wide text-[#B8934A]"
                        data-testid={`service-demo-badge-${s.id}`}
                      >
                        DEMO
                      </span>
                    ) : null}
                  </p>
                  {s.description ? (
                    <p className="mt-0.5 text-xs text-[#7D8B82]">{s.description}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-[#4A564F]">
                    {SERVICE_CATEGORY_LABELS[s.category]} · {s.durationMinutes} min ·{' '}
                    {formatServicePrice(s.price, s.currency, s.priceType)}
                    {!s.active ? ' · neaktivní' : ''}
                    {s.active && s.publicVisibility === 'private' ? ' · neveřejná' : ''}
                    {s.active && !s.bookingEnabled ? ' · bez rezervace' : ''}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="xs" onClick={() => openEdit(s)}>
                    Upravit
                  </Button>
                  {s.active ? (
                    <Button
                      variant="ghost"
                      size="xs"
                      data-testid={`disable-service-${s.id}`}
                      onClick={() => {
                        const r = disableProfessionalService(s.id, profile.id)
                        if (!r.ok) {
                          showToast('Nelze deaktivovat', r.message, 'error')
                          return
                        }
                        setRevision((x) => x + 1)
                        showToast('Služba deaktivována', s.name, 'info')
                      }}
                    >
                      Deaktivovat
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="xs"
                      data-testid={`activate-service-${s.id}`}
                      onClick={() => {
                        const r = activateProfessionalService(s.id, profile.id)
                        if (!r.ok) {
                          showToast('Nelze aktivovat', r.message, 'error')
                          return
                        }
                        setRevision((x) => x + 1)
                        showToast('Služba aktivována', s.name, 'success')
                      }}
                    >
                      Aktivovat
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? 'Upravit službu' : 'Přidat službu'}
      >
        <div className="space-y-3">
          {!editId && suggestions.length > 0 ? (
            <label className="block text-xs font-semibold text-[#4A564F]">
              Návrh podle role
              <select
                className="mt-1 w-full rounded-xl border border-[#E8E4DC] px-3 py-2 text-sm"
                data-testid="service-suggestion-select"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) applySuggestion(e.target.value)
                }}
              >
                <option value="">— vlastní služba —</option>
                {suggestions.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <Input
            label="Název"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            data-testid="service-name-input"
          />
          <label className="block text-xs font-semibold text-[#4A564F]">
            Popis
            <textarea
              className="mt-1 w-full rounded-xl border border-[#E8E4DC] px-3 py-2 text-sm"
              rows={2}
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              data-testid="service-description-input"
            />
          </label>
          <label className="block text-xs font-semibold text-[#4A564F]">
            Kategorie
            <select
              className="mt-1 w-full rounded-xl border border-[#E8E4DC] px-3 py-2 text-sm"
              value={draft.category}
              data-testid="service-category-select"
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  category: e.target.value as ServiceCategory,
                }))
              }
            >
              {recommendedCategories.map((c) => (
                <option key={c} value={c}>
                  {SERVICE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Délka (min)"
            type="number"
            value={draft.durationMinutes}
            onChange={(e) => setDraft((d) => ({ ...d, durationMinutes: e.target.value }))}
            data-testid="service-duration-input"
          />
          <label className="block text-xs font-semibold text-[#4A564F]">
            Typ ceny
            <select
              className="mt-1 w-full rounded-xl border border-[#E8E4DC] px-3 py-2 text-sm"
              value={draft.priceType}
              data-testid="service-price-type-select"
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  priceType: e.target.value as ServicePriceType,
                }))
              }
            >
              {SERVICE_PRICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === 'fixed' ? 'Pevná cena' : t === 'from' ? 'Od' : 'Na dotaz'}
                </option>
              ))}
            </select>
          </label>
          {draft.priceType !== 'on_request' ? (
            <div className="grid grid-cols-2 gap-2">
              <Input
                label={draft.priceType === 'from' ? 'Cena od' : 'Cena'}
                type="number"
                value={draft.price}
                onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                data-testid="service-price-input"
              />
              <Input
                label="Měna"
                value={draft.currency}
                onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))}
                data-testid="service-currency-input"
              />
            </div>
          ) : null}
          <div
            className="space-y-2 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3 py-3"
            data-testid="service-payment-section"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
              Platba
            </p>
            <label className="block text-xs font-semibold text-[#4A564F]">
              Způsob platby
              <select
                className="mt-1 w-full rounded-xl border border-[#E8E4DC] bg-white px-3 py-2 text-sm"
                value={draft.paymentCollection}
                data-testid="service-payment-collection"
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    paymentCollection: e.target.value as ServicePaymentCollection,
                  }))
                }
              >
                <option value="pay_on_site">Platba na místě</option>
                <option value="deposit">Záloha</option>
                <option value="full_prepay">Platba předem</option>
              </select>
            </label>
            {draft.paymentCollection === 'deposit' ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs font-semibold text-[#4A564F]">
                  Typ zálohy
                  <select
                    className="mt-1 w-full rounded-xl border border-[#E8E4DC] bg-white px-3 py-2 text-sm"
                    value={draft.depositType}
                    data-testid="service-deposit-type"
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        depositType: e.target.value as ServiceDepositType,
                      }))
                    }
                  >
                    <option value="percentage">Procento</option>
                    <option value="fixed">Pevná částka</option>
                  </select>
                </label>
                <Input
                  label={draft.depositType === 'percentage' ? 'Záloha (%)' : 'Záloha (Kč)'}
                  type="number"
                  value={draft.depositValue}
                  onChange={(e) => setDraft((d) => ({ ...d, depositValue: e.target.value }))}
                  data-testid="service-deposit-value"
                />
              </div>
            ) : null}
            <p className="text-[11px] text-[#7D8B82]" data-testid="service-payment-hint">
              Platební systém připravujeme. Nastavení se uloží, online platba zatím
              neprobíhá.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Buffer před (min)"
              type="number"
              value={draft.bufferBefore}
              onChange={(e) => setDraft((d) => ({ ...d, bufferBefore: e.target.value }))}
              data-testid="service-buffer-before-input"
            />
            <Input
              label="Buffer po (min)"
              type="number"
              value={draft.bufferAfter}
              onChange={(e) => setDraft((d) => ({ ...d, bufferAfter: e.target.value }))}
              data-testid="service-buffer-after-input"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-[#4A564F]">
            <input
              type="checkbox"
              checked={draft.publicVisibility === 'public'}
              data-testid="service-public-visibility"
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  publicVisibility: e.target.checked ? 'public' : 'private',
                }))
              }
            />
            Veřejně zobrazovat
          </label>
          <label className="flex items-center gap-2 text-xs text-[#4A564F]">
            <input
              type="checkbox"
              checked={draft.bookingEnabled}
              data-testid="service-booking-enabled"
              onChange={(e) =>
                setDraft((d) => ({ ...d, bookingEnabled: e.target.checked }))
              }
            />
            Povolit rezervaci
          </label>
          <Button variant="primary" className="w-full" onClick={save} data-testid="service-save">
            Uložit
          </Button>
        </div>
      </Modal>
    </div>
  )
}
